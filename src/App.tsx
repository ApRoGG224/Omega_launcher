import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Language, ModpackInstance } from "./types";
import { translations } from "./i18n";
import {
  IconArrowLeft,
  IconBox,
  IconChevronDown,
  IconMicrosoft,
  IconSettings,
  IconVolumeX,
  IconVolume2,
  IconActivity,
  IconMessageSquare,
  IconBug,
} from "./ui/icons";
import { SkinHeadPreview } from "./components/home/SkinHeadPreview";
import { FloatingDock } from "./components/navigation/FloatingDock";
import { CatalogTabs } from "./components/catalog/CatalogTabs";
import { ToastProvider, useToast } from "./ui/ToastProvider";
import { useSkin } from "./hooks/useSkin";
import { HomeView } from "./components/home/HomeView";
import { useInstances } from "./hooks/useInstances";
import { useAccounts } from "./hooks/useAccounts";
import { useOmegaAuth } from "./hooks/useOmegaAuth";
import { useFriends } from "./hooks/useFriends";
import { usePresence, type InviteInfo } from "./hooks/usePresence";
import { useVersions } from "./hooks/useVersions";
import { useGameSession } from "./hooks/useGameSession";
import { useSmoothScrolling } from "./hooks/useSmoothScrolling";
import { ipc } from "./services/ipc";
import { CreateInstanceModal } from "./components/home/CreateInstanceModal";
import { ModsPanel } from "./components/mods/ModsPanel";
import { InstancesPanel } from "./components/instances/InstancesPanel";
import { ImportModal } from "./components/instances/ImportModal";
import { ImportProgressPopup } from "./components/instances/ImportProgressPopup";
import { AccountModal } from "./components/accounts/AccountModal";
import { FriendsTab } from "./components/friends/FriendsTab";
import {
  SettingsPanel,
  applyBaseTheme,
  applyNeonTheme,
} from "./components/settings/SettingsPanel";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  getStoredFullscreenOnStart,
  getStoredLanguage,
  getStoredTheme,
  setStoredFullscreenOnStart,
  setStoredLanguage,
  setStoredTheme,
  getStoredCloseOnLaunch,
  setStoredCloseOnLaunch,
} from "./services/storage";
import "./App.css";

const launcherWindow = getCurrentWindow();

function App() {
  useSmoothScrolling();

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
    showToast(
      `${invite.fromName} ${t.friendsInvite} (${invite.hostPort})`,
      "success",
    );
  });
  const accountsApi = useAccounts(t, game.pushLog, omegaAuth);
  const skinApi = useSkin(accountsApi.account?.name);
  const friendsApi = useFriends(omegaAuth);

  const {
    currentVersionsList,
    versionFilters,
    toggleVersionFilter,
    manifestError,
  } = useVersions();

  const [activeTab, setActiveTab] = useState("home");
  const [isCreating, setIsCreating] = useState(false);
  const [importPopupHidden, setImportPopupHidden] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVer, setNewVer] = useState("1.21.4");
  const [newLoader, setNewLoader] = useState("Fabric");
  const [soundMuted, setSoundMuted] = useState(false);

  const [themeHex, setThemeHex] = useState(() => getStoredTheme());
  const [closeOnLaunch, setCloseOnLaunch] = useState(() =>
    getStoredCloseOnLaunch(),
  );
  const [fullscreenOnStart, setFullscreenOnStart] = useState(() =>
    getStoredFullscreenOnStart(),
  );

  useEffect(() => {
    void launcherWindow.setFullscreen(fullscreenOnStart).catch((error) => {
      console.warn("Unable to change launcher fullscreen state", error);
    });
  }, [fullscreenOnStart]);

  useEffect(() => {
    const handleFullscreenShortcut = (event: KeyboardEvent) => {
      if (event.key !== "F11") return;
      event.preventDefault();

      void launcherWindow
        .isFullscreen()
        .then((isFullscreen) => launcherWindow.setFullscreen(!isFullscreen))
        .catch((error) => {
          console.warn("Unable to toggle launcher fullscreen state", error);
        });
    };

    window.addEventListener("keydown", handleFullscreenShortcut);
    return () =>
      window.removeEventListener("keydown", handleFullscreenShortcut);
  }, []);

  useEffect(() => {
    if (instancesApi.importing) setImportPopupHidden(false);
  }, [instancesApi.importing]);

  const applyTheme = useCallback((hex: string) => {
    setThemeHex(hex);
    setStoredTheme(hex);
    document.documentElement.style.setProperty("--accent-color", hex);

    let r = 0,
      g = 0,
      b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    document.documentElement.style.setProperty(
      "--accent-color-rgb",
      `${r}, ${g}, ${b}`,
    );
  }, []);

  useEffect(() => {
    const savedNeon = localStorage.getItem("omega:neonTheme") || "omega";
    const savedBase = localStorage.getItem("omega:baseTheme") || "cappuccino";
    applyNeonTheme(savedNeon);
    applyBaseTheme(savedBase);
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
  }, [
    instancesApi.selectedInstance,
    game,
    accountsApi.account,
    presenceApi,
    t,
  ]);

  const playInstanceById = useCallback(
    (instanceId: string) => {
      const inst = instancesApi.instances.find((i) => i.id === instanceId);
      if (!inst) return;
      instancesApi.moveInstanceToTop(instanceId);
      presenceApi.setGameStatus({ instanceName: inst.name });
      void game.playInstance(inst, accountsApi.account.name, t);
    },
    [instancesApi.instances, game, accountsApi.account, presenceApi, t],
  );

  const handleServerLaunch = useCallback(
    (instanceId: string, serverHostPort: string) => {
      const inst = instancesApi.instances.find((i) => i.id === instanceId);
      if (!inst) return;
      instancesApi.moveInstanceToTop(instanceId);
      presenceApi.setGameStatus({
        instanceName: inst.name,
        serverHost: serverHostPort,
      });
      void game.playInstance(inst, accountsApi.account.name, t, serverHostPort);
    },
    [instancesApi.instances, game, accountsApi.account, presenceApi, t],
  );

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
      <header className="millida-top-bar">
        <div className="millida-top-left">
          {activeTab !== "home" && (
            <button
              type="button"
              className="millida-back-home-btn"
              onClick={() => setActiveTab("home")}
              title={t.backToHome || "На главную"}
            >
              <IconArrowLeft />
              <span>{t.backToHome || "На главную"}</span>
            </button>
          )}
        </div>

        <div className="millida-top-center">
          <div className="millida-title-badge">
            <div className="millida-logo-dot" />
            <span>OMEGA LAUNCHER</span>
          </div>
        </div>

        <div className="millida-top-right">
          {/* Friends online pill */}
          <button
            type="button"
            className="millida-top-friends-pill"
            onClick={() => setActiveTab("friends")}
            title={t.friendsTitle || "Друзья"}
          >
            <div className="millida-friends-heads-row">
              <div className="mini-head mini-head-1">
                <SkinHeadPreview skinUrl={skinApi.activeSkinUrl} size={18} />
              </div>
              <div className="mini-head mini-head-2">
                <SkinHeadPreview
                  skinUrl="https://textures.minecraft.net/texture/292009a4925b58f02c77ada79265e8c4c440b6716ecf340e22f39df1600cc646"
                  size={18}
                />
              </div>
              <div className="mini-head mini-head-3">
                <SkinHeadPreview
                  skinUrl="https://textures.minecraft.net/texture/b51752b027d1421feae1243efeb5fc90a2cf75e8ef4c1735cf577c385db49215"
                  size={18}
                />
              </div>
            </div>
            <span className="millida-friends-online-text">
              {Object.keys(presenceApi.presences).length ||
                friendsApi.friends.length ||
                3}{" "}
              {t.friendsOnlineBadge || "в сети"}
            </span>
            <div className="millida-pill-badge" aria-hidden="true">
              <span>{invites.length || 2}</span>
            </div>
          </button>

          {/* User profile dropdown widget */}
          <div
            className="millida-user-profile"
            onClick={() => {
              accountsApi.setProfileMenuOpen(true);
              accountsApi.setAccountModalView("list");
            }}
          >
            <div className="avatar">
              {accountsApi.account.type === "microsoft" ? (
                <IconMicrosoft />
              ) : (
                <SkinHeadPreview skinUrl={skinApi.activeSkinUrl} size={24} />
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{accountsApi.account.name}</span>
              <span className="user-status">
                {accountsApi.account.type === "microsoft"
                  ? t.microsoftAccountSubtitle || "Аккаунт Microsoft"
                  : accountsApi.account.type === "omega"
                    ? t.omegaAccountSubtitle || "Аккаунт Omega"
                    : t.offlineAccountSubtitle || "Оффлайн профиль"}
              </span>
            </div>
            <IconChevronDown size={14} className="dropdown-arrow" />
          </div>

          {/* Sound mute toggle */}
          <button
            type="button"
            className="millida-top-action-btn"
            onClick={() => {
              setSoundMuted((prev) => {
                const next = !prev;
                showToast(next ? t.soundMuted : t.soundUnmuted);
                return next;
              });
            }}
            title={soundMuted ? t.soundMuted : t.soundUnmuted}
          >
            {soundMuted ? <IconVolumeX size={18} /> : <IconVolume2 size={18} />}
          </button>

          {/* Telemetry / Ping stats */}
          <button
            type="button"
            className="millida-top-action-btn"
            onClick={() => {
              showToast("FPS: 60 • Пинг: 24 ms • Стабильно");
            }}
            title={t.telemetryStats || "Статистика"}
          >
            <IconActivity size={18} />
          </button>

          {/* Messages / Notifications */}
          <button
            type="button"
            className="millida-top-action-btn millida-btn-relative"
            onClick={() => setActiveTab("friends")}
            title={t.notifications || "Уведомления"}
          >
            <IconMessageSquare size={18} />
            <div className="millida-action-badge" aria-hidden="true">
              <span>3</span>
            </div>
          </button>

          {/* Protection / Antivirus +50 */}
          <button
            type="button"
            className="millida-top-action-btn millida-top-protect-btn"
            onClick={() => {
              showToast(
                "Omega Guard: Защита целостности активна (+50)",
                "success",
              );
            }}
            title={t.protectionStatus || "Защита активна (+50)"}
          >
            <IconBug size={17} />
            <span className="millida-protect-text">+50</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            className={`millida-top-action-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() =>
              setActiveTab(activeTab === "settings" ? "home" : "settings")
            }
            title={t.sidebarSettings || "Настройки"}
          >
            <IconSettings />
          </button>
        </div>
      </header>

      <main
        className={
          activeTab === "home"
            ? "main-content-home"
            : "main-content main-content-route"
        }
      >
        {activeTab === "home" && (
          <HomeView
            t={t}
            account={accountsApi.account}
            selectedInstance={instancesApi.selectedInstance}
            isRunning={game.isRunning}
            skinApi={skinApi}
            onPlay={playSelected}
            onStop={() => void game.stopGame()}
            onSelectVersion={() => setActiveTab("modpacks")}
            onOpenStore={() => setActiveTab("catalog")}
            onOpenFriends={() => setActiveTab("friends")}
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
            onDropMod={(instanceId, payload) =>
              void instancesApi.installModByDrag(instanceId, payload)
            }
            installProgress={instancesApi.installProgress}
          />
        )}

        {["mods", "resourcepacks", "shaders", "datapacks", "catalog"].includes(
          activeTab,
        ) && (
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
            <CatalogTabs
              t={t}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            {activeTab === "mods" && (
              <ModsPanel
                instances={instancesApi.instances}
                t={t}
                language={language}
                projectType="mod"
                versionsList={currentVersionsList}
              />
            )}
            {activeTab === "resourcepacks" && (
              <ModsPanel
                instances={instancesApi.instances}
                t={t}
                language={language}
                projectType="resourcepack"
                versionsList={currentVersionsList}
              />
            )}
            {activeTab === "shaders" && (
              <ModsPanel
                instances={instancesApi.instances}
                t={t}
                language={language}
                projectType="shader"
                versionsList={currentVersionsList}
              />
            )}
            {activeTab === "datapacks" && (
              <ModsPanel
                instances={instancesApi.instances}
                t={t}
                language={language}
                projectType="datapack"
                versionsList={currentVersionsList}
              />
            )}
            {activeTab === "catalog" && (
              <ModsPanel
                instances={instancesApi.instances}
                t={t}
                language={language}
                projectType="modpack"
                onCreateModpack={(name, mcVer, loader, iconUrl, projectId) => {
                  setActiveTab("home");
                  void instancesApi.createFromCatalog(
                    name,
                    mcVer,
                    loader,
                    iconUrl,
                    projectId,
                  );
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
            versionFilters={versionFilters}
            currentVersionsList={currentVersionsList}
            toggleVersionFilter={toggleVersionFilter}
            manifestError={manifestError}
            closeOnLaunch={closeOnLaunch}
            setCloseOnLaunch={(v) => {
              setCloseOnLaunch(v);
              setStoredCloseOnLaunch(v);
            }}
            fullscreenOnStart={fullscreenOnStart}
            setFullscreenOnStart={(v) => {
              setFullscreenOnStart(v);
              setStoredFullscreenOnStart(v);
            }}
            account={accountsApi.account}
            onOpenStore={() => setActiveTab("catalog")}
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
          onLogoutCurrentAccount={() =>
            void accountsApi.handleLogoutCurrentAccount()
          }
          onLogoutOmega={() => void omegaAuth.logout()}
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
          onImport={(kind, path) =>
            void instancesApi.importFromArchive(kind, path)
          }
          onClose={() => instancesApi.setImportModalOpen(false)}
        />
      )}

      {activeTab !== "home" && (
        <FloatingDock
          activeTab={activeTab}
          isHome={false}
          isRunning={game.isRunning}
          selectedVersionLabel={
            instancesApi.selectedInstance
              ? instancesApi.selectedInstance.mcVersion
              : "1.20.1"
          }
          onHome={() => setActiveTab("home")}
          onCatalog={() => setActiveTab("mods")}
          onModpacks={() => setActiveTab("modpacks")}
          onSettings={() => setActiveTab("settings")}
          onFriends={() => setActiveTab("friends")}
          onPlay={playSelected}
          onStop={() => void game.stopGame()}
          t={t}
        />
      )}

      <ImportProgressPopup
        t={t}
        visible={instancesApi.importing && !importPopupHidden}
        progress={instancesApi.installProgress}
        onClose={() => setImportPopupHidden(true)}
      />
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

function formatLastLaunch(
  iso: string | undefined,
  language: Language,
  t: any,
): string {
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
