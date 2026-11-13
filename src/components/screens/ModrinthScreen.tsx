import React, { useState } from "react";
import "../../styles/screens.css";

interface ModrinthScreenProps {
  onBack?: () => void;
  onInstallMod: (modName: string) => void;
  onInstallModpack?: (modpack: CatalogItem) => void;
}

interface CatalogItem {
  title: string;
  author: string;
  desc: string;
  downloads: number;
  loaders: string[];
  icon: "layers" | "bolt" | "compass" | "heart" | "sun" | "cube";
}

interface SourceItem {
  name: string;
  color: string;
  mult: number;
}

const SOURCES: SourceItem[] = [
  { name: "Modrinth", color: "#7fd69e", mult: 1 },
  { name: "CurseForge", color: "#e3946b", mult: 1.28 },
];

const CATEGORIES: Array<{
  id: "modpacks" | "mods" | "shaders" | "tex" | "pets" | "cosmetics";
  label: string;
}> = [
  { id: "modpacks", label: "Сборки" },
  { id: "mods", label: "Моды" },
  { id: "shaders", label: "Шейдеры" },
  { id: "tex", label: "Текстуры" },
  { id: "pets", label: "Питомцы" },
  { id: "cosmetics", label: "Косметика" },
];

const CATALOG_DATA: Record<"modpacks" | "mods" | "shaders" | "tex" | "pets" | "cosmetics", CatalogItem[]> = {
  modpacks: [
    {
      title: "All the Mods 9",
      author: "ATMTeam",
      desc: "Легендарная масштабная сборка с более чем 400 модами: технологии, магия, новые миры и глубокая система квестов.",
      downloads: 14.8,
      loaders: ["NeoForge"],
      icon: "cube",
    },
    {
      title: "Better MC [FABRIC]",
      author: "SHXRKIE",
      desc: "Ультимативная сборка нового поколения: переработанный Энд и Незер, десятки боссов, данжей и кастомная генерация.",
      downloads: 18.5,
      loaders: ["Fabric"],
      icon: "compass",
    },
    {
      title: "Prominence II RPG",
      author: "Lunasa",
      desc: "Глубокая ролевая RPG сборка с древом талантов, артефактами, магическими школами и эпическими рейдами.",
      downloads: 9.2,
      loaders: ["Fabric"],
      icon: "bolt",
    },
    {
      title: "RLCraft",
      author: "Shivaxi",
      desc: "Бескомпромиссная хардкорная сборка на выживание: жажда, температура, драконы и экстремально опасные биомы.",
      downloads: 31.4,
      loaders: ["Forge"],
      icon: "heart",
    },
    {
      title: "DawnCraft",
      author: "bstylia14",
      desc: "Приключенческая souls-like сборка с боевой системой от третьего лица, сотнями NPC-квестов и боссами.",
      downloads: 7.9,
      loaders: ["Forge"],
      icon: "layers",
    },
    {
      title: "Fabulously Optimized",
      author: "RobotKoer",
      desc: "Сборка для максимальной оптимизации FPS, плавности графики и полной поддержки современных ресурспаков.",
      downloads: 24.1,
      loaders: ["Fabric"],
      icon: "sun",
    },
  ],
  mods: [
    {
      title: "Fabric API",
      author: "modmuss50",
      desc: "Базовая библиотека хуков и основных функциональных возможностей для модов на Fabric.",
      downloads: 78.2,
      loaders: ["Fabric"],
      icon: "layers",
    },
    {
      title: "Sodium",
      author: "jellysquid3",
      desc: "Современный движок рендеринга для Minecraft, многократно увеличивающий производительность.",
      downloads: 42.8,
      loaders: ["Fabric", "NeoForge"],
      icon: "bolt",
    },
    {
      title: "JourneyMap",
      author: "techbrew",
      desc: "Интерактивная карта мира в реальном времени с радаром мобов, путевыми точками и многим другим.",
      downloads: 35.1,
      loaders: ["Forge", "Fabric", "NeoForge"],
      icon: "compass",
    },
    {
      title: "AppleSkin",
      author: "squeek502",
      desc: "Отображение подробной информации о сытости и насыщении едой прямо в интерфейсе.",
      downloads: 28.5,
      loaders: ["Fabric", "Forge", "NeoForge"],
      icon: "heart",
    },
  ],
  shaders: [
    {
      title: "Complementary Reimagined",
      author: "EminGTR",
      desc: "Универсальный шейдерпак с реалистичным освещением, водой и мягкими тенями.",
      downloads: 12.4,
      loaders: ["Iris"],
      icon: "sun",
    },
    {
      title: "BSL Shaders",
      author: "CaptTatsu",
      desc: "Классический шейдерпак с настраиваемыми облаками, отражениями и объёмным светом.",
      downloads: 9.8,
      loaders: ["Iris"],
      icon: "sun",
    },
    {
      title: "Rethinking Voxels",
      author: "gri573",
      desc: "Шейдерпак с трассировкой лучей и динамическим освещением блоков.",
      downloads: 3.1,
      loaders: ["Iris"],
      icon: "sun",
    },
  ],
  tex: [
    {
      title: "Faithful 32x",
      author: "Faithful Team",
      desc: "Удвоенное разрешение ванильных текстур с сохранением оригинального стиля игры.",
      downloads: 18.2,
      loaders: ["Java"],
      icon: "cube",
    },
    {
      title: "Fresh Animations",
      author: "FreshLX",
      desc: "Оживляет мобов новыми плавными анимациями без изменения их облика.",
      downloads: 7.6,
      loaders: ["Java"],
      icon: "cube",
    },
    {
      title: "Vanilla Tweaks",
      author: "Vanilla Tweaks Team",
      desc: "Набор небольших улучшений ванильных текстур, которые можно включать по одному.",
      downloads: 5.9,
      loaders: ["Java"],
      icon: "cube",
    },
  ],
  pets: [
    {
      title: "Doggy Talents Next",
      author: "dashie",
      desc: "Продвинутая система прокачки собак, уникальные способности, ошейники и новые породы.",
      downloads: 14.2,
      loaders: ["Forge", "Fabric", "NeoForge"],
      icon: "heart",
    },
    {
      title: "Inventory Pets",
      author: "Purplicious_Cow",
      desc: "Анимированные питомцы в инвентаре, дающие уникальные баффы, полёт и защиту.",
      downloads: 38.6,
      loaders: ["Forge", "NeoForge"],
      icon: "heart",
    },
    {
      title: "Mythic Mounts",
      author: "chirp",
      desc: "Приручаемые мифические маунты и летающие питомцы с детальными анимациями.",
      downloads: 9.4,
      loaders: ["Fabric", "Quilt"],
      icon: "compass",
    },
    {
      title: "Cat Companions",
      author: "meowdev",
      desc: "Расширенные породы котиков, трюки, анимации сна и охота на грызунов.",
      downloads: 6.8,
      loaders: ["Fabric", "Forge"],
      icon: "heart",
    },
  ],
  cosmetics: [
    {
      title: "Custom Cosmetics (Cosmetica)",
      author: "eyevee",
      desc: "Бесплатные 3D-шляпы, шарфы, наплечники и светящиеся крылья для всех игроков.",
      downloads: 22.4,
      loaders: ["Fabric", "Forge", "NeoForge"],
      icon: "sun",
    },
    {
      title: "Ears & Tails",
      author: "unascribed",
      desc: "Кастомизация ушек, хвостов, рожек и крыльев персонажа с физикой движения.",
      downloads: 16.7,
      loaders: ["Fabric", "NeoForge"],
      icon: "layers",
    },
    {
      title: "Not Enough Animations",
      author: "tr7zw",
      desc: "Косметические плавные анимации бега, поедания еды, лазания по лестницам и плавания.",
      downloads: 29.8,
      loaders: ["Fabric", "Forge"],
      icon: "bolt",
    },
    {
      title: "Emotecraft",
      author: "kosmx",
      desc: "Пак танцев, приветствий и более 100 выразительных эмоций и движений.",
      downloads: 41.5,
      loaders: ["Fabric", "Forge", "NeoForge"],
      icon: "compass",
    },
  ],
};

export const ModrinthScreen: React.FC<ModrinthScreenProps> = ({
  onInstallMod,
  onInstallModpack,
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "modpacks" | "mods" | "shaders" | "tex" | "pets" | "cosmetics"
  >("modpacks");
  const [search, setSearch] = useState("");
  const [selectedLoader, setSelectedLoader] = useState("");
  const [sortMode, setSortMode] = useState<"p" | "n">("p");
  const [done, setDone] = useState<Record<string, boolean>>({});

  const currentSource = SOURCES[sourceIndex];
  const list = CATALOG_DATA[activeTab];

  const q = search.trim().toLowerCase();
  const filtered = list.filter((item) => {
    const matchText =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q);
    const matchLoader =
      !["modpacks", "mods", "pets", "cosmetics"].includes(activeTab) ||
      !selectedLoader ||
      item.loaders.includes(selectedLoader);
    return matchText && matchLoader;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "n") {
      return a.title.localeCompare(b.title);
    }
    return b.downloads - a.downloads;
  });

  const renderIcon = (type: CatalogItem["icon"]) => {
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
      case "heart":
        return (
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        );
      case "sun":
        return (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.400 1.400M5.600 18.400 7 17M17 7l1.400-1.400" />
          </>
        );
      case "cube":
        return (
          <>
            <path d="m12 3 8 4.500v9L12 21l-8-4.500v-9z" />
            <path d="m4 7.500 8 4.500 8-4.500M12 12v9" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="screens-overlay-layer catalog-screen-overlay">
      <div className="wrap">
        {/* Source switch dock */}
        <div className="dock src" id="src">
          {SOURCES.map((src, i) => (
            <button
              key={src.name}
              type="button"
              className={`f ${i === sourceIndex ? "on" : ""}`}
              onClick={() => setSourceIndex(i)}
            >
              <i style={{ background: src.color }} />
              {src.name}
            </button>
          ))}
        </div>

        {/* Head */}
        <div className="head">
          <div>
            <h1>Каталог</h1>
            <div className="sub" id="sub">
              {activeTab === "modpacks"
                ? `Готовые сборки с быстрой установкой в каталог версий · ${currentSource.name}`
                : `Моды, шейдеры и ресурспаки с прямой установкой в активную версию · ${currentSource.name}`}
            </div>
          </div>
          <div className="dock" id="tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`f ${cat.id === activeTab ? "on" : ""}`}
                onClick={() => setActiveTab(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="tools">
          <div className="sr">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              id="q"
              placeholder="Поиск по названию или описанию…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {["modpacks", "mods", "pets", "cosmetics"].includes(activeTab) && (
            <select
              id="ld"
              value={selectedLoader}
              onChange={(e) => setSelectedLoader(e.target.value)}
            >
              <option value="">Загрузчик: Любой</option>
              <option value="Fabric">Fabric</option>
              <option value="Forge">Forge</option>
              <option value="NeoForge">NeoForge</option>
            </select>
          )}

          <select
            id="so"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as "p" | "n")}
          >
            <option value="p">Сортировка: Популярные</option>
            <option value="n">Сортировка: По названию</option>
          </select>
        </div>

        {/* Grid */}
        <div className="grid" id="grid">
          {sorted.length === 0 ? (
            <div className="empty">Ничего не найдено</div>
          ) : (
            sorted.map((item) => {
              const key = `${sourceIndex}${item.title}`;
              const isDone = !!done[key];
              return (
                <div key={item.title} className="card">
                  <div className="ico">
                    <svg viewBox="0 0 24 24">{renderIcon(item.icon)}</svg>
                  </div>
                  <div className="bd">
                    <div className="t">
                      <b>{item.title}</b>
                      <span>от {item.author}</span>
                    </div>
                    <div className="ds">{item.desc}</div>
                    <div className="ft">
                      <div>
                        <div className="dl">
                          {(item.downloads * currentSource.mult).toFixed(1)}M скачиваний
                        </div>
                        <div className="tags">
                          {item.loaders.map((z) => (
                            <span key={z} className={`tag ${z}`}>
                              {z}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`b ${isDone ? "done" : ""}`}
                        onClick={() => {
                          if (!isDone) {
                            setDone((prev) => ({ ...prev, [key]: true }));
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
      </div>
    </div>
  );
};
