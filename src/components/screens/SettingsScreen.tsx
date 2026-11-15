import React, { useState, useEffect } from "react";
import { MINECRAFT_BACKGROUNDS } from "../../constants/backgrounds";
import { ipc } from "../../services/ipc";
import { setStoredCloseOnLaunch } from "../../services/storage";
import { useLanguage } from "../../context/LanguageContext";
import type {
  TopBarItemId,
  BottomBarItemId,
  BottomBarAlignment,
  ButtonShapePreset,
} from "../../constants/launcherLayout";
import { TopBarCustomizer } from "./settings/TopBarCustomizer";
import { BottomBarCustomizer } from "./settings/BottomBarCustomizer";
import { BackgroundCustomizer } from "./settings/BackgroundCustomizer";
import type { AccountData, InstanceData } from "../../types";
import "../../styles/screens.css";

interface SettingsScreenProps {
  onBack?: () => void;
  bgIndex: number;
  isBgAutoPlay: boolean;
  onSelectBg: (index: number) => void;
  onNextBg: () => void;
  onPrevBg: () => void;
  onToggleBgAutoPlay: () => void;
  topBarLayout?: TopBarItemId[];
  onSaveTopBarLayout?: (layout: TopBarItemId[]) => void;
  onResetTopBarLayout?: () => void;
  bottomBarLayout?: BottomBarItemId[];
  onSaveBottomBarLayout?: (layout: BottomBarItemId[], alignment?: BottomBarAlignment) => void;
  onResetBottomBarLayout?: () => void;
  bottomBarAlignment?: BottomBarAlignment;
  onChangeBottomBarAlignment?: (alignment: BottomBarAlignment) => void;
  buttonShapePreset?: ButtonShapePreset;
  onChangeButtonShapePreset?: (preset: ButtonShapePreset) => void;
  account?: AccountData | null;
  skinUrl?: string;
  selectedInstance?: InstanceData | null;
  instances?: InstanceData[];
  menusCustomization?: import("../../types/menuCustomization").MenusCustomizationState;
  onOpenMenuCustomizer?: (zone: import("../../types/menuCustomization").CustomizerZoneId) => void;
  onUpdateMenusCustomization?: (state: import("../../types/menuCustomization").MenusCustomizationState) => void;
  onResetZoneCustomization?: (zone: import("../../types/menuCustomization").CustomizerZoneId) => void;
}

type SettingsTab = "paths" | "memory" | "network" | "versions" | "launch" | "appearance";

interface StoredSettings {
  ram: number;
  closeOnLaunch: boolean;
  gameDir: string;
  javaPath: string;
  fullscreen: boolean;
  resolution: string;
  gcType: string;
  jvmArgs: string;
  lang: "UK" | "RU" | "EN";
  accountGateway: "offline" | "ely" | "microsoft";
  showStatusFriends: boolean;
  proxyType: string;
  showReleases: boolean;
  showSnapshots: boolean;
  showBetas: boolean;
  showAlphas: boolean;
}

const DEFAULT_SETTINGS: StoredSettings = {
  ram: 4,
  closeOnLaunch: false,
  gameDir: "~/.local/share/Omega_Remaster/.minecraft",
  javaPath: "/usr/lib/jvm/java-21-openjdk/bin/java",
  fullscreen: false,
  resolution: "1280x720",
  gcType: "G1GC",
  jvmArgs: "-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions",
  lang: "UK",
  accountGateway: "offline",
  showStatusFriends: true,
  proxyType: "direct",
  showReleases: true,
  showSnapshots: false,
  showBetas: false,
  showAlphas: false,
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  bgIndex,
  isBgAutoPlay,
  onSelectBg,
  onNextBg,
  onPrevBg,
  onToggleBgAutoPlay,
  topBarLayout,
  onSaveTopBarLayout,
  onResetTopBarLayout,
  bottomBarLayout,
  onSaveBottomBarLayout,
  onResetBottomBarLayout,
  bottomBarAlignment,
  onChangeBottomBarAlignment,
  buttonShapePreset,
  onChangeButtonShapePreset,
  account,
  skinUrl,
  selectedInstance,
  instances,
  menusCustomization,
  onOpenMenuCustomizer,
  onUpdateMenusCustomization,
  onResetZoneCustomization,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("paths");
  const [appearanceSubTab, setAppearanceSubTab] = useState<"topbar" | "bottombar" | "background">("topbar");
  const [bgFilter, setBgFilter] = useState<"all" | "shader" | "official" | "user">("all");

  const [initialSettings] = useState<StoredSettings>(() => {
    try {
      const saved = localStorage.getItem("omega_launcher_settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [ram, setRam] = useState<number>(initialSettings.ram);
  const [mcVersion] = useState<string>("1.21.4");
  const [closeOnLaunch, setCloseOnLaunch] = useState<boolean>(initialSettings.closeOnLaunch);
  const [gameDir, setGameDir] = useState<string>(initialSettings.gameDir);
  const [javaPath, setJavaPath] = useState<string>(initialSettings.javaPath);
  const { t, lang: globalLang, setLang: setGlobalLang } = useLanguage();
  const [fullscreen, setFullscreen] = useState<boolean>(initialSettings.fullscreen);
  const [resolution, setResolution] = useState<string>(initialSettings.resolution);
  const [gcType, setGcType] = useState<string>(initialSettings.gcType);
  const [jvmArgs, setJvmArgs] = useState<string>(initialSettings.jvmArgs);
  const [lang, setLang] = useState<"UK" | "RU" | "EN">(
    (globalLang?.toUpperCase() as "UK" | "RU" | "EN") || initialSettings.lang || "UK"
  );
  const [accountGateway, setAccountGateway] = useState<"offline" | "ely" | "microsoft">(initialSettings.accountGateway);
  const [showStatusFriends, setShowStatusFriends] = useState<boolean>(initialSettings.showStatusFriends);
  const [proxyType, setProxyType] = useState<string>(initialSettings.proxyType);

  useEffect(() => {
    if (globalLang) {
      const upper = globalLang.toUpperCase() as "UK" | "RU" | "EN";
      if (upper !== lang) {
        setLang(upper);
      }
    }
  }, [globalLang]);

  const [showReleases, setShowReleases] = useState<boolean>(initialSettings.showReleases);
  const [showSnapshots, setShowSnapshots] = useState<boolean>(initialSettings.showSnapshots);
  const [showBetas, setShowBetas] = useState<boolean>(initialSettings.showBetas);
  const [showAlphas, setShowAlphas] = useState<boolean>(initialSettings.showAlphas);

  useEffect(() => {
    try {
      const toSave: StoredSettings = {
        ram,
        closeOnLaunch,
        gameDir,
        javaPath,
        fullscreen,
        resolution,
        gcType,
        jvmArgs,
        lang,
        accountGateway,
        showStatusFriends,
        proxyType,
        showReleases,
        showSnapshots,
        showBetas,
        showAlphas,
      };
      localStorage.setItem("omega_launcher_settings", JSON.stringify(toSave));
    } catch {}
  }, [
    ram,
    closeOnLaunch,
    gameDir,
    javaPath,
    fullscreen,
    resolution,
    gcType,
    jvmArgs,
    lang,
    accountGateway,
    showStatusFriends,
    proxyType,
    showReleases,
    showSnapshots,
    showBetas,
    showAlphas,
  ]);

  const showFeedback = (_msg: string) => {};

  const handleRamChange = (v: number) => {
    setRam(v);
  };

  const handleAutoDetectJava = async () => {
    try {
      const detected = await ipc.findSystemJava(mcVersion || "1.20.1");
      if (detected) {
        setJavaPath(detected);
        showFeedback("Java успешно обнаружена: " + detected);
      } else {
        showFeedback("Системная Java не найдена");
      }
    } catch {
      showFeedback("Ошибка автодетекта Java");
    }
  };

  const handleOpenGameDir = () => {
    void ipc.openPath(gameDir);
  };

  const handleOpenScreenshots = () => {
    void ipc.openPath(`${gameDir}/screenshots`);
  };

  const ramPercent = Math.min(100, Math.max(0, ((ram - 1) / 15) * 100));

  const activeBg = MINECRAFT_BACKGROUNDS[bgIndex] || MINECRAFT_BACKGROUNDS[0];

  const shaderCount = MINECRAFT_BACKGROUNDS.filter((b) => b.category === "shader").length;
  const officialCount = MINECRAFT_BACKGROUNDS.filter((b) => b.category === "official").length;
  const userCount = MINECRAFT_BACKGROUNDS.filter((b) => b.category === "user").length;

  const filteredBgs = MINECRAFT_BACKGROUNDS.map((bg, originalIndex) => ({
    bg,
    originalIndex,
  })).filter(({ bg }) => {
    if (bgFilter === "all") return true;
    return bg.category === bgFilter;
  });

  return (
    <div className="screens-overlay-layer settings-screen-overlay">
      <div className="set-wrap">
        <aside className="set-side">
          <div className="set-card set-nav">
            <div className="set-cap">
              {globalLang === "uk" ? "Конфігурація" : globalLang === "ru" ? "Конфигурация" : "Configuration"}
            </div>
            <button
              type="button"
              className={activeTab === "paths" ? "on" : ""}
              onClick={() => setActiveTab("paths")}
            >
              {globalLang === "uk" ? "Шляхи гри" : globalLang === "ru" ? "Пути игры" : "Game Paths"}
            </button>
            <button
              type="button"
              className={activeTab === "memory" ? "on" : ""}
              onClick={() => setActiveTab("memory")}
            >
              {globalLang === "uk" ? "Пам'ять та Java" : globalLang === "ru" ? "Память и Java" : "Memory & Java"}
            </button>
            <button
              type="button"
              className={activeTab === "network" ? "on" : ""}
              onClick={() => setActiveTab("network")}
            >
              {globalLang === "uk" ? "Мережа" : globalLang === "ru" ? "Сеть" : "Network"}
            </button>
            <button
              type="button"
              className={activeTab === "versions" ? "on" : ""}
              onClick={() => setActiveTab("versions")}
            >
              {globalLang === "uk" ? "Версії та мова" : globalLang === "ru" ? "Версии и язык" : "Versions & Language"}
            </button>
            <button
              type="button"
              className={activeTab === "launch" ? "on" : ""}
              onClick={() => setActiveTab("launch")}
            >
              {globalLang === "uk" ? "Запуск" : globalLang === "ru" ? "Запуск" : "Launch"}
            </button>
            <button
              type="button"
              className={activeTab === "appearance" ? "on" : ""}
              onClick={() => setActiveTab("appearance")}
            >
              {globalLang === "uk" ? "Оформлення" : globalLang === "ru" ? "Оформление" : "Appearance"}
            </button>
          </div>

          <div className="set-card set-prof">
            <div className="set-cap" style={{ paddingLeft: 0 }}>
              {globalLang === "uk" ? "Поточний профіль" : globalLang === "ru" ? "Текущий профиль" : "Current Profile"}
            </div>
            <div className="set-pr">
              <b>{ram} GB</b>
              <span>RAM</span>
            </div>
            <div className="set-pr">
              <b>{mcVersion}</b>
              <span>{globalLang === "uk" ? "ВЕРСІЯ" : globalLang === "ru" ? "ВЕРСИЯ" : "VERSION"}</span>
            </div>
            <div className="set-pr">
              <b style={{ color: closeOnLaunch ? "#5fc9a0" : "#8b919c" }}>
                {closeOnLaunch
                  ? globalLang === "uk"
                    ? "Увімк."
                    : globalLang === "ru"
                    ? "Вкл."
                    : "On"
                  : globalLang === "uk"
                  ? "Вимк."
                  : globalLang === "ru"
                  ? "Выкл."
                  : "Off"}
              </b>
              <span>
                {globalLang === "uk"
                  ? "ЗАКРИВАТИ ЛАУНЧЕР"
                  : globalLang === "ru"
                  ? "ЗАКРЫВАТЬ ЛАУНЧЕР"
                  : "CLOSE ON LAUNCH"}
              </span>
            </div>
            <div className="set-pr">
              <b style={{ maxWidth: 120, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={activeBg.title}>
                {activeBg.title}
              </b>
              <span>{globalLang === "uk" ? "ФОН" : globalLang === "ru" ? "ФОН" : "BACKGROUND"}</span>
            </div>
          </div>
        </aside>

        <main className="set-card set-main">
          <div className={`set-pn ${activeTab === "paths" ? "on" : ""}`}>
            <div>
              <h1>Пути к файлам и каталогам игры</h1>
              <div className="set-sub">
                Настройка директории для версий, сохранений, ресурспаков и скриншотов
              </div>
            </div>

            <div>
              <div className="set-lab">Рабочая директория Minecraft (.minecraft):</div>
              <div className="set-line">
                <input
                  type="text"
                  value={gameDir}
                  onChange={(e) => setGameDir(e.target.value)}
                  className="set-input"
                />
                <button
                  type="button"
                  className="set-b"
                  onClick={() => showFeedback("Выбор папки: " + gameDir)}
                >
                  Обзор…
                </button>
                <button
                  type="button"
                  className="set-b"
                  onClick={handleOpenGameDir}
                >
                  В проводнике
                </button>
              </div>
            </div>

            <div>
              <div className="set-lab">Исполняемый файл Java Runtime:</div>
              <div className="set-line">
                <input
                  type="text"
                  value={javaPath}
                  onChange={(e) => setJavaPath(e.target.value)}
                  className="set-input"
                />
                <button
                  type="button"
                  className="set-b go"
                  onClick={handleAutoDetectJava}
                >
                  Автодетект Java
                </button>
              </div>
            </div>

            <div>
              <div className="set-lab">Каталог снимков экрана (Screenshots):</div>
              <div className="set-line">
                <input
                  type="text"
                  value={`${gameDir}/screenshots`}
                  readOnly
                  className="set-input"
                />
                <button
                  type="button"
                  className="set-b"
                  onClick={handleOpenScreenshots}
                >
                  Открыть
                </button>
              </div>
            </div>
          </div>

          <div className={`set-pn ${activeTab === "memory" ? "on" : ""}`}>
            <div>
              <h1>Выделение памяти (RAM) и параметры JVM</h1>
              <div className="set-sub">
                Оптимизация производительности игры под объём оперативной памяти вашего ПК
              </div>
            </div>

            <div>
              <div className="set-lab">
                <span>Выделенная оперативная память:</span>
                <b>{ram} ГБ</b>
              </div>
              <input
                type="range"
                min={1}
                max={16}
                step={1}
                value={ram}
                onChange={(e) => handleRamChange(Number(e.target.value))}
                className="set-range"
                style={{
                  background: `linear-gradient(90deg, #e6e8ec ${ramPercent}%, #1a1d24 ${ramPercent}%)`,
                }}
              />
              <div className="set-seg c6 ctr">
                {[2, 4, 6, 8, 12, 16].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={ram === size ? "on" : ""}
                    onClick={() => handleRamChange(size)}
                  >
                    {size}G
                  </button>
                ))}
              </div>
              <div className="set-hint">
                Рекомендуется 4–8 ГБ для плавной игры с шейдерами и модами Fabric / Forge.
              </div>
            </div>

            <div>
              <div className="set-lab">Сборщик мусора JVM:</div>
              <div className="set-seg c3">
                <button
                  type="button"
                  className={gcType === "G1GC" ? "on" : ""}
                  onClick={() => {
                    setGcType("G1GC");
                    setJvmArgs("-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions");
                  }}
                >
                  G1GC (Стандарт)
                  <small>Стабильный для всех модов</small>
                </button>
                <button
                  type="button"
                  className={gcType === "ZGC" ? "on" : ""}
                  onClick={() => {
                    setGcType("ZGC");
                    setJvmArgs("-XX:+UseZGC -XX:+UnlockExperimentalVMOptions");
                  }}
                >
                  ZGC (Zero Pause)
                  <small>Минимальные фризы</small>
                </button>
                <button
                  type="button"
                  className={gcType === "Shenandoah" ? "on" : ""}
                  onClick={() => {
                    setGcType("Shenandoah");
                    setJvmArgs("-XX:+UseShenandoahGC -XX:+UnlockExperimentalVMOptions");
                  }}
                >
                  Shenandoah
                  <small>Сверхнизкие задержки</small>
                </button>
              </div>
            </div>

            <div>
              <div className="set-lab">Аргументы запуска Java Virtual Machine:</div>
              <div className="set-line">
                <input
                  type="text"
                  value={jvmArgs}
                  onChange={(e) => setJvmArgs(e.target.value)}
                  className="set-input"
                />
              </div>
            </div>
          </div>

          <div className={`set-pn ${activeTab === "network" ? "on" : ""}`}>
            <div>
              <h1>Сетевые настройки и авторизация</h1>
              <div className="set-sub">
                Шлюзы подгрузки скинов, статус в сети и подключение к серверам
              </div>
            </div>

            <div>
              <div className="set-lab">Режим аккаунта по умолчанию:</div>
              <div className="set-seg c3">
                <button
                  type="button"
                  className={accountGateway === "offline" ? "on" : ""}
                  onClick={() => setAccountGateway("offline")}
                >
                  Офлайн профиль
                  <small>0 мс пинг</small>
                </button>
                <button
                  type="button"
                  className={accountGateway === "ely" ? "on" : ""}
                  onClick={() => setAccountGateway("ely")}
                >
                  Шлюз Ely.by
                  <small>Скины и плащи</small>
                </button>
                <button
                  type="button"
                  className={accountGateway === "microsoft" ? "on" : ""}
                  onClick={() => setAccountGateway("microsoft")}
                >
                  Microsoft OAuth2
                  <small>Лицензия</small>
                </button>
              </div>
            </div>

            <div className="set-row">
              <div>
                <b>Показывать друзьям активность в игре</b>
                <small>
                  Отображает в списке друзей, в какой версии и на каком сервере вы сейчас находитесь
                </small>
              </div>
              <button
                type="button"
                className={`set-sw ${showStatusFriends ? "on" : ""}`}
                onClick={() => setShowStatusFriends((prev) => !prev)}
              />
            </div>

            <div>
              <div className="set-lab">Тип подключения к серверам:</div>
              <div className="set-seg c3">
                <button
                  type="button"
                  className={proxyType === "direct" ? "on" : ""}
                  onClick={() => setProxyType("direct")}
                >
                  Прямое (без прокси)
                </button>
                <button
                  type="button"
                  className={proxyType === "http" ? "on" : ""}
                  onClick={() => setProxyType("http")}
                >
                  HTTP
                </button>
                <button
                  type="button"
                  className={proxyType === "socks5" ? "on" : ""}
                  onClick={() => setProxyType("socks5")}
                >
                  SOCKS5
                </button>
              </div>
            </div>
          </div>

          <div className={`set-pn ${activeTab === "versions" ? "on" : ""}`}>
            <div>
              <h1>
                {globalLang === "uk"
                  ? "Фільтрація версій Minecraft та локалізація"
                  : globalLang === "ru"
                  ? "Фильтрация версий Minecraft и локализация"
                  : "Minecraft Version Filtering & Localization"}
              </h1>
              <div className="set-sub">
                {globalLang === "uk"
                  ? "Налаштування відображення снапшотів, бета-версій та мови інтерфейсу"
                  : globalLang === "ru"
                  ? "Настройка отображения снапшотов, бета-версий и языка интерфейса"
                  : "Configure snapshots, betas, and interface language"}
              </div>
            </div>

            <div>
              <div className="set-lab">{t("languageTitle", "Мова інтерфейсу лаунчера:")}</div>
              <div className="set-seg c2">
                <button
                  type="button"
                  className={globalLang === "uk" ? "on" : ""}
                  onClick={() => {
                    setGlobalLang("uk");
                    setLang("UK");
                  }}
                >
                  Українська
                  <small>{t("langUkrainianSub", "Повна локалізація")}</small>
                </button>
                <button
                  type="button"
                  className={globalLang === "en" ? "on" : ""}
                  onClick={() => {
                    setGlobalLang("en");
                    setLang("EN");
                  }}
                >
                  English
                  <small>{t("langEnglishSub", "Default language")}</small>
                </button>
              </div>
            </div>

            <div>
              <div className="set-lab">Отображение типов версий игры:</div>
              <div className="set-grid2">
                <div className="set-row">
                  <div>
                    <b>Официальные релизы</b>
                    <small>1.21.4, 1.20.1, 1.16.5</small>
                  </div>
                  <button
                    type="button"
                    className={`set-ck ${showReleases ? "on" : ""}`}
                    onClick={() => setShowReleases((prev) => !prev)}
                  >
                    ✓
                  </button>
                </div>

                <div className="set-row">
                  <div>
                    <b>Снапшоты разработчиков</b>
                    <small>Тестовые билды Mojang</small>
                  </div>
                  <button
                    type="button"
                    className={`set-ck ${showSnapshots ? "on" : ""}`}
                    onClick={() => setShowSnapshots((prev) => !prev)}
                  >
                    ✓
                  </button>
                </div>

                <div className="set-row">
                  <div>
                    <b>Старые Beta версии</b>
                    <small>Исторические версии b1.7.3</small>
                  </div>
                  <button
                    type="button"
                    className={`set-ck ${showBetas ? "on" : ""}`}
                    onClick={() => setShowBetas((prev) => !prev)}
                  >
                    ✓
                  </button>
                </div>

                <div className="set-row">
                  <div>
                    <b>Старые Alpha версии</b>
                    <small>Ранние версии a1.2.6</small>
                  </div>
                  <button
                    type="button"
                    className={`set-ck ${showAlphas ? "on" : ""}`}
                    onClick={() => setShowAlphas((prev) => !prev)}
                  >
                    ✓
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={`set-pn ${activeTab === "launch" ? "on" : ""}`}>
            <div>
              <h1>Поведение при запуске Minecraft</h1>
              <div className="set-sub">
                Управление окном игры, поведением лаунчера и визуальными эффектами
              </div>
            </div>

            <div className="set-row">
              <div>
                <b>Закрывать лаунчер при старте игры</b>
                <small>
                  Экономит оперативную память ПК, автоматически закрывая процесс лаунчера
                </small>
              </div>
              <button
                type="button"
                className={`set-sw ${closeOnLaunch ? "on" : ""}`}
                onClick={() => setCloseOnLaunch((prev) => !prev)}
              />
            </div>

            <div className="set-row">
              <div>
                <b>Полноэкранный режим по умолчанию</b>
                <small>Разворачивает окно Minecraft во весь экран сразу после загрузки</small>
              </div>
              <button
                type="button"
                className={`set-sw ${fullscreen ? "on" : ""}`}
                onClick={() => setFullscreen((prev) => !prev)}
              />
            </div>

            <div>
              <div className="set-lab">Разрешение окна Minecraft:</div>
              <div className="set-seg c4 ctr">
                {["1280x720", "1920x1080", "1024x768", "default"].map((res) => (
                  <button
                    key={res}
                    type="button"
                    className={resolution === res ? "on" : ""}
                    onClick={() => setResolution(res)}
                  >
                    {res === "default" ? "По умолчанию" : res}
                  </button>
                ))}
              </div>
            </div>

            <div className="set-row">
              <div>
                <b>Фон лаунчера</b>
                <small>Текущий фон: {activeBg.title} ({bgIndex + 1} из {MINECRAFT_BACKGROUNDS.length})</small>
              </div>
              <button
                type="button"
                className="set-b"
                onClick={() => {
                  setActiveTab("appearance");
                  setAppearanceSubTab("background");
                }}
              >
                Настроить фон…
              </button>
            </div>
          </div>

          <div className={`set-pn ${activeTab === "appearance" ? "on" : ""}`}>
            <div className="set-appearance-nav">
              <button
                type="button"
                className={`set-appearance-tab-btn ${appearanceSubTab === "topbar" ? "active on" : ""}`}
                onClick={() => setAppearanceSubTab("topbar")}
              >
                Верхняя панель
              </button>
              <button
                type="button"
                className={`set-appearance-tab-btn ${appearanceSubTab === "bottombar" ? "active on" : ""}`}
                onClick={() => setAppearanceSubTab("bottombar")}
              >
                Нижняя панель (Кнопка «Играть»)
              </button>
              <button
                type="button"
                className={`set-appearance-tab-btn ${appearanceSubTab === "background" ? "active on" : ""}`}
                onClick={() => setAppearanceSubTab("background")}
              >
                Задний фон
              </button>
            </div>

            {appearanceSubTab === "topbar" && (
              <TopBarCustomizer
                layout={topBarLayout}
                onSave={onSaveTopBarLayout}
                onReset={onResetTopBarLayout}
                account={account}
                skinUrl={skinUrl}
                selectedInstance={selectedInstance}
                instances={instances}
                onFeedback={showFeedback}
                topBarCustomization={menusCustomization?.topbar}
                onOpenCustomizer={() => onOpenMenuCustomizer?.("topbar")}
              />
            )}

            {appearanceSubTab === "bottombar" && (
              <BottomBarCustomizer
                layout={bottomBarLayout}
                alignment={bottomBarAlignment}
                onSave={onSaveBottomBarLayout}
                onReset={onResetBottomBarLayout}
                selectedInstance={selectedInstance}
                onFeedback={showFeedback}
              />
            )}

            {appearanceSubTab === "background" && (
              <BackgroundCustomizer
                bgIndex={bgIndex}
                isBgAutoPlay={isBgAutoPlay}
                onSelectBg={onSelectBg}
                onNextBg={onNextBg}
                onPrevBg={onPrevBg}
                onToggleBgAutoPlay={onToggleBgAutoPlay}
                buttonShapePreset={buttonShapePreset}
                onChangeButtonShapePreset={onChangeButtonShapePreset}
                onFeedback={showFeedback}
                backgroundCustomization={menusCustomization?.background}
                onOpenCustomizer={() => onOpenMenuCustomizer?.("background")}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
