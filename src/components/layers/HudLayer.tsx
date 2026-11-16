import React, { useState, useRef, useEffect } from "react";
import {
  IconVolume,
  IconGitHub,
} from "../icons/PixelIcons";
import {
  Play,
  Square,
  Package,
  Puzzle,
  Server,
  ShoppingBag,
  Terminal,
  Users,
  Settings,
  Zap,
  Swords,
  Crown,
  Check,
  ChevronRight,
  ChevronDown,
  User,
  Plus,
  Loader2,
} from "lucide-react";
import { SkinHeadAvatar } from "../common/SkinHeadAvatar";
import { InstanceAvatarIcon } from "../icons/MinecraftIcons";
import { useLanguage } from "../../context/LanguageContext";
import type { AccountData, ActiveModal, OmegaAccountState, InstanceData } from "../../types";
import {
  type TopBarItemId,
  DEFAULT_TOPBAR_LAYOUT,
} from "../../constants/launcherLayout";
import "../../design-system/pixelPlates.css";
import { rgbaString, computePanelTheme } from "../../utils/colorUtils";
import "../../styles/layer2-hud.css";

interface HudLayerProps {
  visible: boolean;
  account?: AccountData | null;
  accounts?: AccountData[];
  omegaAccount?: OmegaAccountState;
  onSelectAccount?: (acc: AccountData) => void;
  onOpenOmegaLogin?: () => void;
  onUnlinkOmega?: () => void;
  onLoginMicrosoft?: () => Promise<void> | void;
  onCreateOfflineAccount?: (name: string) => void;
  soundMuted: boolean;
  activeScreen: string;
  skinUrl?: string;
  onNavigate: (screen: string) => void;
  onToggleSound: () => void;
  onOpenModal?: (modal: ActiveModal) => void;
  selectedInstance?: InstanceData | null;
  instances?: InstanceData[];
  isRunning?: boolean;
  onTogglePlay?: () => void;
  onSelectInstanceById?: (id: string) => void;
  onDirectConnect?: (serverName: string, ip: string) => void;
  topBarLayout?: TopBarItemId[];
  topBarCustomization?: import("../../types/menuCustomization").ZoneCustomizationConfig;
}

export const HudLayer: React.FC<HudLayerProps> = React.memo(({
  visible,
  account,
  accounts = [],
  omegaAccount = { isLinked: false },
  onSelectAccount,
  onOpenOmegaLogin,
  onUnlinkOmega,
  onLoginMicrosoft,
  onCreateOfflineAccount,
  soundMuted,
  activeScreen,
  skinUrl = "/skins/dream.png",
  onNavigate,
  onToggleSound,
  selectedInstance,
  instances = [],
  isRunning = false,
  onTogglePlay,
  onSelectInstanceById,
  onDirectConnect,
  topBarLayout = DEFAULT_TOPBAR_LAYOUT,
  topBarCustomization,
}) => {
  const { t, lang } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingInMs, setIsLoggingInMs] = useState(false);
  const [isAddingOffline, setIsAddingOffline] = useState(false);
  const [offlineInput, setOfflineInput] = useState("");
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const dropdownRefTop = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsideTop = dropdownRefTop.current && dropdownRefTop.current.contains(target);
      if (!clickedInsideTop) {
        setIsDropdownOpen(false);
        setIsAddingOffline(false);
        setOfflineError(null);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const hasBaseAccount = !!account && (account.type === "microsoft" || account.type === "offline");

  const renderAccountDropdown = () => (
    <div className="hud-profile-dropdown panel align-left" onClick={(e) => e.stopPropagation()}>
      <div className="hud-acc-dropdown-header">
        <span className="title">{t("myAccounts", "МОЇ АКАУНТИ")}</span>
        <span className="hud-acc-count-badge">{accounts.length}</span>
      </div>

      <div className="hud-acc-list">
        {accounts.map((acc) => {
          const isSelected = acc.id === account?.id;
          const skin =
            acc.skinUrl ||
            (acc.name === "Steve_Official"
              ? "/skins/steve.png"
              : acc.name === "Alex_Gamer"
              ? "/skins/alex.png"
              : skinUrl);

          return (
            <button
              key={acc.id}
              type="button"
              className={`acc ${isSelected ? "sel" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectAccount?.(acc);
                setIsDropdownOpen(false);
                setIsAddingOffline(false);
              }}
            >
              <span className="ava">
                <SkinHeadAvatar skinUrl={skin} size={30} />
              </span>
              <span className="meta">
                <span className="name">{acc.name}</span>
                <span className="type">
                  {acc.type === "microsoft" ? (
                    <>
                      Microsoft
                      <svg className="ms" viewBox="0 0 12 12" aria-hidden="true" width={11} height={11}>
                        <rect x="0" y="0" width="5.5" height="5.5" rx="1.2" fill="#f25022" />
                        <rect x="6.5" y="0" width="5.5" height="5.5" rx="1.2" fill="#7fba00" />
                        <rect x="0" y="0" width="5.5" height="5.5" rx="1.2" fill="#00a4ef" />
                        <rect x="6.5" y="6.5" width="5.5" height="5.5" rx="1.2" fill="#ffb900" />
                      </svg>
                    </>
                  ) : (
                    t("offlineAccount", "Офлайн профіль")
                  )}
                </span>
              </span>
              {isSelected && (
                <svg className="check" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <div className="hud-acc-divider" />

      <div className="hud-acc-actions">
        <button
          type="button"
          disabled={isLoggingInMs}
          className="hud-acc-action-btn ms-btn"
          onClick={async (e) => {
            e.stopPropagation();
            if (!onLoginMicrosoft || isLoggingInMs) return;
            setIsLoggingInMs(true);
            try {
              await onLoginMicrosoft();
              setIsDropdownOpen(false);
            } finally {
              setIsLoggingInMs(false);
            }
          }}
        >
          {isLoggingInMs ? (
            <>
              <Loader2 size={14} className="hud-acc-spin" />
              <span>{lang === "uk" ? "Авторизація..." : lang === "ru" ? "Авторизация..." : "Authorizing..."}</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 12 12" width={13} height={13} aria-hidden="true" style={{ flexShrink: 0 }}>
                <rect x="0" y="0" width="5.5" height="5.5" rx="1.2" fill="#f25022" />
                <rect x="6.5" y="0" width="5.5" height="5.5" rx="1.2" fill="#7fba00" />
                <rect x="0" y="6.5" width="5.5" height="5.5" rx="1.2" fill="#00a4ef" />
                <rect x="6.5" y="6.5" width="5.5" height="5.5" rx="1.2" fill="#ffb900" />
              </svg>
              <span>{t("loginMicrosoftBtn", "Увійти через Microsoft")}</span>
            </>
          )}
        </button>

        {isAddingOffline ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const cleanNick = offlineInput.trim();
              if (!cleanNick) return;
              if (!/^[a-zA-Z0-9_]{3,16}$/.test(cleanNick)) {
                setOfflineError(lang === "uk" ? "Від 3 до 16 символів" : lang === "ru" ? "От 3 до 16 символов" : "3-16 characters");
                return;
              }
              onCreateOfflineAccount?.(cleanNick);
              setOfflineInput("");
              setOfflineError(null);
              setIsAddingOffline(false);
              setIsDropdownOpen(false);
            }}
            className="hud-acc-offline-form"
          >
            <div className="hud-acc-offline-row">
              <input
                type="text"
                autoFocus
                placeholder={t("enterNickname", "Введіть нікнейм...")}
                value={offlineInput}
                onChange={(e) => {
                  setOfflineInput(e.target.value);
                  if (offlineError) setOfflineError(null);
                }}
                className="hud-acc-offline-input"
                maxLength={16}
              />
              <button
                type="submit"
                className="hud-acc-offline-btn-submit"
                title={lang === "uk" ? "Додати профіль" : lang === "ru" ? "Добавить профиль" : "Add profile"}
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                className="hud-acc-offline-btn-cancel"
                onClick={() => {
                  setIsAddingOffline(false);
                  setOfflineError(null);
                }}
                title={t("cancel", "Скасувати")}
              >
                ✕
              </button>
            </div>
            {offlineError && <div className="hud-acc-offline-error">{offlineError}</div>}
          </form>
        ) : (
          <button
            type="button"
            className="hud-acc-action-btn offline-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddingOffline(true);
            }}
          >
            <User size={14} />
            <span>{t("addOfflineAccount", "Офлайн вхід")}</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderTopBarItem = (id: TopBarItemId) => {
    switch (id) {
      case "profile":
        return (
          <div className="hud-dock-profile-container" ref={dropdownRefTop} key="profile">
            <button
              type="button"
              className={`hud-dock-profile-btn ${isDropdownOpen ? "open" : ""}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-label={t("myAccounts", "МОЇ АКАУНТИ")}
            >
              <ChevronDown
                size={13}
                className={`hud-dock-profile-chevron ${isDropdownOpen ? "open" : ""}`}
              />
              <span className="hud-dock-profile-name">{account?.name ?? (lang === "uk" ? "Гість" : lang === "ru" ? "Гость" : "Guest")}</span>
              <div className="hud-dock-profile-avatar">
                <SkinHeadAvatar skinUrl={skinUrl} size={26} />
              </div>
              {!isDropdownOpen && <div className="hud-dock-tooltip">{t("sidebarAccounts", "Акаунти")}</div>}
            </button>
            {isDropdownOpen && renderAccountDropdown()}
          </div>
        );

      case "divider_profile":
        return <div className="hud-dock-divider-mini" key="divider_profile" />;

      case "play":
        return (
          <button
            key="play"
            type="button"
            className={`hud-dock-btn hud-dock-play ${isRunning ? "running" : ""} ${activeScreen === "home" ? "active" : ""}`}
            onClick={() => {
              if (activeScreen !== "home") {
                onNavigate("home");
              } else {
                onTogglePlay?.();
              }
            }}
            aria-label={isRunning ? t("stopBtn", "Зупинити") : t("playBtn", "Грати")}
          >
            {isRunning ? (
              <Square size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            <div className="hud-dock-tooltip">
              {isRunning
                ? t("stopBtn", "Зупинити")
                : activeScreen === "home"
                ? t("playBtn", "Грати")
                : t("sidebarHome", "Головна")}
            </div>
          </button>
        );

      case "settings":
        return (
          <button
            key="settings"
            type="button"
            className={`hud-dock-btn ${activeScreen === "settings" ? "active" : ""}`}
            onClick={() => onNavigate(activeScreen === "settings" ? "home" : "settings")}
            aria-label={t("dockSettings", "Налаштування")}
          >
            <Settings size={18} />
            <div className="hud-dock-tooltip">{t("dockSettings", "Налаштування")}</div>
          </button>
        );

      case "modrinth":
        return (
          <button
            key="modrinth"
            type="button"
            className={`hud-dock-btn ${activeScreen === "modrinth" ? "active" : ""}`}
            onClick={() => onNavigate(activeScreen === "modrinth" ? "home" : "modrinth")}
            aria-label={t("dockCatalog", "Каталог")}
          >
            <Puzzle size={18} />
            <div className="hud-dock-tooltip">{t("dockCatalog", "Каталог")}</div>
          </button>
        );

      case "instances":
        return (
          <button
            key="instances"
            type="button"
            className={`hud-dock-btn ${activeScreen === "instances" ? "active" : ""}`}
            onClick={() => onNavigate(activeScreen === "instances" ? "home" : "instances")}
            aria-label={t("dockPacks", "Версії")}
          >
            <Package size={18} />
            <div className="hud-dock-tooltip">{t("dockPacks", "Версії")}</div>
          </button>
        );

      case "servers":
        return (
          <button
            key="servers"
            type="button"
            className={`hud-dock-btn ${activeScreen === "servers" ? "active" : ""}`}
            onClick={() => onNavigate(activeScreen === "servers" ? "home" : "servers")}
            aria-label={t("serversTitle", "Сервери")}
          >
            <Server size={18} />
            <div className="hud-dock-tooltip">{t("serversTitle", "Сервери")}</div>
          </button>
        );

      case "store":
        return (
          <button
            key="store"
            type="button"
            className={`hud-dock-btn ${activeScreen === "store" ? "active" : ""}`}
            onClick={() => onNavigate(activeScreen === "store" ? "home" : "store")}
            aria-label={t("launcherStoreTitle", "Магазин")}
          >
            <ShoppingBag size={18} />
            <div className="hud-dock-tooltip">{t("launcherStoreTitle", "Магазин")}</div>
          </button>
        );

      case "console":
        return (
          <button
            key="console"
            type="button"
            className={`hud-dock-btn ${activeScreen === "console" ? "active" : ""}`}
            onClick={() => onNavigate(activeScreen === "console" ? "home" : "console")}
            aria-label={t("consoleTitle", "Консоль")}
          >
            <Terminal size={18} />
            <div className="hud-dock-tooltip">{t("consoleTitle", "Консоль")}</div>
          </button>
        );

      case "divider_shortcuts":
        return <div className="hud-dock-divider" key="divider_shortcuts" />;

      case "shortcuts":
        return (
          <div className="hud-dock-shortcuts" key="shortcuts">
            {(instances.length > 0 ? instances.slice(0, 4) : [
              { id: "inst_rust_beta", name: "Minecraft Rust (Beta)", icon: "obsidian" },
              { id: "inst_1", name: "test1", icon: "end_crystal" },
              { id: "inst_2", name: "Survival 1.20", icon: "diamond_pickaxe" },
              { id: "inst_3", name: "Omega PvP Pack", icon: "diamond_sword" },
            ]).map((inst) => {
              const isSelected = selectedInstance?.id === inst.id;
              return (
                <button
                  key={inst.id}
                  type="button"
                  className={`hud-dock-shortcut-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onSelectInstanceById?.(inst.id);
                    if (activeScreen !== "home") onNavigate("home");
                  }}
                  aria-label={inst.name}
                >
                  <div className={`hud-shortcut-badge ${inst.icon || "diamond_sword"}`}>
                    <InstanceAvatarIcon icon={inst.icon} size={22} />
                  </div>
                  <div className="hud-shortcut-tooltip">{inst.name}</div>
                </button>
              );
            })}
          </div>
        );

      case "divider_friends":
        return <div className="hud-dock-divider" key="divider_friends" />;

      case "friends":
        return (
          <button
            key="friends"
            type="button"
            className={`hud-dock-btn ${activeScreen === "friends" ? "active" : ""}`}
            onClick={() => onNavigate(activeScreen === "friends" ? "home" : "friends")}
            aria-label={t("friendsTitle", "Друзі")}
          >
            <Users size={18} />
            <span className="hud-dock-badge">2</span>
            <div className="hud-dock-tooltip">{t("friendsTitle", "Друзі")}</div>
          </button>
        );

      case "chevron":
        return (
          <button
            key="chevron"
            type="button"
            className="hud-dock-btn hud-dock-chevron"
            onClick={() => onNavigate(activeScreen === "settings" ? "home" : "settings")}
            aria-label={t("dockSettings", "Налаштування")}
          >
            <ChevronRight size={16} />
            <div className="hud-dock-tooltip">{t("dockSettings", "Налаштування")}</div>
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`layer-hud ${!visible ? "hidden" : ""}`}>
      <header className="hud-topbar">
        <nav
          className={`hud-top-dock ${topBarCustomization?.enabled ? "custom-theme-active" : ""}`}
          aria-label="Панель навигации"
          style={
            topBarCustomization?.enabled
              ? (() => {
                  const t = computePanelTheme(
                    topBarCustomization.color,
                    topBarCustomization.intensity,
                    topBarCustomization.patternIntensity,
                    topBarCustomization.mode
                  );
                  return {
                    backgroundColor: t.panelBg,
                    borderColor: t.panelBorder,
                    ["--custom-topbar-bg" as any]: t.panelBg,
                    ["--custom-topbar-border" as any]: t.panelBorder,
                    ["--custom-topbar-pattern" as any]: t.panelPattern,
                    ["--custom-topbar-pattern-size" as any]: t.panelPatternSize,
                    ["--custom-topbar-pattern-pos" as any]: t.panelPatternPosition,
                    ["--custom-topbar-pattern-opacity" as any]: t.panelPatternOpacity,
                    ["--custom-topbar-btn-bg" as any]: t.itemBg,
                    ["--custom-topbar-btn-border" as any]: t.itemBorder,
                    ["--custom-topbar-btn-hover" as any]: t.itemHover,
                    ["--custom-topbar-btn-active" as any]: t.itemActive,
                    ["--custom-topbar-btn-play" as any]: t.itemPlay,
                    ["--custom-topbar-btn-active-border" as any]: t.itemActiveBorder,
                    ["--custom-topbar-accent" as any]: t.accentColor,
                  };
                })()
              : undefined
          }
        >
          {(topBarLayout || DEFAULT_TOPBAR_LAYOUT).map((id) => renderTopBarItem(id))}
        </nav>
      </header>

      {activeScreen === "home" && (
        <aside className="hud-flank-left">
          <a
            href="https://github.com/ApRoGG224/Omega_launcher"
            target="_blank"
            rel="noopener noreferrer"
            className="hud-github-btn"
            title="GitHub — Omega Launcher"
            aria-label="GitHub репозиторий проекта Omega Launcher"
          >
            <IconGitHub size={22} />
            <div className="hud-dock-tooltip">GitHub</div>
          </a>
        </aside>
      )}

      {activeScreen === "home" && (
        <aside className="hud-flank-right">
          <div className="hud-side-controls">
            <button
              type="button"
              className={`hud-flank-btn ${soundMuted ? "muted" : ""}`}
              onClick={onToggleSound}
              title={soundMuted ? "Включить системные звуки" : "Отключить системные звуки"}
            >
              <IconVolume size={16} muted={soundMuted} />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
});
