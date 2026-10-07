import React, { useRef, useState } from "react";
import type { Account } from "../../types";
import type { SkinApi, SkinModel } from "../../hooks/useSkin";
import { Skin3DViewer } from "../settings/Skin3DViewer";
import {
  IconCheck,
  IconShirt,
  IconSparkles,
  IconTrash,
  IconSearch,
} from "../../ui/icons";
import {
  PRESET_SKINS,
  type PresetSkin,
} from "./storePresets";

interface OmegaStorePanelProps {
  t: any;
  skinApi: SkinApi;
  account: Account;
  onBack?: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  onUpdateAccountName?: (name: string) => void;
}

type StoreTab = "skins" | "accessories";

export const OmegaStorePanel: React.FC<OmegaStorePanelProps> = ({
  t,
  skinApi,
  account,
  showToast,
  onUpdateAccountName,
}) => {
  const [activeTab, setActiveTab] = useState<StoreTab>("skins");
  const [characterAngle, setCharacterAngle] = useState<number>(0);
  const skinFileInputRef = useRef<HTMLInputElement | null>(null);
  const capeFileInputRef = useRef<HTMLInputElement | null>(null);

  // Search by nickname state
  const [nickQuery, setNickQuery] = useState("");
  const [searchedSkin, setSearchedSkin] = useState<{
    nickname: string;
    url: string;
    avatarUrl: string;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchNick = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = nickQuery.trim();
    if (!q) return;

    setIsSearching(true);
    const skinUrl = `https://minotar.net/skin/${encodeURIComponent(q)}`;
    const avatarUrl = `https://minotar.net/avatar/${encodeURIComponent(q)}/64`;

    // Preload image
    const img = new Image();
    img.onload = () => {
      setSearchedSkin({ nickname: q, url: skinUrl, avatarUrl });
      setIsSearching(false);
      showToast(`Скин для никнейма "${q}" найден!`, "success");
    };
    img.onerror = () => {
      setSearchedSkin({ nickname: q, url: skinUrl, avatarUrl });
      setIsSearching(false);
    };
    img.src = skinUrl;
  };

  const handleApplySearchedSkin = () => {
    if (!searchedSkin) return;
    skinApi.setPresetSkin(searchedSkin.url, "auto");
    if (onUpdateAccountName) {
      onUpdateAccountName(searchedSkin.nickname);
    }
    showToast(
      `Скин "${searchedSkin.nickname}" успешно сохранён в игре!`,
      "success",
    );
  };

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
    if (onUpdateAccountName && preset.nickname) {
      onUpdateAccountName(preset.nickname);
    }
    showToast(
      `${t.storeSkinApplied || "Скин применён"}: ${preset.nameRu} (ник: ${preset.nickname})`,
      "success",
    );
  };


  return (
    <div className="omega-store-page">
      {/* Top Header */}
      <header className="omega-store-header">
        <div className="omega-store-header-left">
          <div className="omega-store-title-wrap">
            <span className="omega-store-badge">Omega</span>
            <h1 className="omega-store-title">
              {t.storeTitle || "Магазин персонажа"}
            </h1>
          </div>
        </div>

        {/* Tab switchers: skins and capes */}
        <nav className="omega-store-nav">
          <button
            type="button"
            className={`omega-store-tab-btn ${activeTab === "skins" ? "active" : ""}`}
            onClick={() => setActiveTab("skins")}
          >
            <IconShirt />
            <span>{t.storeTabSkins || "Скины"}</span>
          </button>

          <button
            type="button"
            className={`omega-store-tab-btn ${activeTab === "accessories" ? "active" : ""}`}
            onClick={() => setActiveTab("accessories")}
          >
            <IconSparkles />
            <span>{t.storeTabCapes || "Плащи"}</span>
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="omega-store-body">
        {/* TAB 1: SKINS */}
        {activeTab === "skins" && (
          <div className="store-split-layout">
            <div className="store-scroll-col">
              {/* Search by Nickname Card */}
              <div className="store-section-card">
                <div className="section-card-header">
                  <h3>Найти скин по нику (с сохранением в игре)</h3>
                  <span className="section-card-tag">Online API</span>
                </div>
                <form className="store-nick-search-form" onSubmit={handleSearchNick}>
                  <div className="nick-search-input-wrap">
                    <IconSearch size={16} />
                    <input
                      type="text"
                      className="nick-search-input"
                      placeholder="Введите никнейм (Notch, Dream, Steve...)"
                      value={nickQuery}
                      onChange={(e) => setNickQuery(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="nick-search-submit-btn"
                    disabled={isSearching || !nickQuery.trim()}
                  >
                    <span>{isSearching ? "Поиск..." : "Найти"}</span>
                  </button>
                </form>

                {searchedSkin && (
                  <div className="store-found-skin-card">
                    <img
                      src={searchedSkin.avatarUrl}
                      alt={searchedSkin.nickname}
                      className="found-skin-avatar"
                    />
                    <div className="found-skin-meta">
                      <span className="found-skin-name">{searchedSkin.nickname}</span>
                      <span className="found-skin-sub">Готов к сохранению в игре</span>
                    </div>
                    <button
                      type="button"
                      className="found-skin-apply-btn"
                      onClick={handleApplySearchedSkin}
                    >
                      <span>Применить скин и ник</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Custom Skin Card */}
              <div className="store-section-card">
                <div className="section-card-header">
                  <h3>{t.storeCustomSkin || "Свой скин"}</h3>
                  <span className="section-card-tag">PNG 64x64</span>
                </div>
                <p className="section-card-desc">
                  {t.storeCustomSkinDesc ||
                    "Загрузите PNG-файл вашего скина. Поддерживаются классические модели и тонкие руки Slim."}
                </p>

                <div className="store-actions-row">
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
                    <span>{t.storeUploadSkinBtn || "Загрузить скин (PNG)"}</span>
                  </button>

                  {skinApi.customSkinUrl && (
                    <button
                      type="button"
                      className="store-reset-btn"
                      onClick={skinApi.resetSkin}
                      title="Сбросить на дефолтный"
                    >
                      <IconTrash />
                      <span>{t.storeResetBtn || "Сбросить"}</span>
                    </button>
                  )}
                </div>

                <div className="store-model-selector-row">
                  <span className="model-selector-label">
                    {t.storeModelType || "Тип модели"}:
                  </span>
                  <div className="model-selector-chips">
                    {(["auto", "classic", "slim"] as SkinModel[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`model-chip-btn ${skinApi.skinModel === m ? "active" : ""}`}
                        onClick={() => skinApi.setSkinModel(m)}
                      >
                        {m === "auto"
                          ? "Авто"
                          : m === "classic"
                            ? "Стив (4px)"
                            : "Алекс (3px)"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preset Skins Grid */}
              <div className="store-section-card">
                <div className="section-card-header">
                  <h3>{t.storePresetSkins || "Каталог популярных скинов"}</h3>
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
                        <div className="preset-avatar-box">
                          <img
                            src={preset.avatarUrl}
                            alt={preset.nameRu}
                            className="preset-avatar-img"
                            loading="lazy"
                          />
                          <span className="preset-badge-tag">{preset.tag}</span>
                        </div>

                        <div className="preset-card-meta">
                          <div className="preset-card-title-row">
                            <span className="preset-title">{preset.nameRu}</span>
                            <span className="preset-model-type">
                              {preset.model === "slim" ? "Slim" : "Classic"}
                            </span>
                          </div>
                          <div className="preset-nick-tag">Ник: {preset.nickname}</div>
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
                              onClick={() => handleSelectPresetSkin(preset)}
                            >
                              <span>Применить в игре</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3D Preview Stage */}
            <div className="store-preview-stage-wrap">
              <div className="store-preview-stage-card">
                <div className="preview-stage-header">
                  <span className="preview-heading">3D Предпросмотр</span>
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

                <div className="preview-stage-canvas">
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
                    animation="wave"
                    loading={skinApi.skinLoading}
                    rotationY={characterAngle === 180 ? Math.PI : 0}
                  />
                </div>

                <div className="preview-stage-info-pill">
                  <span className="pill-user">{account.name}</span>
                  <span className="pill-model">
                    {skinApi.skinModel === "slim"
                      ? "Slim модель (3px)"
                      : "Classic модель (4px)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACCESSORIES (CAPES) */}
        {activeTab === "accessories" && (
          <div className="store-split-layout">
            <div className="store-scroll-col">
              {/* Cape Visibility & Custom Upload */}
              <div className="store-section-card">
                <div className="section-card-header">
                  <h3>{t.storeCapesSettings || "Настройки плаща"}</h3>
                  <span className="section-card-tag">Плащи</span>
                </div>
                <p className="section-card-desc">
                  Загрузите PNG-файл вашего плаща или управляйте его видимостью в игре.
                </p>

                <div className="store-actions-row">
                  <button
                    type="button"
                    className={`store-toggle-cape-btn ${
                      skinApi.capeEnabled ? "active" : ""
                    }`}
                    onClick={() => skinApi.setCapeEnabled(!skinApi.capeEnabled)}
                  >
                    <span>
                      {skinApi.capeEnabled
                        ? "Плащ отображается (ВКЛ)"
                        : "Плащ скрыт (ВЫКЛ)"}
                    </span>
                  </button>

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
                    <span>Загрузить свой плащ</span>
                  </button>

                  {skinApi.customCapeUrl && (
                    <button
                      type="button"
                      className="store-reset-btn"
                      onClick={skinApi.resetCape}
                      title="Сбросить плащ"
                    >
                      <IconTrash />
                      <span>{t.storeResetBtn || "Сбросить"}</span>
                    </button>
                  )}
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

                <div className="preview-stage-canvas">
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
                    rotationY={characterAngle === 180 ? Math.PI : 0}
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
      </div>
    </div>
  );
};
