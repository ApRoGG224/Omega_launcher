import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  searchCatalog,
  CatalogItem,
  CatalogSource,
  CatalogTab,
  CatalogLoader,
  CatalogSort,
} from "../../services/catalogService";
import { IsometricCube } from "../icons/IsometricCube";
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

const PAGE_SIZE = 24;

export const ModrinthScreen: React.FC<ModrinthScreenProps> = ({
  onInstallMod,
  onInstallModpack,
}) => {
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

  const wrapRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchItems = useCallback(async (signal?: AbortSignal) => {
    const currentReqId = ++reqIdRef.current;
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
        setItems(data);
        setHasMore(data.length >= PAGE_SIZE);
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
        setError(err?.message || "Не удалось загрузить данные из каталога");
        setIsLoading(false);
      }
    }
  }, [activeSource, activeTab, debouncedSearch, selectedLoader, sortMode]);

  useEffect(() => {
    const controller = new AbortController();
    fetchItems(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchItems]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;

    const currentReqId = reqIdRef.current;
    setIsLoadingMore(true);

    try {
      const data = await searchCatalog({
        source: activeSource,
        tab: activeTab,
        query: debouncedSearch,
        loader: selectedLoader,
        sort: sortMode,
        limit: PAGE_SIZE,
        offset: items.length,
      });

      if (currentReqId === reqIdRef.current) {
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        }
        setItems((prev) => {
          const seen = new Set(prev.map((i) => `${i.source}-${i.id}`));
          const newItems = data.filter((i) => !seen.has(`${i.source}-${i.id}`));
          return [...prev, ...newItems];
        });
        setIsLoadingMore(false);
      }
    } catch {
      if (currentReqId === reqIdRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [
    isLoading,
    isLoadingMore,
    hasMore,
    items.length,
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
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: wrap,
        rootMargin: "300px",
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  const handleScroll = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || isLoading || isLoadingMore || !hasMore) return;
    if (wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 400) {
      loadMore();
    }
  }, [isLoading, isLoadingMore, hasMore, loadMore]);

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const renderFallbackIcon = (type: CatalogItem["iconFallback"]) => {
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
  };

  return (
    <div className="screens-overlay-layer catalog-screen-overlay">
      <div className="wrap" ref={wrapRef} onScroll={handleScroll}>
        {/* Navigation & Source Switch Bar */}
        <div className="head">
          <div className="dock" id="tabs">
            {CATEGORIES.map((cat) => (
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

        {/* Filter and Search Tools */}
        <div className="tools">
          <div className="sr">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              id="q"
              placeholder={`Поиск в ${activeSource} (название или описание)...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {["modpacks", "mods"].includes(activeTab) && (
            <select
              id="ld"
              value={selectedLoader}
              onChange={(e) => setSelectedLoader(e.target.value as CatalogLoader)}
            >
              <option value="">Загрузчик: Любой</option>
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
            <option value="p">По популярности</option>
            <option value="n">По релевантности</option>
            <option value="new">Недавно обновлённые</option>
          </select>
        </div>

        {/* Catalog Items Grid */}
        <div className="grid" id="grid">
          {isLoading ? (
            <div className="catalog-loading">
              <div className="loading-cube">
                <IsometricCube size={48} variant={activeSource === "Modrinth" ? "emerald" : "rust"} />
              </div>
              <div>Поиск в {activeSource}...</div>
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
              const isDone = !!done[itemKey];
              const showImg = !!item.iconUrl && !failedImages[item.id];

              return (
                <div key={itemKey} className="card">
                  <div className="card-ambient-blur" aria-hidden="true">
                    {showImg ? (
                      <img
                        src={item.iconUrl}
                        alt=""
                        onError={() => handleImageError(item.id)}
                      />
                    ) : (
                      <div className={`ambient-fallback ${item.iconFallback}`} />
                    )}
                  </div>

                  <div className="card-left">
                    <div className="ico">
                      {showImg ? (
                        <img
                          src={item.iconUrl}
                          alt={item.title}
                          loading="lazy"
                          onError={() => handleImageError(item.id)}
                        />
                      ) : (
                        <svg viewBox="0 0 24 24">
                          {renderFallbackIcon(item.iconFallback)}
                        </svg>
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
                      <span title={`от ${item.author}`}>от {item.author}</span>
                    </div>
                    <div className="ds" title={item.desc}>
                      {item.desc || "Нет описания"}
                    </div>
                    <div className="ft">
                      <div className="dl">{item.downloadsFormatted}</div>
                      <button
                        type="button"
                        className={`b ${isDone ? "done" : ""}`}
                        onClick={() => {
                          if (!isDone) {
                            setDone((prev) => ({ ...prev, [itemKey]: true }));
                            if (activeTab === "modpacks" && onInstallModpack) {
                              onInstallModpack(item);
                            } else {
                              onInstallMod(item.title);
                            }
                          }
                        }}
                      >
                        {isDone
                          ? activeTab === "modpacks"
                            ? "Сборка установлена"
                            : "Установлено"
                          : activeTab === "modpacks"
                          ? "+ Скачать сборку"
                          : "+ Установить"}
                      </button>
                    </div>
                  </div>
                </div>
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
              Загрузка ещё {activeTab === "modpacks" ? "сборок" : activeTab === "mods" ? "модов" : activeTab === "shaders" ? "шейдеров" : "текстур"}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
