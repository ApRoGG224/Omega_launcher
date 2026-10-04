import React from "react";
import type { Account, Language, VersionFilterState } from "../../types";
import { ipc } from "../../services/ipc";
import { SkinSection } from "./SkinSection";
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

const VERSION_FILTER_ITEMS = [
  { key: "release", icon: <IconTag />, labelKey: "versionRelease", descKey: "versionReleaseDesc" },
  { key: "snapshot", icon: <IconSparkles />, labelKey: "versionSnapshot", descKey: "versionSnapshotDesc" },
  { key: "old_beta", icon: <IconFlask />, labelKey: "versionBeta", descKey: "versionBetaDesc" },
  { key: "old_alpha", icon: <IconHistory />, labelKey: "versionAlpha", descKey: "versionAlphaDesc" },
] as const;

const RAM_MIN = 1;
const RAM_MAX = 16;
const RAM_MARKS = [1, 4, 8, 12, 16];

const SettingsSection = React.memo(({
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
      <div className="settings-rewrite-section-icon" style={iconColor ? { color: iconColor } : undefined}>{icon}</div>
      <div className="settings-rewrite-section-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {aside && <div className="settings-rewrite-section-aside">{aside}</div>}
    </div>
    <div className="settings-rewrite-section-content">{children}</div>
  </section>
));

export const SettingsPanel = React.memo(({
  t,
  account,
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
  account: Account;
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
  toggleVersionFilter: (key: keyof VersionFilterState, checked: boolean) => void;
  manifestError: boolean;
  closeOnLaunch: boolean;
  setCloseOnLaunch: (v: boolean) => void;
  fullscreenOnStart: boolean;
  setFullscreenOnStart: (v: boolean) => void;
  onOpenStore: () => void;
}) => {
  const [javaDetectMsg, setJavaDetectMsg] = React.useState<string | null>(null);
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
          <div className="settings-rewrite-emblem" aria-hidden="true"><IconSettings /></div>
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
        <aside className="settings-rewrite-sidebar" aria-label={isRussian ? "Разделы настроек" : "Settings sections"}>
          <nav className="settings-rewrite-nav">
            <span className="settings-rewrite-nav-label">{isRussian ? "Конфигурация" : "Configuration"}</span>
            <a href="#settings-skin"><IconUsers /><span>{isRussian ? "Скин" : "Skin"}</span></a>
            <a href="#settings-files"><IconFolder /><span>{isRussian ? "Пути игры" : "Game paths"}</span></a>
            <a href="#settings-runtime"><IconCpu /><span>{isRussian ? "Производительность" : "Performance"}</span></a>
            <a href="#settings-library"><IconLayers /><span>{isRussian ? "Библиотека версий" : "Version library"}</span></a>
            <a href="#settings-session"><IconSettings /><span>{isRussian ? "Поведение запуска" : "Launch behavior"}</span></a>
          </nav>

          <div className="settings-rewrite-sidebar-summary">
            <span>{isRussian ? "Текущий профиль" : "Current profile"}</span>
            <div><strong>{ram}<small> GB</small></strong><em>{t.ram}</em></div>
            <div><strong>{currentVersionsList.length}</strong><em>{t.version}</em></div>
            <div><strong>{closeOnLaunch ? t.on : t.off}</strong><em>{t.closeOnLaunch}</em></div>
          </div>
        </aside>

        <main className="settings-rewrite-main">
          <SettingsSection
            id="settings-skin"
            icon={<IconUsers />}
            iconColor="#61d6b5"
            title={isRussian ? "Скин персонажа" : "Character skin"}
            description={isRussian ? "Просмотр и источник скина для текущего аккаунта" : "Preview and skin source for the current account"}
            aside={<span className="settings-rewrite-section-tag">{account.type === "microsoft" ? "MICROSOFT" : "ELY.BY"}</span>}
          >
            <SkinSection account={account} language={language} />
          </SettingsSection>

          <SettingsSection
            id="settings-files"
            icon={<IconFolder />}
            title={t.filePathsTitle}
            description={isRussian ? "Источники и каталоги, которые использует лаунчер" : "Sources and directories used by the launcher"}
            aside={<span className="settings-rewrite-section-tag">FILES</span>}
          >
            <div className="settings-rewrite-fields">
              <div className="settings-rewrite-field settings-rewrite-field-wide">
                <label htmlFor="settings-export-path">{t.settingsExportPath}</label>
                <div className="settings-rewrite-input">
                  <input id="settings-export-path" type="text" value={exportPath} onChange={(e) => setExportPath(e.target.value)} />
                  <button type="button" title={t.openFolderShort} aria-label={t.openFolderShort} onClick={() => void ipc.openPath(exportPath)}><IconFolder /></button>
                </div>
              </div>
              <div className="settings-rewrite-field">
                <label htmlFor="settings-java-path">{t.javaLabel}</label>
                <div className="settings-rewrite-input">
                  <input id="settings-java-path" type="text" value={javaPath} onChange={(e) => setJavaPath(e.target.value)} />
                  <button type="button" title={t.javaAutoDetect} aria-label={t.javaAutoDetect} onClick={() => void detectJava()}><IconSearch /></button>
                  <button type="button" title={t.openFolderShort} aria-label={t.openFolderShort} onClick={() => void ipc.openPath(javaPath)}><IconFolder /></button>
                </div>
                {javaDetectMsg && <div className="settings-rewrite-message" aria-live="polite">{javaDetectMsg}</div>}
              </div>
              <div className="settings-rewrite-field">
                <label htmlFor="settings-game-path">{t.gameFolder}</label>
                <div className="settings-rewrite-input">
                  <input id="settings-game-path" type="text" value={gamePath} onChange={(e) => setGamePath(e.target.value)} />
                  <button type="button" title={t.openFolderShort} aria-label={t.openFolderShort} onClick={() => void ipc.openPath(gamePath)}><IconFolder /></button>
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="settings-runtime"
            icon={<IconCpu />}
            iconColor="#9a8dff"
            title={t.ramSettingsTitle}
            description={isRussian ? "Сколько ресурсов выделять Java при запуске" : "How much memory Java receives at launch"}
            aside={<strong className="settings-rewrite-big-value">{ram}<small> GB</small></strong>}
          >
            <div className="settings-rewrite-runtime-row">
              <div className="settings-rewrite-range-wrap">
                <input type="range" min={RAM_MIN} max={RAM_MAX} value={ram} onChange={(e) => setRam(parseInt(e.target.value))} className="settings-rewrite-range" style={sliderStyle} aria-label={t.ramSettingsTitle} />
                <div className="settings-rewrite-range-labels">
                  {RAM_MARKS.map((mark) => (
                    <span
                      key={mark}
                      style={{
                        left: `${((mark - RAM_MIN) / (RAM_MAX - RAM_MIN)) * 100}%`,
                        transform: mark === RAM_MIN ? "translateX(0)" : mark === RAM_MAX ? "translateX(-100%)" : "translateX(-50%)",
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

          <SettingsSection
            id="settings-network"
            icon={<IconUsers />}
            iconColor="#61d6b5"
            title={t.autoConnect}
            description={isRussian ? "Необязательный сервер для быстрого подключения" : "Optional server for quick connection"}
            aside={<span className="settings-rewrite-section-tag">OPTIONAL</span>}
          >
            <div className="settings-rewrite-inline-field">
              <label htmlFor="settings-server-ip">{t.serverIpLabel}</label>
              <input id="settings-server-ip" type="text" placeholder="mc.hypixel.net" value={serverIp} onChange={(e) => setServerIp(e.target.value)} />
            </div>
          </SettingsSection>

          <SettingsSection
            id="settings-library"
            icon={<IconLayers />}
            title={t.settingsVersionTypes}
            description={<>{t.settingsShownVersions} {currentVersionsList.length}</>}
            aside={<span className="settings-rewrite-count">{currentVersionsList.length} {isRussian ? "доступно" : "available"}</span>}
          >
            {manifestError && <div className="settings-rewrite-warning">{t.settingsManifestError}</div>}
            <div className="settings-rewrite-version-list">
              {VERSION_FILTER_ITEMS.map((item) => (
                <label key={item.key} className={`settings-rewrite-version-row ${versionFilters[item.key] ? "active" : ""}`}>
                  <input type="checkbox" checked={versionFilters[item.key]} onChange={(e) => toggleVersionFilter(item.key, e.target.checked)} />
                  <span className="settings-rewrite-version-icon">{item.icon}</span>
                  <span className="settings-rewrite-version-copy"><strong>{t[item.labelKey]}</strong><small>{t[item.descKey]}</small></span>
                  <span className="settings-rewrite-check" aria-hidden="true" />
                </label>
              ))}
            </div>
            <div className="settings-rewrite-language-row">
              <div><strong>{t.languageTitle}</strong><span>{isRussian ? "Язык интерфейса лаунчера" : "Launcher interface language"}</span></div>
              <div className="settings-rewrite-language-buttons">
                <button type="button" className={language === "ru" ? "active" : ""} onClick={() => changeLanguage("ru")}><b>RU</b> Русский</button>
                <button type="button" className={language === "en" ? "active" : ""} onClick={() => changeLanguage("en")}><b>EN</b> English</button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="settings-session"
            icon={<IconSettings />}
            iconColor="#ff9a70"
            title={t.closeOnLaunch}
            description={t.closeOnLaunchDesc}
            aside={<span className={`settings-rewrite-live-pill ${closeOnLaunch ? "enabled" : ""}`}>{closeOnLaunch ? t.on : t.off}</span>}
          >
            <div className="settings-rewrite-session-row">
              <div className="settings-rewrite-session-options">
                <label className="settings-rewrite-switch-label">
                  <input type="checkbox" checked={closeOnLaunch} onChange={(e) => setCloseOnLaunch(e.target.checked)} />
                  <span className="settings-rewrite-switch" aria-hidden="true"><span /></span>
                  <span><strong>{isRussian ? "Закрывать после запуска" : "Close after launch"}</strong><small>{isRussian ? "Освободить место на экране после старта игры" : "Clear the launcher from the screen after the game starts"}</small></span>
                </label>
                <label className="settings-rewrite-switch-label">
                  <input type="checkbox" checked={fullscreenOnStart} onChange={(e) => setFullscreenOnStart(e.target.checked)} />
                  <span className="settings-rewrite-switch" aria-hidden="true"><span /></span>
                  <span><strong>{t.fullscreenOnStart}</strong><small>{t.fullscreenOnStartDesc}</small></span>
                </label>
              </div>
              <button className="settings-rewrite-store-button" type="button" onClick={onOpenStore}><span>{t.launcherStoreButton}</span><IconDownload /></button>
            </div>
          </SettingsSection>
        </main>
      </div>
    </div>
  );
});
