import React, { useState, useEffect, useCallback } from "react";
import { MINECRAFT_BACKGROUNDS } from "../../constants/backgrounds";
import { ipc } from "../../services/ipc";
import { setStoredCloseOnLaunch } from "../../services/storage";
import { useLanguage } from "../../context/LanguageContext";
import {
  Sparkles,
  Trash2,
  Cpu,
  RotateCcw,
  Gauge,
  Zap,
  CheckCircle2,
  FolderOpen,
  HardDrive,
  Database,
  RefreshCw,
  Rocket,
  EyeOff,
  Sliders,
} from "lucide-react";
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
  onNavigate?: (screen: import("../layers/ScreensLayer").ScreenId) => void;
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

type SettingsTab = "paths" | "memory" | "network" | "versions" | "launch" | "appearance" | "optimization";

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
  enableGameMode?: boolean;
  launcherEcoMode?: boolean;
  ultraPerformanceMode?: boolean;
  disable3DCharacter?: boolean;
  disableAnimations?: boolean;
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
  enableGameMode: true,
  launcherEcoMode: false,
  ultraPerformanceMode: false,
  disable3DCharacter: false,
  disableAnimations: false,
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
  onNavigate,
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
  const [enableGameMode, setEnableGameMode] = useState<boolean>(
    initialSettings.enableGameMode !== undefined ? Boolean(initialSettings.enableGameMode) : true
  );
  const [launcherEcoMode, setLauncherEcoMode] = useState<boolean>(
    Boolean(initialSettings.launcherEcoMode)
  );
  const [ultraPerformanceMode, setUltraPerformanceMode] = useState<boolean>(
    Boolean(initialSettings.ultraPerformanceMode)
  );
  const [disable3DCharacter, setDisable3DCharacter] = useState<boolean>(
    Boolean(initialSettings.disable3DCharacter || initialSettings.ultraPerformanceMode)
  );
  const [disableAnimations, setDisableAnimations] = useState<boolean>(
    Boolean(initialSettings.disableAnimations || initialSettings.ultraPerformanceMode)
  );

  const [systemMemory, setSystemMemory] = useState<import("../../services/ipc").SystemMemoryInfo | null>(null);
  const [dbSizeBytes, setDbSizeBytes] = useState<number>(0);
  const [cacheSizeText, setCacheSizeText] = useState<string>("");
  const [isCleaningCache, setIsCleaningCache] = useState<boolean>(false);
  const [isCleaningLogs, setIsCleaningLogs] = useState<boolean>(false);
  const [isCleaningGameLogs, setIsCleaningGameLogs] = useState<boolean>(false);
  const [isCleaningTemp, setIsCleaningTemp] = useState<boolean>(false);
  const [isVacuumingDb, setIsVacuumingDb] = useState<boolean>(false);
  const [isOptimizingBackend, setIsOptimizingBackend] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string } | null>(null);

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
      localStorage.setItem("vf_release", String(showReleases));
      localStorage.setItem("vf_snapshot", String(showSnapshots));
      localStorage.setItem("vf_old_beta", String(showBetas));
      localStorage.setItem("vf_old_alpha", String(showAlphas));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }, [showReleases, showSnapshots, showBetas, showAlphas]);

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
        enableGameMode,
        launcherEcoMode,
        ultraPerformanceMode,
        disable3DCharacter,
        disableAnimations,
      };
      localStorage.setItem("omega_launcher_settings", JSON.stringify(toSave));
      window.dispatchEvent(new Event("omega_settings_updated"));
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
    enableGameMode,
    launcherEcoMode,
    ultraPerformanceMode,
    disable3DCharacter,
    disableAnimations,
  ]);

  const showFeedback = useCallback((msg: string) => {
    setFeedbackMsg({ text: msg });
    setTimeout(() => {
      setFeedbackMsg((curr) => (curr?.text === msg ? null : curr));
    }, 4200);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return "0 Б";
    const k = 1024;
    const sizes = ["Б", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const refreshMemoryStats = useCallback(async () => {
    try {
      const [memInfo, cacheSize, dbSize] = await Promise.all([
        ipc.getSystemMemoryInfo().catch(() => null),
        ipc.getLauncherCacheSize().catch(() => 0),
        ipc.getDatabaseSize().catch(() => 0),
      ]);
      if (memInfo) setSystemMemory(memInfo);
      setCacheSizeText(formatBytes(cacheSize));
      setDbSizeBytes(dbSize);
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === "memory" || activeTab === "optimization") {
      void refreshMemoryStats();
    }
  }, [activeTab, refreshMemoryStats]);

  useEffect(() => {
    if (launcherEcoMode) {
      document.body.classList.add("launcher-eco-mode");
    } else {
      document.body.classList.remove("launcher-eco-mode");
    }
  }, [launcherEcoMode]);

  useEffect(() => {
    if (ultraPerformanceMode || disableAnimations) {
      document.body.classList.add("ultra-performance-mode");
    } else {
      document.body.classList.remove("ultra-performance-mode");
    }
  }, [ultraPerformanceMode, disableAnimations]);

  const handleBrowseGameDir = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: globalLang === "uk" ? "Оберіть директорію гри .minecraft" : "Выберите директорию игры .minecraft",
      });
      if (selected && typeof selected === "string") {
        setGameDir(selected);
        showFeedback(globalLang === "uk" ? `Обрано папку: ${selected}` : `Выбрана папка: ${selected}`);
      }
    } catch (e: any) {
      showFeedback(`Помилка діалогу: ${e?.message || e}`);
    }
  };

  const handleBrowseJava = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: false,
        multiple: false,
        title: globalLang === "uk" ? "Оберіть виконуваний файл Java" : "Выберите исполняемый файл Java",
      });
      if (selected && typeof selected === "string") {
        setJavaPath(selected);
        showFeedback(globalLang === "uk" ? `Обрано Java: ${selected}` : `Выбран путь Java: ${selected}`);
      }
    } catch (e: any) {
      showFeedback(`Помилка діалогу: ${e?.message || e}`);
    }
  };

  const handleOptimizeLauncher = async () => {
    setIsOptimizingBackend(true);
    try {
      setUltraPerformanceMode(true);
      setDisable3DCharacter(true);
      setDisableAnimations(true);
      setLauncherEcoMode(true);

      const res = await ipc.optimizeLauncherBackend();
      window.dispatchEvent(new Event("omega_settings_updated"));
      void refreshMemoryStats();

      showFeedback(
        globalLang === "uk"
          ? `✓ Лаунчер оптимізовано! 3D-персонаж та анімації вимкнено, базу стиснуто (звільнено ${formatBytes(res.totalFreedBytes)})`
          : globalLang === "ru"
          ? `✓ Лаунчер оптимизирован! 3D-персонаж и анимации выключены, база сжата (освобождено ${formatBytes(res.totalFreedBytes)})`
          : `✓ Launcher optimized! 3D character & animations disabled, DB compressed (freed ${formatBytes(res.totalFreedBytes)})`
      );
    } catch (e: any) {
      showFeedback(`Помилка оптимізації: ${e?.message || e}`);
    } finally {
      setIsOptimizingBackend(false);
    }
  };

  const handleVacuumDatabase = async () => {
    setIsVacuumingDb(true);
    try {
      const msg = await ipc.optimizeDatabase();
      void refreshMemoryStats();
      showFeedback(
        globalLang === "uk"
          ? "Базу даних SQLite дефрагментовано та успішно стиснуто"
          : globalLang === "ru"
          ? "База данных SQLite дефрагментирована и сжата"
          : msg
      );
    } catch (e: any) {
      showFeedback(`Помилка оптимізації БД: ${e?.message || e}`);
    } finally {
      setIsVacuumingDb(false);
    }
  };

  const handleClearTempFiles = async () => {
    setIsCleaningTemp(true);
    try {
      const freed = await ipc.clearTempFiles();
      void refreshMemoryStats();
      showFeedback(
        globalLang === "uk"
          ? `Тимчасові файли очищено (звільнено ${formatBytes(freed)})`
          : globalLang === "ru"
          ? `Временные файлы загрузок очищены (освобождено ${formatBytes(freed)})`
          : `Temporary files cleared (freed ${formatBytes(freed)})`
      );
    } catch (e: any) {
      showFeedback(`Помилка: ${e?.message || e}`);
    } finally {
      setIsCleaningTemp(false);
    }
  };

  const handleAutoTuneRam = () => {
    if (systemMemory && systemMemory.totalRamMb > 0) {
      const totalGb = Math.round(systemMemory.totalRamMb / 1024);
      let target = 4;
      if (totalGb <= 4) target = 2;
      else if (totalGb <= 8) target = 4;
      else if (totalGb <= 16) target = 6;
      else target = 8;
      setRam(target);
      showFeedback(
        globalLang === "uk"
          ? `Автопідбір RAM: встановлено ${target} ГБ (для ПК з ${totalGb} ГБ)`
          : globalLang === "ru"
          ? `Автоподбор RAM: выставлено ${target} ГБ (для ПК с ${totalGb} ГБ)`
          : `Auto-tuned RAM: set to ${target} GB (for PC with ${totalGb} GB)`
      );
    } else {
      setRam(4);
      showFeedback("Установлено оптимальное значение: 4 ГБ");
    }
  };

  const handleClearCache = async () => {
    setIsCleaningCache(true);
    try {
      const freed = await ipc.clearLauncherCache();
      showFeedback(
        globalLang === "uk"
          ? `Кеш лаунчера очищено (звільнено ${formatBytes(freed)})`
          : globalLang === "ru"
          ? `Кэш лаунчера очищен (освобождено ${formatBytes(freed)})`
          : `Launcher cache cleared (freed ${formatBytes(freed)})`
      );
      void refreshMemoryStats();
    } catch (e: any) {
      showFeedback(`Помилка: ${e?.message || e}`);
    } finally {
      setIsCleaningCache(false);
    }
  };

  const handleClearLauncherLogs = async () => {
    setIsCleaningLogs(true);
    try {
      const freed = await ipc.clearLauncherLogs();
      showFeedback(
        globalLang === "uk"
          ? `Логи лаунчера видалено (звільнено ${formatBytes(freed)})`
          : globalLang === "ru"
          ? `Логи лаунчера удалены (освобождено ${formatBytes(freed)})`
          : `Launcher logs deleted (freed ${formatBytes(freed)})`
      );
    } catch (e: any) {
      showFeedback(`Помилка: ${e?.message || e}`);
    } finally {
      setIsCleaningLogs(false);
    }
  };

  const handleClearGameLogs = async () => {
    setIsCleaningGameLogs(true);
    try {
      const freed = await ipc.clearGameLogs(gameDir);
      showFeedback(
        globalLang === "uk"
          ? `Ігрові логи та дампи очищено (звільнено ${formatBytes(freed)})`
          : globalLang === "ru"
          ? `Игровые логи и отчеты о сбоях очищены (освобождено ${formatBytes(freed)})`
          : `Game logs and crash reports cleaned (freed ${formatBytes(freed)})`
      );
    } catch (e: any) {
      showFeedback(`Помилка: ${e?.message || e}`);
    } finally {
      setIsCleaningGameLogs(false);
    }
  };

  const handleTrimMemory = () => {
    try {
      if ((window as any).gc) {
        (window as any).gc();
      }
    } catch {}
    showFeedback(
      globalLang === "uk"
        ? "Пам'ять інтерфейсу оптимізована (вивантажено невикористовувані об'єкти)"
        : globalLang === "ru"
        ? "Память интерфейса оптимизирована (выгружены неиспользуемые объекты)"
        : "Interface memory trimmed (unused objects evicted)"
    );
  };

  const AIKAR_FLAGS =
    "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1";

  const handleApplyAikarFlags = () => {
    setGcType("G1GC");
    setJvmArgs(AIKAR_FLAGS);
    showFeedback(
      globalLang === "uk"
        ? "Застосовано рекомендовані прапорці Aikar's Flags для G1GC"
        : globalLang === "ru"
        ? "Применены рекомендованные флаги Aikar's Flags для G1GC"
        : "Applied recommended Aikar's Flags for G1GC"
    );
  };

  const ZGC_FLAGS = "-XX:+UseZGC -XX:+ZGenerational -XX:+UnlockExperimentalVMOptions -XX:+AlwaysPreTouch";

  const handleApplyZGCFlags = () => {
    setGcType("ZGC");
    setJvmArgs(ZGC_FLAGS);
    showFeedback(
      globalLang === "uk"
        ? "Застосовано конфігурацію ZGC Generational (наднизька затримка)"
        : globalLang === "ru"
        ? "Применена конфигурация ZGC Generational (сверхнизкая задержка)"
        : "Applied ZGC Generational configuration (ultra-low latency)"
    );
  };

  const SHENANDOAH_FLAGS = "-XX:+UseShenandoahGC -XX:+UnlockExperimentalVMOptions -XX:+AlwaysPreTouch";

  const handleApplyShenandoahFlags = () => {
    setGcType("Shenandoah");
    setJvmArgs(SHENANDOAH_FLAGS);
    showFeedback(
      globalLang === "uk"
        ? "Застосовано збирач сміття Shenandoah GC"
        : globalLang === "ru"
        ? "Применен сборщик мусора Shenandoah GC"
        : "Applied Shenandoah GC"
    );
  };

  const DEFAULT_JVM_FLAGS = "-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions";

  const handleResetJvmFlags = () => {
    setGcType("G1GC");
    setJvmArgs(DEFAULT_JVM_FLAGS);
    showFeedback(
      globalLang === "uk"
        ? "Параметри JVM скинуто до стандартних"
        : globalLang === "ru"
        ? "Параметры JVM сброшены к стандартным"
        : "JVM flags reset to default"
    );
  };

  const handleNavigateToOptimizationMods = () => {
    if (onNavigate) {
      onNavigate("modrinth");
    }
  };

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
              {globalLang === "uk" ? "Пам'ять та очищення" : globalLang === "ru" ? "Память и очистка" : "Memory & Storage"}
            </button>
            <button
              type="button"
              className={activeTab === "optimization" ? "on" : ""}
              onClick={() => setActiveTab("optimization")}
            >
              {globalLang === "uk" ? "Оптимізація" : globalLang === "ru" ? "Оптимизация" : "Optimization"}
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
              <b style={{ color: enableGameMode ? "#5fc9a0" : "#8b919c" }}>
                {enableGameMode
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
              <span>GAMEMODE</span>
            </div>
            <div className="set-pr">
              <b style={{ color: ultraPerformanceMode ? "#5fc9a0" : "#8b919c" }}>
                {ultraPerformanceMode
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
              <span>ULTRA MODE</span>
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
                  onClick={handleBrowseGameDir}
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
                <button
                  type="button"
                  className="set-b"
                  onClick={handleBrowseJava}
                >
                  Обзор…
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
              <h1>
                {globalLang === "uk"
                  ? "Пам'ять та дискове сховище"
                  : globalLang === "ru"
                  ? "Память и дисковое хранилище"
                  : "Memory & Storage"}
              </h1>
              <div className="set-sub">
                {globalLang === "uk"
                  ? "Моніторинг ОЗП у реальному часі, автопідбір виділення пам'яті, очищення кешів, логів та оптимізація бази даних"
                  : globalLang === "ru"
                  ? "Мониторинг ОЗУ в реальном времени, автоподбор памяти, очистка кэшей, логов и оптимизация базы данных"
                  : "Real-time RAM monitoring, auto-tuning, cache and log cleanup, and database optimization"}
              </div>
            </div>

            {/* Real-time memory and storage stats dashboard */}
            <div>
              <div className="set-opt-section-header" style={{ marginBottom: "6px" }}>
                <span className="set-opt-badge">
                  <HardDrive size={13} />
                  {globalLang === "uk"
                    ? "Статистика пам'яті системи та лаунчера"
                    : globalLang === "ru"
                    ? "Статистика памяти системы и лаунчера"
                    : "System & Launcher Memory Stats"}
                </span>
                <button
                  type="button"
                  className="set-b"
                  style={{ height: "26px", padding: "0 10px", fontSize: "11px", gap: "6px" }}
                  onClick={() => void refreshMemoryStats()}
                >
                  <RefreshCw size={12} />
                  {globalLang === "uk" ? "Оновити дані" : globalLang === "ru" ? "Обновить данные" : "Refresh"}
                </button>
              </div>

              <div className="set-mem-stats-grid">
                <div className="set-mem-stat-card">
                  <span className="set-mem-stat-val">
                    {systemMemory?.totalRamMb ? (systemMemory.totalRamMb / 1024).toFixed(1) + " ГБ" : "—"}
                  </span>
                  <span className="set-mem-stat-lbl">
                    {globalLang === "uk" ? "Всього RAM" : globalLang === "ru" ? "Всего ОЗУ" : "Total RAM"}
                  </span>
                </div>
                <div className="set-mem-stat-card">
                  <span className="set-mem-stat-val" style={{ color: "#5fc9a0" }}>
                    {systemMemory?.availableRamMb ? (systemMemory.availableRamMb / 1024).toFixed(1) + " ГБ" : "—"}
                  </span>
                  <span className="set-mem-stat-lbl">
                    {globalLang === "uk" ? "Вільно RAM" : globalLang === "ru" ? "Свободно ОЗУ" : "Available RAM"}
                  </span>
                </div>
                <div className="set-mem-stat-card">
                  <span className="set-mem-stat-val">
                    {systemMemory?.launcherRssMb ? systemMemory.launcherRssMb.toFixed(0) + " МБ" : "—"}
                  </span>
                  <span className="set-mem-stat-lbl">
                    {globalLang === "uk" ? "Лаунчер RSS" : globalLang === "ru" ? "Лаунчер RSS" : "Launcher RSS"}
                  </span>
                </div>
                <div className="set-mem-stat-card">
                  <span className="set-mem-stat-val">
                    {cacheSizeText || "0 Б"}
                  </span>
                  <span className="set-mem-stat-lbl">
                    {globalLang === "uk" ? "Кеш лаунчера" : globalLang === "ru" ? "Кэш лаунчера" : "Launcher Cache"}
                  </span>
                </div>
                <div className="set-mem-stat-card">
                  <span className="set-mem-stat-val">
                    {dbSizeBytes > 0 ? formatBytes(dbSizeBytes) : "—"}
                  </span>
                  <span className="set-mem-stat-lbl">
                    {globalLang === "uk" ? "БД SQLite" : globalLang === "ru" ? "БД SQLite" : "SQLite DB"}
                  </span>
                </div>
              </div>
            </div>

            {/* RAM Allocation for Minecraft */}
            <div>
              <div className="set-lab" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {globalLang === "uk"
                    ? "Виділена оперативна пам'ять для гри:"
                    : globalLang === "ru"
                    ? "Выделенная оперативная память для игры:"
                    : "Allocated RAM for Minecraft:"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    className="set-b go"
                    style={{ height: "26px", padding: "0 10px", fontSize: "11px" }}
                    onClick={handleAutoTuneRam}
                  >
                    ⚡ {globalLang === "uk" ? "Автопідбір RAM" : globalLang === "ru" ? "Автоподбор RAM" : "Auto-tune RAM"}
                  </button>
                  <b style={{ fontSize: "15px", color: "#e6e8ec" }}>{ram} ГБ</b>
                </div>
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
                {globalLang === "uk"
                  ? "Рекомендується 4–8 ГБ для стабільної гри з модами та шейдерами. Кнопка автопідбору виставляє оптимальний об'єм на основі характеристик вашого ПК."
                  : globalLang === "ru"
                  ? "Рекомендуется 4–8 ГБ для стабильной игры с модами и шейдерами. Кнопка автоподбора выставляет оптимальный объём на основе характеристик вашего ПК."
                  : "4–8 GB is recommended for smooth gameplay with mods and shaders. Auto-tune calculates optimal RAM for your system."}
              </div>
            </div>

            {/* Clean Caches and Logs Grid */}
            <div className="set-opt-section" style={{ marginTop: "4px" }}>
              <div className="set-opt-section-header">
                <span className="set-opt-badge">
                  <Trash2 size={13} />
                  {globalLang === "uk"
                    ? "Очищення кешів, логів та дискового простору"
                    : globalLang === "ru"
                    ? "Очистка кэшей, логов и дискового пространства"
                    : "Clean Caches, Logs & Disk Space"}
                </span>
              </div>

              <div className="set-opt-grid">
                {/* Clear Launcher Cache */}
                <div className="set-opt-card">
                  <div className="set-opt-card-header">
                    <div className="set-opt-card-icon">
                      <Trash2 size={18} />
                    </div>
                    <div className="set-opt-card-info">
                      <b>
                        {globalLang === "uk"
                          ? "Очистити кеш лаунчера"
                          : globalLang === "ru"
                          ? "Очистить кэш лаунчера"
                          : "Clear Launcher Cache"}
                      </b>
                      <small>
                        {globalLang === "uk"
                          ? "Видаляє завантажені іконки модів, списки версій та кеш запитів"
                          : globalLang === "ru"
                          ? "Удаляет кэшированные иконки модов, списки версий и кэш запросов"
                          : "Deletes cached mod icons, version manifests, and query cache"}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="set-b"
                    disabled={isCleaningCache}
                    onClick={handleClearCache}
                  >
                    {isCleaningCache
                      ? globalLang === "uk"
                        ? "Очищення..."
                        : globalLang === "ru"
                        ? "Очистка..."
                        : "Cleaning..."
                      : globalLang === "uk"
                      ? "Очистити кеш"
                      : globalLang === "ru"
                      ? "Очистить кэш"
                      : "Clear Cache"}
                  </button>
                </div>

                {/* Clear Launcher Logs */}
                <div className="set-opt-card">
                  <div className="set-opt-card-header">
                    <div className="set-opt-card-icon">
                      <RotateCcw size={18} />
                    </div>
                    <div className="set-opt-card-info">
                      <b>
                        {globalLang === "uk"
                          ? "Очистити логи лаунчера"
                          : globalLang === "ru"
                          ? "Очистить логи лаунчера"
                          : "Clear Launcher Logs"}
                      </b>
                      <small>
                        {globalLang === "uk"
                          ? "Видаляє застарілі файли launcher.log та журнали сесій"
                          : globalLang === "ru"
                          ? "Удаляет устаревшие файлы launcher.log и журналы сессий"
                          : "Deletes old launcher.log files and session journals"}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="set-b"
                    disabled={isCleaningLogs}
                    onClick={handleClearLauncherLogs}
                  >
                    {isCleaningLogs
                      ? globalLang === "uk"
                        ? "Видалення..."
                        : globalLang === "ru"
                        ? "Удаление..."
                        : "Deleting..."
                      : globalLang === "uk"
                      ? "Видалити логи"
                      : globalLang === "ru"
                      ? "Удалить логи"
                      : "Delete Logs"}
                  </button>
                </div>

                {/* Clear Game Logs & Crash Reports */}
                <div className="set-opt-card">
                  <div className="set-opt-card-header">
                    <div className="set-opt-card-icon">
                      <Zap size={18} />
                    </div>
                    <div className="set-opt-card-info">
                      <b>
                        {globalLang === "uk"
                          ? "Очистити ігрові логи та дампи"
                          : globalLang === "ru"
                          ? "Очистить игровые логи и дампы"
                          : "Clean Game Logs & Crash Reports"}
                      </b>
                      <small>
                        {globalLang === "uk"
                          ? "Видаляє стиснуті логи (.log.gz) та звіти crash-reports у папці гри"
                          : globalLang === "ru"
                          ? "Удаляет сжатые логи (.log.gz) и отчеты crash-reports в папке игры"
                          : "Removes compressed logs (.log.gz) and crash reports in game dir"}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="set-b"
                    disabled={isCleaningGameLogs}
                    onClick={handleClearGameLogs}
                  >
                    {isCleaningGameLogs
                      ? globalLang === "uk"
                        ? "Очищення..."
                        : globalLang === "ru"
                        ? "Очистка..."
                        : "Cleaning..."
                      : globalLang === "uk"
                      ? "Очистити логи гри"
                      : globalLang === "ru"
                      ? "Очистить логи игры"
                      : "Clean Game Logs"}
                  </button>
                </div>

                {/* Clear Temp Files */}
                <div className="set-opt-card">
                  <div className="set-opt-card-header">
                    <div className="set-opt-card-icon">
                      <FolderOpen size={18} />
                    </div>
                    <div className="set-opt-card-info">
                      <b>
                        {globalLang === "uk"
                          ? "Очистити тимчасові файли"
                          : globalLang === "ru"
                          ? "Очистить временные файлы"
                          : "Clear Temporary Files"}
                      </b>
                      <small>
                        {globalLang === "uk"
                          ? "Очищає незавершені завантаження та тимчасові архіви в .omega/temp"
                          : globalLang === "ru"
                          ? "Очищает незавершенные загрузки и временные архивы в .omega/temp"
                          : "Deletes unfinished downloads and temporary archives in .omega/temp"}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="set-b"
                    disabled={isCleaningTemp}
                    onClick={handleClearTempFiles}
                  >
                    {isCleaningTemp
                      ? globalLang === "uk"
                        ? "Очищення..."
                        : globalLang === "ru"
                        ? "Очистка..."
                        : "Cleaning..."
                      : globalLang === "uk"
                      ? "Очистити темп"
                      : globalLang === "ru"
                      ? "Очистить темп"
                      : "Clear Temp"}
                  </button>
                </div>
              </div>
            </div>

            {/* Database & RAM Tuning */}
            <div className="set-opt-section" style={{ marginTop: "4px" }}>
              <div className="set-opt-section-header">
                <span className="set-opt-badge">
                  <Database size={13} />
                  {globalLang === "uk"
                    ? "Оптимізація бази даних та системної пам'яті"
                    : globalLang === "ru"
                    ? "Оптимизация базы данных и системной памяти"
                    : "Database & Memory Optimization"}
                </span>
              </div>

              <div className="set-opt-grid">
                {/* SQLite VACUUM */}
                <div className="set-opt-card">
                  <div className="set-opt-card-header">
                    <div className="set-opt-card-icon">
                      <Database size={18} />
                    </div>
                    <div className="set-opt-card-info">
                      <b>
                        {globalLang === "uk"
                          ? "Стиснути базу даних SQLite"
                          : globalLang === "ru"
                          ? "Сжать базу данных SQLite"
                          : "Vacuum SQLite Database"}
                      </b>
                      <small>
                        {globalLang === "uk"
                          ? "Виконує дефрагментацію (VACUUM), скидає WAL-журнали та звільняє дискове місце"
                          : globalLang === "ru"
                          ? "Выполняет дефрагментацию (VACUUM), сбрасывает WAL-журналы и освобождает место"
                          : "Runs VACUUM defragmentation, truncates WAL logs and shrinks DB"}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="set-b"
                    disabled={isVacuumingDb}
                    onClick={handleVacuumDatabase}
                  >
                    {isVacuumingDb
                      ? globalLang === "uk"
                        ? "Стиснення..."
                        : globalLang === "ru"
                        ? "Сжатие..."
                        : "Shrinking..."
                      : globalLang === "uk"
                      ? "Стиснути БД"
                      : globalLang === "ru"
                      ? "Сжать БД"
                      : "Vacuum DB"}
                  </button>
                </div>

                {/* Free Interface Memory / Trim */}
                <div className="set-opt-card">
                  <div className="set-opt-card-header">
                    <div className="set-opt-card-icon">
                      <Cpu size={18} />
                    </div>
                    <div className="set-opt-card-info">
                      <b>
                        {globalLang === "uk"
                          ? "Звільнити пам'ять інтерфейсу"
                          : globalLang === "ru"
                          ? "Освободить память интерфейса"
                          : "Trim Interface Memory"}
                      </b>
                      <small>
                        {globalLang === "uk"
                          ? "Вивантажує неактивні ресурси веб-рушія та примусово звільняє оперативну пам'ять"
                          : globalLang === "ru"
                          ? "Выгружает неактивные ресурсы веб-движка и принудительно освобождает ОЗУ"
                          : "Evicts inactive web-engine resources and trims allocated RAM"}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="set-b"
                    onClick={handleTrimMemory}
                  >
                    {globalLang === "uk"
                      ? "Оптимізувати RAM"
                      : globalLang === "ru"
                      ? "Оптимизировать RAM"
                      : "Trim Memory"}
                  </button>
                </div>
              </div>
            </div>

            {/* JVM Collector Selection & Arguments */}
            <div>
              <div className="set-lab">
                {globalLang === "uk"
                  ? "Збирач сміття JVM (Garbage Collector):"
                  : globalLang === "ru"
                  ? "Сборщик мусора JVM (Garbage Collector):"
                  : "JVM Garbage Collector:"}
              </div>
              <div className="set-seg c3">
                <button
                  type="button"
                  className={gcType === "G1GC" ? "on" : ""}
                  onClick={() => {
                    setGcType("G1GC");
                    setJvmArgs("-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions");
                  }}
                >
                  G1GC ({globalLang === "uk" ? "Стандарт" : globalLang === "ru" ? "Стандарт" : "Default"})
                  <small>{globalLang === "uk" ? "Стабільний для всіх модів" : globalLang === "ru" ? "Стабильный для всех модов" : "Stable for all mods"}</small>
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
                  <small>{globalLang === "uk" ? "Мінімальні фризи" : globalLang === "ru" ? "Минимальные фризы" : "Low pause time"}</small>
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
                  <small>{globalLang === "uk" ? "Сверхнизькі затримки" : globalLang === "ru" ? "Сверхнизкие задержки" : "Ultra-low latency"}</small>
                </button>
              </div>
            </div>

            <div>
              <div className="set-lab">
                {globalLang === "uk"
                  ? "Аргументи запуску Java Virtual Machine:"
                  : globalLang === "ru"
                  ? "Аргументы запуска Java Virtual Machine:"
                  : "JVM Launch Arguments:"}
              </div>
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

          <div className={`set-pn ${activeTab === "optimization" ? "on" : ""}`}>
            <div>
              <h1>
                {globalLang === "uk"
                  ? "Оптимізація лаунчера та гри"
                  : globalLang === "ru"
                  ? "Оптимизация лаунчера и игры"
                  : "Launcher & Game Optimization"}
              </h1>
              <div className="set-sub">
                {globalLang === "uk"
                  ? "Режим максимальної швидкодії, вимкнення 3D персонажа, зупинка анімацій, тюнінг бекенда та оптимізація FPS у грі"
                  : globalLang === "ru"
                  ? "Режим максимальной производительности, выключение 3D персонажа, остановка анимаций, тюнинг бэкенда и оптимизация FPS в игре"
                  : "Ultra performance mode, disable 3D character, freeze animations, backend tuning, and in-game FPS optimization"}
              </div>
            </div>

            {/* Master Hero Card: Optimize Launcher */}
            <div className="set-hero-card">
              <div className="set-hero-header">
                <div className="set-hero-title">
                  <Rocket size={20} color="#7c5cff" />
                  <span>
                    {globalLang === "uk"
                      ? "Режим максимальної швидкодії лаунчера"
                      : globalLang === "ru"
                      ? "Режим максимальной производительности лаунчера"
                      : "Ultra Performance Launcher Mode"}
                  </span>
                </div>
                <button
                  type="button"
                  className="set-b go"
                  disabled={isOptimizingBackend}
                  onClick={handleOptimizeLauncher}
                  style={{ padding: "0 20px", height: "36px", fontSize: "13px", fontWeight: 700 }}
                >
                  {isOptimizingBackend
                    ? globalLang === "uk"
                      ? "Оптимізація..."
                      : globalLang === "ru"
                      ? "Оптимизация..."
                      : "Optimizing..."
                    : globalLang === "uk"
                    ? "🚀 Оптимізувати лаунчер"
                    : globalLang === "ru"
                    ? "🚀 Оптимизировать лаунчер"
                    : "🚀 Optimize Launcher"}
                </button>
              </div>
              <div className="set-hero-desc">
                {globalLang === "uk"
                  ? "В один клік вмикає режим максимальної продуктивності: вимикає всі CSS-анімації та переходи (інтерфейс літає миттєво), повністю розмонтовує 3D-персонажа (0% навантаження на GPU/CPU), вмикає Eco-режим та проводить оптимізацію бекенда (дефрагментація БД, очищення темп-файлів)."
                  : globalLang === "ru"
                  ? "В один клик включает режим максимальной производительности: отключает все CSS-анимации и переходы (интерфейс откликается моментально), полностью размонтирует 3D-персонажа (0% нагрузки на GPU/CPU), активирует Eco-режим и запускает бэкенд-оптимизацию (дефрагментация БД, очистка темп-файлов)."
                  : "One-click ultra performance mode: disables all animations and transitions (instant UI response), completely unmounts 3D character (0% GPU/CPU load), turns on Eco mode, and executes backend optimization (DB vacuum, temp cleanup)."}
              </div>
            </div>

            {/* Launcher Fine-Tuning Section */}
            <div className="set-opt-section" style={{ marginTop: "12px" }}>
              <div className="set-opt-section-header">
                <span className="set-opt-badge">
                  <Sparkles size={13} />
                  {globalLang === "uk"
                    ? "Тонке налаштування продуктивності лаунчера"
                    : globalLang === "ru"
                    ? "Тонкая настройка производительности лаунчера"
                    : "Launcher Performance Fine-Tuning"}
                </span>
              </div>

              {/* Ultra Performance Mode */}
              <div className="set-row">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <b>
                      {globalLang === "uk"
                        ? "Режим максимальної продуктивності (Ultra Performance)"
                        : globalLang === "ru"
                        ? "Режим максимальной производительности (Ultra Performance)"
                        : "Ultra Performance Mode"}
                    </b>
                    <span
                      style={{
                        fontSize: "10.5px",
                        padding: "1px 6px",
                        background: "rgba(124, 92, 255, 0.18)",
                        color: "#a78bfa",
                        borderRadius: "4px",
                        fontWeight: 700,
                      }}
                    >
                      MAX SPEED
                    </span>
                  </div>
                  <small>
                    {globalLang === "uk"
                      ? "Примусово вимикає всі анімації, переходи, розмиття та важкі тіні по всьому лаунчеру для максимального FPS інтерфейсу"
                      : globalLang === "ru"
                      ? "Принудительно отключает все анимации, переходы, размытия и тяжелые тени по всему лаунчеру для максимального FPS интерфейса"
                      : "Forcibly disables all animations, transitions, blurs, and heavy shadows for instantaneous UI response"}
                  </small>
                </div>
                <button
                  type="button"
                  className={`set-sw ${ultraPerformanceMode ? "on" : ""}`}
                  onClick={() => setUltraPerformanceMode((prev) => !prev)}
                />
              </div>

              {/* Disable 3D Character */}
              <div className="set-row">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <b>
                      {globalLang === "uk"
                        ? "Повністю вимкнути 3D-персонажа"
                        : globalLang === "ru"
                        ? "Полностью отключить 3D-персонажа"
                        : "Completely Disable 3D Character"}
                    </b>
                    <span
                      style={{
                        fontSize: "10.5px",
                        padding: "1px 6px",
                        background: "rgba(95, 201, 160, 0.15)",
                        color: "#5fc9a0",
                        borderRadius: "4px",
                        fontWeight: 700,
                      }}
                    >
                      0% GPU
                    </span>
                  </div>
                  <small>
                    {globalLang === "uk"
                      ? "Повністю розмонтовує сцену Three.js зі скіном на головному екрані. Повністю звільняє ресурси відеокарти та CPU від рендерингу сцени"
                      : globalLang === "ru"
                      ? "Полностью размонтирует сцену Three.js со скином на главном экране. Полностью освобождает ресурсы видеокарты и CPU от рендеринга сцены"
                      : "Completely unmounts Three.js Canvas with the skin. Saves 100% of GPU resources and requestAnimationFrame cycles"}
                  </small>
                </div>
                <button
                  type="button"
                  className={`set-sw ${disable3DCharacter ? "on" : ""}`}
                  onClick={() => setDisable3DCharacter((prev) => !prev)}
                />
              </div>

              {/* Disable Animations */}
              <div className="set-row">
                <div>
                  <b>
                    {globalLang === "uk"
                      ? "Вимкнути анімації інтерфейсу"
                      : globalLang === "ru"
                      ? "Отключить анимации интерфейса"
                      : "Disable UI Animations"}
                  </b>
                  <small>
                    {globalLang === "uk"
                      ? "Миттєве перемикання між вкладками, вікнами та списками без затримок переходів"
                      : globalLang === "ru"
                      ? "Мгновенное переключение между вкладками, окнами и списками без задержек переходов"
                      : "Instant switching between tabs, screens, and dialogs without transition delays"}
                  </small>
                </div>
                <button
                  type="button"
                  className={`set-sw ${disableAnimations ? "on" : ""}`}
                  onClick={() => setDisableAnimations((prev) => !prev)}
                />
              </div>

              {/* Eco / Low-Spec Mode */}
              <div className="set-row">
                <div>
                  <b>
                    {globalLang === "uk"
                      ? "Режим енергозбереження (Low-Spec / Eco Mode)"
                      : globalLang === "ru"
                      ? "Режим энергосбережения (Low-Spec / Eco Mode)"
                      : "Low-Spec / Eco Mode"}
                  </b>
                  <small>
                    {globalLang === "uk"
                      ? "Вимикає фонові частинки пилу, розмиття та знижує навантаження на систему"
                      : globalLang === "ru"
                      ? "Отключает фоновые частицы пыли, размытия и снижает общую нагрузку на систему"
                      : "Disables background dust particles, blurs, and reduces overall system load"}
                  </small>
                </div>
                <button
                  type="button"
                  className={`set-sw ${launcherEcoMode ? "on" : ""}`}
                  onClick={() => setLauncherEcoMode((prev) => !prev)}
                />
              </div>
            </div>

            {/* Game Optimization Section */}
            <div className="set-opt-section" style={{ marginTop: "12px" }}>
              <div className="set-opt-section-header">
                <span className="set-opt-badge">
                  <Zap size={13} />
                  {globalLang === "uk"
                    ? "Оптимізація гри Minecraft"
                    : globalLang === "ru"
                    ? "Оптимизация игры Minecraft"
                    : "Minecraft Game Optimization"}
                </span>
              </div>

              {/* Linux Feral GameMode */}
              <div className="set-row">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <b>
                      {globalLang === "uk"
                        ? "Linux Feral GameMode (gamemoderun)"
                        : globalLang === "ru"
                        ? "Linux Feral GameMode (gamemoderun)"
                        : "Linux Feral GameMode (gamemoderun)"}
                    </b>
                    <span
                      style={{
                        fontSize: "10.5px",
                        padding: "1px 6px",
                        background: "rgba(95, 201, 160, 0.15)",
                        color: "#5fc9a0",
                        borderRadius: "4px",
                        fontWeight: 700,
                      }}
                    >
                      RECOMMENDED
                    </span>
                  </div>
                  <small>
                    {globalLang === "uk"
                      ? "Автоматично підвищує пріоритет CPU, частоти GPU та планувальник I/O для максимального FPS"
                      : globalLang === "ru"
                      ? "Автоматически повышает приоритет CPU, частоты GPU и планировщик ввода в Linux для максимального FPS"
                      : "Elevates CPU priority, GPU clock frequencies, and I/O scheduler in Linux for maximum FPS"}
                  </small>
                </div>
                <button
                  type="button"
                  className={`set-sw ${enableGameMode ? "on" : ""}`}
                  onClick={() => setEnableGameMode((prev) => !prev)}
                />
              </div>

              {/* Close Launcher On Launch */}
              <div className="set-row">
                <div>
                  <b>
                    {globalLang === "uk"
                      ? "Закривати лаунчер при старті гри"
                      : globalLang === "ru"
                      ? "Закрывать лаунчер при старте игры"
                      : "Close Launcher On Launch"}
                  </b>
                  <small>
                    {globalLang === "uk"
                      ? "Автоматично завершує процес лаунчера після запуску гри для звільнення оперативної пам'яті"
                      : globalLang === "ru"
                      ? "Автоматически завершает процесс лаунчера после запуска игры для освобождения оперативной памяти"
                      : "Automatically closes launcher process when game starts to free memory"}
                  </small>
                </div>
                <button
                  type="button"
                  className={`set-sw ${closeOnLaunch ? "on" : ""}`}
                  onClick={() => setCloseOnLaunch((prev) => !prev)}
                />
              </div>

              {/* JVM Presets */}
              <div>
                <div className="set-lab">
                  <span>
                    {globalLang === "uk"
                      ? "Оптимізовані пресети аргументів JVM:"
                      : globalLang === "ru"
                      ? "Оптимизированные пресеты аргументов JVM:"
                      : "Optimized JVM Argument Presets:"}
                  </span>
                  <b style={{ fontSize: "12px", color: "#8b919c" }}>{gcType}</b>
                </div>
                <div className="set-seg c4">
                  <button
                    type="button"
                    className={
                      gcType === "G1GC" && jvmArgs.includes("InitiatingHeapOccupancyPercent")
                        ? "on"
                        : ""
                    }
                    onClick={handleApplyAikarFlags}
                  >
                    Aikar's Flags
                    <small>
                      {globalLang === "uk"
                        ? "Мінімум фризів G1GC"
                        : globalLang === "ru"
                        ? "Минимум фризов G1GC"
                        : "Zero lag spikes"}
                    </small>
                  </button>
                  <button
                    type="button"
                    className={gcType === "ZGC" ? "on" : ""}
                    onClick={handleApplyZGCFlags}
                  >
                    ZGC Low-Latency
                    <small>
                      {globalLang === "uk"
                        ? "Паузи кадру <1 мс"
                        : globalLang === "ru"
                        ? "Паузы кадра <1 мс"
                        : "Sub-millisecond"}
                    </small>
                  </button>
                  <button
                    type="button"
                    className={gcType === "Shenandoah" ? "on" : ""}
                    onClick={handleApplyShenandoahFlags}
                  >
                    Shenandoah GC
                    <small>
                      {globalLang === "uk"
                        ? "Ультракороткі паузи"
                        : globalLang === "ru"
                        ? "Ультракороткие паузы"
                        : "Ultra-short pause"}
                    </small>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetJvmFlags}
                  >
                    {globalLang === "uk" ? "Стандартні" : globalLang === "ru" ? "Стандартные" : "Default"}
                    <small>
                      {globalLang === "uk"
                        ? "Базовий G1GC"
                        : globalLang === "ru"
                        ? "Базовый G1GC"
                        : "Standard flags"}
                    </small>
                  </button>
                </div>
                <div className="set-hint" style={{ marginTop: "8px" }}>
                  {globalLang === "uk"
                    ? "Прапорці Aikar's Flags оптимізують паралельну обробку посилань та розміри поколінь NewSize, значно знижуючи лаги при завантаженні чанків."
                    : globalLang === "ru"
                    ? "Флаги Aikar's Flags оптимизируют параллельную обработку ссылок и размеры поколений NewSize, значительно снижая лаги при прогрузке чанков."
                    : "Aikar's Flags optimize parallel reference processing and generation sizes to smooth chunk generation."}
                </div>
              </div>

              {/* Optimization Mods Hub */}
              <div className="set-row">
                <div>
                  <b>
                    {globalLang === "uk"
                      ? "Каталог рекомендованих модів оптимізації"
                      : globalLang === "ru"
                      ? "Каталог рекомендованных модов оптимизации"
                      : "Recommended Optimization Mods Hub"}
                  </b>
                  <small>
                    {globalLang === "uk"
                      ? "Sodium, Lithium, FerriteCore, ImmediatelyFast, Entity Culling для суттєвого підвищення FPS"
                      : globalLang === "ru"
                      ? "Sodium, Lithium, FerriteCore, ImmediatelyFast, Entity Culling для существенного прироста FPS"
                      : "Sodium, Lithium, FerriteCore, ImmediatelyFast, Entity Culling for massive FPS boost"}
                  </small>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    className="set-b go"
                    onClick={handleNavigateToOptimizationMods}
                  >
                    {globalLang === "uk" ? "Знайти моди" : globalLang === "ru" ? "Найти моды" : "Browse Mods"} →
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {feedbackMsg && (
        <div className="set-toast">
          <CheckCircle2 size={16} color="#5fc9a0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}
    </div>
  );
};
