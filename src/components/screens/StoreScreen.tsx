import React, { useState, useEffect, useRef, useCallback } from "react";
import { PRESET_SKINS, PRESET_CAPES } from "../../constants/skinPresets";
import {
  ipc,
  type MinecraftInsideSkinItem,
  type MicrosoftCapeItem,
} from "../../services/ipc";
import { IsometricCube } from "../icons/IsometricCube";
import { Cape3DViewer } from "../common/Cape3DViewer";
import { Crown3DViewer } from "../common/Crown3DViewer";
import { Wardrobe3DViewer, type WardrobeFocusZone } from "../common/Wardrobe3DViewer";
import type { AccountData } from "../../types";
import "../../styles/screens.css";

interface StoreScreenProps {
  onBack?: () => void;
  onEquipSkin: (skinUrl: string, model: "default" | "slim") => void;
  onEquipCape: (capeUrl: string | null) => void;
  currentSkinUrl?: string;
  currentCapeUrl?: string | null;
  skinModel?: "default" | "slim";
  account?: AccountData;
  onLoginMicrosoft?: () => Promise<void>;
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

const CAPE_METADATA: Record<string, { title: string; desc: string }> = {
  migrator: {
    title: "Migrator Cape",
    desc: "Официальный плащ за миграцию аккаунта Mojang в Microsoft",
  },
  "15th anniversary": {
    title: "15th Anniversary Cape",
    desc: "Праздничный плащ к 15-летию Minecraft (2024)",
  },
  "15_year": {
    title: "15th Anniversary Cape",
    desc: "Праздничный плащ к 15-летию Minecraft (2024)",
  },
  vanilla: {
    title: "Vanilla Cape",
    desc: "Эксклюзивный плащ для владельцев Java & Bedrock",
  },
  "cherry blossom": {
    title: "Cherry Blossom Cape",
    desc: "Плащ цветения сакуры в честь голосования мобов Minecraft Live 2023",
  },
  cherry: {
    title: "Cherry Blossom Cape",
    desc: "Плащ цветения сакуры в честь голосования мобов Minecraft Live 2023",
  },
  "purple heart": {
    title: "Twitch Purple Heart Cape",
    desc: "Эксклюзивный фиолетовый плащ за поддержку стримеров на Twitch",
  },
  twitch: {
    title: "Twitch Cape",
    desc: "Официальный плащ Twitch за просмотр трансляций Minecraft",
  },
  tiktok: {
    title: "TikTok Cape",
    desc: "Эксклюзивный плащ коллаборации с TikTok",
  },
  "mojang studios": {
    title: "Mojang Studios Cape",
    desc: "Официальный плащ разработчиков и сотрудников Mojang Studios",
  },
  mojang: {
    title: "Mojang Studios Cape",
    desc: "Официальный плащ разработчиков и сотрудников Mojang Studios",
  },
  prismarine: {
    title: "MCC Prismarine Cape",
    desc: "Плащ совместного 15-летия Minecraft и чемпионата MCC",
  },
  mcc: {
    title: "MCC Prismarine Cape",
    desc: "Плащ совместного 15-летия Minecraft и чемпионата MCC",
  },
  follower: {
    title: "Follower Cape",
    desc: "Эксклюзивный плащ подписчика сообщества Minecraft",
  },
  pan: {
    title: "Pancake Cape",
    desc: "Эксклюзивный плащ со сковородой и блинчиками",
  },
  pancake: {
    title: "Pancake Cape",
    desc: "Эксклюзивный плащ со сковородой и блинчиками",
  },
};

function getCapeDetails(cape: MicrosoftCapeItem): { title: string; desc: string } {
  const rawAlias = (cape.alias || "").trim();
  const lower = rawAlias.toLowerCase();
  if (CAPE_METADATA[lower]) {
    return CAPE_METADATA[lower];
  }
  for (const [key, meta] of Object.entries(CAPE_METADATA)) {
    if (lower.includes(key)) {
      return meta;
    }
  }
  return {
    title: rawAlias ? `${rawAlias} Cape` : "Minecraft Cape",
    desc: "Официальный плащ учётной записи Microsoft Mojang",
  };
}

const PT: Array<[string, string, string, string]> = [
  ["Малая панда", "Эпический", "Компаньон · Панда", "Очаровательная панда, следующая за игроком и кувыркающаяся при отдыхе."],
  ["Дракончик Края", "Легендарный", "Летающий · Дракон", "Миниатюрный дракон Края с частицами фиолетового пламени вокруг крыльев."],
  ["Полярная лисичка", "Редкий", "Компаньон · Лисичка", "Снежная лиса с ягодой во рту, предупреждающая о приближении враждебных мобов."],
  ["Кибер-дрон Omega", "Легендарный", "Тактический · Дрон", "Голографический сканирующий дрон с подсветкой и звуками сканирования."],
  ["Мудрый совёнок", "Обычный", "Летающий · Сова", "Сидит на плече персонажа и мягко покачивает головой во время движения."],
  ["Слаймик-кубик", "Редкий", "Прыгучий · Слайм", "Полупрозрачный изумрудный слайм, забавно подпрыгивающий в такт шагам."],
];

const CS: string[] = [
  "Корона Монарха",
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

const InsideSkinCard = React.memo<{
  skin: MinecraftInsideSkinItem;
  isEquipped: boolean;
  isApplying: boolean;
  onEquip: (skin: MinecraftInsideSkinItem) => void;
}>(({ skin, isEquipped, isApplying, onEquip }) => {
  return (
    <div className="card ctr">
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
            (e.target as HTMLImageElement).src = `https://minotar.net/skin/${encodeURIComponent(skin.nickname)}`;
          }}
        />
      </div>
      <div className="nm" title={skin.nickname}>{skin.nickname}</div>
      <div className="ms">Скин по нику</div>
      <button
        type="button"
        className={`b ${isEquipped ? "on" : ""}`}
        disabled={isApplying}
        onClick={() => onEquip(skin)}
      >
        {isEquipped ? "✓ Надет" : isApplying ? "..." : "Примерить в 3D"}
      </button>
    </div>
  );
});
InsideSkinCard.displayName = "InsideSkinCard";

export const StoreScreen: React.FC<StoreScreenProps> = ({
  onEquipSkin,
  onEquipCape,
  currentSkinUrl,
  currentCapeUrl,
  skinModel = "default",
  account,
  onLoginMicrosoft,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("skins");
  const [activeSkin, setActiveSkin] = useState<string>("Dream");
  const [activeCape, setActiveCape] = useState<string>("");
  const [activePet, setActivePet] = useState<string>("Малая панда");
  const [activeCos, setActiveCos] = useState<string>(() => {
    return localStorage.getItem("omega:equipped_cosmetic") || "Корона Монарха";
  });
  const [wardrobeFocus, setWardrobeFocus] = useState<WardrobeFocusZone>("full");

  const [msCapes, setMsCapes] = useState<MicrosoftCapeItem[]>([]);
  const [isLoadingCapes, setIsLoadingCapes] = useState<boolean>(false);
  const [capesError, setCapesError] = useState<string | null>(null);
  const [equippingCapeId, setEquippingCapeId] = useState<string | null>(null);
  const [isLoggingInMs, setIsLoggingInMs] = useState<boolean>(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [nick, setNick] = useState("");

  const [insideSkins, setInsideSkins] = useState<MinecraftInsideSkinItem[]>([]);
  const [isLoadingInside, setIsLoadingInside] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [insideError, setInsideError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<string | null>(null);

  const currentPageRef = useRef<number>(1);
  const totalPagesRef = useRef<number>(1);
  const isLoadingRef = useRef<boolean>(false);
  const isLoadingMoreRef = useRef<boolean>(false);
  const hasMoreRef = useRef<boolean>(true);
  const reqIdRef = useRef<number>(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [recentList, setRecentList] = useState<RecentSkinItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_RECENT_SKINS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
    }
    return [
      { name: "Dream", url: PRESET_SKINS.dream, timestamp: Date.now() - 60000, model: "slim" },
      { name: "Technoblade", url: PRESET_SKINS.technoblade, timestamp: Date.now() - 7200000, model: "default" },
      { name: "Classic Steve", url: PRESET_SKINS.steve, timestamp: Date.now() - 86400000, model: "default" },
    ];
  });

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchInitialSkins = useCallback(async () => {
    if (activeTab !== "skins") return;

    const currentReqId = ++reqIdRef.current;
    currentPageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    isLoadingRef.current = true;
    setIsLoadingInside(true);
    setInsideError(null);

    try {
      const pageData = await ipc.fetchMinecraftInsideSkins(1, debouncedSearch || undefined);
      if (currentReqId === reqIdRef.current) {
        setInsideSkins(pageData?.skins || []);
        totalPagesRef.current = Math.max(1, pageData?.totalPages || 1);
        const more = (pageData?.hasNext ?? false) || (pageData?.currentPage < (pageData?.totalPages || 1));
        hasMoreRef.current = more;
        setHasMore(more);
      }
    } catch (err: any) {
      if (currentReqId === reqIdRef.current) {
        setInsideError(err?.message || String(err));
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        isLoadingRef.current = false;
        setIsLoadingInside(false);
      }
    }
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    fetchInitialSkins();
  }, [fetchInitialSkins]);

  const loadMore = useCallback(async () => {
    if (
      isLoadingRef.current ||
      isLoadingMoreRef.current ||
      !hasMoreRef.current ||
      activeTab !== "skins"
    ) {
      return;
    }

    const nextPage = currentPageRef.current + 1;
    if (nextPage > totalPagesRef.current) {
      hasMoreRef.current = false;
      setHasMore(false);
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    const currentReqId = reqIdRef.current;

    try {
      const pageData = await ipc.fetchMinecraftInsideSkins(nextPage, debouncedSearch || undefined);
      if (currentReqId === reqIdRef.current) {
        currentPageRef.current = nextPage;
        totalPagesRef.current = Math.max(totalPagesRef.current, pageData?.totalPages || 1);
        const more = (pageData?.hasNext ?? false) || (nextPage < totalPagesRef.current);
        hasMoreRef.current = more;
        setHasMore(more);

        setInsideSkins((prev) => {
          const seen = new Set(prev.map((s) => s.skinUrl));
          const newSkins = (pageData?.skins || []).filter((s) => !seen.has(s.skinUrl));
          return [...prev, ...newSkins];
        });
      }
    } catch (err) {
      console.warn("Failed to load more skins:", err);
    } finally {
      if (currentReqId === reqIdRef.current) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || activeTab !== "skins") return;

    const handleScroll = () => {
      if (
        !isLoadingRef.current &&
        !isLoadingMoreRef.current &&
        hasMoreRef.current
      ) {
        const scrollBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight;
        if (scrollBottom < 350) {
          loadMore();
        }
      }
    };

    wrap.addEventListener("scroll", handleScroll, { passive: true });

    let observer: IntersectionObserver | null = null;
    const sentinel = sentinelRef.current;
    if (sentinel && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
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
          rootMargin: "300px",
          threshold: 0,
        }
      );
      observer.observe(sentinel);
    }

    return () => {
      wrap.removeEventListener("scroll", handleScroll);
      if (observer) observer.disconnect();
    };
  }, [loadMore, activeTab, insideSkins.length]);

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
      }
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentList([]);
    try {
      localStorage.removeItem(STORAGE_RECENT_SKINS_KEY);
    } catch {
    }
    showToast("История очищена");
  };

  const handleEquipInsideSkin = useCallback(async (skin: MinecraftInsideSkinItem) => {
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
  }, [onEquipSkin]);

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

  const handleUnequipCosmetics = useCallback(() => {
    setActiveCos("");
    localStorage.removeItem("omega:equipped_cosmetic");
    localStorage.setItem("omega:equipped_cosmetics", JSON.stringify({ head: null }));
    window.dispatchEvent(
      new CustomEvent("omega:cosmetics_updated", { detail: { head: null, name: "" } })
    );
    setWardrobeFocus("full");
    showToast("Аксессуары сняты");
  }, []);

  const fetchMicrosoftCapes = useCallback(async () => {
    if (!account || account.type !== "microsoft") {
      setMsCapes([]);
      setIsLoadingCapes(false);
      return;
    }

    setIsLoadingCapes(true);
    setCapesError(null);
    try {
      const capes = await ipc.getMicrosoftCapes();
      setMsCapes(capes || []);
      const active = (capes || []).find((c) => c.state === "ACTIVE");
      if (active) {
        setActiveCape(active.id);
      }
    } catch (err: any) {
      console.warn("Failed to fetch Microsoft capes:", err);
      setCapesError(err?.message || String(err));
    } finally {
      setIsLoadingCapes(false);
    }
  }, [account]);

  useEffect(() => {
    if (activeTab === "capes") {
      void fetchMicrosoftCapes();
    }
  }, [activeTab, fetchMicrosoftCapes]);

  const handleEquipCape = async (cape: MicrosoftCapeItem) => {
    setEquippingCapeId(cape.id);
    try {
      await ipc.equipMicrosoftCape(cape.id);
      setActiveCape(cape.id);
      onEquipCape(cape.url);
      setMsCapes((prev) =>
        prev.map((c) => ({
          ...c,
          state: c.id === cape.id ? "ACTIVE" : "INACTIVE",
        }))
      );
      const details = getCapeDetails(cape);
      showToast(`Плащ «${details.title}» надет!`);
    } catch (err: any) {
      showToast(`Ошибка установки плаща: ${err?.message || err}`);
    } finally {
      setEquippingCapeId(null);
    }
  };

  const handleUnequipCape = async () => {
    try {
      await ipc.unequipMicrosoftCape();
      setActiveCape("");
      onEquipCape(null);
      setMsCapes((prev) =>
        prev.map((c) => ({
          ...c,
          state: "INACTIVE",
        }))
      );
      showToast("Плащ снят");
    } catch (err: any) {
      showToast(`Ошибка снятия плаща: ${err?.message || err}`);
    }
  };

  const handleLoginMsFromCapes = async () => {
    if (!onLoginMicrosoft) return;
    setIsLoggingInMs(true);
    try {
      await onLoginMicrosoft();
    } catch (err: any) {
      showToast(`Ошибка входа в Microsoft: ${err?.message || err}`);
    } finally {
      setIsLoggingInMs(false);
    }
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

        {(activeTab === "skins" || activeTab === "capes" || activeTab === "pets") && (
          <div className="tools" id="tools">
            {activeTab !== "capes" && (
              <div className="q">
                <input
                  id="q"
                  placeholder={
                    activeTab === "skins"
                      ? "Какой скин ты ищешь? (например: zefaa, Dream, Steve, anime...)"
                      : "Поиск питомца по имени или типу…"
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

            {activeTab === "capes" && account?.type === "microsoft" && (
              <div style={{ display: "flex", gap: "8px", marginLeft: "auto", alignItems: "center" }}>
                <button
                  type="button"
                  className="b"
                  disabled={isLoadingCapes}
                  onClick={fetchMicrosoftCapes}
                  title="Обновить список плащей из Microsoft"
                >
                  {isLoadingCapes ? "..." : "↻ Обновить"}
                </button>
                <button
                  type="button"
                  className="b rm"
                  id="rm"
                  onClick={handleUnequipCape}
                >
                  Снять плащ
                </button>
              </div>
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
          </div>
        )}

        <div id="out">
          {activeTab === "skins" && (
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
                    onClick={fetchInitialSkins}
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
                        <InsideSkinCard
                          key={`${skin.nickname}-${skin.skinUrl}`}
                          skin={skin}
                          isEquipped={isEquipped}
                          isApplying={isApplyingThis}
                          onEquip={handleEquipInsideSkin}
                        />
                      );
                    })}
                  </div>

                  <div
                    ref={sentinelRef}
                    style={{ height: "4px", width: "100%", pointerEvents: "none" }}
                    aria-hidden="true"
                  />

                  {isLoadingMore && (
                    <div className="store-load-more">
                      <div className="spin-cube">
                        <IsometricCube size={24} variant="emerald" />
                      </div>
                      <span>Загрузка ещё скинов...</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "capes" && (
            <>
              {account?.type !== "microsoft" ? (
                <div className="store-offline-center-wrap">
                  <div className="store-offline-center-card">
                    <div className="store-offline-icon-box">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: "#9ca3af" }}
                      >
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>

                    <h2 className="store-offline-title">
                      Не зарегистрирован аккаунт Microsoft
                    </h2>

                    <p className="store-offline-desc">
                      Официальные плащи Minecraft привязаны к вашей учётной записи Microsoft.
                      Войдите в лицензионный аккаунт, чтобы просматривать свои плащи и примерять их в 3D.
                    </p>

                    <button
                      type="button"
                      className="store-ms-auth-action-btn"
                      disabled={isLoggingInMs}
                      onClick={handleLoginMsFromCapes}
                    >
                      {isLoggingInMs ? (
                        <>
                          <IsometricCube size={20} variant="emerald" />
                          <span>Ожидание авторизации...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                          </svg>
                          <span>Войти в аккаунт Microsoft</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : isLoadingCapes ? (
                <div className="store-loading-state">
                  <IsometricCube size={48} variant="emerald" />
                  <div>Загрузка ваших плащей из Microsoft ({account.name})...</div>
                </div>
              ) : capesError ? (
                <div className="store-error-state">
                  <p>Не удалось получить плащи: {capesError}</p>
                  <button
                    type="button"
                    className="store-retry-btn"
                    onClick={fetchMicrosoftCapes}
                  >
                    Повторить попытку
                  </button>
                </div>
              ) : msCapes.length === 0 ? (
                <div className="store-offline-center-wrap">
                  <div className="store-offline-center-card">
                    <h2 className="store-offline-title">
                      У вас пока нет официальных плащей
                    </h2>
                    <p className="store-offline-desc">
                      На аккаунте <strong>{account.name}</strong> пока не найдены плащи Mojang.
                      Официальные плащи выдаются за миграцию (Migrator), 15-летие Minecraft, голосование за мобов, Twitch/TikTok дропы или посещение Minecon.
                    </p>
                    <button
                      type="button"
                      className="b"
                      onClick={fetchMicrosoftCapes}
                      style={{ padding: "8px 24px" }}
                    >
                      ↻ Обновить список
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}
                >
                  {msCapes.map((c) => {
                    const isEquipped = c.state === "ACTIVE" || activeCape === c.id;
                    const isEquipping = equippingCapeId === c.id;
                    const details = getCapeDetails(c);

                    return (
                      <div key={c.id} className="card ctr">
                        <div
                          className="pv cape-3d-pv"
                          style={{
                            width: "100%",
                            height: "155px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#080a10",
                            borderRadius: "10px",
                            overflow: "hidden",
                          }}
                        >
                          <Cape3DViewer
                            capeUrl={c.url}
                            width={130}
                            height={150}
                            interactive={false}
                            animated={false}
                          />
                        </div>
                        <div className="nm" title={details.title}>
                          {details.title}
                        </div>
                        <div className="ds ms" title={details.desc}>
                          {details.desc}
                        </div>
                        <button
                          type="button"
                          className={`b ${isEquipped ? "on" : ""}`}
                          disabled={isEquipping || isEquipped}
                          onClick={() => handleEquipCape(c)}
                        >
                          {isEquipped
                            ? "✓ Надет"
                            : isEquipping
                            ? "Установка..."
                            : "Надеть плащ"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

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

          {activeTab === "cos" && (
            <div className="store-cosmetics-wardrobe-container">
              <div className="store-cosmetics-catalog">
                <div className="store-cosmetics-tools">
                  <button
                    type="button"
                    className="store-cosmetics-unequip-btn"
                    onClick={handleUnequipCosmetics}
                  >
                    Снять аксессуары
                  </button>
                </div>

                <div className="store-cosmetics-grid">
                  {CS.filter((name) => !q || name.toLowerCase().includes(q)).map((name) => {
                    const isEquipped = activeCos === name;
                    return (
                      <div key={name} className="card store-cosmetic-card">
                        <div className="store-cosmetic-pv-box">
                          <Crown3DViewer width={180} height={145} interactive={false} animated={true} />
                        </div>
                        <div className="store-cosmetic-title">{name}</div>
                        <button
                          type="button"
                          className={`b ${isEquipped ? "on" : ""}`}
                          onClick={() => {
                            if (isEquipped) {
                              handleUnequipCosmetics();
                            } else {
                              setActiveCos(name);
                              localStorage.setItem("omega:equipped_cosmetic", name);
                              const headVal = name === "Корона Монарха" ? "crown" : null;
                              localStorage.setItem("omega:equipped_cosmetics", JSON.stringify({ head: headVal }));
                              window.dispatchEvent(
                                new CustomEvent("omega:cosmetics_updated", { detail: { head: headVal, name } })
                              );
                              setWardrobeFocus("head");
                              showToast(`Аксессуар "${name}" надет!`);
                            }
                          }}
                        >
                          {isEquipped ? "✓ Надет на игрока" : "Примерить аксессуар"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="store-wardrobe-showcase">
                <div className="store-wardrobe-header">
                  <div className="store-wardrobe-title">Примерочная 3D</div>
                  <div className="store-wardrobe-angle-tabs">
                    <button
                      type="button"
                      className={`store-wardrobe-tab ${wardrobeFocus === "head" ? "active" : ""}`}
                      onClick={() => setWardrobeFocus("head")}
                    >
                      Голова
                    </button>
                    <button
                      type="button"
                      className={`store-wardrobe-tab ${wardrobeFocus === "full" ? "active" : ""}`}
                      onClick={() => setWardrobeFocus("full")}
                    >
                      Во весь рост
                    </button>
                    <button
                      type="button"
                      className={`store-wardrobe-tab ${wardrobeFocus === "back" ? "active" : ""}`}
                      onClick={() => setWardrobeFocus("back")}
                    >
                      Спина
                    </button>
                  </div>
                </div>

                <div className="store-wardrobe-stage-card">
                  <Wardrobe3DViewer
                    skinUrl={currentSkinUrl}
                    capeUrl={currentCapeUrl}
                    model={skinModel}
                    focusZone={wardrobeFocus}
                    equippedHead={activeCos === "Корона Монарха" ? "crown" : null}
                  />
                </div>
              </div>
            </div>
          )}

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
