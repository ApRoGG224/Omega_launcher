import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  searchCatalog,
  CatalogItem,
  CatalogSource,
  CatalogTab,
  CatalogLoader,
  CatalogSort,
} from "../../services/catalogService";
import { IsometricCube } from "../icons/IsometricCube";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/screens.css";

interface ModrinthScreenProps {
  onBack?: () => void;
  onInstallMod: (modName: string) => void;
  onInstallModpack?: (modpack: CatalogItem) => void;
}

interface SourceItem {
  name: CatalogSource;
  color: string;
}

const SOURCES: SourceItem[] = [
  { name: "Modrinth", color: "#7fd69e" },
  { name: "CurseForge", color: "#e3946b" },
];

const CATEGORIES: Array<{
  id: CatalogTab;
  label: string;
}> = [
  { id: "modpacks", label: "Сборки" },
  { id: "mods", label: "Моды" },
  { id: "shaders", label: "Шейдеры" },
  { id: "tex", label: "Текстуры" },
];

const PAGE_SIZE = 15;

function renderFallbackIcon(type: CatalogItem["iconFallback"]) {
  switch (type) {
    case "layers":
      return (
        <>
          <path d="m12 3 9 5-9 5-9-5z" />
          <path d="m3 13 9 5 9-5" />
        </>
      );
    case "bolt":
      return <path d="M13 3 5 14h6l-1 7 8-11h-6z" />;
    case "compass":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m15.5 8.5-2 5-5 2 2-5z" />
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.400 1.400M5.600 18.400 7 17M17 7l1.400-1.400" />
        </>
      );
    case "cube":
    default:
      return (
        <>
          <path d="m12 3 8 4.500v9L12 21l-8-4.500v-9z" />
          <path d="m4 7.500 8 4.500 8-4.500M12 12v9" />
        </>
      );
  }
}

interface CatalogCardProps {
  item: CatalogItem;
  isDone: boolean;
  failedImage: boolean;
  onImageError: (id: string) => void;
  onInstall: (item: CatalogItem, itemKey: string) => void;
  activeTab: CatalogTab;
}

const CatalogCard = React.memo<CatalogCardProps>(
  ({ item, isDone, failedImage, onImageError, onInstall, activeTab }) => {
    const { t, lang } = useLanguage();
    const itemKey = `${item.source}-${item.id}`;
    const showImg = !!item.iconUrl && !failedImage;

    const handleInstallClick = useCallback(() => {
      onInstall(item, itemKey);
    }, [item, itemKey, onInstall]);

    const handleImgError = useCallback(() => {
      onImageError(item.id);
    }, [item.id, onImageError]);

    const noDescText = lang === "uk" ? "Немає опису" : lang === "ru" ? "Нет описания" : "No description";
    const installedPackText = lang === "uk" ? "Збірку встановлено" : lang === "ru" ? "Сборка установлена" : "Modpack installed";
    const downloadPackText = lang === "uk" ? "+ Завантажити збірку" : lang === "ru" ? "+ Скачать сборку" : "+ Download modpack";
    const installModText = lang === "uk" ? "+ Встановити" : lang === "ru" ? "+ Установить" : "+ Install";

    return (
      <div className="card">
        <div className="card-ambient-backdrop" aria-hidden="true">
          {showImg ? (
            <img
              src={item.iconUrl}
              alt=""
              className="card-ambient-img"
              loading="lazy"
              onError={handleImgError}
            />
          ) : (
            <div className="card-ambient-fallback" />
          )}
          <div className="card-ambient-overlay" />
        </div>

        <div className="card-left">
          <div className="ico">
            {showImg ? (
              <img
                src={item.iconUrl}
                alt={item.title}
                loading="lazy"
                onError={handleImgError}
              />
            ) : (
              <svg viewBox="0 0 24 24">{renderFallbackIcon(item.iconFallback)}</svg>
            )}
          </div>

          {item.loaders && item.loaders.length > 0 && (
            <div className="card-loaders">
              {item.loaders.slice(0, 2).map((loader) => (
                <span key={loader} className={`tag ${loader}`} title={loader}>
                  {loader}
                </span>
              ))}
              {item.loaders.length > 2 && (
                <span
                  className="tag more"
                  title={item.loaders.slice(2).join(", ")}
                >
                  +{item.loaders.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="bd">
          <div className="t">
            <b title={item.title}>{item.title}</b>
            <span title={`${t("byAuthor", "від")} ${item.author}`}>
              {t("byAuthor", "від")} {item.author}
            </span>
          </div>
          <div className="ds" title={item.desc}>
            {item.desc || noDescText}
          </div>
          <div className="ft">
            <div className="dl">{item.downloadsFormatted}</div>
            <button
              type="button"
              className={`b ${isDone ? "done" : ""}`}
              onClick={handleInstallClick}
            >
              {isDone
                ? activeTab === "modpacks"
                  ? installedPackText
                  : t("installed", "Встановлено")
                : activeTab === "modpacks"
                ? downloadPackText
                : installModText}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

CatalogCard.displayName = "CatalogCard";

export const ModrinthScreen: React.FC<ModrinthScreenProps> = ({
  onInstallMod,
  onInstallModpack,
}) => {
  const { t, lang, setLang } = useLanguage();
  const [activeSource, setActiveSource] = useState<CatalogSource>("Modrinth");
  const [activeTab, setActiveTab] = useState<CatalogTab>("modpacks");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLoader, setSelectedLoader] = useState<CatalogLoader>("");
  const [sortMode, setSortMode] = useState<CatalogSort>("p");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const categories = useMemo(
    () => [
      { id: "modpacks" as CatalogTab, label: t("catModpacks", "Збірки") },
      { id: "mods" as CatalogTab, label: t("catMods", "Моди") },
      { id: "shaders" as CatalogTab, label: t("catShaders", "Шейдери") },
      { id: "tex" as CatalogTab, label: t("catTextures", "Текстури") },
    ],
    [t]
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const trimmed = val.trim().toLowerCase();

    // Secret hidden trigger: typing /ru switches launcher translation to Russian
    if (trimmed === "/ru") {
      setLang("ru");
      setSearch("");
      return;
    }
    // Secret trigger to switch back to Ukrainian
    if (trimmed === "/uk" || trimmed === "/ua") {
      setLang("uk");
      setSearch("");
      return;
    }
    // Secret trigger for English
    if (trimmed === "/en") {
      setLang("en");
      setSearch("");
      return;
    }

    setSearch(val);
  }, [setLang]);

  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const itemsCountRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchItems = useCallback(
    async (signal?: AbortSignal) => {
      const currentReqId = ++reqIdRef.current;
      isLoadingRef.current = true;
      isLoadingMoreRef.current = false;
      hasMoreRef.current = true;
      itemsCountRef.current = 0;
      setIsLoading(true);
      setIsLoadingMore(false);
      setHasMore(true);
      setError(null);

      try {
        const data = await searchCatalog(
          {
            source: activeSource,
            tab: activeTab,
            query: debouncedSearch,
            loader: selectedLoader,
            sort: sortMode,
            limit: PAGE_SIZE,
            offset: 0,
          },
          signal
        );

        if (currentReqId === reqIdRef.current) {
          itemsCountRef.current = data.length;
          hasMoreRef.current = data.length >= PAGE_SIZE;
          setItems(data);
          setHasMore(data.length >= PAGE_SIZE);
          isLoadingRef.current = false;
          setIsLoading(false);
          if (wrapRef.current) {
            wrapRef.current.scrollTop = 0;
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }
        if (currentReqId === reqIdRef.current) {
          isLoadingRef.current = false;
          setError(err?.message || "Не удалось загрузить данные из каталога");
          setIsLoading(false);
        }
      }
    },
    [activeSource, activeTab, debouncedSearch, selectedLoader, sortMode]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchItems(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchItems]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || isLoadingMoreRef.current || !hasMoreRef.current) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const currentReqId = reqIdRef.current;

    try {
      const data = await searchCatalog({
        source: activeSource,
        tab: activeTab,
        query: debouncedSearch,
        loader: selectedLoader,
        sort: sortMode,
        limit: PAGE_SIZE,
        offset: itemsCountRef.current,
      });

      if (currentReqId === reqIdRef.current) {
        if (data.length < PAGE_SIZE) {
          hasMoreRef.current = false;
          setHasMore(false);
        }
        setItems((prev) => {
          const seen = new Set(prev.map((i) => `${i.source}-${i.id}`));
          const newItems = data.filter((i) => !seen.has(`${i.source}-${i.id}`));
          const next = [...prev, ...newItems];
          itemsCountRef.current = next.length;
          return next;
        });
      }
    } catch {
    } finally {
      if (currentReqId === reqIdRef.current) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [
    activeSource,
    activeTab,
    debouncedSearch,
    selectedLoader,
    sortMode,
  ]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const sentinel = sentinelRef.current;
    if (!sentinel || !wrap) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry &&
          entry.isIntersecting &&
          !isLoadingRef.current &&
          !isLoadingMoreRef.current &&
          hasMoreRef.current
        ) {
          loadMore();
        }
      },
      {
        root: wrap,
        rootMargin: "120px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  const handleImageError = useCallback((id: string) => {
    setFailedImages((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  const handleInstall = useCallback(
    (item: CatalogItem, itemKey: string) => {
      setDone((prev) => {
        if (prev[itemKey]) return prev;
        return { ...prev, [itemKey]: true };
      });
      if (activeTab === "modpacks" && onInstallModpack) {
        onInstallModpack(item);
      } else {
        onInstallMod(item.title);
      }
    },
    [activeTab, onInstallMod, onInstallModpack]
  );

  return (
    <div className="screens-overlay-layer catalog-screen-overlay">
      <div className="wrap" ref={wrapRef}>
        <div className="head">
          <div className="dock" id="tabs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`f ${cat.id === activeTab ? "on" : ""}`}
                onClick={() => {
                  setActiveTab(cat.id);
                  setSelectedLoader("");
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="dock src" id="src">
            {SOURCES.map((src) => (
              <button
                key={src.name}
                type="button"
                className={`f ${src.name === activeSource ? "on" : ""}`}
                onClick={() => setActiveSource(src.name)}
              >
                <i style={{ background: src.color }} />
                {src.name}
              </button>
            ))}
          </div>
        </div>

        <div className="tools">
          <div className="sr">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              id="q"
              placeholder={`${t("searchIn", "Пошук у")} ${activeSource} (${lang === "uk" ? "назва або опис" : lang === "ru" ? "название или описание" : "name or description"})...`}
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          {["modpacks", "mods"].includes(activeTab) && (
            <select
              id="ld"
              value={selectedLoader}
              onChange={(e) => setSelectedLoader(e.target.value as CatalogLoader)}
            >
              <option value="">{t("loaderAny", "Завантажувач: Будь-який")}</option>
              <option value="Fabric">Fabric</option>
              <option value="Forge">Forge</option>
              <option value="NeoForge">NeoForge</option>
              <option value="Quilt">Quilt</option>
            </select>
          )}

          <select
            id="so"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as CatalogSort)}
          >
            <option value="p">{t("sortPopularity", "За популярністю")}</option>
            <option value="n">{t("sortRelevance", "За релевантністю")}</option>
            <option value="new">{t("sortRecentlyUpdated", "Нещодавно оновлені")}</option>
          </select>
        </div>

        <div className="grid" id="grid">
          {isLoading ? (
            <div className="catalog-loading">
              <div className="loading-cube">
                <IsometricCube
                  size={48}
                  variant={activeSource === "Modrinth" ? "emerald" : "rust"}
                />
              </div>
              <div>{t("searchIn", "Пошук у")} {activeSource}...</div>
            </div>
          ) : error ? (
            <div className="catalog-error">
              <div>{error}</div>
              <button
                type="button"
                className="catalog-retry-btn"
                onClick={() => fetchItems()}
              >
                Повторить попытку
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="empty">Ничего не найдено по вашему запросу</div>
          ) : (
            items.map((item) => {
              const itemKey = `${item.source}-${item.id}`;
              return (
                <CatalogCard
                  key={itemKey}
                  item={item}
                  isDone={!!done[itemKey]}
                  failedImage={!!failedImages[item.id]}
                  onImageError={handleImageError}
                  onInstall={handleInstall}
                  activeTab={activeTab}
                />
              );
            })
          )}
        </div>

        <div
          ref={sentinelRef}
          style={{ height: "1px", width: "100%", pointerEvents: "none" }}
          aria-hidden="true"
        />

        {isLoadingMore && (
          <div className="catalog-load-more">
            <div className="spin-cube">
              <IsometricCube
                size={24}
                variant={activeSource === "Modrinth" ? "emerald" : "rust"}
              />
            </div>
            <span>
              Загрузка ещё{" "}
              {activeTab === "modpacks"
                ? "сборок"
                : activeTab === "mods"
                ? "модов"
                : activeTab === "shaders"
                ? "шейдеров"
                : "текстур"}
              ...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
