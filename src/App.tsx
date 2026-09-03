import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Language, ModpackInstance } from "./types";
import { translations } from "./i18n";
import { IconBox, IconMicrosoft } from "./ui/icons";
import { FloatingDock } from "./components/navigation/FloatingDock";
import { CatalogTabs } from "./components/catalog/CatalogTabs";
import { ToastProvider, useToast } from "./ui/ToastProvider";
import { useInstances } from "./hooks/useInstances";
import { useAccounts } from "./hooks/useAccounts";
import { useOmegaAuth } from "./hooks/useOmegaAuth";
import { useFriends } from "./hooks/useFriends";
import { usePresence, type InviteInfo } from "./hooks/usePresence";
import { useVersions } from "./hooks/useVersions";
import { useGameSession } from "./hooks/useGameSession";
import { getStoredLanguage, getStoredTheme, setStoredLanguage, setStoredTheme, getStoredCloseOnLaunch, setStoredCloseOnLaunch } from "./services/storage";
import { ipc } from "./services/ipc";
import { HomeDashboard } from "./components/home/HomeDashboard";
import { CreateInstanceModal } from "./components/home/CreateInstanceModal";
import { ModsPanel } from "./components/mods/ModsPanel";
import { InstancesPanel } from "./components/instances/InstancesPanel";
import { ImportModal } from "./components/instances/ImportModal";
import { ImportProgressPopup } from "./components/instances/ImportProgressPopup";
import { AccountModal } from "./components/accounts/AccountModal";
import { FriendsTab } from "./components/friends/FriendsTab";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import "./App.css";

function App() {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = translations[language];
  const { showToast } = useToast();
  const instancesApiRef = useRef<ReturnType<typeof useInstances> | null>(null);
  const game = useGameSession(
    useCallback((id: string, ms: number) => {
      instancesApiRef.current?.recordPlaySession(id, ms);
    }, []),
  );

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    setStoredLanguage(lang);
  }, []);

  const instancesApi = useInstances(game.pushLog, showToast, t);
  instancesApiRef.current = instancesApi;
  const omegaAuth = useOmegaAuth();
  const omegaConnected = Boolean(omegaAuth.profile);
  const [invites, setInvites] = useState<InviteInfo[]>([]);
  const presenceApi = usePresence(omegaAuth, (invite) => {
    setInvites((prev) =>
      prev.some((i) => i.fromId === invite.fromId) ? prev : [...prev, invite],
    );
    showToast(`${invite.fromName} ${t.friendsInvite} (${invite.hostPort})`, "success");
  });
  const accountsApi = useAccounts(t, game.pushLog, omegaAuth);
  const friendsApi = useFriends(omegaAuth);

  const { currentVersionsList, versionFilters, toggleVersionFilter, manifestError } = useVersions();

  const [activeTab, setActiveTab] = useState("home");
  const [isCreating, setIsCreating] = useState(false);
  const [importPopupHidden, setImportPopupHidden] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVer, setNewVer] = useState("1.21.4");
  const [newLoader, setNewLoader] = useState("Fabric");

  const [themeHex, setThemeHex] = useState(() => getStoredTheme());
  const [customThemeInput, setCustomThemeInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [closeOnLaunch, setCloseOnLaunch] = useState(() => getStoredCloseOnLaunch());

  useEffect(() => {
    if (instancesApi.importing) setImportPopupHidden(false);
  }, [instancesApi.importing]);

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
      if (isCreating) setIsCreating(false);
      if (accountsApi.profileMenuOpen) accountsApi.setProfileMenuOpen(false);
      if (instancesApi.importModalOpen) instancesApi.setImportModalOpen(false);
      if (instancesApi.editModalOpen) instancesApi.setEditModalOpen(null);
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
    instancesApi.moveInstanceToTop(inst.id);
    presenceApi.setGameStatus({ instanceName: inst.name });
    void game.playInstance(inst, accountsApi.account.name, t);
  }, [instancesApi.selectedInstance, game, accountsApi.account, presenceApi, t]);

  const playInstanceById = useCallback((instanceId: string) => {
    const inst = instancesApi.instances.find((i) => i.id === instanceId);
    if (!inst) return;
    instancesApi.moveInstanceToTop(instanceId);
    presenceApi.setGameStatus({ instanceName: inst.name });
    void game.playInstance(inst, accountsApi.account.name, t);
  }, [instancesApi.instances, game, accountsApi.account, presenceApi, t]);

  const handleServerLaunch = useCallback((instanceId: string, serverHostPort: string) => {
    const inst = instancesApi.instances.find((i) => i.id === instanceId);
    if (!inst) return;
    instancesApi.moveInstanceToTop(instanceId);
    presenceApi.setGameStatus({ instanceName: inst.name, serverHost: serverHostPort });
    void game.playInstance(inst, accountsApi.account.name, t, serverHostPort);
  }, [instancesApi.instances, game, accountsApi.account, presenceApi, t]);

  useEffect(() => {
    if (!game.runningInstanceId) presenceApi.setGameStatus(null);
  }, [game.runningInstanceId, presenceApi]);

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
                <span className="status-dot" /> {accountsApi.account.type === "offline" ? t.onlineStatus : (t as any).connectedLabel}
              </span>
            </div>
          </div>
        </header>

        {activeTab === "home" && (
          <div className="home-glow-overlay" aria-hidden="true">
            <div className="home-glow-icon">
              <img src="/icons/128x128.png" alt="" />
            </div>
            <div className="home-glow-beam" />
          </div>
        )}

        {activeTab === "home" && (
          <HomeDashboard
            t={t}
            instances={instancesApi.visibleInstances}
            selectedInstanceId={instancesApi.selectedInstanceId}
            selectedInstance={instancesApi.selectedInstance}
            logs={game.logs}
            isRunning={game.isRunning}
            consoleOpen={game.consoleOpen}
            onToggleConsole={() => game.setConsoleOpen((p) => !p)}
            onSelectInstance={(id) => instancesApi.setSelectedInstanceId(id)}
            onPlayInstance={playInstanceById}
            onServerLaunch={handleServerLaunch}
            friendsApi={friendsApi}
            presenceApi={presenceApi}
            invites={invites}
            onDismissInvite={(fromId) =>
              setInvites((prev) => prev.filter((i) => i.fromId !== fromId))
            }
            onNotify={showToast}
            onCreate={() => setIsCreating(true)}
          />
        )}

        {activeTab === "modpacks" && (
          <InstancesPanel
            visibleInstances={instancesApi.visibleInstances}
            selectedInstanceId={instancesApi.selectedInstanceId}
            selectedInstance={instancesApi.selectedInstance}
            modCount={instancesApi.modCount}
            fileInputRef={instancesApi.fileInputRef}
            t={t}
            modals={{
              editModalOpen: instancesApi.editModalOpen,
              editNameInput: instancesApi.editNameInput,
              setEditNameInput: instancesApi.setEditNameInput,
              editVersionInput: instancesApi.editVersionInput,
              setEditVersionInput: instancesApi.setEditVersionInput,
              editLoaderInput: instancesApi.editLoaderInput,
              setEditLoaderInput: instancesApi.setEditLoaderInput,
            }}
            onSelectInstance={(id) => instancesApi.setSelectedInstanceId(id)}
            onIconChange={instancesApi.handleIconChange}
            onPlay={playSelected}
            onOpenFolder={(instanceId) => void ipc.openFolder(instanceId)}
            onEditInstance={(id) => instancesApi.openEditModal(id)}
            onDeleteInstance={(id) => instancesApi.deleteInstance(id)}
            onSaveEdit={instancesApi.saveEdit}
            onCloseEdit={() => instancesApi.setEditModalOpen(null)}
            onCreate={() => setIsCreating(true)}
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
            <CatalogTabs t={t} activeTab={activeTab} setActiveTab={setActiveTab} />

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
            closeOnLaunch={closeOnLaunch}
            setCloseOnLaunch={(v) => {
              setCloseOnLaunch(v);
              setStoredCloseOnLaunch(v);
            }}
          />
        )}

        {activeTab === "friends" && (
          <FriendsTab
            t={t}
            friends={friendsApi}
            presence={presenceApi}
            instances={instancesApi.instances}
            invites={invites}
            onDismissInvite={(fromId) =>
              setInvites((prev) => prev.filter((i) => i.fromId !== fromId))
            }
            onLaunch={handleServerLaunch}
            onNotify={showToast}
            onOpenAccounts={() => {
              accountsApi.setProfileMenuOpen(true);
              accountsApi.setAccountModalView("list");
            }}
          />
        )}

        {isCreating && (
          <CreateInstanceModal
            t={t}
            versionsList={currentVersionsList}
            newName={newName}
            setNewName={setNewName}
            newVer={newVer}
            setNewVer={setNewVer}
            newLoader={newLoader}
            setNewLoader={setNewLoader}
            onCreate={handleCreateInstance}
            onImport={() => {
              setIsCreating(false);
              instancesApi.setImportModalOpen(true);
            }}
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
          omegaMode={accountsApi.omegaMode}
          setOmegaMode={accountsApi.setOmegaMode}
          omegaEmail={accountsApi.omegaEmail}
          setOmegaEmail={accountsApi.setOmegaEmail}
          omegaUsername={accountsApi.omegaUsername}
          setOmegaUsername={accountsApi.setOmegaUsername}
          omegaPassword={accountsApi.omegaPassword}
          setOmegaPassword={accountsApi.setOmegaPassword}
          omegaBusy={accountsApi.omegaBusy}
          omegaError={accountsApi.omegaError}
          omegaConnected={omegaConnected}
          onBack={() => accountsApi.setAccountModalView("list")}
          onSelectAccount={accountsApi.handleSelectAccount}
          onDeleteAccount={accountsApi.handleDeleteAccount}
          onLogoutCurrentAccount={() => void accountsApi.handleLogoutCurrentAccount()}
          onAddOffline={accountsApi.handleAddOffline}
          onAddMicrosoft={() => void accountsApi.handleAddMicrosoft()}
          onAddOmega={() => void accountsApi.handleAddOmega()}
          onChangeView={accountsApi.setAccountModalView}
          onClose={() => accountsApi.setProfileMenuOpen(false)}
        />
      )}

      {instancesApi.importModalOpen && (
        <ImportModal
          t={t}
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

      <ImportProgressPopup
        t={t}
        visible={instancesApi.importing && !importPopupHidden}
        progress={instancesApi.installProgress}
        onClose={() => setImportPopupHidden(true)}
      />

      {instancesApi.selectedInstance && (
        <div className="playtime-badge">
          <span className="playtime-badge-dot" />
          <span>
            {t.playtimeLabel}: <b>{formatPlayTime(instancesApi.selectedInstance.playTimeMs, t)}</b>
          </span>
          <span className="playtime-badge-sep">•</span>
          <span>
            {t.lastLaunchLabel}: <b>{formatLastLaunch(instancesApi.selectedInstance.lastPlayedAt, language, t)}</b>
          </span>
        </div>
      )}
    </div>
  );
}

function formatPlayTime(ms: number | undefined, t: any): string {
  const totalMin = Math.floor((ms || 0) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} ${t.timeH} ${m} ${t.timeMin}`;
  if (m > 0) return `${m} ${t.timeMin}`;
  return `0 ${t.timeMin}`;
}

function formatLastLaunch(iso: string | undefined, language: Language, t: any): string {
  if (!iso) return t.neverLaunched;
  return new Date(iso).toLocaleString(language === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppWithToast() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
