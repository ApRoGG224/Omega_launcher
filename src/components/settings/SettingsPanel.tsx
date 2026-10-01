import React from "react";
import type { Language, VersionFilterState } from "../../types";
import { ipc } from "../../services/ipc";
import {
  IconBox,
  IconCpu,
  IconDownload,
  IconFolder,
  IconSearch,
  IconSettings,
  IconUsers,
} from "../../ui/icons";

const VERSION_FILTER_ITEMS = [
  { key: "release", icon: <IconBox />, labelKey: "versionRelease", descKey: "versionReleaseDesc" },
  { key: "snapshot", icon: <IconCpu />, labelKey: "versionSnapshot", descKey: "versionSnapshotDesc" },
  { key: "old_beta", icon: <IconSettings />, labelKey: "versionBeta", descKey: "versionBetaDesc" },
  { key: "old_alpha", icon: <IconFolder />, labelKey: "versionAlpha", descKey: "versionAlphaDesc" },
] as const;

const SettingsZone = React.memo(({
  icon,
  iconColor,
  title,
  description,
  className,
  children,
}: {
  icon: React.ReactNode;
  iconColor?: string;
  title: React.ReactNode;
  description: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <section className={`settings-zone${className ? ` ${className}` : ""}`}>
    <div className="settings-zone-header">
      <div className="settings-zone-icon" style={iconColor ? { color: iconColor } : undefined}>{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
    <div className="settings-zone-body">{children}</div>
  </section>
));

export const SettingsPanel = React.memo(({
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
  toggleVersionFilter: (key: keyof VersionFilterState, checked: boolean) => void;
  manifestError: boolean;
  closeOnLaunch: boolean;
  setCloseOnLaunch: (v: boolean) => void;
  onOpenStore: () => void;
}) => {
  const [javaDetectMsg, setJavaDetectMsg] = React.useState<string | null>(null);

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
    <div className="settings-panel settings-control-center">
      <header className="settings-hero">
        <div className="settings-hero-copy">
          <div className="settings-hero-mark" aria-hidden="true"><IconSettings /></div>
          <div>
            <h2>{t.sidebarSettings}</h2>
            <p>{t.settingsSubtitle}</p>
          </div>
        </div>
        <div className="settings-hero-state">
          <span className="settings-state-dot" />
          <span>{language === "ru" ? "Локальный профиль" : "Local profile"}</span>
        </div>
      </header>

      <div className="settings-control-layout">
        <aside className="settings-profile-rail" aria-label={language === "ru" ? "Сводка профиля" : "Profile summary"}>
          <div className="settings-profile-badge"><IconBox /></div>
          <div className="settings-profile-title">Omega Launcher</div>
          <p className="settings-profile-copy">
            {language === "ru" ? "Профиль запуска Minecraft" : "Minecraft launch profile"}
          </p>

          <div className="settings-profile-stats">
            <div className="settings-profile-stat">
              <strong>{ram}<small> GB</small></strong>
              <span>{t.ram}</span>
            </div>
            <div className="settings-profile-stat">
              <strong>{currentVersionsList.length}</strong>
              <span>{t.version}</span>
            </div>
            <div className="settings-profile-stat">
              <strong>{closeOnLaunch ? t.on : t.off}</strong>
              <span>{t.closeOnLaunch}</span>
            </div>
          </div>

          <div className="settings-profile-divider" />
          <div className="settings-profile-note">
            <span className="settings-note-dot" />
            <span>{language === "ru" ? "Изменения применяются сразу" : "Changes apply instantly"}</span>
          </div>
        </aside>

        <main className="settings-control-content">
          <SettingsZone
            icon={<IconFolder />}
            title={t.filePathsTitle}
            description={language === "ru" ? "Где лаунчер хранит и запускает игру" : "Where the launcher stores and starts the game"}
            className="settings-zone-paths"
          >
            <div className="settings-field-grid">
              <div className="settings-field settings-field-wide">
                <label htmlFor="settings-export-path">{t.settingsExportPath}</label>
                <div className="settings-input-shell">
                  <input id="settings-export-path" type="text" value={exportPath} onChange={(e) => setExportPath(e.target.value)} />
                  <button className="settings-input-action" type="button" title={t.openFolderShort} aria-label={t.openFolderShort} onClick={() => void ipc.openPath(exportPath)}>
                    <IconFolder />
                  </button>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="settings-java-path">{t.javaLabel}</label>
                <div className="settings-input-shell">
                  <input id="settings-java-path" type="text" value={javaPath} onChange={(e) => setJavaPath(e.target.value)} />
                  <button className="settings-input-action" type="button" title={t.javaAutoDetect} aria-label={t.javaAutoDetect} onClick={() => void detectJava()}>
                    <IconSearch />
                  </button>
                  <button className="settings-input-action" type="button" title={t.openFolderShort} aria-label={t.openFolderShort} onClick={() => void ipc.openPath(javaPath)}>
                    <IconFolder />
                  </button>
                </div>
                {javaDetectMsg && <div className="settings-inline-message" aria-live="polite">{javaDetectMsg}</div>}
              </div>

              <div className="settings-field">
                <label htmlFor="settings-game-path">{t.gameFolder}</label>
                <div className="settings-input-shell">
                  <input id="settings-game-path" type="text" value={gamePath} onChange={(e) => setGamePath(e.target.value)} />
                  <button className="settings-input-action" type="button" title={t.openFolderShort} aria-label={t.openFolderShort} onClick={() => void ipc.openPath(gamePath)}>
                    <IconFolder />
                  </button>
                </div>
              </div>
            </div>
          </SettingsZone>

          <div className="settings-zone-pair">
            <SettingsZone
              icon={<IconCpu />}
              iconColor="#8d7cff"
              title={t.ramSettingsTitle}
              description={t.ramSettingsDesc}
              className="settings-zone-memory"
            >
              <div className="settings-memory-readout"><strong>{ram}</strong><span>GB allocated</span></div>
              <input type="range" min="1" max="16" value={ram} onChange={(e) => setRam(parseInt(e.target.value))} className="settings-range" style={sliderStyle} aria-label={t.ramSettingsTitle} />
              <div className="settings-range-scale"><span>1G</span><span>4G</span><span>8G</span><span>12G</span><span>16G</span></div>
            </SettingsZone>

            <SettingsZone
              icon={<IconUsers />}
              iconColor="#5fd0b2"
              title={t.autoConnect}
              description={language === "ru" ? "Сервер для быстрого подключения" : "Server for quick connection"}
              className="settings-zone-network"
            >
              <div className="settings-field">
                <label htmlFor="settings-server-ip">{t.serverIpLabel}</label>
                <input id="settings-server-ip" type="text" className="settings-plain-input" placeholder="mc.hypixel.net" value={serverIp} onChange={(e) => setServerIp(e.target.value)} />
              </div>
              <div className="settings-field-hint">{language === "ru" ? "Оставьте пустым для обычного запуска" : "Leave empty for a normal launch"}</div>
            </SettingsZone>
          </div>

          <SettingsZone
            icon={<IconBox />}
            title={t.settingsVersionTypes}
            description={<>{t.settingsShownVersions} {currentVersionsList.length}</>}
            className="settings-zone-library"
          >
            {manifestError && <div className="settings-warning">{t.settingsManifestError}</div>}
            <div className="settings-version-options">
              {VERSION_FILTER_ITEMS.map((item) => (
                <label key={item.key} className={`settings-version-option ${versionFilters[item.key] ? "active" : ""}`}>
                  <input type="checkbox" checked={versionFilters[item.key]} onChange={(e) => toggleVersionFilter(item.key, e.target.checked)} />
                  <span className="settings-version-option-icon">{item.icon}</span>
                  <span className="settings-version-option-copy">
                    <strong>{t[item.labelKey]}</strong>
                    <small>{t[item.descKey]}</small>
                  </span>
                  <span className="settings-checkmark" aria-hidden="true" />
                </label>
              ))}
            </div>
            <div className="settings-language-control">
              <span>{t.languageTitle}</span>
              <div className="settings-language-options">
                <button type="button" className={language === "ru" ? "active" : ""} onClick={() => changeLanguage("ru")}><span>RU</span> Русский</button>
                <button type="button" className={language === "en" ? "active" : ""} onClick={() => changeLanguage("en")}><span>EN</span> English</button>
              </div>
            </div>
          </SettingsZone>

          <div className="settings-zone-pair settings-zone-pair-last">
            <SettingsZone
              icon={<IconSettings />}
              iconColor="#ff9a70"
              title={t.closeOnLaunch}
              description={t.closeOnLaunchDesc}
              className="settings-zone-session"
            >
              <label className="settings-switch-row">
                <input type="checkbox" checked={closeOnLaunch} onChange={(e) => setCloseOnLaunch(e.target.checked)} />
                <span className="settings-switch" aria-hidden="true"><span /></span>
                <span className="settings-switch-copy"><strong>{closeOnLaunch ? t.on : t.off}</strong><small>{language === "ru" ? "Закрывать лаунчер после запуска" : "Close launcher after starting"}</small></span>
              </label>
            </SettingsZone>

            <SettingsZone
              icon={<IconDownload />}
              iconColor="#f0b76a"
              title={t.launcherStoreTitle}
              description={t.launcherStoreDesc}
              className="settings-zone-store"
            >
              <button className="settings-store-cta" type="button" onClick={onOpenStore}>
                <span>{t.launcherStoreButton}</span>
                <IconDownload />
              </button>
            </SettingsZone>
          </div>
        </main>
      </div>
    </div>
  );
});
