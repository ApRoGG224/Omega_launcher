import React, { useState } from "react";
import { PRESET_SKINS, PRESET_CAPES } from "../../constants/skinPresets";
import "../../styles/screens.css";

interface StoreScreenProps {
  onBack?: () => void;
  onEquipSkin: (skinUrl: string, model: "default" | "slim") => void;
  onEquipCape: (capeUrl: string | null) => void;
}

interface SkinData {
  name: string;
  category: string;
  palette: string[];
  whiteEyes?: boolean;
  url: string;
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

export const StoreScreen: React.FC<StoreScreenProps> = ({
  onEquipSkin,
  onEquipCape,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("skins");
  const [activeSkin, setActiveSkin] = useState("Dream");
  const [activeCape, setActiveCape] = useState("");
  const [activePet, setActivePet] = useState("Малая панда");
  const [activeCos, setActiveCos] = useState("Крылья Архангела");
  const [search, setSearch] = useState("");
  const [nick, setNick] = useState("");
  const [recentList, setRecentList] = useState<Array<[string, string]>>([
    ["Dream", "Только что"],
    ["Technoblade", "2 ч. назад"],
    ["Classic Steve", "Вчера"],
  ]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
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

  const findSkin = (name: string): SkinData => {
    return SK.find((s) => s.name === name) || SK[1];
  };

  const handleNickEquip = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nick.trim();
    if (!clean) return;
    setActiveSkin(clean);
    setRecentList((prev) => [[clean, "Только что"], ...prev.filter((r) => r[0] !== clean)]);
    setNick("");
    setActiveTab("recent");
    onEquipSkin(`https://minotar.net/skin/${clean}`, "default");
    showToast(`Скин ${clean} надет!`);
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

      <div className="wrap">
        {/* Head */}
        <div className="head">
          <div>
            <h1>Магазин Omega</h1>
            <div className="sub">Скины, плащи, питомцы, косметика и недавние образы</div>
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
                      ? "Какой скин ты ищешь? (например: Dream, Steve...)"
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
                <button type="submit" className="b nb" id="nb">
                  Примерить
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

        {/* Content output */}
        <div id="out">
          {/* SKINS TAB */}
          {activeTab === "skins" && (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
              {SK.filter(
                (s) =>
                  !q ||
                  s.name.toLowerCase().includes(q) ||
                  s.category.toLowerCase().includes(q)
              ).map((s) => {
                const isEquipped = activeSkin === s.name;
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
              <div className="cap" style={{ marginBottom: "10px" }}>
                История последних надеваний
              </div>
              <div className="grid" style={{ gap: "10px" }}>
                {recentList.map((x) => {
                  const s = findSkin(x[0]);
                  const isEquipped = activeSkin === x[0];
                  return (
                    <div key={x[0]} className="rw">
                      <div className="ico">{renderFigure(s.palette, s.whiteEyes, true)}</div>
                      <div>
                        <div className="nm">{x[0]}</div>
                        <div className="ms">Использовался: {x[1]}</div>
                      </div>
                      <button
                        type="button"
                        className={`b ${isEquipped ? "on" : ""}`}
                        onClick={() => {
                          setActiveSkin(x[0]);
                          onEquipSkin(s.url, s.model);
                          showToast(`Скин ${x[0]} надет!`);
                        }}
                      >
                        {isEquipped ? "✓ Надет" : "Надеть снова"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
