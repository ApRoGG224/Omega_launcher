import React from "react";
import type { Language, VersionFilterState } from "../../types";
import { ipc } from "../../services/ipc";
import {
  IconCpu,
  IconDownload,
  IconFlask,
  IconFolder,
  IconHistory,
  IconLayers,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconTag,
  IconUsers,
} from "../../ui/icons";

export interface NeonTheme {
  id: string;
  name: string;
  nameRu?: string;
  accent: string;
  rgb: string;
  light: string;
  dark: string;
}

export interface BaseTheme {
  id: string;
  name: string;
  nameRu?: string;
  previewColor: string;
  launcherBg: string;
  sidebarBg: string;
  sectionBg: string;
  cardBg: string;
  cardBorder: string;
  frameBorder: string;
  frameBg: string;
  frameShadow: string;
}

export const NEON_THEMES: readonly NeonTheme[] = [
  {
    id: "omega",
    name: "Omega Violet",
    nameRu: "Омега Фиолетовый",
    accent: "#6344d4",
    rgb: "99, 68, 212",
    light: "#7c5edc",
    dark: "#4b31a8",
  },
  {
    id: "cyber",
    name: "Cyber Cyan",
    nameRu: "Кибер Голубой",
    accent: "#00d2ff",
    rgb: "0, 210, 255",
    light: "#38bdf8",
    dark: "#0284c7",
  },
  {
    id: "emerald",
    name: "Emerald Green",
    nameRu: "Изумрудно-зеленый",
    accent: "#10b981",
    rgb: "16, 185, 129",
    light: "#34d399",
    dark: "#059669",
  },
  {
    id: "crimson",
    name: "Crimson Neon",
    nameRu: "Малиновый Неон",
    accent: "#ff2a5f",
    rgb: "255, 42, 95",
    light: "#ff5983",
    dark: "#cc1846",
  },
] as const;

export const BASE_THEMES: readonly BaseTheme[] = [
  {
    id: "cappuccino",
    name: "Rosewater (Mocha)",
    nameRu: "Капучино",
    previewColor: "#f5e0dc",
    launcherBg: "#07080e",
    sidebarBg: "rgba(9, 10, 16, 0.97)",
    sectionBg: "rgba(11, 13, 20, 0.92)",
    cardBg: "rgba(14, 16, 26, 0.75)",
    cardBorder: "rgba(245, 224, 220, 0.15)",
    frameBorder: "1px solid rgba(245, 224, 220, 0.3)",
    frameBg:
      "radial-gradient(circle at center, rgba(245, 224, 220, 0.08) 0%, rgba(9, 10, 16, 0.98) 100%)",
    frameShadow: "inset 0 0 24px rgba(0, 0, 0, 0.85)",
  },
  {
    id: "lavender",
    name: "Lavender (Mocha)",
    nameRu: "Лаванда",
    previewColor: "#b4befe",
    launcherBg: "#07080e",
    sidebarBg: "rgba(9, 10, 16, 0.97)",
    sectionBg: "rgba(11, 13, 20, 0.92)",
    cardBg: "rgba(14, 16, 26, 0.75)",
    cardBorder: "rgba(180, 190, 254, 0.15)",
    frameBorder: "1px solid rgba(180, 190, 254, 0.3)",
    frameBg:
      "radial-gradient(circle at center, rgba(180, 190, 254, 0.08) 0%, rgba(9, 10, 16, 0.98) 100%)",
    frameShadow: "inset 0 0 24px rgba(0, 0, 0, 0.85)",
  },
  {
    id: "sapphire",
    name: "Sapphire (Mocha)",
    nameRu: "Сапфир",
    previewColor: "#74c7ec",
    launcherBg: "#07080e",
    sidebarBg: "rgba(9, 10, 16, 0.97)",
    sectionBg: "rgba(11, 13, 20, 0.92)",
    cardBg: "rgba(14, 16, 26, 0.75)",
    cardBorder: "rgba(116, 199, 236, 0.15)",
    frameBorder: "1px solid rgba(116, 199, 236, 0.3)",
    frameBg:
      "radial-gradient(circle at center, rgba(116, 199, 236, 0.08) 0%, rgba(9, 10, 16, 0.98) 100%)",
    frameShadow: "inset 0 0 24px rgba(0, 0, 0, 0.85)",
  },
  {
    id: "green",
    name: "Green (Mocha)",
    nameRu: "Мята",
    previewColor: "#a6e3a1",
    launcherBg: "#07080e",
    sidebarBg: "rgba(9, 10, 16, 0.97)",
    sectionBg: "rgba(11, 13, 20, 0.92)",
    cardBg: "rgba(14, 16, 26, 0.75)",
    cardBorder: "rgba(166, 227, 161, 0.15)",
    frameBorder: "1px solid rgba(166, 227, 161, 0.3)",
    frameBg:
      "radial-gradient(circle at center, rgba(166, 227, 161, 0.08) 0%, rgba(9, 10, 16, 0.98) 100%)",
    frameShadow: "inset 0 0 24px rgba(0, 0, 0, 0.85)",
  },
] as const;

export function applyNeonTheme(neonId: string) {
  const t = NEON_THEMES.find((th) => th.id === neonId) ?? NEON_THEMES[0];
  document.documentElement.style.setProperty("--accent-color", t.accent);
  document.documentElement.style.setProperty("--accent-color-rgb", t.rgb);
  document.documentElement.style.setProperty("--accent-color-light", t.light);
  document.documentElement.style.setProperty("--accent-color-dark", t.dark);
  document.documentElement.style.setProperty(
    "--accent-box-shadow",
    `0 0 16px rgba(${t.rgb}, 0.35)`,
  );
  localStorage.setItem("omega:neonTheme", t.id);
}

export function applyBaseTheme(baseId: string) {
  const b = BASE_THEMES.find((th) => th.id === baseId) ?? BASE_THEMES[0];
  document.documentElement.style.setProperty("--launcher-bg", b.launcherBg);
  document.documentElement.style.setProperty("--sidebar-bg", b.sidebarBg);
  document.documentElement.style.setProperty("--section-bg", b.sectionBg);
  document.documentElement.style.setProperty("--card-bg", b.cardBg);
  document.documentElement.style.setProperty("--card-border", b.cardBorder);
  document.documentElement.style.setProperty("--dock-bg", b.sidebarBg);
  document.documentElement.style.setProperty("--dock-border", b.cardBorder);
  document.documentElement.style.setProperty(
    "--theme-frame-border",
    b.frameBorder,
  );
  document.documentElement.style.setProperty("--theme-frame-bg", b.frameBg);
  document.documentElement.style.setProperty(
    "--theme-frame-shadow",
    b.frameShadow,
  );
  localStorage.setItem("omega:baseTheme", b.id);
}

export function applyLauncherTheme(themeId: string) {
  const neon = NEON_THEMES.find((t) => t.id === themeId);
  if (neon) {
    applyNeonTheme(neon.id);
    return;
  }
  const base = BASE_THEMES.find((b) => b.id === themeId);
  if (base) {
    applyBaseTheme(base.id);
    return;
  }
  applyNeonTheme("omega");
  applyBaseTheme("cappuccino");
}

const VERSION_FILTER_ITEMS = [
  {
    key: "release",
    icon: <IconTag />,
    labelKey: "versionRelease",
    descKey: "versionReleaseDesc",
  },
  {
    key: "snapshot",
    icon: <IconSparkles />,
    labelKey: "versionSnapshot",
    descKey: "versionSnapshotDesc",
  },
  {
    key: "old_beta",
    icon: <IconFlask />,
    labelKey: "versionBeta",
    descKey: "versionBetaDesc",
  },
  {
    key: "old_alpha",
    icon: <IconHistory />,
    labelKey: "versionAlpha",
    descKey: "versionAlphaDesc",
  },
] as const;

const RAM_MIN = 1;
const RAM_MAX = 16;
const RAM_MARKS = [1, 4, 8, 12, 16];

const SettingsSection = React.memo(
  ({
    id,
    icon,
    iconColor,
    title,
    description,
    aside,
    children,
  }: {
    id: string;
    icon: React.ReactNode;
    iconColor?: string;
    title: React.ReactNode;
    description: React.ReactNode;
    aside?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section id={id} className="settings-rewrite-section">
      <div className="settings-rewrite-section-head">
        <div
          className="settings-rewrite-section-icon"
          style={iconColor ? { color: iconColor } : undefined}
        >
          {icon}
        </div>
        <div className="settings-rewrite-section-copy">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {aside && <div className="settings-rewrite-section-aside">{aside}</div>}
      </div>
      <div className="settings-rewrite-section-content">{children}</div>
    </section>
  ),
);

type SettingsTab =
  "files" | "runtime" | "network" | "library" | "session";

const SETTINGS_TABS: Array<{
  id: SettingsTab;
  icon: React.ReactNode;
  labelKeyRu: string;
  labelKeyEn: string;
}> = [
  {
    id: "files",
    icon: <IconFolder />,
    labelKeyRu: "Пути игры",
    labelKeyEn: "Game paths",
  },
  {
    id: "runtime",
    icon: <IconCpu />,
    labelKeyRu: "Память и Java",
    labelKeyEn: "Memory & Java",
  },
  {
    id: "network",
    icon: <IconUsers />,
    labelKeyRu: "Сеть",
    labelKeyEn: "Network",
  },
  {
    id: "library",
    icon: <IconLayers />,
    labelKeyRu: "Версии и язык",
    labelKeyEn: "Versions & Language",
  },
  {
    id: "session",
    icon: <IconSettings />,
    labelKeyRu: "Запуск",
    labelKeyEn: "Launch behavior",
  },
];

export const SettingsPanel = React.memo(
  ({
    t,
    language,
    changeLanguage,
    exportPath,
    setExportPath,
    ram,
    setRam,
    sliderStyle,
    serverIp,
    setServerIp,
    javaPath,
    setJavaPath,
    gamePath,
    setGamePath,
    versionFilters,
    currentVersionsList,
    toggleVersionFilter,
    manifestError,
    closeOnLaunch,
    setCloseOnLaunch,
    fullscreenOnStart,
    setFullscreenOnStart,
    onOpenStore,
  }: {
    t: any;
    language: Language;
    changeLanguage: (lang: Language) => void;
    exportPath: string;
    setExportPath: (v: string) => void;
    ram: number;
    setRam: (v: number) => void;
    sliderStyle: React.CSSProperties;
    serverIp: string;
    setServerIp: (v: string) => void;
    javaPath: string;
    setJavaPath: (v: string) => void;
    gamePath: string;
    setGamePath: (v: string) => void;
    versionFilters: VersionFilterState;
    currentVersionsList: string[];
    toggleVersionFilter: (
      key: keyof VersionFilterState,
      checked: boolean,
    ) => void;
    manifestError: boolean;
    closeOnLaunch: boolean;
    setCloseOnLaunch: (v: boolean) => void;
    fullscreenOnStart: boolean;
    setFullscreenOnStart: (v: boolean) => void;
    onOpenStore: () => void;
  }) => {
    const [activeTab, setActiveTab] =
      React.useState<SettingsTab>("files");

    const [javaDetectMsg, setJavaDetectMsg] = React.useState<string | null>(
      null,
    );
    const isRussian = language === "ru";

    const detectJava = async () => {
      try {
        const found = await ipc.findSystemJava();
        if (found) {
          setJavaPath(found);
          setJavaDetectMsg(t.javaFound + found.replace(/\/home\/[^/]+/, "~"));
        } else {
          setJavaDetectMsg(t.javaNotFound);
        }
      } catch (e) {
        setJavaDetectMsg(t.javaDetectError + e);
      }
    };

    return (
      <div className="settings-panel settings-rewrite">
        <header className="settings-rewrite-header">
          <div className="settings-rewrite-heading">
            <div className="settings-rewrite-emblem" aria-hidden="true">
              <IconSettings />
            </div>
            <div>
              <h2>{t.sidebarSettings}</h2>
              <p>{t.settingsSubtitle}</p>
            </div>
          </div>
          <div className="settings-rewrite-status">
            <span className="settings-rewrite-status-dot" />
            <span>{isRussian ? "Локальный профиль" : "Local profile"}</span>
          </div>
        </header>

        <div className="settings-rewrite-layout">
          <aside
            className="settings-rewrite-sidebar"
            aria-label={isRussian ? "Разделы настроек" : "Settings sections"}
          >
            <nav className="settings-rewrite-nav">
              <span className="settings-rewrite-nav-label">
                {isRussian ? "Конфигурация" : "Configuration"}
              </span>
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`settings-rewrite-nav-button ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{isRussian ? tab.labelKeyRu : tab.labelKeyEn}</span>
                </button>
              ))}
            </nav>

            <div className="settings-rewrite-sidebar-summary">
              <span>{isRussian ? "Текущий профиль" : "Current profile"}</span>
              <div>
                <strong>
                  {ram}
                  <small> GB</small>
                </strong>
                <em>{t.ram}</em>
              </div>
              <div>
                <strong>{currentVersionsList.length}</strong>
                <em>{t.version}</em>
              </div>
              <div>
                <strong>{closeOnLaunch ? t.on : t.off}</strong>
                <em>{t.closeOnLaunch}</em>
              </div>
            </div>
          </aside>

          <main className="settings-rewrite-main">
            {activeTab === "files" && (
              <SettingsSection
                id="settings-files"
                icon={<IconFolder />}
                title={t.filePathsTitle}
                description={
                  isRussian
                    ? "Источники и каталоги, которые использует лаунчер"
                    : "Sources and directories used by the launcher"
                }
                aside={
                  <span className="settings-rewrite-section-tag">
                    {isRussian ? "ФАЙЛЫ" : "FILES"}
                  </span>
                }
              >
                <div className="settings-rewrite-fields">
                  <div className="settings-rewrite-field settings-rewrite-field-wide">
                    <label htmlFor="settings-export-path">
                      {t.settingsExportPath}
                    </label>
                    <div className="settings-rewrite-input">
                      <input
                        id="settings-export-path"
                        type="text"
                        value={exportPath}
                        onChange={(e) => setExportPath(e.target.value)}
                      />
                      <button
                        type="button"
                        title={t.openFolderShort}
                        aria-label={t.openFolderShort}
                        onClick={() => void ipc.openPath(exportPath)}
                      >
                        <IconFolder />
                      </button>
                    </div>
                  </div>
                  <div className="settings-rewrite-field">
                    <label htmlFor="settings-java-path">{t.javaLabel}</label>
                    <div className="settings-rewrite-input">
                      <input
                        id="settings-java-path"
                        type="text"
                        value={javaPath}
                        onChange={(e) => setJavaPath(e.target.value)}
                      />
                      <button
                        type="button"
                        title={t.javaAutoDetect}
                        aria-label={t.javaAutoDetect}
                        onClick={() => void detectJava()}
                      >
                        <IconSearch />
                      </button>
                      <button
                        type="button"
                        title={t.openFolderShort}
                        aria-label={t.openFolderShort}
                        onClick={() => void ipc.openPath(javaPath)}
                      >
                        <IconFolder />
                      </button>
                    </div>
                    {javaDetectMsg && (
                      <div
                        className="settings-rewrite-message"
                        aria-live="polite"
                      >
                        {javaDetectMsg}
                      </div>
                    )}
                  </div>
                  <div className="settings-rewrite-field">
                    <label htmlFor="settings-game-path">{t.gameFolder}</label>
                    <div className="settings-rewrite-input">
                      <input
                        id="settings-game-path"
                        type="text"
                        value={gamePath}
                        onChange={(e) => setGamePath(e.target.value)}
                      />
                      <button
                        type="button"
                        title={t.openFolderShort}
                        aria-label={t.openFolderShort}
                        onClick={() => void ipc.openPath(gamePath)}
                      >
                        <IconFolder />
                      </button>
                    </div>
                  </div>
                </div>
              </SettingsSection>
            )}

            {activeTab === "runtime" && (
              <SettingsSection
                id="settings-runtime"
                icon={<IconCpu />}
                iconColor="#9a8dff"
                title={t.ramSettingsTitle}
                description={
                  isRussian
                    ? "Сколько ресурсов выделять Java при запуске"
                    : "How much memory Java receives at launch"
                }
                aside={
                  <strong className="settings-rewrite-big-value">
                    {ram}
                    <small> GB</small>
                  </strong>
                }
              >
                <div className="settings-rewrite-runtime-row">
                  <div className="settings-rewrite-range-wrap">
                    <input
                      type="range"
                      min={RAM_MIN}
                      max={RAM_MAX}
                      value={ram}
                      onChange={(e) => setRam(parseInt(e.target.value))}
                      className="settings-rewrite-range"
                      style={sliderStyle}
                      aria-label={t.ramSettingsTitle}
                    />
                    <div className="settings-rewrite-range-labels">
                      {RAM_MARKS.map((mark) => (
                        <span
                          key={mark}
                          style={{
                            left: `${((mark - RAM_MIN) / (RAM_MAX - RAM_MIN)) * 100}%`,
                            transform:
                              mark === RAM_MIN
                                ? "translateX(0)"
                                : mark === RAM_MAX
                                  ? "translateX(-100%)"
                                  : "translateX(-50%)",
                          }}
                        >
                          {mark}G
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="settings-rewrite-runtime-note">
                    <span>{isRussian ? "Рекомендуется" : "Recommended"}</span>
                    <strong>4–8 GB</strong>
                  </div>
                </div>
              </SettingsSection>
            )}

            {activeTab === "network" && (
              <SettingsSection
                id="settings-network"
                icon={<IconUsers />}
                iconColor="#61d6b5"
                title={t.autoConnect}
                description={
                  isRussian
                    ? "Необязательный сервер для быстрого подключения"
                    : "Optional server for quick connection"
                }
                aside={
                  <span className="settings-rewrite-section-tag">
                    {isRussian ? "ОПЦИОНАЛЬНО" : "OPTIONAL"}
                  </span>
                }
              >
                <div className="settings-rewrite-inline-field">
                  <label htmlFor="settings-server-ip">{t.serverIpLabel}</label>
                  <input
                    id="settings-server-ip"
                    type="text"
                    placeholder="mc.hypixel.net"
                    value={serverIp}
                    onChange={(e) => setServerIp(e.target.value)}
                  />
                </div>
              </SettingsSection>
            )}

            {activeTab === "library" && (
              <SettingsSection
                id="settings-library"
                icon={<IconLayers />}
                title={t.settingsVersionTypes}
                description={
                  <>
                    {t.settingsShownVersions} {currentVersionsList.length}
                  </>
                }
                aside={
                  <span className="settings-rewrite-count">
                    {currentVersionsList.length}{" "}
                    {isRussian ? "доступно" : "available"}
                  </span>
                }
              >
                {manifestError && (
                  <div className="settings-rewrite-warning">
                    {t.settingsManifestError}
                  </div>
                )}
                <div className="settings-rewrite-version-list">
                  {VERSION_FILTER_ITEMS.map((item) => (
                    <label
                      key={item.key}
                      className={`settings-rewrite-version-row ${versionFilters[item.key] ? "active" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={versionFilters[item.key]}
                        onChange={(e) =>
                          toggleVersionFilter(item.key, e.target.checked)
                        }
                      />
                      <span className="settings-rewrite-version-icon">
                        {item.icon}
                      </span>
                      <span className="settings-rewrite-version-copy">
                        <strong>{t[item.labelKey]}</strong>
                        <small>{t[item.descKey]}</small>
                      </span>
                      <span
                        className="settings-rewrite-check"
                        aria-hidden="true"
                      />
                    </label>
                  ))}
                </div>
                <div className="settings-rewrite-language-row">
                  <div>
                    <strong>{t.languageTitle}</strong>
                    <span>
                      {isRussian
                        ? "Язык интерфейса лаунчера"
                        : "Launcher interface language"}
                    </span>
                  </div>
                  <div className="settings-rewrite-language-buttons">
                    <button
                      type="button"
                      className={language === "ru" ? "active" : ""}
                      onClick={() => changeLanguage("ru")}
                    >
                      <b>RU</b> Русский
                    </button>
                    <button
                      type="button"
                      className={language === "en" ? "active" : ""}
                      onClick={() => changeLanguage("en")}
                    >
                      <b>EN</b> English
                    </button>
                  </div>
                </div>
              </SettingsSection>
            )}

            {activeTab === "session" && (
              <SettingsSection
                id="settings-session"
                icon={<IconSettings />}
                iconColor="#ff9a70"
                title={t.closeOnLaunch}
                description={t.closeOnLaunchDesc}
                aside={
                  <span
                    className={`settings-rewrite-live-pill ${closeOnLaunch ? "enabled" : ""}`}
                  >
                    {closeOnLaunch ? t.on : t.off}
                  </span>
                }
              >
                <div className="settings-rewrite-session-row">
                  <div className="settings-rewrite-session-options">
                    <label className="settings-rewrite-switch-label">
                      <input
                        type="checkbox"
                        checked={closeOnLaunch}
                        onChange={(e) => setCloseOnLaunch(e.target.checked)}
                      />
                      <span
                        className="settings-rewrite-switch"
                        aria-hidden="true"
                      >
                        <span />
                      </span>
                      <span>
                        <strong>
                          {isRussian
                            ? "Закрывать после запуска"
                            : "Close after launch"}
                        </strong>
                        <small>
                          {isRussian
                            ? "Освободить место на экране после старта игры"
                            : "Clear the launcher from the screen after the game starts"}
                        </small>
                      </span>
                    </label>
                    <label className="settings-rewrite-switch-label">
                      <input
                        type="checkbox"
                        checked={fullscreenOnStart}
                        onChange={(e) => setFullscreenOnStart(e.target.checked)}
                      />
                      <span
                        className="settings-rewrite-switch"
                        aria-hidden="true"
                      >
                        <span />
                      </span>
                      <span>
                        <strong>{t.fullscreenOnStart}</strong>
                        <small>{t.fullscreenOnStartDesc}</small>
                      </span>
                    </label>
                  </div>
                  <button
                    className="settings-rewrite-store-button"
                    type="button"
                    onClick={onOpenStore}
                  >
                    <span>{t.launcherStoreButton}</span>
                    <IconDownload />
                  </button>
                </div>
              </SettingsSection>
            )}
          </main>
        </div>
      </div>
    );
  },
);
