import React from "react";
import { HexColorPicker } from "react-colorful";
import type { Language, VersionFilterState } from "../../types";
import { ipc } from "../../services/ipc";
import { IconBox, IconCpu, IconFolder, IconSettings, IconUsers } from "../../ui/icons";

const VERSION_FILTER_ITEMS = [
  { key: "release", icon: "📦", labelKey: "versionRelease", descKey: "versionReleaseDesc" },
  { key: "snapshot", icon: "🧪", labelKey: "versionSnapshot", descKey: "versionSnapshotDesc" },
  { key: "old_beta", icon: "🏗️", labelKey: "versionBeta", descKey: "versionBetaDesc" },
  { key: "old_alpha", icon: "🏚️", labelKey: "versionAlpha", descKey: "versionAlphaDesc" },
] as const;

const THEME_PRESETS = [
  { name: "Void Violet", hex: "#663af3" },
  { name: "Deep Teal", hex: "#269684" },
  { name: "Signal Blue", hex: "#027dea" },
  { name: "Ember Glow", hex: "#e46d4c" },
  { name: "Blueprint Blue", hex: "#b6d9fc" },
  { name: "Frost Glow", hex: "#d1e4fa" },
];

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
  themeHex,
  applyTheme,
  customThemeInput,
  setCustomThemeInput,
  showColorPicker,
  setShowColorPicker,
  versionFilters,
  currentVersionsList,
  toggleVersionFilter,
  manifestError,
  closeOnLaunch,
  setCloseOnLaunch,
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
  themeHex: string;
  applyTheme: (hex: string) => void;
  customThemeInput: string;
  setCustomThemeInput: (v: string) => void;
  showColorPicker: boolean;
  setShowColorPicker: (v: boolean) => void;
  versionFilters: VersionFilterState;
  currentVersionsList: string[];
  toggleVersionFilter: (key: keyof VersionFilterState, checked: boolean) => void;
  manifestError: boolean;
  closeOnLaunch: boolean;
  setCloseOnLaunch: (v: boolean) => void;
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
        <h2>{t.sidebarSettings}</h2>
        <p>{t.settingsSubtitle}</p>
      </div>

      <div className="settings-grid">
        <SettingsCard icon={<IconFolder />} iconColor="var(--accent-color)" title={t.settingsExportPath}>
          <div className="input-wrapper">
            <input type="text" value={exportPath} onChange={(e) => setExportPath(e.target.value)} />
            <button className="folder-btn" title={t.openFolderShort} onClick={() => void ipc.openPath(exportPath)}>
              <IconFolder />
            </button>
          </div>
        </SettingsCard>

        <SettingsCard icon={<IconCpu />} iconColor="#027dea" title={t.filePathsTitle}>
          <div className="input-group">
            <label>{t.javaLabel}</label>
            <div className="input-wrapper">
              <input type="text" value={javaPath} onChange={(e) => setJavaPath(e.target.value)} />
              <button className="folder-btn" title={t.javaAutoDetect} onClick={() => void detectJava()}>
                <span style={{ fontSize: "0.9rem" }}>🔍</span>
              </button>
              <button className="folder-btn" onClick={() => void ipc.openPath(javaPath)}><IconFolder /></button>
            </div>
            {javaDetectMsg && <div className="settings-java-msg">{javaDetectMsg}</div>}
          </div>

          <div className="input-group">
            <label>{t.gameFolder}</label>
            <div className="input-wrapper">
              <input type="text" value={gamePath} onChange={(e) => setGamePath(e.target.value)} />
              <button className="folder-btn" onClick={() => void ipc.openPath(gamePath)}><IconFolder /></button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<IconCpu />}
          title={t.ramSettingsTitle}
          subtitle={t.ramSettingsDesc}
          value={<>{ram} <span>GB</span></>}
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

        <SettingsCard icon={<IconUsers />} iconColor="#269684" title={t.autoConnect}>
          <div className="input-group">
            <label>{t.serverIpLabel}</label>
            <input type="text" className="settings-text-input" placeholder="mc.hypixel.net" value={serverIp} onChange={(e) => setServerIp(e.target.value)} />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<IconBox />}
          iconColor="var(--accent-color)"
          title={t.settingsVersionTypes}
          subtitle={<>{t.settingsShownVersions} {currentVersionsList.length}</>}
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

        <SettingsCard icon={<IconSettings />} iconColor="#e46d4c" title={t.languageTitle}>
          <div className="settings-lang-row">
            <button
              className={`settings-lang-btn ${language === "ru" ? "active" : ""}`}
              onClick={() => changeLanguage("ru")}
            >
              🇷🇺 Русский
            </button>
            <button
              className={`settings-lang-btn ${language === "en" ? "active" : ""}`}
              onClick={() => changeLanguage("en")}
            >
              🇬🇧 English
            </button>
          </div>
        </SettingsCard>

        <SettingsCard icon={<IconBox />} iconColor="var(--accent-color)" title={t.themeTitle} className="settings-card-wide">
          <div className="settings-theme-presets">
            {THEME_PRESETS.map((theme) => (
              <button
                key={theme.name}
                className={`settings-theme-btn ${themeHex === theme.hex ? "active" : ""}`}
                style={{ borderColor: themeHex === theme.hex ? theme.hex : undefined, background: themeHex === theme.hex ? `${theme.hex}22` : undefined }}
                onClick={() => applyTheme(theme.hex)}
              >
                <div className="settings-theme-dot" style={{ background: theme.hex, boxShadow: `0 0 10px ${theme.hex}` }} />
                {theme.name}
              </button>
            ))}
          </div>

          <div className="settings-theme-custom">
            <label>{t.customThemeTitle}</label>
            <div className="settings-theme-custom-row">
              <div
                className="settings-theme-swatch"
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{ background: customThemeInput || themeHex }}
              />
              <span className="settings-theme-hex">{customThemeInput || themeHex}</span>

              {showColorPicker && (
                <div style={{ position: "relative" }}>
                  <div style={{ position: "fixed", inset: 0 }} onClick={() => setShowColorPicker(false)} />
                  <div style={{ position: "relative" }}>
                    <HexColorPicker
                      color={customThemeInput || themeHex}
                      onChange={(newColor) => {
                        setCustomThemeInput(newColor);
                        applyTheme(newColor);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon={<IconBox />} iconColor="#e46d4c" title={t.closeOnLaunch} subtitle={t.closeOnLaunchDesc}>
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