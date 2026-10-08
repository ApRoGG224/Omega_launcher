import React, { useEffect, useRef, useState } from "react";
import type { Account } from "../../types";
import type { SkinApi, SkinModel } from "../../hooks/useSkin";
import { Skin3DViewer } from "../settings/Skin3DViewer";
import {
  IconCheck,
  IconShirt,
  IconSparkles,
  IconTrash,
  IconSearch,
  IconX,
  IconClock,
  IconHistory,
  IconEly,
} from "../../ui/icons";
import {
  ipc,
  type MinecraftInsideSkinItem,
} from "../../services/ipc";

interface OmegaStorePanelProps {
  t: any;
  skinApi: SkinApi;
  account: Account;
  onBack?: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

type StoreTab = "skins" | "accessories";
type SkinsCatalogTab = "catalog" | "recent";

export interface RecentSkinItem {
  id: string;
  nickname: string;
  skinUrl: string;
  renderUrl?: string;
  model: SkinModel;
  wornAt: number;
}

function formatWornTime(time: number): string {
  const diff = Math.floor((Date.now() - time) / 1000);
  if (diff < 60) return "Только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  return `${Math.floor(diff / 86400)} дн. назад`;
}

export const OmegaStorePanel: React.FC<OmegaStorePanelProps> = ({
  t,
  skinApi,
  account,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<StoreTab>("skins");
  const [catalogSubTab, setCatalogSubTab] = useState<SkinsCatalogTab>("catalog");
  const [characterAngle, setCharacterAngle] = useState<number>(0);
  const skinFileInputRef = useRef<HTMLInputElement | null>(null);
  const capeFileInputRef = useRef<HTMLInputElement | null>(null);

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Catalog state
  const [insideSkins, setInsideSkins] = useState<MinecraftInsideSkinItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingInside, setIsLoadingInside] = useState<boolean>(false);
  const [insideError, setInsideError] = useState<string | null>(null);
  const [pageJumpInput, setPageJumpInput] = useState<string>("1");

  // Interaction & Preview state
  const [previewSkinUrl, setPreviewSkinUrl] = useState<string | null>(null);
  const [applyingNick, setApplyingNick] = useState<string | null>(null);

  // Recent skins state (stored in localStorage)
  const [recentSkins, setRecentSkins] = useState<RecentSkinItem[]>(() => {
    try {
      const raw = localStorage.getItem("omega:recent_skins");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const saveRecentSkin = (item: Omit<RecentSkinItem, "wornAt">) => {
    setRecentSkins((prev) => {
      const filtered = prev.filter(
        (s) => s.id !== item.id && s.skinUrl !== item.skinUrl,
      );
      const updated: RecentSkinItem[] = [
        { ...item, wornAt: Date.now() },
        ...filtered,
      ].slice(0, 30);
      try {
        localStorage.setItem("omega:recent_skins", JSON.stringify(updated));
      } catch {
        // ignore quota errors
      }
      return updated;
    });
  };

  const handleRemoveRecentSkin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSkins((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem("omega:recent_skins", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearAllRecent = () => {
    setRecentSkins([]);
    try {
      localStorage.removeItem("omega:recent_skins");
    } catch {}
  };

  // Fetch catalog when page or search query changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingInside(true);
    setInsideError(null);

    if (typeof ipc?.fetchMinecraftInsideSkins === "function") {
      ipc
        .fetchMinecraftInsideSkins(currentPage, searchQuery)
        .then((pageData) => {
          if (isCancelled) return;
          setInsideSkins(pageData?.skins || []);
          setTotalPages(Math.max(1, pageData?.totalPages || 1));
          setIsLoadingInside(false);
        })
        .catch((err) => {
          if (isCancelled) return;
          setInsideError(err?.message || String(err));
          setIsLoadingInside(false);
        });
    } else {
      setIsLoadingInside(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [currentPage, searchQuery]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchInput.trim();
    setSearchQuery(clean);
    setCurrentPage(1);
    setPageJumpInput("1");
    setCatalogSubTab("catalog");
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
    setPageJumpInput("1");
  };

  // Do NOT scroll to top when changing pages, staying smoothly in view
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    setPageJumpInput(String(newPage));
  };

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageJumpInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      handlePageChange(parsed);
    }
  };

  // Preview skin on card click
  const handlePreviewInsideSkin = async (skin: MinecraftInsideSkinItem) => {
    try {
      if (typeof ipc?.fetchSkinAsDataUrl === "function") {
        const dataUrl = await ipc.fetchSkinAsDataUrl(skin.skinUrl);
        setPreviewSkinUrl(dataUrl);
      } else {
        setPreviewSkinUrl(`https://minotar.net/skin/${encodeURIComponent(skin.nickname)}`);
      }
    } catch {
      setPreviewSkinUrl(`https://minotar.net/skin/${encodeURIComponent(skin.nickname)}`);
    }
  };

  const handlePreviewRecentSkin = (recent: RecentSkinItem) => {
    setPreviewSkinUrl(recent.skinUrl);
  };

  // Apply catalog skin (NEVER change account nickname, automatically syncs with Microsoft if licensed or Ely.by if offline)
  const handleApplyInsideSkin = async (skin: MinecraftInsideSkinItem) => {
    setApplyingNick(skin.nickname);
    try {
      let finalSkinData = skin.skinUrl;
      if (typeof ipc?.fetchSkinAsDataUrl === "function") {
        try {
          finalSkinData = await ipc.fetchSkinAsDataUrl(skin.skinUrl);
        } catch {
          // fallback to direct skinUrl
        }
      }

      const modelToUse = skinApi.skinModel === "auto" ? "classic" : skinApi.skinModel;
      skinApi.setPresetSkin(finalSkinData, skinApi.skinModel);
      setPreviewSkinUrl(null);

      if (account.type === "microsoft") {
        await ipc.uploadMicrosoftSkin(finalSkinData, modelToUse);
        skinApi.setSkinSource("microsoft");
      } else if (account.type === "offline") {
        localStorage.setItem(`omega:ely_skin:${account.name}`, finalSkinData);
        localStorage.setItem("omega:ely_skin", finalSkinData);
        skinApi.setSkinSource("ely");
      }

      saveRecentSkin({
        id: skin.nickname,
        nickname: skin.nickname,
        skinUrl: finalSkinData,
        renderUrl: skin.renderUrl,
        model: modelToUse,
      });

      if (account.type === "offline") {
        showToast("Скин применён и сохранён для Ely.by!", "success");
      } else {
        showToast("Скин применён!", "success");
      }
    } catch (err: any) {
      showToast(
        `Скин сохранён локально, но ошибка отправки в Microsoft: ${err?.message || err}`,
        "error",
      );
    } finally {
      setApplyingNick(null);
    }
  };

  // Re-equip a recent skin
  const handleApplyRecentSkin = async (recent: RecentSkinItem) => {
    setApplyingNick(recent.nickname);
    try {
      const modelToUse = recent.model === "auto" ? "classic" : recent.model;
      skinApi.setPresetSkin(recent.skinUrl, recent.model);
      setPreviewSkinUrl(null);

      if (account.type === "microsoft") {
        await ipc.uploadMicrosoftSkin(recent.skinUrl, modelToUse);
        skinApi.setSkinSource("microsoft");
      } else if (account.type === "offline") {
        localStorage.setItem(`omega:ely_skin:${account.name}`, recent.skinUrl);
        localStorage.setItem("omega:ely_skin", recent.skinUrl);
        skinApi.setSkinSource("ely");
      }

      saveRecentSkin(recent);
      if (account.type === "offline") {
        showToast("Скин применён и сохранён для Ely.by!", "success");
      } else {
        showToast("Скин применён!", "success");
      }
    } catch (err: any) {
      showToast(
        `Скин сохранён локально, но ошибка отправки в Microsoft: ${err?.message || err}`,
        "error",
      );
    } finally {
      setApplyingNick(null);
    }
  };

  // Direct nickname lookup fallback (loads direct skin without changing account nickname)
  const handleApplyDirectNick = async (nicknameToApply: string) => {
    const clean = nicknameToApply.trim();
    if (!clean) return;
    setApplyingNick(clean);
    try {
      const minotarUrl = `https://minotar.net/skin/${encodeURIComponent(clean)}`;
      let finalData = minotarUrl;
      if (typeof ipc?.fetchSkinAsDataUrl === "function") {
        try {
          finalData = await ipc.fetchSkinAsDataUrl(minotarUrl);
        } catch {
          // fallback
        }
      }

      const modelToUse = skinApi.skinModel === "auto" ? "classic" : skinApi.skinModel;
      skinApi.setPresetSkin(finalData, skinApi.skinModel);
      setPreviewSkinUrl(null);

      if (account.type === "microsoft") {
        await ipc.uploadMicrosoftSkin(finalData, modelToUse);
        skinApi.setSkinSource("microsoft");
      } else if (account.type === "offline") {
        localStorage.setItem(`omega:ely_skin:${account.name}`, finalData);
        localStorage.setItem("omega:ely_skin", finalData);
        skinApi.setSkinSource("ely");
      }

      saveRecentSkin({
        id: clean,
        nickname: clean,
        skinUrl: finalData,
        renderUrl: `https://minotar.net/avatar/${encodeURIComponent(clean)}/100`,
        model: modelToUse,
      });

      if (account.type === "offline") {
        showToast("Скин применён и сохранён для Ely.by!", "success");
      } else {
        showToast("Скин применён!", "success");
      }
    } catch (err: any) {
      showToast(
        `Скин сохранён локально, но ошибка отправки в Microsoft: ${err?.message || err}`,
        "error",
      );
    } finally {
      setApplyingNick(null);
    }
  };

  const handleSkinUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      const modelToUse = skinApi.skinModel === "slim" ? "slim" : "classic";
      skinApi.setPresetSkin(dataUrl, skinApi.skinModel);
      setPreviewSkinUrl(null);

      if (account.type === "microsoft") {
        try {
          await ipc.uploadMicrosoftSkin(dataUrl, modelToUse);
          skinApi.setSkinSource("microsoft");
        } catch (err: any) {
          showToast(
            `Скин сохранён локально, но ошибка отправки в Microsoft: ${err?.message || err}`,
            "error",
          );
          return;
        }
      } else if (account.type === "offline") {
        localStorage.setItem(`omega:ely_skin:${account.name}`, dataUrl);
        localStorage.setItem("omega:ely_skin", dataUrl);
        skinApi.setSkinSource("ely");
      }

      saveRecentSkin({
        id: `custom-${Date.now()}`,
        nickname: "Свой скин",
        skinUrl: dataUrl,
        renderUrl: dataUrl,
        model: modelToUse,
      });

      if (account.type === "offline") {
        showToast("Скин применён и сохранён для Ely.by!", "success");
      } else {
        showToast("Скин применён!", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const [isOpeningEly, setIsOpeningEly] = useState(false);

  const handleOpenElyLogin = async () => {
    setIsOpeningEly(true);
    try {
      if (typeof ipc?.openElyLogin === "function") {
        await ipc.openElyLogin();
        showToast("Открываем окно входа в Ely.by...", "success");
      } else if (typeof ipc?.openUrl === "function") {
        await ipc.openUrl("https://account.ely.by/login");
        showToast("Открываем страницу входа в Ely.by в браузере...", "success");
      } else {
        window.open("https://account.ely.by/login", "_blank");
        showToast("Открываем страницу входа в Ely.by в браузере...", "success");
      }
    } catch {
      if (typeof ipc?.openUrl === "function") {
        try {
          await ipc.openUrl("https://account.ely.by/login");
          showToast("Открываем страницу входа в Ely.by в браузере...", "success");
          return;
        } catch {}
      }
      window.open("https://account.ely.by/login", "_blank");
      showToast("Открываем страницу входа в Ely.by в браузере...", "success");
    } finally {
      setTimeout(() => setIsOpeningEly(false), 800);
    }
  };

  const handleCapeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void skinApi.uploadCape(file).then(() => {
        showToast("Плащ применён!", "success");
      });
    }
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
              {/* Redesigned Search by Nickname Card */}
              <div className="store-section-card store-inside-search-card">
                <div className="section-card-header">
                  <div className="section-card-header-left">
                    <h3>Поиск скинов по никам</h3>
                    <span className="section-card-tag">Онлайн база</span>
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      className="store-search-reset-tag-btn"
                      onClick={handleClearSearch}
                      title="Сбросить поиск"
                    >
                      <IconX size={12} />
                      <span>Сбросить поиск</span>
                    </button>
                  )}
                </div>

                <form className="store-inside-search-form" onSubmit={handleSearchSubmit}>
                  <div className="inside-search-input-wrap">
                    <IconSearch size={16} className="inside-search-icon" />
                    <input
                      type="text"
                      className="inside-search-input"
                      placeholder="Какой скин ты ищешь? (например: Notch, creeper, anime...)"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searchInput && (
                      <button
                        type="button"
                        className="inside-search-clear-btn"
                        onClick={() => setSearchInput("")}
                        title="Очистить поле"
                      >
                        <IconX size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="inside-search-submit-btn"
                    disabled={isLoadingInside}
                  >
                    <IconSearch size={14} />
                    <span>Найти</span>
                  </button>
                </form>

                {searchQuery && (
                  <div className="inside-search-feedback-row">
                    <span className="inside-search-feedback-text">
                      Результаты поиска: <strong>«{searchQuery}»</strong>{" "}
                      (найдено: {insideSkins.length})
                    </span>
                    <button
                      type="button"
                      className="inside-direct-nick-btn"
                      disabled={applyingNick === searchQuery}
                      onClick={() => handleApplyDirectNick(searchQuery)}
                      title={`Применить официальный скин по точному нику "${searchQuery}"`}
                    >
                      <span>Применить ник «{searchQuery}» напрямую</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-Tabs: Skins Catalog vs Recent Skins */}
              <div className="store-section-card store-catalog-main-card">
                <div className="section-card-header">
                  <div className="catalog-tab-switchers">
                    <button
                      type="button"
                      className={`catalog-tab-btn ${catalogSubTab === "catalog" ? "active" : ""}`}
                      onClick={() => setCatalogSubTab("catalog")}
                    >
                      <IconShirt />
                      <span>Каталог скинов</span>
                      <span className="catalog-pill-count">50 000+</span>
                    </button>
                    <button
                      type="button"
                      className={`catalog-tab-btn ${catalogSubTab === "recent" ? "active" : ""}`}
                      onClick={() => setCatalogSubTab("recent")}
                    >
                      <IconHistory />
                      <span>Недавние скины</span>
                      {recentSkins.length > 0 && (
                        <span className="catalog-pill-count">{recentSkins.length}</span>
                      )}
                    </button>
                  </div>

                  {catalogSubTab === "catalog" && (
                    <span className="section-card-tag">
                      Стр. {currentPage} из {totalPages}
                    </span>
                  )}

                  {catalogSubTab === "recent" && recentSkins.length > 0 && (
                    <button
                      type="button"
                      className="store-clear-history-btn"
                      onClick={handleClearAllRecent}
                      title="Очистить историю недавних скинов"
                    >
                      <IconTrash size={12} />
                      <span>Очистить историю</span>
                    </button>
                  )}
                </div>

                {/* SubTab 1: Live Catalog */}
                {catalogSubTab === "catalog" && (
                  <div className="inside-catalog-content">
                    {isLoadingInside ? (
                      <div className="inside-catalog-loading">
                        <div className="inside-loading-spinner" />
                        <span>Загрузка скинов...</span>
                      </div>
                    ) : insideError ? (
                      <div className="inside-catalog-error">
                        <p>Не удалось загрузить каталог: {insideError}</p>
                        <button
                          type="button"
                          className="inside-retry-btn"
                          onClick={() => {
                            setCurrentPage((p) => p);
                          }}
                        >
                          Повторить попытку
                        </button>
                      </div>
                    ) : insideSkins.length === 0 ? (
                      <div className="inside-catalog-empty">
                        <p>Скинов не найдено по запросу «{searchQuery}»</p>
                        <button
                          type="button"
                          className="inside-retry-btn"
                          onClick={handleClearSearch}
                        >
                          Показать все скины
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="inside-skins-grid">
                          {insideSkins.map((skin) => {
                            const isCurrent =
                              skinApi.activeSkinUrl === skin.skinUrl ||
                              skinApi.customSkinUrl === skin.skinUrl;
                            const isPreviewing = previewSkinUrl === skin.skinUrl;
                            const isApplyingThis = applyingNick === skin.nickname;

                            return (
                              <div
                                key={`${skin.nickname}-${skin.skinUrl}`}
                                className={`inside-skin-card ${isCurrent ? "current-active" : ""} ${isPreviewing ? "previewing" : ""}`}
                                onClick={() => handlePreviewInsideSkin(skin)}
                                title={`Кликните для 3D предпросмотра ${skin.nickname}`}
                              >
                                <div className="inside-skin-render-wrap">
                                  <img
                                    src={skin.renderUrl}
                                    alt={skin.nickname}
                                    className="inside-skin-render-img"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `https://minotar.net/avatar/${encodeURIComponent(skin.nickname)}/100`;
                                    }}
                                  />
                                </div>
                                <div className="inside-skin-meta">
                                  <span className="inside-skin-nick" title={skin.nickname}>
                                    {skin.nickname}
                                  </span>
                                </div>
                                <div className="inside-skin-actions">
                                  {isCurrent ? (
                                    <div className="inside-skin-active-tag">
                                      <IconCheck size={13} />
                                      <span>Надет</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="inside-skin-equip-btn"
                                      disabled={isApplyingThis}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyInsideSkin(skin);
                                      }}
                                    >
                                      <span>
                                        {isApplyingThis ? "..." : "Надеть"}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Minecraft Themed Pagination Bar */}
                        <div className="inside-pagination-bar">
                          <button
                            type="button"
                            className="inside-page-nav-btn"
                            disabled={currentPage <= 1 || isLoadingInside}
                            onClick={() => handlePageChange(1)}
                            title="Первая страница"
                          >
                            « Первая
                          </button>
                          <button
                            type="button"
                            className="inside-page-nav-btn"
                            disabled={currentPage <= 1 || isLoadingInside}
                            onClick={() => handlePageChange(currentPage - 1)}
                            title="Предыдущая страница"
                          >
                            ‹ Назад
                          </button>

                          <div className="inside-page-indicator">
                            <span>Стр. {currentPage} / {totalPages}</span>
                          </div>

                          <button
                            type="button"
                            className="inside-page-nav-btn"
                            disabled={currentPage >= totalPages || isLoadingInside}
                            onClick={() => handlePageChange(currentPage + 1)}
                            title="Следующая страница"
                          >
                            Вперед ›
                          </button>
                          <button
                            type="button"
                            className="inside-page-nav-btn"
                            disabled={currentPage >= totalPages || isLoadingInside}
                            onClick={() => handlePageChange(totalPages)}
                            title="Последняя страница"
                          >
                            Последняя »
                          </button>

                          {/* Stepped Notched Page Jump Form */}
                          <form
                            className="inside-page-jump-form"
                            onSubmit={handlePageJumpSubmit}
                          >
                            <input
                              type="number"
                              min={1}
                              max={totalPages}
                              className="inside-page-jump-input"
                              value={pageJumpInput}
                              onChange={(e) => setPageJumpInput(e.target.value)}
                              title="Номер страницы"
                            />
                            <button type="submit" className="inside-page-jump-submit">
                              Перейти
                            </button>
                          </form>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* SubTab 2: Recent Skins */}
                {catalogSubTab === "recent" && (
                  <div className="recent-skins-container">
                    {recentSkins.length === 0 ? (
                      <div className="inside-catalog-empty">
                        <IconClock size={36} />
                        <p style={{ fontSize: "14px", fontWeight: 700, margin: "4px 0" }}>
                          История недавних скинов пуста
                        </p>
                        <span style={{ fontSize: "12px", color: "#64748b", maxWidth: "340px", marginBottom: "8px" }}>
                          Скины, которые вы надеваете в лаунчере, будут сохраняться здесь для быстрого переключения.
                        </span>
                        <button
                          type="button"
                          className="inside-retry-btn"
                          onClick={() => setCatalogSubTab("catalog")}
                        >
                          Перейти в каталог скинов
                        </button>
                      </div>
                    ) : (
                      <div className="inside-skins-grid">
                        {recentSkins.map((recent) => {
                          const isCurrent =
                            skinApi.activeSkinUrl === recent.skinUrl ||
                            skinApi.customSkinUrl === recent.skinUrl;
                          const isPreviewing = previewSkinUrl === recent.skinUrl;
                          const isApplyingThis = applyingNick === recent.nickname;

                          return (
                            <div
                              key={`${recent.id}-${recent.wornAt}`}
                              className={`inside-skin-card recent-skin-card ${isCurrent ? "current-active" : ""} ${isPreviewing ? "previewing" : ""}`}
                              onClick={() => handlePreviewRecentSkin(recent)}
                              title={`Кликните для 3D предпросмотра ${recent.nickname}`}
                            >
                              <button
                                type="button"
                                className="recent-skin-remove-btn"
                                onClick={(e) => handleRemoveRecentSkin(recent.id, e)}
                                title="Удалить из недавних"
                              >
                                <IconX size={10} />
                              </button>

                              <div className="inside-skin-render-wrap">
                                <img
                                  src={recent.renderUrl || recent.skinUrl}
                                  alt={recent.nickname}
                                  className="inside-skin-render-img"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://minotar.net/avatar/${encodeURIComponent(recent.nickname)}/100`;
                                  }}
                                />
                              </div>

                              <div className="inside-skin-meta">
                                <span className="inside-skin-nick" title={recent.nickname}>
                                  {recent.nickname}
                                </span>
                                <span className="recent-skin-date">
                                  {formatWornTime(recent.wornAt)}
                                </span>
                              </div>

                              <div className="inside-skin-actions">
                                {isCurrent ? (
                                  <div className="inside-skin-active-tag">
                                    <IconCheck size={13} />
                                    <span>Надет</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="inside-skin-equip-btn"
                                    disabled={isApplyingThis}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApplyRecentSkin(recent);
                                    }}
                                  >
                                    <span>
                                      {isApplyingThis ? "..." : "Надеть"}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Upload Custom Skin & Model Card */}
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

                  <button
                    type="button"
                    className="store-ely-btn"
                    disabled={isOpeningEly}
                    onClick={handleOpenElyLogin}
                    title="Войти в аккаунт Ely.by через браузер для управления и синхронизации скинов"
                  >
                    <IconEly size={16} />
                    <span>{isOpeningEly ? "Открытие..." : "Войти в Ely.by"}</span>
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
                    skinUrl={previewSkinUrl || skinApi.activeSkinUrl}
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

                {previewSkinUrl && previewSkinUrl !== skinApi.activeSkinUrl && (
                  <div className="preview-notice-banner">
                    <span>Предпросмотр скина</span>
                    <button
                      type="button"
                      className="preview-cancel-btn"
                      onClick={() => setPreviewSkinUrl(null)}
                    >
                      Сбросить предпросмотр
                    </button>
                  </div>
                )}

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
