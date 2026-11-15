import React, { useState, useEffect, useRef } from "react";
import { PRESET_SKINS, PRESET_CAPES } from "../../constants/skinPresets";
import { ipc, type MinecraftInsideSkinItem } from "../../services/ipc";
import { IsometricCube } from "../icons/IsometricCube";
import "../../styles/screens.css";

interface StoreScreenProps {
  onBack?: () => void;
  onEquipSkin: (skinUrl: string, model: "default" | "slim") => void;
  onEquipCape: (capeUrl: string | null) => void;
  currentSkinUrl?: string;
}

interface SkinData {
  name: string;
  category: string;
  palette: string[];
  whiteEyes?: boolean;
  url: string;
  model: "default" | "slim";
}

interface RecentSkinItem {
  name: string;
  url: string;
  renderUrl?: string;
  timestamp: number;
  model: "default" | "slim";
}

const RC: Record<string, string> = {
  Обычный: "#aab0ba",
  Редкий: "#9fb6d3",
  Эпический: "#b9a3c7",
  Легендарный: "#d4a088",
};

const SK: SkinData[] = [
  {
    name: "Dream",
    category: "Ютубер",
    palette: ["#ece8dc", "#7fbf5a", "#7fbf5a", "#e6e6e6"],
    url: PRESET_SKINS.dream,
    model: "slim",
  },
  {
    name: "Classic Steve",
    category: "Классика",
    palette: ["#c58c6b", "#4a3320", "#3aa6b0", "#3b3f9a"],
    url: PRESET_SKINS.steve,
    model: "default",
  },
  {
    name: "Slim Alex",
    category: "Классика (3px)",
    palette: ["#c58c6b", "#b5622f", "#6aa84f", "#7a5a3a"],
    url: PRESET_SKINS.alex,
    model: "slim",
  },
  {
    name: "Technoblade",
    category: "Легенда",
    palette: ["#e8a9a0", "#e0c040", "#b83a3a", "#333840"],
    url: PRESET_SKINS.technoblade,
    model: "default",
  },
  {
    name: "Herobrine",
    category: "Крипи",
    palette: ["#c58c6b", "#4a3320", "#3aa6b0", "#3b3f9a"],
    whiteEyes: true,
    url: "https://minotar.net/skin/MHF_Herobrine",
    model: "default",
  },
  {
    name: "Notch",
    category: "Создатель",
    palette: ["#e8a9a0", "#2e2e2e", "#6b4a2e", "#8e9298"],
    url: "https://minotar.net/skin/Notch",
    model: "default",
  },
];

const CP = [
  {
    name: "15th Anniversary Cape",
    desc: "Официальный плащ к 15-летию Minecraft",
    color: "#9d83c4",
    url: PRESET_CAPES.anniversary,
  },
  {
    name: "Migrator Cape",
    desc: "Плащ за миграцию аккаунта Mojang",
    color: "#b5524a",
    url: PRESET_CAPES.migrator,
  },
  {
    name: "Vanilla Cape",
    desc: "Эксклюзивный плащ для владельцев Java & Bedrock",
    color: "#8f6fb8",
    url: PRESET_CAPES.vanilla,
  },
];

const PT: Array<[string, string, string, string]> = [
  ["Малая панда", "Эпический", "Компаньон · Панда", "Очаровательная панда, следующая за игроком и кувыркающаяся при отдыхе."],
  ["Дракончик Края", "Легендарный", "Летающий · Дракон", "Миниатюрный дракон Края с частицами фиолетового пламени вокруг крыльев."],
  ["Полярная лисичка", "Редкий", "Компаньон · Лисичка", "Снежная лиса с ягодой во рту, предупреждающая о приближении враждебных мобов."],
  ["Кибер-дрон Omega", "Легендарный", "Тактический · Дрон", "Голографический сканирующий дрон с подсветкой и звуками сканирования."],
  ["Мудрый совёнок", "Обычный", "Летающий · Сова", "Сидит на плече персонажа и мягко покачивает головой во время движения."],
  ["Слаймик-кубик", "Редкий", "Прыгучий · Слайм", "Полупрозрачный изумрудный слайм, забавно подпрыгивающий в такт шагам."],
];

const CS: Array<[string, string, string, string]> = [
  ["Крылья Архангела", "Легендарный", "Крылья", "Светящиеся белые крылья с динамической физикой взмахов при прыжках."],
  ["Корона Монарха", "Эпический", "Головной убор", "Золотая инкрустированная рубинами корона истинного короля серверов."],
  ["Наушники Neko Neon", "Эпический", "Головной убор", "Тактические чёрные наушники с анимированными светящимися кошачьими ушками."],
  ["Тактический визор", "Редкий", "Маска", "Киберспортивный визор с бегущей строкой данных в реальном времени."],
  ["Шарф Пустоты", "Редкий", "Аксессуар", "Длинный струящийся шарф из ткани тёмной материи с частицами звёздной пыли."],
  ["Ореол Пламени", "Легендарный", "Аура", "Кружащие огненные искры и спирали вокруг персонажа."],
];

const TB = [
  { id: "skins", label: "Скины" },
  { id: "capes", label: "Плащи" },
  { id: "pets", label: "Питомцы" },
  { id: "cos", label: "Косметика" },
  { id: "recent", label: "Недавние" },
] as const;

type TabId = (typeof TB)[number]["id"];

const STORAGE_RECENT_SKINS_KEY = "omega:recent_skins";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
}

export const StoreScreen: React.FC<StoreScreenProps> = ({
  onEquipSkin,
  onEquipCape,
  currentSkinUrl,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("skins");
  const [skinsSubTab, setSkinsSubTab] = useState<"inside" | "presets">("inside");
  const [activeSkin, setActiveSkin] = useState<string>("Dream");
  const [activeCape, setActiveCape] = useState<string>("");
  const [activePet, setActivePet] = useState<string>("Малая панда");
  const [activeCos, setActiveCos] = useState<string>("Крылья Архангела");

  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [nick, setNick] = useState("");

  // Live Minecraft Inside catalog state
  const [insideSkins, setInsideSkins] = useState<MinecraftInsideSkinItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingInside, setIsLoadingInside] = useState<boolean>(false);
  const [insideError, setInsideError] = useState<string | null>(null);
  const [pageJumpInput, setPageJumpInput] = useState<string>("1");
  const [isApplying, setIsApplying] = useState<string | null>(null);

  // Recent skins state with persistent localStorage
  const [recentList, setRecentList] = useState<RecentSkinItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_RECENT_SKINS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      { name: "Dream", url: PRESET_SKINS.dream, timestamp: Date.now() - 60000, model: "slim" },
      { name: "Technoblade", url: PRESET_SKINS.technoblade, timestamp: Date.now() - 7200000, model: "default" },
      { name: "Classic Steve", url: PRESET_SKINS.steve, timestamp: Date.now() - 86400000, model: "default" },
    ];
  });

  const [toast, setToast] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
      setPageJumpInput("1");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Fetch skins from Minecraft Inside API
  useEffect(() => {
    if (activeTab !== "skins" || skinsSubTab !== "inside") return;

    let isCancelled = false;
    setIsLoadingInside(true);
    setInsideError(null);

    ipc.fetchMinecraftInsideSkins(currentPage, debouncedSearch || undefined)
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

    return () => {
      isCancelled = true;
    };
  }, [activeTab, skinsSubTab, currentPage, debouncedSearch]);

  const saveRecentSkin = (
    name: string,
    url: string,
    renderUrl?: string,
    model: "default" | "slim" = "default"
  ) => {
    setRecentList((prev) => {
      const filtered = prev.filter((item) => item.name.toLowerCase() !== name.toLowerCase());
      const updated: RecentSkinItem[] = [
        { name, url, renderUrl, timestamp: Date.now(), model },
        ...filtered,
      ].slice(0, 30);
      try {
        localStorage.setItem(STORAGE_RECENT_SKINS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentList([]);
    try {
      localStorage.removeItem(STORAGE_RECENT_SKINS_KEY);
    } catch {
      // ignore
    }
    showToast("История очищена");
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    setPageJumpInput(String(newPage));
    wrapRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageJumpInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      handlePageChange(parsed);
    } else {
      setPageJumpInput(String(currentPage));
    }
  };

  // Equip skin from Minecraft Inside live catalog
  const handleEquipInsideSkin = async (skin: MinecraftInsideSkinItem) => {
    setIsApplying(skin.nickname);
    try {
      let finalDataUrl = skin.skinUrl;
      try {
        finalDataUrl = await ipc.fetchSkinAsDataUrl(skin.skinUrl);
      } catch (err) {
        console.warn("Proxy download fallback to direct url:", err);
      }
      setActiveSkin(skin.nickname);
      onEquipSkin(finalDataUrl, "default");
      saveRecentSkin(skin.nickname, finalDataUrl, skin.renderUrl, "default");
      showToast(`Скин «${skin.nickname}» надет!`);
    } catch (err: any) {
      showToast(`Ошибка загрузки скина: ${err?.message || err}`);
    } finally {
      setIsApplying(null);
    }
  };

  // Direct nickname equip
  const handleNickEquip = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nick.trim();
    if (!clean) return;

    setIsApplying(clean);
    try {
      const minotarUrl = `https://minotar.net/skin/${encodeURIComponent(clean)}`;
      let finalDataUrl = minotarUrl;
      try {
        finalDataUrl = await ipc.fetchSkinAsDataUrl(minotarUrl);
      } catch (err) {
        console.warn("fetchSkinAsDataUrl error, using direct url:", err);
      }
      setActiveSkin(clean);
      onEquipSkin(finalDataUrl, "default");
      const renderAvatar = `https://minotar.net/avatar/${encodeURIComponent(clean)}/100`;
      saveRecentSkin(clean, finalDataUrl, renderAvatar, "default");
      setNick("");
      showToast(`Скин «${clean}» надет!`);
    } catch (err: any) {
      showToast(`Не удалось примерить скин: ${err?.message || err}`);
    } finally {
      setIsApplying(null);
    }
  };

  const renderFigure = (p: string[], w?: boolean, headOnly?: boolean) => {
    const eyeColor = w ? "#fff" : "#2a2a2a";
    if (headOnly) {
      return (
        <svg viewBox="4 0 8 8" shapeRendering="crispEdges">
          <rect x="4" y="0" width="8" height="8" fill={p[0]} />
          <rect x="4" y="0" width="8" height="3" fill={p[1]} />
          <rect x="5" y="4" width="2" height="1" fill={eyeColor} />
          <rect x="9" y="4" width="2" height="1" fill={eyeColor} />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 16 32" shapeRendering="crispEdges">
        <rect x="4" y="0" width="8" height="8" fill={p[0]} />
        <rect x="4" y="0" width="8" height="3" fill={p[1]} />
        <rect x="5" y="4" width="2" height="1" fill={eyeColor} />
        <rect x="9" y="4" width="2" height="1" fill={eyeColor} />
        <rect x="4" y="8" width="8" height="12" fill={p[2]} />
        <rect x="0" y="8" width="4" height="12" fill={p[2]} />
        <rect x="12" y="8" width="4" height="12" fill={p[2]} />
        <rect x="0" y="17" width="4" height="3" fill={p[0]} />
        <rect x="12" y="17" width="4" height="3" fill={p[0]} />
        <rect x="4" y="20" width="4" height="12" fill={p[3]} />
        <rect x="8" y="20" width="4" height="12" fill={p[3]} />
        <rect x="4" y="29" width="8" height="3" fill="#4a4f58" />
      </svg>
    );
  };

  const q = search.trim().toLowerCase();

  return (
    <div className="screens-overlay-layer store-screen-overlay">
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(14, 18, 26, 0.96)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: "8px",
            fontSize: "12.5px",
            fontWeight: 700,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          }}
        >
          {toast}
        </div>
      )}

      <div className="wrap" ref={wrapRef}>
        {/* Head */}
        <div className="head">
          <div>
            <h1>Магазин Omega</h1>
            <div className="sub">Скины по никам (54 000+), плащи, питомцы и кастомизация</div>
          </div>
          <div className="dock" id="tabs">
            {TB.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`f ${tab.id === activeTab ? "on" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearch("");
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools row */}
        {(activeTab === "skins" || activeTab === "capes" || activeTab === "pets" || activeTab === "cos") && (
          <div className="tools" id="tools">
            {activeTab !== "capes" && (
              <div className="q">
                <input
                  id="q"
                  placeholder={
                    activeTab === "skins"
                      ? "Какой скин ты ищешь? (например: zefaa, Dream, Steve, anime...)"
                      : activeTab === "pets"
                      ? "Поиск питомца по имени или типу…"
                      : "Поиск косметики по названию или категории…"
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}

            {activeTab === "skins" && (
              <form onSubmit={handleNickEquip} style={{ display: "contents" }}>
                <div className="n">
                  <input
                    id="nick"
                    placeholder="Скин по никнейму…"
                    value={nick}
                    onChange={(e) => setNick(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="b nb"
                  id="nb"
                  disabled={!nick.trim() || isApplying === nick.trim()}
                >
                  {isApplying === nick.trim() ? "..." : "Примерить"}
                </button>
              </form>
            )}

            {activeTab === "capes" && (
              <button
                type="button"
                className="b rm"
                id="rm"
                onClick={() => {
                  setActiveCape("");
                  onEquipCape(null);
                  showToast("Плащ снят");
                }}
              >
                Снять плащ
              </button>
            )}

            {activeTab === "pets" && (
              <button
                type="button"
                className="b rm"
                id="rm"
                onClick={() => {
                  setActivePet("");
                  showToast("Питомец отозван");
                }}
              >
                Отозвать питомца
              </button>
            )}

            {activeTab === "cos" && (
              <button
                type="button"
                className="b rm"
                id="rm"
                onClick={() => {
                  setActiveCos("");
                  showToast("Аксессуары сняты");
                }}
              >
                Снять аксессуары
              </button>
            )}
          </div>
        )}

        {/* SKINS SUB-TABS */}
        {activeTab === "skins" && (
          <div className="store-subtabs">
            <button
              type="button"
              className={`store-subtab-btn ${skinsSubTab === "inside" ? "active" : ""}`}
              onClick={() => {
                setSkinsSubTab("inside");
                setCurrentPage(1);
              }}
            >
              <span>Каталог по никам (54 000+)</span>
              {insideSkins.length > 0 && !isLoadingInside && (
                <span style={{ opacity: 0.7 }}>· Стр. {currentPage}/{totalPages}</span>
              )}
            </button>
            <button
              type="button"
              className={`store-subtab-btn ${skinsSubTab === "presets" ? "active" : ""}`}
              onClick={() => setSkinsSubTab("presets")}
            >
              <span>Популярные пресеты ({SK.length})</span>
            </button>
          </div>
        )}

        {/* Content output */}
        <div id="out">
          {/* SKINS TAB */}
          {activeTab === "skins" && (
            <>
              {skinsSubTab === "inside" ? (
                <>
                  {isLoadingInside ? (
                    <div className="store-loading-state">
                      <IsometricCube size={48} variant="emerald" />
                      <div>Загрузка каталога скинов по никам...</div>
                    </div>
                  ) : insideError ? (
                    <div className="store-error-state">
                      <p>Не удалось подключиться к базе скинов: {insideError}</p>
                      <button
                        type="button"
                        className="store-retry-btn"
                        onClick={() => setCurrentPage((p) => p)}
                      >
                        Повторить попытку
                      </button>
                    </div>
                  ) : insideSkins.length === 0 ? (
                    <div className="store-error-state">
                      <p>Скинов не найдено по запросу «{debouncedSearch}»</p>
                      {debouncedSearch && (
                        <button
                          type="button"
                          className="store-retry-btn"
                          onClick={() => setSearch("")}
                        >
                          Сбросить поиск
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div
                        className="grid"
                        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}
                      >
                        {insideSkins.map((skin) => {
                          const isEquipped =
                            activeSkin.toLowerCase() === skin.nickname.toLowerCase() ||
                            currentSkinUrl === skin.skinUrl;
                          const isApplyingThis = isApplying === skin.nickname;

                          return (
                            <div key={`${skin.nickname}-${skin.skinUrl}`} className="card ctr">
                              <div className="pv">
                                <img
                                  src={skin.renderUrl}
                                  alt={skin.nickname}
                                  style={{
                                    width: "72px",
                                    height: "106px",
                                    objectFit: "contain",
                                    imageRendering: "pixelated",
                                  }}
                                  loading="lazy"
                                  onError={(e) => {
                                    // Fallback to minotar skin preview if render fails
                                    (e.target as HTMLImageElement).src = `https://minotar.net/skin/${encodeURIComponent(skin.nickname)}`;
                                  }}
                                />
                              </div>
                              <div className="nm" title={skin.nickname}>{skin.nickname}</div>
                              <div className="ms">Скин по нику</div>
                              <button
                                type="button"
                                className={`b ${isEquipped ? "on" : ""}`}
                                disabled={isApplyingThis}
                                onClick={() => handleEquipInsideSkin(skin)}
                              >
                                {isEquipped ? "✓ Надет" : isApplyingThis ? "..." : "Примерить в 3D"}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Bar */}
                      <div className="store-pagination">
                        <button
                          type="button"
                          className="store-page-btn"
                          disabled={currentPage <= 1 || isLoadingInside}
                          onClick={() => handlePageChange(currentPage - 1)}
                          title="Предыдущая страница"
                        >
                          « Назад
                        </button>

                        <span className="store-page-info">
                          Страница {currentPage} из {totalPages}
                        </span>

                        <form onSubmit={handlePageJump} className="store-page-jump">
                          <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageJumpInput}
                            onChange={(e) => setPageJumpInput(e.target.value)}
                            aria-label="Номер страницы"
                          />
                          <button
                            type="submit"
                            className="store-page-btn"
                            disabled={isLoadingInside}
                          >
                            Перейти
                          </button>
                        </form>

                        <button
                          type="button"
                          className="store-page-btn"
                          disabled={currentPage >= totalPages || isLoadingInside}
                          onClick={() => handlePageChange(currentPage + 1)}
                          title="Следующая страница"
                        >
                          Вперед »
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                /* PRESETS SUBTAB */
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
                  {SK.filter(
                    (s) =>
                      !q ||
                      s.name.toLowerCase().includes(q) ||
                      s.category.toLowerCase().includes(q)
                  ).map((s) => {
                    const isEquipped = activeSkin === s.name || currentSkinUrl === s.url;
                    return (
                      <div key={s.name} className="card ctr">
                        <div className="pv">{renderFigure(s.palette, s.whiteEyes)}</div>
                        <div className="nm">{s.name}</div>
                        <div className="ms">{s.category}</div>
                        <button
                          type="button"
                          className={`b ${isEquipped ? "on" : ""}`}
                          onClick={() => {
                            setActiveSkin(s.name);
                            onEquipSkin(s.url, s.model);
                            saveRecentSkin(s.name, s.url, undefined, s.model);
                            showToast(`Скин ${s.name} надет!`);
                          }}
                        >
                          {isEquipped ? "✓ Надет" : "Примерить в 3D"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* CAPES TAB */}
          {activeTab === "capes" && (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
              {CP.map((c) => {
                const isEquipped = activeCape === c.name;
                return (
                  <div key={c.name} className="card ctr">
                    <div className="pv">
                      <div className="cape" style={{ background: c.color }} />
                    </div>
                    <div className="nm">{c.name}</div>
                    <div className="ds ms">{c.desc}</div>
                    <button
                      type="button"
                      className={`b ${isEquipped ? "on" : ""}`}
                      onClick={() => {
                        setActiveCape(c.name);
                        onEquipCape(c.url);
                        showToast(`Плащ "${c.name}" надет!`);
                      }}
                    >
                      {isEquipped ? "✓ Надет" : "Надеть плащ"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* PETS TAB */}
          {activeTab === "pets" && (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
              {PT.filter((x) => !q || x.join(" ").toLowerCase().includes(q)).map((x) => {
                const isEquipped = activePet === x[0];
                return (
                  <div key={x[0]} className="card">
                    <div className="it">
                      <div className="ico">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
                        </svg>
                      </div>
                      <div>
                        <div className="top">
                          <span className="nm">{x[0]}</span>
                          <span className="tag" style={{ background: RC[x[1]] }}>
                            {x[1]}
                          </span>
                        </div>
                        <div className="ms">{x[2]}</div>
                      </div>
                    </div>
                    <div className="ds">{x[3]}</div>
                    <button
                      type="button"
                      className={`b ${isEquipped ? "on" : ""}`}
                      onClick={() => {
                        setActivePet(x[0]);
                        showToast(`Питомец ${x[0]} выбран!`);
                      }}
                    >
                      {isEquipped ? "✓ Выбран (Активен)" : "+ Призвать питомца"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* COSMETICS TAB */}
          {activeTab === "cos" && (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
              {CS.filter((x) => !q || x.join(" ").toLowerCase().includes(q)).map((x) => {
                const isEquipped = activeCos === x[0];
                return (
                  <div key={x[0]} className="card">
                    <div className="it">
                      <div className="ico">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="top">
                          <span className="nm">{x[0]}</span>
                          <span className="tag" style={{ background: RC[x[1]] }}>
                            {x[1]}
                          </span>
                        </div>
                        <div className="ms">{x[2]}</div>
                      </div>
                    </div>
                    <div className="ds">{x[3]}</div>
                    <button
                      type="button"
                      className={`b ${isEquipped ? "on" : ""}`}
                      onClick={() => {
                        setActiveCos(x[0]);
                        showToast(`Аксессуар "${x[0]}" надет!`);
                      }}
                    >
                      {isEquipped ? "✓ Надет на игрока" : "Примерить аксессуар"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* RECENT TAB */}
          {activeTab === "recent" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div className="cap">История надеваний (Недавние скины)</div>
                {recentList.length > 0 && (
                  <button
                    type="button"
                    className="b rm"
                    onClick={handleClearRecent}
                    style={{ height: "30px", fontSize: "11.5px", padding: "0 10px" }}
                  >
                    Очистить историю
                  </button>
                )}
              </div>

              {recentList.length === 0 ? (
                <div className="empty">История пуста. Выберите любой скин из каталога!</div>
              ) : (
                <div className="grid" style={{ gap: "10px" }}>
                  {recentList.map((item) => {
                    const isEquipped =
                      activeSkin.toLowerCase() === item.name.toLowerCase() ||
                      currentSkinUrl === item.url;
                    return (
                      <div key={`${item.name}-${item.timestamp}`} className="rw">
                        <div className="ico" style={{ overflow: "hidden" }}>
                          {item.renderUrl ? (
                            <img
                              src={item.renderUrl}
                              alt={item.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                imageRendering: "pixelated",
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://minotar.net/avatar/${encodeURIComponent(item.name)}/100`;
                              }}
                            />
                          ) : (
                            <img
                              src={`https://minotar.net/avatar/${encodeURIComponent(item.name)}/100`}
                              alt={item.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                imageRendering: "pixelated",
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <div className="nm">{item.name}</div>
                          <div className="ms">Использовался: {formatRelativeTime(item.timestamp)}</div>
                        </div>
                        <button
                          type="button"
                          className={`b ${isEquipped ? "on" : ""}`}
                          onClick={() => {
                            setActiveSkin(item.name);
                            onEquipSkin(item.url, item.model || "default");
                            saveRecentSkin(item.name, item.url, item.renderUrl, item.model);
                            showToast(`Скин ${item.name} надет!`);
                          }}
                        >
                          {isEquipped ? "✓ Надет" : "Надеть снова"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
