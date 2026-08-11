import React from "react";
import { HexColorPicker } from "react-colorful";
import type { Language, VersionFilterState } from "../../types";
import { ipc } from "../../services/ipc";
import { IconBox, IconCpu, IconFolder, IconSettings, IconUsers } from "../../ui/icons";

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
}) => {
  const [javaDetectMsg, setJavaDetectMsg] = React.useState<string | null>(null);

  return (
    <div className="settings-panel">
      <h2>{t.sidebarSettings}</h2>

      <div className="settings-section">
        <h3>Пути и сохранение</h3>
        <div className="setting-item">
          <label>Папка для экспорта сборок</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" value={exportPath} onChange={(e) => setExportPath(e.target.value)} style={{ flex: 1 }} />
            <button className="play-btn" style={{ padding: "0 15px", height: "40px" }} onClick={() => void ipc.openPath(exportPath)}>
              <IconFolder />
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Отображаемые версии Minecraft</h3>
        <p style={{ color: "#8b8b9c", fontSize: "0.85rem" }}>Выберите, какие типы версий показывать в списках. Можно комбинировать.</p>

        {manifestError && (
          <p style={{ color: "#fbbf24", fontSize: "0.8rem", marginTop: "8px" }}>
            Не удалось обновить список версий — используются кэшированные данные.
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
          {([
            { key: "release", label: "📦 Релизы", desc: "Стабильные версии (1.21.4, 1.20.1...)" },
            { key: "snapshot", label: "🧪 Снапшоты", desc: "Тестовые версии (25w04a...)" },
            { key: "old_beta", label: "🏗️ Беты", desc: "Старые бета-версии (b1.8.1...)" },
            { key: "old_alpha", label: "🏚️ Альфы", desc: "Самые старые версии (a1.2.6...)" },
          ] as const).map((item) => (
            <label
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                padding: "12px 14px",
                borderRadius: "10px",
                background: versionFilters[item.key] ? "rgba(var(--accent-color-rgb), 0.15)" : "rgba(255,255,255,0.03)",
                border: versionFilters[item.key] ? "1px solid rgba(var(--accent-color-rgb), 0.4)" : "1px solid rgba(255,255,255,0.06)",
                transition: "all 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={versionFilters[item.key]}
                onChange={(e) => toggleVersionFilter(item.key, e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--accent-color)", flexShrink: 0 }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: "0.75rem", color: "#8b8b9c" }}>{item.desc}</span>
              </div>
            </label>
          ))}
        </div>
        <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#6b6b7c" }}>Показано версий: {currentVersionsList.length}</div>
      </div>

      <div className="settings-section">
        <h3>{t.ramSettingsTitle}</h3>
        <p>{t.settingsSubtitle}</p>
      </div>

      <div className="settings-section">
        <div className="section-title">
          <div className="section-icon" style={{ color: "var(--accent-color)" }}><IconUsers /></div>
          {t.autoConnect}
        </div>

        <div className="input-group">
          <label>{t.serverIpLabel}</label>
          <div className="input-wrapper">
            <input type="text" placeholder="mc.hypixel.net" value={serverIp} onChange={(e) => setServerIp(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-top">
          <div className="section-title">
            <div className="section-icon"><IconCpu /></div>
            <div>
              <div>{t.ramSettingsTitle}</div>
              <div style={{ fontSize: "0.8rem", color: "#8b8b9c", fontWeight: "normal" }}>{t.ramSettingsDesc}</div>
            </div>
          </div>
          <div className="section-value">{ram} <span>GB</span></div>
        </div>

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
      </div>

      <div className="settings-section">
        <div className="section-title">
          <div className="section-icon" style={{ color: "#3b82f6" }}><IconFolder /></div>
          {t.filePathsTitle}
        </div>

        <div className="input-group">
          <label>{t.javaLabel}</label>
          <div className="input-wrapper">
            <input type="text" value={javaPath} onChange={(e) => setJavaPath(e.target.value)} />
            <button
              className="folder-btn"
              title="Авто-детект системной Java"
              onClick={async () => {
                try {
                  const found = await ipc.findSystemJava();
                  if (found) {
                    setJavaPath(found);
                    setJavaDetectMsg("Найдена системная Java: " + found.replace(/\/home\/[^/]+/, "~"));
                  } else {
                    setJavaDetectMsg("Системная Java не найдена — будет скачана автоматически");
                  }
                } catch (e) {
                  setJavaDetectMsg("Ошибка детекта Java: " + e);
                }
              }}
            >
              <span style={{ fontSize: "0.9rem" }}>🔍</span>
            </button>
            <button className="folder-btn" onClick={() => void ipc.openPath(javaPath)}><IconFolder /></button>
          </div>
          {javaDetectMsg && <div style={{ fontSize: "0.78rem", color: "#8b8b9c", marginTop: "4px" }}>{javaDetectMsg}</div>}
        </div>

        <div className="input-group">
          <label>{t.gameFolder}</label>
          <div className="input-wrapper">
            <input type="text" value={gamePath} onChange={(e) => setGamePath(e.target.value)} />
            <button className="folder-btn" onClick={() => void ipc.openPath(gamePath)}><IconFolder /></button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">
          <div className="section-icon" style={{ color: "#10b981" }}><IconSettings /></div>
          {t.languageTitle}
        </div>
        <div className="input-group" style={{ flexDirection: "row", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={() => changeLanguage("ru")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: language === "ru" ? "1px solid rgba(var(--accent-color-rgb), 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
              background: language === "ru" ? "rgba(var(--accent-color-rgb), 0.2)" : "rgba(255, 255, 255, 0.05)",
              color: language === "ru" ? "white" : "#8b8b9c",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: language === "ru" ? "bold" : "normal",
            }}
          >
            🇷🇺 Русский
          </button>
          <button
            onClick={() => changeLanguage("en")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: language === "en" ? "1px solid rgba(var(--accent-color-rgb), 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
              background: language === "en" ? "rgba(var(--accent-color-rgb), 0.2)" : "rgba(255, 255, 255, 0.05)",
              color: language === "en" ? "white" : "#8b8b9c",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: language === "en" ? "bold" : "normal",
            }}
          >
            🇬🇧 English
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">
          <div className="section-icon" style={{ color: "var(--accent-color)" }}><IconBox /></div>
          {t.themeTitle || "Тема лаунчера"}
        </div>
        <div className="input-group" style={{ flexDirection: "row", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
          {[
            { name: "Omega Purple", hex: "#a855f7" },
            { name: "Neon Green", hex: "#10b981" },
            { name: "Cyber Blue", hex: "#3b82f6" },
            { name: "Crimson Red", hex: "#ef4444" },
            { name: "Sunset Orange", hex: "#f97316" },
            { name: "Hot Pink", hex: "#ec4899" },
          ].map((theme) => (
            <button
              key={theme.name}
              onClick={() => applyTheme(theme.hex)}
              style={{
                flex: "1 1 30%",
                padding: "10px",
                borderRadius: "10px",
                border: themeHex === theme.hex ? `1px solid ${theme.hex}` : "1px solid rgba(255, 255, 255, 0.1)",
                background: themeHex === theme.hex ? `${theme.hex}20` : "rgba(255, 255, 255, 0.05)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                justifyContent: "center",
              }}
            >
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: theme.hex, boxShadow: `0 0 10px ${theme.hex}` }}></div>
              {theme.name}
            </button>
          ))}
        </div>

        <div className="input-group" style={{ marginTop: "15px" }}>
          <label>{t.customThemeTitle || "Свой цвет (Hex)"}</label>
          <div className="input-wrapper" style={{ display: "flex", gap: "15px", alignItems: "center", position: "relative" }}>
            <div
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                cursor: "pointer",
                background: customThemeInput || themeHex,
                border: "2px solid rgba(255,255,255,0.2)",
              }}
            />
            <span style={{ color: "#8b8b9c", fontSize: "1rem" }}>{customThemeInput || themeHex}</span>

            {showColorPicker && (
              <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100, marginTop: "10px" }}>
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
      </div>
    </div>
  );
});