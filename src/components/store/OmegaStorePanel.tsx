import React, { useRef, useState } from "react";
import type { Account } from "../../types";
import type { SkinApi, SkinModel, SkinSource } from "../../hooks/useSkin";
import { Skin3DViewer } from "../settings/Skin3DViewer";
import {
  IconArrowLeft,
  IconCheck,
  IconPalette,
  IconShirt,
  IconSparkles,
  IconTrash,
} from "../../ui/icons";
import {
  NEON_THEMES,
  BASE_THEMES,
  applyNeonTheme,
  applyBaseTheme,
} from "../settings/SettingsPanel";
import {
  PRESET_SKINS,
  PRESET_CAPES,
  type PresetSkin,
  type PresetCape,
} from "./storePresets";

interface OmegaStorePanelProps {
  t: any;
  skinApi: SkinApi;
  account: Account;
  onBack: () => void;
  themeHex: string;
  applyTheme: (hex: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

type StoreTab = "skins" | "accessories" | "customization";

export const OmegaStorePanel: React.FC<OmegaStorePanelProps> = ({
  t,
  skinApi,
  account,
  onBack,
  themeHex,
  applyTheme,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<StoreTab>("skins");
  const [characterAngle, setCharacterAngle] = useState<number>(0);
  const skinFileInputRef = useRef<HTMLInputElement | null>(null);
  const capeFileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeNeonId, setActiveNeonId] = useState<string>(
    () => localStorage.getItem("omega:neonTheme") || "omega",
  );
  const [activeBaseId, setActiveBaseId] = useState<string>(
    () => localStorage.getItem("omega:baseTheme") || "cappuccino",
  );

  const [sunburstEnabled, setSunburstEnabled] = useState<boolean>(
    () => localStorage.getItem("omega:atmosphereSunburst") !== "false",
  );
  const [sparksEnabled, setSparksEnabled] = useState<boolean>(
    () => localStorage.getItem("omega:atmosphereSparks") !== "false",
  );
  const [glowEnabled, setGlowEnabled] = useState<boolean>(
    () => localStorage.getItem("omega:atmosphereGlow") !== "false",
  );

  const handleSkinUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void skinApi.uploadSkin(file).then(() => {
        showToast(t.storeSkinApplied || "Скин успешно загружен и применён!", "success");
      });
    }
  };

  const handleCapeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void skinApi.uploadCape(file).then(() => {
        showToast(t.storeCapeApplied || "Плащ успешно загружен и применён!", "success");
      });
    }
  };

  const handleSelectPresetSkin = (preset: PresetSkin) => {
    skinApi.setPresetSkin(preset.url, preset.model);
    showToast(
      `${t.storeSkinApplied || "Скин применён"}: ${preset.nameRu}`,
      "success",
    );
  };

  const handleSelectPresetCape = (preset: PresetCape) => {
    skinApi.setPresetCape(preset.url);
    showToast(
      `${t.storeCapeApplied || "Плащ применён"}: ${preset.nameRu}`,
      "success",
    );
  };

  const handleSelectNeonTheme = (id: string) => {
    applyNeonTheme(id);
    setActiveNeonId(id);
    showToast(t.storeThemeApplied || "Тема успешно обновлена!", "success");
  };

  const handleSelectBaseTheme = (id: string) => {
    applyBaseTheme(id);
    setActiveBaseId(id);
    showToast(t.storeThemeApplied || "Палитра успешно обновлена!", "success");
  };

  const toggleAtmosphere = (
    key: "omega:atmosphereSunburst" | "omega:atmosphereSparks" | "omega:atmosphereGlow",
    currentVal: boolean,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    const next = !currentVal;
    setter(next);
    localStorage.setItem(key, String(next));
    showToast("Настройки атмосферы сохранены", "success");
  };

  const COLOR_SWATCHES = [
    "#6344d4",
    "#00d2ff",
    "#10b981",
    "#ff2a5f",
    "#eab308",
    "#a855f7",
    "#f97316",
    "#38bdf8",
  ];

  return (
    <div className="omega-store-page">
      {/* Top Header */}
      <header className="omega-store-header">
        <div className="omega-store-header-left">
          <button
            type="button"
            className="omega-store-back-btn"
            onClick={onBack}
            title={t.backToHome || "На главную"}
          >
            <IconArrowLeft />
            <span>{t.backToHome || "На главную"}</span>
          </button>

          <div className="omega-store-title-badge">
            <div className="store-badge-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18"
                  stroke="#facc15"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 10a4 4 0 01-8 0"
                  stroke="#facc15"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="omega-store-heading">
                {t.storeTitle || "Магазин Omega"}
              </h1>
              <p className="omega-store-subheading">
                {t.storeSubtitle ||
                  "Кастомизация персонажа, плащей и интерфейса лаунчера"}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="omega-store-tabs">
          <button
            type="button"
            className={`omega-store-tab ${activeTab === "skins" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("skins");
              setCharacterAngle(0);
            }}
          >
            <IconShirt />
            <span>{t.storeTabSkins || "Скины"}</span>
          </button>
          <button
            type="button"
            className={`omega-store-tab ${activeTab === "accessories" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("accessories");
              setCharacterAngle(180);
            }}
          >
            <IconSparkles />
            <span>{t.storeTabAccessories || "Аксессуары"}</span>
          </button>
          <button
            type="button"
            className={`omega-store-tab ${activeTab === "customization" ? "active" : ""}`}
            onClick={() => setActiveTab("customization")}
          >
            <IconPalette />
            <span>{t.storeTabCustomization || "Кастомизация"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="omega-store-body">
        {/* TAB 1: SKINS */}
        {activeTab === "skins" && (
          <div className="store-split-layout">
            <div className="store-content-scroll">
              {/* Custom skin & controls card */}
              <div className="store-section-card">
                <div className="section-card-header">
                  <h3>{t.storeCustomSkin || "Настройки и загрузка скина"}</h3>
                  <span className="section-card-tag">PNG</span>
                </div>

                <div className="store-controls-row">
                  {/* Source selector */}
                  <div className="store-control-group">
                    <label className="store-control-label">
                      {t.skinSource || "Источник"}
                    </label>
                    <div className="store-pills-row">
                      {(["ely", "microsoft", "custom"] as SkinSource[]).map(
                        (src) => (
                          <button
                            key={src}
                            type="button"
                            className={`store-pill ${
                              skinApi.skinSource === src ? "active" : ""
                            }`}
                            onClick={() => skinApi.setSkinSource(src)}
                          >
                            {src === "ely"
                              ? "Ely.by"
                              : src === "microsoft"
                                ? "Microsoft"
                                : "Свой файл"}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Model selector */}
                  <div className="store-control-group">
                    <label className="store-control-label">
                      {t.skinModel || "Модель"}
                    </label>
                    <div className="store-pills-row">
                      {(["auto", "classic", "slim"] as SkinModel[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`store-pill ${
                            skinApi.skinModel === m ? "active" : ""
                          }`}
                          onClick={() => skinApi.setSkinModel(m)}
                        >
                          {m === "auto"
                            ? "Авто"
                            : m === "classic"
                              ? "Classic"
                              : "Slim"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Upload action buttons */}
                <div className="store-actions-bar">
                  <input
                    ref={skinFileInputRef}
                    type="file"
                    accept="image/png"
                    style={{ display: "none" }}
                    onChange={handleSkinUpload}
                  />
                  <button
                    type="button"
                    className="store-upload-btn"
                    onClick={() => skinFileInputRef.current?.click()}
                  >
                    <IconShirt />
                    <span>{t.skinUploadPng || "Загрузить свой скин (.png)"}</span>
                  </button>

                  {skinApi.customSkinUrl && (
                    <button
                      type="button"
                      className="store-reset-btn"
                      onClick={() => {
                        skinApi.resetSkin();
                        showToast("Скин сброшен к стандартному", "success");
                      }}
                      title={t.skinReset || "Сбросить скин"}
                    >
                      <IconTrash />
                      <span>{t.storeResetBtn || "Сбросить"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Skins Gallery */}
              <div className="store-section-card">
                <div className="section-card-header">
                  <h3>{t.storePresetSkins || "Коллекция популярных скинов"}</h3>
                  <span className="section-card-tag">
                    {PRESET_SKINS.length} скинов
                  </span>
                </div>

                <div className="store-presets-grid">
                  {PRESET_SKINS.map((preset) => {
                    const isCurrent =
                      skinApi.activeSkinUrl === preset.url ||
                      skinApi.customSkinUrl === preset.url;

                    return (
                      <div
                        key={preset.id}
                        className={`store-preset-card ${
                          isCurrent ? "current-active" : ""
                        }`}
                      >
                        <div className="preset-card-avatar">
                          <img
                            src={preset.avatarUrl}
                            alt={preset.nameRu}
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "https://minotar.net/avatar/MHF_Steve/64";
                            }}
                          />
                        </div>

                        <div className="preset-card-meta">
                          <div className="preset-card-title-row">
                            <span className="preset-title">{preset.nameRu}</span>
                            <span className="preset-badge">{preset.tag}</span>
                          </div>
                          <p className="preset-desc">{preset.descriptionRu}</p>
                          <span className="preset-model-chip">
                            {preset.model === "slim" ? "Slim (Alex)" : "Classic"}
                          </span>
                        </div>

                        <div className="preset-card-action">
                          {isCurrent ? (
                            <div className="preset-active-label">
                              <IconCheck size={16} />
                              <span>{t.storeActiveBadge || "Активен"}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="preset-select-btn"
                              onClick={() => handleSelectPresetSkin(preset)}
                            >
                              <span>{t.storeApplyBtn || "Выбрать"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3D Character Preview Stage */}
            <div className="store-preview-stage-wrap">
              <div className="store-preview-stage-card">
                <div className="preview-stage-header">
                  <span className="preview-heading">Предпросмотр</span>
                  <button
                    type="button"
                    className="stage-rotate-toggle"
                    onClick={() =>
                      setCharacterAngle((prev) => (prev === 0 ? 180 : 0))
                    }
                  >
                    <span>{characterAngle === 0 ? "Сзади ↻" : "Спереди ↺"}</span>
                  </button>
                </div>

                <div
                  className="preview-stage-canvas"
                  style={{
                    transform:
                      characterAngle === 180 ? "rotateY(180deg)" : "none",
                    transition: "transform 0.4s ease",
                  }}
                >
                  <Skin3DViewer
                    width={310}
                    height={430}
                    cameraDistance={65}
                    skinUrl={skinApi.activeSkinUrl}
                    capeUrl={skinApi.activeCapeUrl}
                    model={
                      skinApi.skinModel === "auto"
                        ? "auto-detect"
                        : skinApi.skinModel === "slim"
                          ? "slim"
                          : "default"
                    }
                    animation="idle"
                    loading={skinApi.skinLoading}
                  />
                </div>

                <div className="preview-stage-info-pill">
                  <span className="pill-user">{account.name}</span>
                  <span className="pill-model">
                    {skinApi.skinModel === "slim" ? "Slim" : "Classic"}
                  </span>
                  <span className="pill-source">
                    {skinApi.skinSource.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACCESSORIES (CAPES) */}
        {activeTab === "accessories" && (
          <div className="store-split-layout">
            <div className="store-content-scroll">
              {/* Cape controls banner */}
              <div className="store-section-card">
                <div className="section-card-header">
                  <h3>{t.storeCustomCape || "Управление плащами"}</h3>
                  <span className="section-card-tag">Плащи</span>
                </div>

                <div className="store-cape-toggle-bar">
                  <div className="cape-toggle-info">
                    <span className="cape-toggle-title">
                      {t.storeCapeToggle || "Отображать плащ за спиной"}
                    </span>
                    <span className="cape-toggle-desc">
                      Плащ виден в 3D-предпросмотре и при игре на серверах
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`cape-toggle-btn ${
                      skinApi.capeEnabled ? "enabled" : "disabled"
                    }`}
                    onClick={() => skinApi.setCapeEnabled(!skinApi.capeEnabled)}
                  >
                    <span>{skinApi.capeEnabled ? "ВКЛЮЧЕН" : "ВЫКЛЮЧЕН"}</span>
                  </button>
                </div>

                <div className="store-actions-bar">
                  <input
                    ref={capeFileInputRef}
                    type="file"
                    accept="image/png"
                    style={{ display: "none" }}
                    onChange={handleCapeUpload}
                  />
                  <button
                    type="button"
                    className="store-upload-btn"
                    onClick={() => capeFileInputRef.current?.click()}
                  >
                    <IconSparkles />
                    <span>Загрузить свой плащ (.png)</span>
                  </button>

                  {skinApi.customCapeUrl && (
                    <button
                      type="button"
                      className="store-reset-btn"
                      onClick={() => {
                        skinApi.resetCape();
                        showToast("Плащ сброшен", "success");
                      }}
                    >
                      <IconTrash />
                      <span>{t.storeResetBtn || "Сбросить"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Capes Grid */}
              <div className="store-section-card">
                <div className="section-card-header">
                  <h3>{t.storePresetCapes || "Коллекция плащей"}</h3>
                  <span className="section-card-tag">
                    {PRESET_CAPES.length} плащей
                  </span>
                </div>

                <div className="store-presets-grid">
                  {PRESET_CAPES.map((preset) => {
                    const isCurrent =
                      skinApi.capeEnabled &&
                      (skinApi.activeCapeUrl === preset.url ||
                        skinApi.customCapeUrl === preset.url);

                    return (
                      <div
                        key={preset.id}
                        className={`store-preset-card ${
                          isCurrent ? "current-active" : ""
                        }`}
                      >
                        <div
                          className="preset-cape-preview-box"
                          style={{
                            background: `linear-gradient(135deg, ${preset.previewColor}44 0%, #0d121f 100%)`,
                            border: `1px solid ${preset.previewColor}88`,
                          }}
                        >
                          <div
                            className="cape-color-indicator"
                            style={{ backgroundColor: preset.previewColor }}
                          />
                          <span className="cape-badge-tag">{preset.tag}</span>
                        </div>

                        <div className="preset-card-meta">
                          <div className="preset-card-title-row">
                            <span className="preset-title">{preset.nameRu}</span>
                          </div>
                          <p className="preset-desc">{preset.descriptionRu}</p>
                        </div>

                        <div className="preset-card-action">
                          {isCurrent ? (
                            <div className="preset-active-label">
                              <IconCheck size={16} />
                              <span>{t.storeActiveBadge || "Надет"}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="preset-select-btn"
                              onClick={() => handleSelectPresetCape(preset)}
                            >
                              <span>{t.storeApplyBtn || "Надеть"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3D Preview Stage from Behind */}
            <div className="store-preview-stage-wrap">
              <div className="store-preview-stage-card">
                <div className="preview-stage-header">
                  <span className="preview-heading">Плащ в 3D</span>
                  <button
                    type="button"
                    className="stage-rotate-toggle"
                    onClick={() =>
                      setCharacterAngle((prev) => (prev === 180 ? 0 : 180))
                    }
                  >
                    <span>{characterAngle === 180 ? "Спереди ↺" : "Сзади ↻"}</span>
                  </button>
                </div>

                <div
                  className="preview-stage-canvas"
                  style={{
                    transform:
                      characterAngle === 180 ? "rotateY(180deg)" : "none",
                    transition: "transform 0.4s ease",
                  }}
                >
                  <Skin3DViewer
                    width={310}
                    height={430}
                    cameraDistance={65}
                    skinUrl={skinApi.activeSkinUrl}
                    capeUrl={skinApi.activeCapeUrl}
                    model={
                      skinApi.skinModel === "auto"
                        ? "auto-detect"
                        : skinApi.skinModel === "slim"
                          ? "slim"
                          : "default"
                    }
                    animation="walk"
                    loading={skinApi.skinLoading}
                  />
                </div>

                <div className="preview-stage-info-pill">
                  <span className="pill-user">{account.name}</span>
                  <span className="pill-model">
                    {skinApi.capeEnabled ? "Плащ активен" : "Плащ скрыт"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMIZATION (THEMES) */}
        {activeTab === "customization" && (
          <div className="store-full-scroll">
            {/* Neon Themes */}
            <div className="store-section-card">
              <div className="section-card-header">
                <h3>{t.storeNeonThemes || "Неоновые темы лаунчера"}</h3>
                <span className="section-card-tag">Акцентное сияние</span>
              </div>

              <div className="store-themes-grid">
                {NEON_THEMES.map((th) => {
                  const isCurrent = activeNeonId === th.id;

                  return (
                    <div
                      key={th.id}
                      className={`store-theme-card ${
                        isCurrent ? "theme-active" : ""
                      }`}
                      onClick={() => handleSelectNeonTheme(th.id)}
                    >
                      <div
                        className="theme-gradient-strip"
                        style={{
                          background: `linear-gradient(90deg, ${th.dark} 0%, ${th.accent} 50%, ${th.light} 100%)`,
                          boxShadow: `0 0 16px ${th.accent}66`,
                        }}
                      />
                      <div className="theme-card-info">
                        <span className="theme-name">
                          {th.nameRu || th.name}
                        </span>
                        <span className="theme-hex">{th.accent}</span>
                      </div>
                      <div className="theme-card-bottom">
                        {isCurrent ? (
                          <div className="theme-selected-badge">
                            <IconCheck size={14} />
                            <span>Активна</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="theme-pick-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectNeonTheme(th.id);
                            }}
                          >
                            Применить
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Base Themes */}
            <div className="store-section-card">
              <div className="section-card-header">
                <h3>{t.storeBaseThemes || "Палитры фона (Base Themes)"}</h3>
                <span className="section-card-tag">Основа интерфейса</span>
              </div>

              <div className="store-themes-grid">
                {BASE_THEMES.map((b) => {
                  const isCurrent = activeBaseId === b.id;

                  return (
                    <div
                      key={b.id}
                      className={`store-theme-card ${
                        isCurrent ? "theme-active" : ""
                      }`}
                      onClick={() => handleSelectBaseTheme(b.id)}
                    >
                      <div
                        className="theme-base-strip"
                        style={{ backgroundColor: b.previewColor }}
                      />
                      <div className="theme-card-info">
                        <span className="theme-name">
                          {b.nameRu || b.name}
                        </span>
                        <span className="theme-hex">{b.previewColor}</span>
                      </div>
                      <div className="theme-card-bottom">
                        {isCurrent ? (
                          <div className="theme-selected-badge">
                            <IconCheck size={14} />
                            <span>Активна</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="theme-pick-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectBaseTheme(b.id)}
                            }
                          >
                            Применить
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Accent Color */}
            <div className="store-section-card">
              <div className="section-card-header">
                <h3>{t.storeAccentColor || "Пользовательский цвет акцента"}</h3>
                <span className="section-card-tag">HEX</span>
              </div>

              <div className="store-color-custom-row">
                <div className="color-swatches-list">
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      className={`color-swatch-circle ${
                        themeHex.toLowerCase() === swatch.toLowerCase()
                          ? "selected"
                          : ""
                      }`}
                      style={{ backgroundColor: swatch }}
                      onClick={() => applyTheme(swatch)}
                    />
                  ))}
                </div>

                <div className="color-hex-picker-box">
                  <input
                    type="color"
                    className="native-color-input"
                    value={themeHex}
                    onChange={(e) => applyTheme(e.target.value)}
                  />
                  <input
                    type="text"
                    className="text-hex-input"
                    value={themeHex}
                    maxLength={7}
                    onChange={(e) => applyTheme(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Atmosphere Effects */}
            <div className="store-section-card">
              <div className="section-card-header">
                <h3>{t.storeAtmosphere || "Эффекты атмосферы"}</h3>
                <span className="section-card-tag">Главный экран</span>
              </div>

              <div className="store-toggles-grid">
                <div className="store-toggle-row">
                  <div>
                    <span className="toggle-label">
                      {t.storeAtmosphereSunburst || "Солнечные лучи"}
                    </span>
                    <span className="toggle-sub">
                      Анимированные лучи света на фоне
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch-btn ${
                      sunburstEnabled ? "on" : "off"
                    }`}
                    onClick={() =>
                      toggleAtmosphere(
                        "omega:atmosphereSunburst",
                        sunburstEnabled,
                        setSunburstEnabled,
                      )
                    }
                  >
                    <span>{sunburstEnabled ? "ВКЛ" : "ВЫКЛ"}</span>
                  </button>
                </div>

                <div className="store-toggle-row">
                  <div>
                    <span className="toggle-label">
                      {t.storeAtmosphereSparks || "Парящие искры"}
                    </span>
                    <span className="toggle-sub">
                      Частицы изумрудной пыли в пространстве
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch-btn ${
                      sparksEnabled ? "on" : "off"
                    }`}
                    onClick={() =>
                      toggleAtmosphere(
                        "omega:atmosphereSparks",
                        sparksEnabled,
                        setSparksEnabled,
                      )
                    }
                  >
                    <span>{sparksEnabled ? "ВКЛ" : "ВЫКЛ"}</span>
                  </button>
                </div>

                <div className="store-toggle-row">
                  <div>
                    <span className="toggle-label">
                      {t.storeAtmosphereGlow || "Радиальное сияние"}
                    </span>
                    <span className="toggle-sub">
                      Центральное свечение вокруг персонажа
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch-btn ${
                      glowEnabled ? "on" : "off"
                    }`}
                    onClick={() =>
                      toggleAtmosphere(
                        "omega:atmosphereGlow",
                        glowEnabled,
                        setGlowEnabled,
                      )
                    }
                  >
                    <span>{glowEnabled ? "ВКЛ" : "ВЫКЛ"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
