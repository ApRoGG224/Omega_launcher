import React from "react";
import type { Language, VersionFilterState } from "../../types";
import { ipc } from "../../services/ipc";
import { IconBox, IconCpu, IconDownload, IconFolder, IconSearch, IconSettings, IconUsers } from "../../ui/icons";

const VERSION_FILTER_ITEMS = [
  { key: "release", icon: <IconBox />, labelKey: "versionRelease", descKey: "versionReleaseDesc" },
  { key: "snapshot", icon: <IconCpu />, labelKey: "versionSnapshot", descKey: "versionSnapshotDesc" },
  { key: "old_beta", icon: <IconSettings />, labelKey: "versionBeta", descKey: "versionBetaDesc" },
  { key: "old_alpha", icon: <IconFolder />, labelKey: "versionAlpha", descKey: "versionAlphaDesc" },
] as const;

const SettingsCard = React.memo(({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  className,
  children,
}: {
  icon: React.ReactNode;
  iconColor?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`settings-card${className ? ` ${className}` : ""}`}>
    <div className="settings-card-header">
      <div className="settings-card-title">
        <div className="settings-card-icon" style={iconColor ? { color: iconColor } : undefined}>{icon}</div>
        <div className="settings-card-heading">
          <div className="settings-card-name">{title}</div>
          {subtitle && <div className="settings-card-sub">{subtitle}</div>}
        </div>
      </div>
      {value && <div className="settings-card-value">{value}</div>}
    </div>
    <div className="settings-card-body">{children}</div>
  </div>
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
    <div className="settings-panel settings-panel-sketch">
      <div className="settings-header">
        <div>
          <h2>{t.sidebarSettings}</h2>
          <p>{t.settingsSubtitle}</p>
        </div>
        <div className="settings-header-status">
          <span className="settings-header-status-dot" />
          <span>{language === "ru" ? "Локальные настройки" : "Local settings"}</span>
        </div>
      </div>

      <div className="settings-grid">
        <SettingsCard icon={<IconFolder />} iconColor="var(--accent-color)" title={t.settingsExportPath} className="settings-card-export">
          <div className="input-wrapper">
            <label className="sr-only" htmlFor="settings-export-path">{t.settingsExportPath}</label>
            <input id="settings-export-path" type="text" value={exportPath} onChange={(e) => setExportPath(e.target.value)} />
            <button className="folder-btn" type="button" title={t.openFolderShort} aria-label={t.openFolderShort} onClick={() => void ipc.openPath(exportPath)}>
              <IconFolder />
            </button>
          </div>
        </SettingsCard>

        <SettingsCard icon={<IconCpu />} iconColor="#027dea" title={t.filePathsTitle} className="settings-card-paths">
          <div className="input-group">
            <label htmlFor="settings-java-path">{t.javaLabel}</label>
            <div className="input-wrapper">
              <input id="settings-java-path" type="text" value={javaPath} onChange={(e) => setJavaPath(e.target.value)} />
              <button className="folder-btn" type="button" title={t.javaAutoDetect} aria-label={t.javaAutoDetect} onClick={() => void detectJava()}>
                <IconSearch />
              </button>
              <button className="folder-btn" type="button" title={t.openFolderShort} aria-label={t.openFolderShort} onClick={() => void ipc.openPath(javaPath)}><IconFolder /></button>
            </div>
            {javaDetectMsg && <div className="settings-java-msg" aria-live="polite">{javaDetectMsg}</div>}
          </div>

          <div className="input-group">
            <label htmlFor="settings-game-path">{t.gameFolder}</label>
            <div className="input-wrapper">
              <input id="settings-game-path" type="text" value={gamePath} onChange={(e) => setGamePath(e.target.value)} />
              <button className="folder-btn" type="button" title={t.openFolderShort} aria-label={t.openFolderShort} onClick={() => void ipc.openPath(gamePath)}><IconFolder /></button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<IconCpu />}
          title={t.ramSettingsTitle}
          subtitle={t.ramSettingsDesc}
          value={<>{ram} <span>GB</span></>}
          className="settings-card-memory"
        >
          <div className="slider-container">
            <input type="range" min="1" max="16" value={ram} onChange={(e) => setRam(parseInt(e.target.value))} className="slider" style={sliderStyle} />
            <div className="slider-marks">
              <span>1G</span>
              <span>2G</span>
              <span style={ram === 4 ? { color: "var(--accent-color)" } : {}}>4G</span>
              <span>6G</span>
              <span>8G</span>
              <span>10G</span>
              <span>12G</span>
              <span>16G</span>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon={<IconUsers />} iconColor="#269684" title={t.autoConnect} className="settings-card-network">
          <div className="input-group">
            <label htmlFor="settings-server-ip">{t.serverIpLabel}</label>
            <input id="settings-server-ip" type="text" className="settings-text-input" placeholder="mc.hypixel.net" value={serverIp} onChange={(e) => setServerIp(e.target.value)} />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<IconBox />}
          iconColor="var(--accent-color)"
          title={t.settingsVersionTypes}
          subtitle={<>{t.settingsShownVersions} {currentVersionsList.length}</>}
          className="settings-card-versions"
        >
          {manifestError && <div className="settings-manifest-warn">{t.settingsManifestError}</div>}
          <div className="settings-version-grid">
            {VERSION_FILTER_ITEMS.map((item) => (
              <label
                key={item.key}
                className={`settings-version-item ${versionFilters[item.key] ? "active" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={versionFilters[item.key]}
                  onChange={(e) => toggleVersionFilter(item.key, e.target.checked)}
                />
                <span className="settings-version-icon">{item.icon}</span>
                <span className="settings-version-label">{t[item.labelKey]}</span>
                <span className="settings-version-desc">{t[item.descKey]}</span>
              </label>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard icon={<IconSettings />} iconColor="#e46d4c" title={t.languageTitle} className="settings-card-language">
          <div className="settings-lang-row">
            <button
              className={`settings-lang-btn ${language === "ru" ? "active" : ""}`}
              onClick={() => changeLanguage("ru")}
            >
              <span className="settings-lang-code">RU</span> Русский
            </button>
            <button
              className={`settings-lang-btn ${language === "en" ? "active" : ""}`}
              onClick={() => changeLanguage("en")}
            >
              <span className="settings-lang-code">EN</span> English
            </button>
          </div>
        </SettingsCard>

        <SettingsCard icon={<IconBox />} iconColor="var(--accent-color)" title={t.launcherStoreTitle} subtitle={t.launcherStoreDesc} className="settings-card-wide settings-card-store">
          <button className="settings-store-btn" onClick={onOpenStore}>
            <IconDownload />
            <span>{t.launcherStoreButton}</span>
          </button>
        </SettingsCard>

        <SettingsCard icon={<IconBox />} iconColor="#e46d4c" title={t.closeOnLaunch} subtitle={t.closeOnLaunchDesc} className="settings-card-launch">
          <label className="settings-toggle-row">
            <input
              type="checkbox"
              className="settings-toggle"
              checked={closeOnLaunch}
              onChange={(e) => setCloseOnLaunch(e.target.checked)}
            />
            <span className="settings-toggle-track">
              <span className="settings-toggle-thumb" />
            </span>
            <span className="settings-toggle-label">{closeOnLaunch ? t.on : t.off}</span>
          </label>
        </SettingsCard>
      </div>
    </div>
  );
});
