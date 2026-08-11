import React, { useCallback, useEffect, useState } from "react";
import type { Language, ModpackInstance } from "./types";
import { translations } from "./i18n";
import { IconBox, IconMicrosoft } from "./ui/icons";
import { FloatingDock } from "./components/navigation/FloatingDock";
import { CatalogTabs } from "./components/catalog/CatalogTabs";
import { ToastProvider, useToast } from "./ui/ToastProvider";
import { useInstances } from "./hooks/useInstances";
import { useAccounts } from "./hooks/useAccounts";
import { useVersions } from "./hooks/useVersions";
import { useGameSession } from "./hooks/useGameSession";
import { getStoredLanguage, getStoredTheme, setStoredLanguage, setStoredTheme } from "./services/storage";
import { ipc } from "./services/ipc";
import { HomeDashboard } from "./components/home/HomeDashboard";
import { CreateInstanceModal } from "./components/home/CreateInstanceModal";
import { ModsPanel } from "./components/mods/ModsPanel";
import { InstancesPanel } from "./components/instances/InstancesPanel";
import { ImportModal } from "./components/instances/ImportModal";
import { AccountModal } from "./components/accounts/AccountModal";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import "./App.css";

function App() {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = translations[language];
  const { showToast } = useToast();
  const game = useGameSession();

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    setStoredLanguage(lang);
  }, []);

  const instancesApi = useInstances(game.pushLog, showToast);
  const accountsApi = useAccounts(t, game.pushLog);

  const { currentVersionsList, versionFilters, toggleVersionFilter, manifestError } = useVersions();

  const [activeTab, setActiveTab] = useState("home");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVer, setNewVer] = useState("1.21.4");
  const [newLoader, setNewLoader] = useState("Fabric");

  const [themeHex, setThemeHex] = useState(() => getStoredTheme());
  const [customThemeInput, setCustomThemeInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const applyTheme = useCallback((hex: string) => {
    setThemeHex(hex);
    setStoredTheme(hex);
    document.documentElement.style.setProperty("--accent-color", hex);

    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    document.documentElement.style.setProperty("--accent-color-rgb", `${r}, ${g}, ${b}`);
  }, []);

  useEffect(() => {
    applyTheme(themeHex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes any open overlay.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (instancesApi.contextMenu) instancesApi.setContextMenu(null);
      if (instancesApi.desktopContextMenu) instancesApi.setDesktopContextMenu(null);
      if (isCreating) setIsCreating(false);
      if (accountsApi.profileMenuOpen) accountsApi.setProfileMenuOpen(false);
      if (instancesApi.importModalOpen) instancesApi.setImportModalOpen(false);
      if (instancesApi.renameModalOpen) instancesApi.setRenameModalOpen(null);
      if (instancesApi.editModalOpen) instancesApi.setEditModalOpen(null);
      if (instancesApi.groupModalOpen) instancesApi.setGroupModalOpen(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isCreating, instancesApi, accountsApi.profileMenuOpen]);

  const handleCreateInstance = () => {
    if (!newName) return;
    const newInst: ModpackInstance = {
      id: Date.now().toString(),
      name: newName,
      mcVersion: newVer,
      loader: newLoader,
      x: 24 + Math.random() * 120,
      y: 24 + Math.random() * 120,
    };
    instancesApi.addInstance(newInst);
    instancesApi.setSelectedInstanceId(newInst.id);
    setIsCreating(false);
    setNewName("");
  };

  const playSelected = useCallback(() => {
    const inst = instancesApi.selectedInstance;
    if (!inst) return alert(t.alertNoInstance);
    void game.playInstance(inst, accountsApi.account.name, t);
  }, [instancesApi.selectedInstance, game, accountsApi.account, t]);

  const playInstanceById = useCallback((instanceId: string) => {
    const inst = instancesApi.instances.find((i) => i.id === instanceId);
    if (!inst) return;
    void game.playInstance(inst, accountsApi.account.name, t);
  }, [instancesApi.instances, game, accountsApi.account, t]);

  const handleCopyInstanceInfo = useCallback(async (instanceId: string) => {
    const inst = instancesApi.instances.find((i) => i.id === instanceId);
    if (!inst) return;
    const text = `${inst.name}\n${inst.mcVersion}\n${inst.loader}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Информация о сборке скопирована", "success");
    } catch {
      showToast("Не удалось скопировать информацию", "error");
    }
  }, [instancesApi.instances, showToast]);

  const handleCreateShortcut = useCallback(async (instanceId: string) => {
    try {
      await ipc.createShortcut(instanceId);
      showToast("Ярлык создан", "success");
    } catch (e) {
      showToast("Не удалось создать ярлык: " + e, "error");
    }
  }, [showToast]);

  const handleExportInstance = useCallback(async (instanceId: string) => {
    const inst = instancesApi.instances.find((i) => i.id === instanceId);
    if (!inst) return;
    try {
      await ipc.exportModpack({
        instanceId: inst.id,
        instanceName: inst.name,
        exportPath: instancesApi.exportPath,
      });
      showToast("Экспорт запущен", "success");
    } catch (e) {
      showToast("Не удалось экспортировать сборку: " + e, "error");
    }
  }, [instancesApi.instances, instancesApi.exportPath, showToast]);

  const handleUpdateMods = useCallback(async (instanceId: string) => {
    try {
      const updated = await ipc.updateAllMods(instanceId);
      showToast(`Обновлено модов: ${updated}`, "success");
    } catch (e) {
      showToast("Ошибка обновления модов: " + e, "error");
    }
  }, [showToast]);

  const handleExportOmega = useCallback(async (instanceId: string) => {
    const inst = instancesApi.instances.find((i) => i.id === instanceId);
    if (!inst) return;
    try {
      await ipc.exportOmega({
        instanceId: inst.id,
        instanceName: inst.name,
        mcVersion: inst.mcVersion,
        loader: inst.loader,
        exportPath: instancesApi.exportPath,
      });
      showToast("Экспорт .omega запущен", "success");
    } catch (e) {
      showToast("Не удалось экспортировать: " + e, "error");
    }
  }, [instancesApi.instances, instancesApi.exportPath, showToast]);

  const handleInstanceAction = useCallback((action: string, instanceId: string) => {
    switch (action) {
      case "rename":
        instancesApi.openRenameModal(instanceId);
        break;
      case "icon":
        instancesApi.fileInputRef.current?.click();
        break;
      case "play":
        playInstanceById(instanceId);
        break;
      case "stop":
        void game.stopGame();
        break;
      case "edit":
        instancesApi.openEditModal(instanceId);
        break;
      case "group":
        instancesApi.openGroupModal(instanceId);
        break;
      case "folder":
        void ipc.openFolder(instanceId);
        break;
      case "export":
        void handleExportInstance(instanceId);
        break;
      case "export_omega":
        void handleExportOmega(instanceId);
        break;
      case "update_mods":
        void handleUpdateMods(instanceId);
        break;
      case "copy":
        void handleCopyInstanceInfo(instanceId);
        break;
      case "delete":
        instancesApi.deleteInstance(instanceId);
        break;
      case "shortcut":
        void handleCreateShortcut(instanceId);
        break;
      case "saveRename":
        instancesApi.saveRename();
        break;
      case "closeRename":
        instancesApi.setRenameModalOpen(null);
        break;
      case "saveEdit":
        instancesApi.saveEdit();
        break;
      case "closeEdit":
        instancesApi.setEditModalOpen(null);
        break;
      case "saveGroup":
        instancesApi.saveGroup();
        break;
      case "closeGroup":
        instancesApi.setGroupModalOpen(null);
        break;
    }
  }, [instancesApi, game, playInstanceById, handleExportInstance, handleExportOmega, handleUpdateMods, handleCopyInstanceInfo, handleCreateShortcut]);

  return (
    <div
      className="app-container"
      onCopy={(e) => {
        if (!(e.target as HTMLElement).closest(".copyable-console")) {
          e.preventDefault();
        }
      }}
      onCut={(e) => {
        if (!(e.target as HTMLElement).closest(".copyable-console")) {
          e.preventDefault();
        }
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <main className="main-content">
        <header className="top-bar">
          <div className="title-area" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="sidebar-icon brand" style={{ width: 36, height: 36, marginBottom: 0, borderRadius: 10 }}>
              <IconBox />
            </div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "0.5px" }}>Omega Launcher</h1>
          </div>

          <div
            className="user-profile"
            onClick={() => {
              accountsApi.setProfileMenuOpen(true);
              accountsApi.setAccountModalView("list");
            }}
          >
            <div className="avatar">
              {accountsApi.account.type === "microsoft" ? (
                <IconMicrosoft />
              ) : (
                accountsApi.account.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{accountsApi.account.name}</span>
              <span className="user-status">
                <span className="status-dot" /> Онлайн
              </span>
            </div>
          </div>
        </header>

        {activeTab === "home" && (
          <HomeDashboard
            instances={instancesApi.instances}
            selectedInstanceId={instancesApi.selectedInstanceId}
            selectedInstance={instancesApi.selectedInstance}
            logs={game.logs}
            isRunning={game.isRunning}
            consoleOpen={game.consoleOpen}
            onToggleConsole={() => game.setConsoleOpen((p) => !p)}
            onSelectInstance={(id) => instancesApi.setSelectedInstanceId(id)}
            onPlayInstance={playInstanceById}
            onCreate={() => setIsCreating(true)}
          />
        )}

        {activeTab === "modpacks" && (
          <InstancesPanel
            visibleInstances={instancesApi.visibleInstances}
            selectedInstanceId={instancesApi.selectedInstanceId}
            selectedInstance={instancesApi.selectedInstance}
            modCount={instancesApi.modCount}
            contextMenu={instancesApi.contextMenu}
            fileInputRef={instancesApi.fileInputRef}
            t={t}
            modals={{
              renameModalOpen: instancesApi.renameModalOpen,
              renameInput: instancesApi.renameInput,
              setRenameInput: instancesApi.setRenameInput,
              editModalOpen: instancesApi.editModalOpen,
              editNameInput: instancesApi.editNameInput,
              setEditNameInput: instancesApi.setEditNameInput,
              editVersionInput: instancesApi.editVersionInput,
              setEditVersionInput: instancesApi.setEditVersionInput,
              editLoaderInput: instancesApi.editLoaderInput,
              setEditLoaderInput: instancesApi.setEditLoaderInput,
              groupModalOpen: instancesApi.groupModalOpen,
              groupInput: instancesApi.groupInput,
              setGroupInput: instancesApi.setGroupInput,
            }}
            onSelectInstance={(id) => instancesApi.setSelectedInstanceId(id)}
            onContextMenu={(id, x, y) => instancesApi.setContextMenu({ visible: true, x, y, instanceId: id })}
            onCloseContextMenu={() => instancesApi.setContextMenu(null)}
            onIconChange={instancesApi.handleIconChange}
            onPlay={playSelected}
            onOpenFolder={(instanceId) => void ipc.openFolder(instanceId)}
            onCreate={() => setIsCreating(true)}
            onModalAction={handleInstanceAction}
            onDropMod={(instanceId, payload) => void instancesApi.installModByDrag(instanceId, payload)}
            installProgress={instancesApi.installProgress}
          />
        )}

        {["mods", "resourcepacks", "shaders", "datapacks", "catalog"].includes(activeTab) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              flex: 1,
              minHeight: 0,
              height: "100%",
              paddingBottom: "20px",
              boxSizing: "border-box",
            }}
          >
            <CatalogTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === "mods" && <ModsPanel instances={instancesApi.instances} t={t} language={language} projectType="mod" versionsList={currentVersionsList} />}
            {activeTab === "resourcepacks" && <ModsPanel instances={instancesApi.instances} t={t} language={language} projectType="resourcepack" versionsList={currentVersionsList} />}
            {activeTab === "shaders" && <ModsPanel instances={instancesApi.instances} t={t} language={language} projectType="shader" versionsList={currentVersionsList} />}
            {activeTab === "datapacks" && <ModsPanel instances={instancesApi.instances} t={t} language={language} projectType="datapack" versionsList={currentVersionsList} />}
            {activeTab === "catalog" && (
              <ModsPanel
                instances={instancesApi.instances}
                t={t}
                language={language}
                projectType="modpack"
                onCreateModpack={(name, mcVer, loader, iconUrl, projectId) => {
                  setActiveTab("home");
                  void instancesApi.createFromCatalog(name, mcVer, loader, iconUrl, projectId);
                }}
                versionsList={currentVersionsList}
              />
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <SettingsPanel
            t={t}
            language={language}
            changeLanguage={changeLanguage}
            exportPath={instancesApi.exportPath}
            setExportPath={(v) => {
              instancesApi.setExportPath(v);
              localStorage.setItem("exportPath", v);
            }}
            ram={game.ram}
            setRam={game.setRam}
            sliderStyle={game.sliderStyle}
            serverIp={game.serverIp}
            setServerIp={game.setServerIp}
            javaPath={game.javaPath}
            setJavaPath={game.setJavaPath}
            gamePath={game.gamePath}
            setGamePath={game.setGamePath}
            themeHex={themeHex}
            applyTheme={applyTheme}
            customThemeInput={customThemeInput}
            setCustomThemeInput={setCustomThemeInput}
            showColorPicker={showColorPicker}
            setShowColorPicker={setShowColorPicker}
            versionFilters={versionFilters}
            currentVersionsList={currentVersionsList}
            toggleVersionFilter={toggleVersionFilter}
            manifestError={manifestError}
          />
        )}

        {isCreating && (
          <CreateInstanceModal
            t={t}
            language={language}
            versionsList={currentVersionsList}
            newName={newName}
            setNewName={setNewName}
            newVer={newVer}
            setNewVer={setNewVer}
            newLoader={newLoader}
            setNewLoader={setNewLoader}
            onCreate={handleCreateInstance}
            onClose={() => setIsCreating(false)}
          />
        )}
      </main>

      {accountsApi.profileMenuOpen && (
        <AccountModal
          t={t}
          accountModalView={accountsApi.accountModalView}
          account={accountsApi.account}
          savedAccounts={accountsApi.savedAccounts}
          newUsernameInput={accountsApi.newUsernameInput}
          setNewUsernameInput={accountsApi.setNewUsernameInput}
          onBack={() => accountsApi.setAccountModalView("list")}
          onSelectAccount={accountsApi.handleSelectAccount}
          onDeleteAccount={accountsApi.handleDeleteAccount}
          onAddOffline={accountsApi.handleAddOffline}
          onAddMicrosoft={() => void accountsApi.handleAddMicrosoft()}
          onChangeView={accountsApi.setAccountModalView}
          onClose={() => accountsApi.setProfileMenuOpen(false)}
        />
      )}

      {instancesApi.importModalOpen && (
        <ImportModal
          step={instancesApi.importStep}
          onSelectStep={instancesApi.setImportStep}
          onImport={(kind, path) => void instancesApi.importFromArchive(kind, path)}
          onClose={() => instancesApi.setImportModalOpen(false)}
        />
      )}

      <FloatingDock
        activeTab={activeTab}
        isHome={activeTab === "home"}
        isRunning={game.isRunning}
        selectedVersionLabel={instancesApi.selectedInstance ? instancesApi.selectedInstance.mcVersion : "1.20.1"}
        onHome={() => setActiveTab("home")}
        onCatalog={() => setActiveTab("mods")}
        onModpacks={() => setActiveTab("modpacks")}
        onSettings={() => setActiveTab("settings")}
        onFriends={() => setActiveTab("friends")}
        onPlay={playSelected}
        onStop={() => void game.stopGame()}
        t={t}
      />
    </div>
  );
}

export default function AppWithToast() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}