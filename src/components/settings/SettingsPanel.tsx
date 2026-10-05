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
  IconPalette,
  IconSearch,
  IconSettings,
  IconShirt,
  IconSparkles,
  IconTag,
  IconUsers,
} from "../../ui/icons";

export const LAUNCHER_THEMES = [
  {
    id: "omega",
    name: "Omega Violet",
    accent: "#663af3",
    rgb: "102, 58, 243",
    light: "#8b5cf6",
    dark: "#4c2bd6",
  },
  {
    id: "cyber",
    name: "Cyber Cyan",
    accent: "#00d2ff",
    rgb: "0, 210, 255",
    light: "#38bdf8",
    dark: "#0284c7",
  },
  {
    id: "emerald",
    name: "Emerald Green",
    accent: "#10b981",
    rgb: "16, 185, 129",
    light: "#34d399",
    dark: "#059669",
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    accent: "#ff6b4a",
    rgb: "255, 107, 74",
    light: "#fb923c",
    dark: "#ea580c",
  },
  {
    id: "rose",
    name: "Rose Neon",
    accent: "#f43f5e",
    rgb: "244, 63, 94",
    light: "#fb7185",
    dark: "#e11d48",
  },
  {
    id: "gold",
    name: "Electric Gold",
    accent: "#f59e0b",
    rgb: "245, 158, 11",
    light: "#fbbf24",
    dark: "#d97706",
  },
] as const;

export function applyLauncherTheme(themeId: string) {
  const t =
    LAUNCHER_THEMES.find((th) => th.id === themeId) ?? LAUNCHER_THEMES[0];
  document.documentElement.style.setProperty("--accent-color", t.accent);
  document.documentElement.style.setProperty("--accent-color-rgb", t.rgb);
  document.documentElement.style.setProperty("--accent-color-light", t.light);
  document.documentElement.style.setProperty("--accent-color-dark", t.dark);
  localStorage.setItem("omega:theme", t.id);
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
  "customization" | "files" | "runtime" | "network" | "library" | "session";

const SETTINGS_TABS: Array<{
  id: SettingsTab;
  icon: React.ReactNode;
  labelKeyRu: string;
  labelKeyEn: string;
}> = [
  {
    id: "customization",
    icon: <IconPalette />,
    labelKeyRu: "Кастомизация",
    labelKeyEn: "Customization",
  },
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
      React.useState<SettingsTab>("customization");
    const [skinSource, setSkinSource] = React.useState<
      "ely" | "microsoft" | "custom"
    >(() => {
      return (localStorage.getItem("omega:skinSource") as any) || "ely";
    });
    const [skinModel, setSkinModel] = React.useState<"classic" | "slim">(() => {
      return (localStorage.getItem("omega:skinModel") as any) || "classic";
    });
    const [customSkinUrl, setCustomSkinUrl] = React.useState<string | null>(
      () => {
        return localStorage.getItem("omega:customSkin") || null;
      },
    );
    const [capeEnabled, setCapeEnabled] = React.useState<boolean>(() => {
      return localStorage.getItem("omega:capeEnabled") === "true";
    });
    const [customCapeUrl, setCustomCapeUrl] = React.useState<string | null>(
      () => {
        return localStorage.getItem("omega:customCape") || null;
      },
    );
    const [currentTheme, setCurrentTheme] = React.useState<string>(() => {
      return localStorage.getItem("omega:theme") || "omega";
    });

    React.useEffect(() => {
      const saved = localStorage.getItem("omega:theme") || "omega";
      applyLauncherTheme(saved);
    }, []);

    const handleSelectTheme = (themeId: string) => {
      setCurrentTheme(themeId);
      applyLauncherTheme(themeId);
    };

    const handleSkinUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCustomSkinUrl(dataUrl);
        setSkinSource("custom");
        localStorage.setItem("omega:customSkin", dataUrl);
        localStorage.setItem("omega:skinSource", "custom");
      };
      reader.readAsDataURL(file);
    };

    const handleCapeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCustomCapeUrl(dataUrl);
        setCapeEnabled(true);
        localStorage.setItem("omega:customCape", dataUrl);
        localStorage.setItem("omega:capeEnabled", "true");
      };
      reader.readAsDataURL(file);
    };

    const handleResetSkin = () => {
      setCustomSkinUrl(null);
      setSkinSource("ely");
      localStorage.removeItem("omega:customSkin");
      localStorage.setItem("omega:skinSource", "ely");
    };

    const handleResetCape = () => {
      setCustomCapeUrl(null);
      setCapeEnabled(false);
      localStorage.removeItem("omega:customCape");
      localStorage.setItem("omega:capeEnabled", "false");
    };

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
            {activeTab === "customization" && (
              <SettingsSection
                id="settings-customization"
                icon={<IconPalette />}
                iconColor="#b388ff"
                title={isRussian ? "Кастомизация" : "Customization"}
                description={
                  isRussian
                    ? "Управление скинами, плащами и цветовой темой лаунчера"
                    : "Manage player skins, capes and launcher color theme"
                }
                aside={
                  <span className="settings-rewrite-section-tag">STYLE</span>
                }
              >
                <div className="settings-custom-grid">
                  <div className="settings-custom-card">
                    <div className="settings-custom-card-title">
                      <IconShirt />
                      <span>
                        {isRussian
                          ? "Гардероб (Скин и Плащ)"
                          : "Wardrobe (Skin & Cape)"}
                      </span>
                    </div>

                    <div className="settings-custom-controls">
                      <div className="settings-custom-row">
                        <label>
                          {isRussian ? "Сервис скина" : "Skin service"}
                        </label>
                        <div className="settings-custom-pill-group">
                          <button
                            type="button"
                            className={skinSource === "ely" ? "active" : ""}
                            onClick={() => {
                              setSkinSource("ely");
                              localStorage.setItem("omega:skinSource", "ely");
                            }}
                          >
                            Ely.by
                          </button>
                          <button
                            type="button"
                            className={
                              skinSource === "microsoft" ? "active" : ""
                            }
                            onClick={() => {
                              setSkinSource("microsoft");
                              localStorage.setItem(
                                "omega:skinSource",
                                "microsoft",
                              );
                            }}
                          >
                            Microsoft
                          </button>
                          <button
                            type="button"
                            className={skinSource === "custom" ? "active" : ""}
                            onClick={() => {
                              setSkinSource("custom");
                              localStorage.setItem(
                                "omega:skinSource",
                                "custom",
                              );
                            }}
                          >
                            {isRussian ? "Свой PNG" : "Custom"}
                          </button>
                        </div>
                      </div>

                      <div className="settings-custom-row">
                        <label>{isRussian ? "Модель" : "Model"}</label>
                        <div className="settings-custom-pill-group">
                          <button
                            type="button"
                            className={skinModel === "classic" ? "active" : ""}
                            onClick={() => {
                              setSkinModel("classic");
                              localStorage.setItem(
                                "omega:skinModel",
                                "classic",
                              );
                            }}
                          >
                            Steve (4px)
                          </button>
                          <button
                            type="button"
                            className={skinModel === "slim" ? "active" : ""}
                            onClick={() => {
                              setSkinModel("slim");
                              localStorage.setItem("omega:skinModel", "slim");
                            }}
                          >
                            Alex (3px)
                          </button>
                        </div>
                      </div>

                      <div className="settings-custom-actions">
                        <label className="settings-custom-upload-btn">
                          <input
                            type="file"
                            accept="image/png"
                            onChange={handleSkinUpload}
                            style={{ display: "none" }}
                          />
                          <span>
                            {isRussian
                              ? "Загрузить скин (.png)"
                              : "Upload skin (.png)"}
                          </span>
                        </label>
                        <label className="settings-custom-upload-btn">
                          <input
                            type="file"
                            accept="image/png"
                            onChange={handleCapeUpload}
                            style={{ display: "none" }}
                          />
                          <span>
                            {isRussian
                              ? "Загрузить плащ (.png)"
                              : "Upload cape (.png)"}
                          </span>
                        </label>
                        <label
                          className="settings-rewrite-switch-label"
                          style={{ minHeight: "auto", margin: 0 }}
                        >
                          <input
                            type="checkbox"
                            checked={capeEnabled}
                            onChange={(e) => {
                              setCapeEnabled(e.target.checked);
                              localStorage.setItem(
                                "omega:capeEnabled",
                                String(e.target.checked),
                              );
                            }}
                          />
                          <span
                            className="settings-rewrite-switch"
                            aria-hidden="true"
                          >
                            <span />
                          </span>
                          <span>
                            <strong>
                              {isRussian ? "Плащ включён" : "Cape enabled"}
                            </strong>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="settings-custom-preview-card">
                    <div className="settings-custom-avatar-wrapper">
                      {customSkinUrl ? (
                        <img
                          src={customSkinUrl}
                          alt="Skin preview"
                          className="settings-custom-skin-img"
                        />
                      ) : (
                        <div className="settings-custom-avatar-placeholder">
                          <IconShirt />
                        </div>
                      )}
                      {capeEnabled && (
                        <span className="settings-custom-cape-badge">
                          {isRussian ? "ПЛАЩ" : "CAPE"}
                        </span>
                      )}
                    </div>
                    <div className="settings-custom-preview-meta">
                      <strong>
                        {skinSource === "custom"
                          ? isRussian
                            ? "Пользовательский файл"
                            : "Custom file"
                          : skinSource === "ely"
                            ? "Ely.by Skin"
                            : "Microsoft Skin"}
                      </strong>
                      <small>
                        {skinModel === "classic"
                          ? "Classic Steve"
                          : "Slim Alex"}
                      </small>
                    </div>
                    {(customSkinUrl || customCapeUrl) && (
                      <button
                        type="button"
                        className="settings-custom-reset-btn"
                        onClick={() => {
                          handleResetSkin();
                          handleResetCape();
                        }}
                      >
                        {isRussian
                          ? "Сбросить на стандартный"
                          : "Reset to default"}
                      </button>
                    )}
                  </div>

                  <div className="settings-custom-card settings-custom-card-wide">
                    <div className="settings-custom-card-title">
                      <IconPalette />
                      <span>
                        {isRussian
                          ? "Цветовая тема лаунчера"
                          : "Launcher Color Theme"}
                      </span>
                    </div>
                    <div className="settings-theme-palette">
                      {LAUNCHER_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          className={`settings-theme-chip ${currentTheme === theme.id ? "active" : ""}`}
                          onClick={() => handleSelectTheme(theme.id)}
                        >
                          <span
                            className="settings-theme-dot"
                            style={{
                              backgroundColor: theme.accent,
                              boxShadow: `0 0 10px ${theme.accent}`,
                            }}
                          />
                          <span className="settings-theme-name">
                            {theme.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SettingsSection>
            )}

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
                  <span className="settings-rewrite-section-tag">FILES</span>
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
                  <span className="settings-rewrite-section-tag">OPTIONAL</span>
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
