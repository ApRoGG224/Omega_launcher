import React, { useState, useEffect, useCallback, useRef } from "react";
import { AtmosphereLayer } from "./components/layers/AtmosphereLayer";
import { MINECRAFT_BACKGROUNDS } from "./constants/backgrounds";
import { Stage3DLayer } from "./components/layers/Stage3DLayer";
import { PRESET_SKINS } from "./constants/skinPresets";
import { HudLayer } from "./components/layers/HudLayer";
import { DockLayer } from "./components/layers/DockLayer";
import { ScreensLayer, type ScreenId } from "./components/layers/ScreensLayer";
import { OmegaLoginModal } from "./components/modals/OmegaLoginModal";
import { MenuCustomizerModal } from "./components/common/MenuCustomizerModal";
import {
  type MenusCustomizationState,
  type CustomizerZoneId,
  DEFAULT_MENUS_CUSTOMIZATION,
} from "./types/menuCustomization";
import { computePanelTheme } from "./utils/colorUtils";
import {
  type TopBarItemId,
  type BottomBarItemId,
  type BottomBarAlignment,
  type ButtonShapePreset,
  DEFAULT_TOPBAR_LAYOUT,
  DEFAULT_BOTTOMBAR_LAYOUT,
  DEFAULT_BOTTOMBAR_ALIGNMENT,
  DEFAULT_BUTTON_SHAPE_PRESET,
  sanitizeTopBarLayout,
  sanitizeBottomBarLayout,
} from "./constants/launcherLayout";
import { ipc, type DbInstance } from "./services/ipc";
import { listen } from "@tauri-apps/api/event";
import { useLanguage } from "./context/LanguageContext";
import type { Language } from "./i18n";
import type { LogEntry } from "./components/screens/ConsoleScreen";
import type {
  ActiveModal,
  InstanceData,
  AccountData,
  OmegaAccountState,
  InstanceAvatarVariant,
} from "./types";
import "./styles/globals.css";
import "./styles/menu-customizer.css";

const FALLBACK_ACCOUNT: AccountData = {
  id: "guest",
  name: "Гость",
  type: "offline",
  isOnline: false,
  skinUrl: "/skins/steve.png",
};

const DEFAULT_INSTANCES: InstanceData[] = [
  {
    id: "inst_rust_beta",
    name: "Minecraft Rust (Beta)",
    mcVersion: "26.3",
    loader: "Rust",
    playTimeMinutes: 0,
    modCount: 0,
    isReady: true,
    folderId: "folder_rust",
    icon: "obsidian",
    description: "Нативная версия Minecraft на языке Rust. Высокая скорость, низкий оверхед по памяти.",
  },
  {
    id: "inst_1",
    name: "test1",
    mcVersion: "1.21.4",
    loader: "Fabric",
    playTimeMinutes: 0,
    modCount: 26,
    isReady: true,
    folderId: "folder_modpacks",
    icon: "end_crystal",
  },
  {
    id: "inst_2",
    name: "Survival 1.20",
    mcVersion: "1.20.1",
    loader: "Forge",
    playTimeMinutes: 140,
    modCount: 42,
    isReady: true,
    folderId: "folder_survival",
    icon: "diamond_pickaxe",
  },
  {
    id: "inst_3",
    name: "Omega PvP Pack",
    mcVersion: "1.21.4",
    loader: "NeoForge",
    playTimeMinutes: 35,
    modCount: 18,
    isReady: true,
    folderId: "folder_pvp",
    icon: "diamond_sword",
  },
  {
    id: "inst_4",
    name: "Vanilla 1.21.4",
    mcVersion: "1.21.4",
    loader: "Vanilla",
    playTimeMinutes: 60,
    modCount: 0,
    isReady: true,
    folderId: "folder_vanilla",
    icon: "obsidian",
  },
  {
    id: "inst_5",
    name: "Hardcore 1.20",
    mcVersion: "1.20.1",
    loader: "Fabric",
    playTimeMinutes: 85,
    modCount: 12,
    isReady: true,
    folderId: "folder_survival",
    icon: "diamond_sword",
  },
];

const DEFAULT_ACCOUNTS: AccountData[] = [
  {
    id: "acc_1",
    name: "I_Sky2Fly_I",
    type: "offline",
    isOnline: true,
    skinUrl: "/skins/dream.png",
  },
  {
    id: "acc_2",
    name: "Steve_Official",
    type: "microsoft",
    isOnline: true,
    skinUrl: "/skins/steve.png",
  },
  {
    id: "acc_3",
    name: "Alex_Gamer",
    type: "offline",
    isOnline: true,
    skinUrl: "/skins/alex.png",
  },
];

const loadStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const App: React.FC = () => {
  const { t, lang } = useLanguage();
  const [activeScreen, setActiveScreen] = useState<ScreenId>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const screen = urlParams.get("screen") as ScreenId;
      if (screen && ["home", "store", "instances", "modrinth", "servers", "friends", "settings", "console", "accounts"].includes(screen)) {
        return screen;
      }
    } catch {}
    return "home";
  });

  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  const [bgIndex, setBgIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("omega_launcher_bg_index");
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < MINECRAFT_BACKGROUNDS.length) {
          return parsed;
        }
      }
    } catch {}
    return 0;
  });

  const [isBgAutoPlay, setIsBgAutoPlay] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("omega_launcher_bg_autoplay");
      if (saved !== null) {
        return saved === "true";
      }
    } catch {}
    return true;
  });

  const [ultraPerformanceMode, setUltraPerformanceMode] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("omega_launcher_settings");
      if (raw) {
        const s = JSON.parse(raw);
        return Boolean(s.ultraPerformanceMode);
      }
    } catch {}
    return false;
  });

  const [disable3DCharacter, setDisable3DCharacter] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("omega_launcher_settings");
      if (raw) {
        const s = JSON.parse(raw);
        return Boolean(s.disable3DCharacter);
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    const handleSettingsUpdated = () => {
      try {
        const raw = localStorage.getItem("omega_launcher_settings");
        if (raw) {
          const s = JSON.parse(raw);
          const isUltra = Boolean(s.ultraPerformanceMode);
          const noChar = Boolean(s.disable3DCharacter);
          setUltraPerformanceMode(isUltra);
          setDisable3DCharacter(noChar);
          if (isUltra || s.disableAnimations) {
            document.body.classList.add("ultra-performance-mode");
          } else {
            document.body.classList.remove("ultra-performance-mode");
          }
        }
      } catch {}
    };

    handleSettingsUpdated();
    window.addEventListener("storage", handleSettingsUpdated);
    window.addEventListener("omega_settings_updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("storage", handleSettingsUpdated);
      window.removeEventListener("omega_settings_updated", handleSettingsUpdated);
    };
  }, []);

  const handleSelectBg = (index: number) => {
    if (index >= 0 && index < MINECRAFT_BACKGROUNDS.length) {
      setBgIndex(index);
      try {
        localStorage.setItem("omega_launcher_bg_index", index.toString());
      } catch {}
    }
  };

  const handleNextBg = () => {
    setBgIndex((curr) => {
      const next = (curr + 1) % MINECRAFT_BACKGROUNDS.length;
      try {
        localStorage.setItem("omega_launcher_bg_index", next.toString());
      } catch {}
      return next;
    });
  };

  const handlePrevBg = () => {
    setBgIndex((curr) => {
      const prev = (curr - 1 + MINECRAFT_BACKGROUNDS.length) % MINECRAFT_BACKGROUNDS.length;
      try {
        localStorage.setItem("omega_launcher_bg_index", prev.toString());
      } catch {}
      return prev;
    });
  };

  const handleToggleBgAutoPlay = () => {
    setIsBgAutoPlay((curr) => {
      const next = !curr;
      try {
        localStorage.setItem("omega_launcher_bg_autoplay", next.toString());
      } catch {}
      return next;
    });
  };

  const showToast = (_msg: string) => {};

  const [activeSkinUrl, setActiveSkinUrl] = useState<string>(PRESET_SKINS.dream);
  const [skinModel, setSkinModel] = useState<"default" | "slim">("slim");
  const [activeCapeUrl, setActiveCapeUrl] = useState<string | null>(null);

  const [instances, setInstances] = useState<InstanceData[]>(() => {
    const loaded = loadStorage<InstanceData[]>("omega_instances", DEFAULT_INSTANCES);
    const hasRustInstance = loaded.some(
      (i) => i.id === "inst_rust_beta" || i.folderId === "folder_rust" || i.loader === "Rust"
    );
    let list = loaded;
    if (!hasRustInstance) {
      const defaultRust = DEFAULT_INSTANCES.find((i) => i.id === "inst_rust_beta");
      if (defaultRust) {
        list = [defaultRust, ...loaded];
      }
    }
    return list.map((inst) => {
      let icon = inst.icon;
      if (!icon) {
        if (inst.loader === "Rust" || inst.id === "inst_rust_beta") icon = "obsidian";
        else if (inst.id === "inst_3" || inst.name.toLowerCase().includes("pvp")) icon = "diamond_sword";
        else if (inst.id === "inst_2" || inst.name.toLowerCase().includes("survival")) icon = "diamond_pickaxe";
        else if (inst.id === "inst_1") icon = "end_crystal";
        else icon = "diamond_sword";
      }
      let name = inst.name;
      if (name === "Моя сборка 1.21") name = "Моя версия 1.21";
      if (name === "Импортированная сборка") name = "Импортированная версия";

      return {
        ...inst,
        name,
        icon,
        mcVersion:
          inst.loader === "Rust" || inst.id === "inst_rust_beta" || inst.folderId === "folder_rust"
            ? "26.3"
            : inst.mcVersion,
      };
    });
  });
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(() => {
    const saved = localStorage.getItem("omega_selected_instance_id");
    return saved || "inst_1";
  });

  useEffect(() => {
    try {
      localStorage.setItem("omega_instances", JSON.stringify(instances));
    } catch {}
  }, [instances]);

  useEffect(() => {
    try {
      localStorage.setItem("omega_selected_instance_id", selectedInstanceId);
    } catch {}
  }, [selectedInstanceId]);

  const [accounts, setAccounts] = useState<AccountData[]>(() =>
    loadStorage<AccountData[]>("omega_accounts", DEFAULT_ACCOUNTS)
  );
  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    const saved = localStorage.getItem("omega_active_account_id");
    return saved || "acc_1";
  });

  useEffect(() => {
    try {
      localStorage.setItem("omega_accounts", JSON.stringify(accounts));
    } catch {}
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem("omega_active_account_id", activeAccountId);
    } catch {}
  }, [activeAccountId]);

  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [gamePid, setGamePid] = useState<number | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [exitStatus, setExitStatus] = useState<{ code: number | null; crashed: boolean } | null>(null);

  const pushLog = useCallback((message: string, tag: LogEntry["tag"] = "INFO") => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setLiveLogs((prev) => {
      // Keep memory footprint tiny: maintain up to 500 lines for live UI inspection
      const maxLogs = 500;
      const next = prev.length >= maxLogs ? prev.slice(prev.length - 400) : prev;
      return [
        ...next,
        { id: `${Date.now()}_${Math.random()}`, time, tag, message },
      ];
    });
  }, []);

  useEffect(() => {
    let unlistenProg: (() => void) | null = null;
    let unlistenAuth: (() => void) | null = null;

    listen<string>("download-progress", (event) => {
      const line = event.payload;
      const pidMatch = line.match(/process spawned with PID:\s*(\d+)/i);
      if (pidMatch) {
        setIsRunning(true);
        setGamePid(parseInt(pidMatch[1], 10));
        setGameStartTime(Date.now());
        setExitStatus(null);
      }
      const exitMatch = line.match(/process exited with code:\s*(\d+)/i);
      if (exitMatch) {
        setIsRunning(false);
        setGamePid(null);
        setExitStatus({ code: parseInt(exitMatch[1], 10), crashed: false });
      }
      const crashMatch = line.match(/process crashed with exit code:\s*(-?\d+)/i);
      if (crashMatch) {
        setIsRunning(false);
        setGamePid(null);
        setExitStatus({ code: parseInt(crashMatch[1], 10), crashed: true });
      }
      if (line.includes("terminated by signal")) {
        setIsRunning(false);
        setGamePid(null);
        setExitStatus({ code: 137, crashed: true });
      } else if (line.includes("Minecraft process exited") && !exitMatch && !crashMatch) {
        setIsRunning(false);
        setGamePid(null);
      }

      const tag: LogEntry["tag"] = (line.includes("[ERROR]") || line.includes("Exception in thread") || line.includes("Caused by:"))
        ? "ERROR"
        : line.includes("[WARN]")
        ? "WARN"
        : line.includes("[MS_AUTH]")
        ? "AUTH"
        : "INFO";
      pushLog(line, tag);
    })
      .then((u) => {
        unlistenProg = u;
      })
      .catch(() => {});

    listen<string>("auth-log", (event) => {
      pushLog(event.payload, "AUTH");
    })
      .then((u) => {
        unlistenAuth = u;
      })
      .catch(() => {});

    return () => {
      unlistenProg?.();
      unlistenAuth?.();
    };
  }, [pushLog]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dbInstances = await ipc.dbLoadInstances();
        if (cancelled) return;
        if (dbInstances && dbInstances.length > 0) {
          const mapped: InstanceData[] = dbInstances.map((db) => ({
            id: db.id,
            name: db.name,
            mcVersion: db.mcVersion,
            loader: (db.loader as InstanceData["loader"]) || "Fabric",
            playTimeMinutes: Math.round((db.playTimeMs || 0) / 60000),
            modCount: 0,
            isReady: true,
            folderId: db.groupName || undefined,
            icon: (db.icon as InstanceAvatarVariant) || "diamond_sword",
          }));
          setInstances(mapped);

          for (const inst of mapped) {
            void ipc.countInstalledMods(inst.id).then((count) => {
              if (count > 0 && !cancelled) {
                setInstances((prev) =>
                  prev.map((i) => (i.id === inst.id ? { ...i, modCount: count } : i))
                );
              }
            }).catch(() => {});
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("omega_instances", JSON.stringify(instances));
    } catch {}
    const dbList: DbInstance[] = instances.map((inst, idx) => ({
      id: inst.id,
      name: inst.name,
      mcVersion: inst.mcVersion,
      loader: inst.loader,
      x: idx * 100,
      y: 0,
      icon: typeof inst.icon === "string" ? inst.icon : undefined,
      groupName: inst.folderId,
      playTimeMs: (inst.playTimeMinutes || 0) * 60000,
    }));
    void ipc.dbSaveInstances(dbList).catch(() => {});
  }, [instances]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dbAccounts = await ipc.dbLoadAccounts();
        if (cancelled) return;
        if (dbAccounts && dbAccounts.length > 0) {
          const mapped: AccountData[] = dbAccounts.map((a, idx) => ({
            id: `acc_db_${idx}_${a.name}`,
            name: a.name,
            type: a.type as AccountData["type"],
            isOnline: true,
            skinUrl: a.type === "microsoft" ? "/skins/steve.png" : undefined,
          }));
          setAccounts(mapped);
        }
      } catch {}

      try {
        const cachedMs = await ipc.getCachedMicrosoftAccount();
        if (cachedMs && cachedMs.name && !cancelled) {
          setAccounts((prev) => {
            const exists = prev.find((a) => a.type === "microsoft");
            if (exists) {
              return prev.map((a) => (a.type === "microsoft" ? { ...a, name: cachedMs.name } : a));
            } else {
              return [
                ...prev,
                {
                  id: "acc_ms_cached",
                  name: cachedMs.name,
                  type: "microsoft",
                  isOnline: true,
                  skinUrl: "/skins/steve.png",
                },
              ];
            }
          });

          void ipc.getMicrosoftSkin(cachedMs.name).then((skin) => {
            if (skin && !cancelled) {
              setActiveSkinUrl(skin);
              setAccounts((prev) =>
                prev.map((a) => (a.type === "microsoft" ? { ...a, skinUrl: skin } : a))
              );
            }
          }).catch(() => {});
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void ipc.dbSaveAccounts(accounts.map((a) => ({ name: a.name, type: a.type }))).catch(() => {});
  }, [accounts]);

  const activeAccount =
    accounts.find((a) => a.id === activeAccountId) || accounts[0] || FALLBACK_ACCOUNT;

  const selectedInstance =
    instances.find((i) => i.id === selectedInstanceId) || instances[0] || null;

  const [omegaAccount, setOmegaAccount] = useState<OmegaAccountState>(() =>
    loadStorage("omega_network_account", { isLinked: false })
  );

  useEffect(() => {
    try {
      localStorage.setItem("omega_network_account", JSON.stringify(omegaAccount));
    } catch {}
  }, [omegaAccount]);

  const [isOmegaModalOpen, setIsOmegaModalOpen] = useState<boolean>(false);

  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [topBarLayout, setTopBarLayout] = useState<TopBarItemId[]>(() => {
    const loaded = loadStorage("omega_topbar_layout", DEFAULT_TOPBAR_LAYOUT);
    return sanitizeTopBarLayout(loaded);
  });

  const [bottomBarLayout, setBottomBarLayout] = useState<BottomBarItemId[]>(() => {
    const loaded = loadStorage("omega_bottombar_layout", DEFAULT_BOTTOMBAR_LAYOUT);
    return sanitizeBottomBarLayout(loaded);
  });

  const [bottomBarAlignment, setBottomBarAlignment] = useState<BottomBarAlignment>(() => {
    const loaded = loadStorage<BottomBarAlignment>("omega_bottombar_alignment", DEFAULT_BOTTOMBAR_ALIGNMENT);
    return ["center", "left", "right", "space-between"].includes(loaded) ? loaded : DEFAULT_BOTTOMBAR_ALIGNMENT;
  });

  const [buttonShapePreset, setButtonShapePreset] = useState<ButtonShapePreset>(() => {
    const loaded = loadStorage<ButtonShapePreset>("omega_btn_shape_preset", DEFAULT_BUTTON_SHAPE_PRESET);
    return ["tactical", "cyber", "rounded", "chamfer"].includes(loaded) ? loaded : DEFAULT_BUTTON_SHAPE_PRESET;
  });

  const [menusCustomization, setMenusCustomization] = useState<MenusCustomizationState>(() => {
    try {
      const saved = localStorage.getItem("omega_menus_customization_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          topbar: { ...DEFAULT_MENUS_CUSTOMIZATION.topbar, ...parsed.topbar },
          background: { ...DEFAULT_MENUS_CUSTOMIZATION.background, ...parsed.background },
          catalog: { ...DEFAULT_MENUS_CUSTOMIZATION.catalog, ...parsed.catalog },
        };
      }
    } catch (e) {
      console.warn("Failed to load menus customization:", e);
    }
    return DEFAULT_MENUS_CUSTOMIZATION;
  });

  const [menuCustomizerModal, setMenuCustomizerModal] = useState<{
    isOpen: boolean;
    zone: CustomizerZoneId;
  }>({
    isOpen: false,
    zone: "topbar",
  });

  const menuCustomizationPersistTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (menusCustomization.topbar) {
      const theme = computePanelTheme(
        menusCustomization.topbar.color,
        menusCustomization.topbar.intensity,
        menusCustomization.topbar.patternIntensity,
        menusCustomization.topbar.mode
      );
      root.style.setProperty("--custom-topbar-bg", theme.panelBg);
      root.style.setProperty("--custom-topbar-border", theme.panelBorder);
      root.style.setProperty("--custom-topbar-pattern", theme.panelPattern);
      root.style.setProperty("--custom-topbar-pattern-size", theme.panelPatternSize);
      root.style.setProperty("--custom-topbar-pattern-pos", theme.panelPatternPosition);
      root.style.setProperty("--custom-topbar-pattern-opacity", theme.panelPatternOpacity);
      root.style.setProperty("--custom-topbar-btn-bg", theme.itemBg);
      root.style.setProperty("--custom-topbar-btn-border", theme.itemBorder);
      root.style.setProperty("--custom-topbar-btn-hover", theme.itemHover);
      root.style.setProperty("--custom-topbar-btn-active", theme.itemActive);
      root.style.setProperty("--custom-topbar-btn-play", theme.itemPlay);
      root.style.setProperty("--custom-topbar-btn-active-border", theme.itemActiveBorder);
      root.style.setProperty("--custom-topbar-accent", theme.accentColor);
    }
  }, [menusCustomization.topbar]);

  const handleUpdateMenusCustomization = useCallback((newState: MenusCustomizationState) => {
    setMenusCustomization(newState);
    if (menuCustomizationPersistTimeoutRef.current) {
      window.clearTimeout(menuCustomizationPersistTimeoutRef.current);
    }
    menuCustomizationPersistTimeoutRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem("omega_menus_customization_v1", JSON.stringify(newState));
      } catch {}
    }, 250);
  }, []);

  const handleOpenMenuCustomizer = (zone: CustomizerZoneId = "topbar") => {
    setMenuCustomizerModal({
      isOpen: true,
      zone,
    });
  };

  const handleCloseMenuCustomizer = () => {
    setMenuCustomizerModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleResetZoneCustomization = (zone: CustomizerZoneId) => {
    setMenusCustomization((prev) => {
      const updated = {
        ...prev,
        [zone]: { ...DEFAULT_MENUS_CUSTOMIZATION[zone] },
      };
      try {
        localStorage.setItem("omega_menus_customization_v1", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(
      `Оформление "${zone === "topbar" ? "Верхней панели" : zone === "background" ? "Заднего фона" : "Каталога"}" сброшено`
    );
  };

  const handleSaveTopBarLayout = (newLayout: TopBarItemId[]) => {
    const sanitized = sanitizeTopBarLayout(newLayout);
    setTopBarLayout(sanitized);
    try {
      localStorage.setItem("omega_topbar_layout", JSON.stringify(sanitized));
    } catch {}
    showToast("Порядок верхней панели сохранен!");
  };

  const handleResetTopBarLayout = () => {
    setTopBarLayout([...DEFAULT_TOPBAR_LAYOUT]);
    try {
      localStorage.setItem("omega_topbar_layout", JSON.stringify(DEFAULT_TOPBAR_LAYOUT));
    } catch {}
    showToast("Верхняя панель сброшена по умолчанию");
  };

  const handleSaveBottomBarLayout = (newLayout: BottomBarItemId[], alignment?: BottomBarAlignment) => {
    const sanitized = sanitizeBottomBarLayout(newLayout);
    setBottomBarLayout(sanitized);
    try {
      localStorage.setItem("omega_bottombar_layout", JSON.stringify(sanitized));
    } catch {}
    if (alignment) {
      setBottomBarAlignment(alignment);
      try {
        localStorage.setItem("omega_bottombar_alignment", JSON.stringify(alignment));
      } catch {}
    }
    showToast("Настройки нижней панели сохранены!");
  };

  const handleResetBottomBarLayout = () => {
    setBottomBarLayout([...DEFAULT_BOTTOMBAR_LAYOUT]);
    setBottomBarAlignment(DEFAULT_BOTTOMBAR_ALIGNMENT);
    try {
      localStorage.setItem("omega_bottombar_layout", JSON.stringify(DEFAULT_BOTTOMBAR_LAYOUT));
      localStorage.setItem("omega_bottombar_alignment", JSON.stringify(DEFAULT_BOTTOMBAR_ALIGNMENT));
    } catch {}
    showToast("Нижняя панель сброшена по умолчанию");
  };

  const handleChangeButtonShapePreset = (preset: ButtonShapePreset) => {
    setButtonShapePreset(preset);
    try {
      localStorage.setItem("omega_btn_shape_preset", JSON.stringify(preset));
    } catch {}
    showToast(`Форма кнопок изменена: ${preset}`);
  };

  const handleTogglePlay = useCallback(async () => {
    if (!selectedInstance) return;
    if (isRunning) {
      pushLog(`[launcher/INFO] Запрос остановки Minecraft для "${selectedInstance.name}"...`, "INFO");
      try {
        await ipc.killMinecraft(selectedInstance.id);
      } catch (e: any) {
        pushLog(`[launcher/ERROR] Ошибка остановки: ${e?.message || e}`, "ERROR");
      }
      setIsRunning(false);
      return;
    }

    const settings = (() => {
      try {
        const raw = localStorage.getItem("omega_launcher_settings");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    const customJvmArgs = typeof settings?.jvmArgs === "string" && settings.jvmArgs.trim()
      ? settings.jvmArgs.trim()
      : "-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions";
    const ramToUse = selectedInstance.ramGb || settings?.ram || 4;
    const enableGamemode = Boolean(settings?.enableGameMode);

    const loader = selectedInstance.loader || "Vanilla";
    const versionToLaunch =
      loader !== "Vanilla" && !selectedInstance.mcVersion.toLowerCase().includes(loader.toLowerCase())
        ? `${selectedInstance.mcVersion}-${loader.toLowerCase()}`
        : selectedInstance.mcVersion;

    const fullscreen = Boolean(settings?.fullscreen);
    const resolution = typeof settings?.resolution === "string" ? settings.resolution : undefined;

    setIsRunning(true);
    pushLog(
      `[launcher/INFO] Запуск "${selectedInstance.name}" (Minecraft ${selectedInstance.mcVersion}, ${loader}) от имени "${activeAccount.name}" [RAM: ${ramToUse}G, JVM: ${customJvmArgs}]...`,
      "INFO"
    );
    try {
      await ipc.launchMinecraft({
        version: versionToLaunch,
        server: "",
        username: activeAccount.name,
        ram: ramToUse,
        instanceId: selectedInstance.id,
        customJvmArgs,
        enableGamemode,
        fullscreen,
        resolution,
      });

      if (Boolean(settings?.closeOnLaunch)) {
        pushLog(`[launcher/INFO] Закрытие лаунчера согласно настройкам (closeOnLaunch)...`, "INFO");
        setTimeout(async () => {
          try {
            await ipc.appExit();
          } catch {}
        }, 1200);
      }
    } catch (e: any) {
      pushLog(`[launcher/ERROR] Ошибка запуска: ${e?.message || e}`, "ERROR");
      setIsRunning(false);
      setGamePid(null);
    }
  }, [selectedInstance, isRunning, activeAccount.name, pushLog]);

  const handleKillMinecraft = useCallback(async () => {
    if (!selectedInstance) return;
    pushLog(`[launcher/WARN] Принудительная остановка Minecraft для "${selectedInstance.name}"...`, "WARN");
    try {
      await ipc.killMinecraft(selectedInstance.id);
    } catch (e: any) {
      pushLog(`[launcher/ERROR] Ошибка принудительной остановки: ${e?.message || e}`, "ERROR");
    }
    setIsRunning(false);
    setGamePid(null);
  }, [selectedInstance, pushLog]);

  const handleOpenLogsFolder = useCallback(async () => {
    if (!selectedInstance) return;
    try {
      await ipc.openInstanceLogs(selectedInstance.id);
    } catch {
      await ipc.openFolder(selectedInstance.id);
    }
  }, [selectedInstance]);

  const handleToggleSound = () => {
    setSoundMuted((prev) => {
      const next = !prev;
      showToast(next ? "Системные звуки отключены" : "Системные звуки включены");
      return next;
    });
  };

  const handleEquipSkin = (url: string, model: "default" | "slim") => {
    setActiveSkinUrl(url);
    setSkinModel(model);
    showToast("Скин успешно надет на 3D модель!");
  };

  const handleEquipCape = (url: string | null) => {
    setActiveCapeUrl(url);
    showToast(url ? "Плащ успешно экипирован!" : "Плащ снят");
  };

  const handleRefreshSelectedInstanceMods = useCallback(async () => {
    if (!selectedInstance) return;
    try {
      const count = await ipc.countInstalledMods(selectedInstance.id);
      setInstances((prev) =>
        prev.map((i) => (i.id === selectedInstance.id ? { ...i, modCount: count } : i))
      );
    } catch (err) {
      console.warn("Failed to recount mods:", err);
    }
  }, [selectedInstance]);

  const handleInstallMod = useCallback(
    async (modName: string) => {
      if (!selectedInstance) {
        showToast(`Сначала выберите или создайте версию для установки мода "${modName}"`);
        return;
      }
      pushLog(`[MODS] Установка мода "${modName}" в версию "${selectedInstance.name}"...`, "INFO");
      try {
        await ipc.downloadMod({
          modId: modName.toLowerCase().replace(/\s+/g, "-"),
          mcVersion: selectedInstance.mcVersion,
          loader: selectedInstance.loader.toLowerCase(),
          instanceId: selectedInstance.id,
          projectType: "mod",
        });
        const count = await ipc.countInstalledMods(selectedInstance.id);
        setInstances((prev) =>
          prev.map((i) => (i.id === selectedInstance.id ? { ...i, modCount: count } : i))
        );
        pushLog(`[MODS] Мод "${modName}" успешно установлен!`, "INFO");
        showToast(`Мод "${modName}" успешно установлен в версию "${selectedInstance.name}"!`);
      } catch (err: any) {
        pushLog(`[MODS] Ошибка загрузки мода "${modName}": ${err?.message || err}`, "ERROR");
      }
    },
    [selectedInstance, pushLog]
  );

  const handleInstallModpack = (pack: {
    title: string;
    author?: string;
    desc?: string;
    loaders?: string[];
  }) => {
    const primaryLoader = (pack.loaders?.[0] as InstanceData["loader"]) || "Fabric";
    const newInst: InstanceData = {
      id: "inst_pack_" + Date.now(),
      name: pack.title,
      mcVersion: "1.20.1",
      loader: primaryLoader,
      playTimeMinutes: 0,
      modCount: Math.floor(Math.random() * 80) + 70,
      isReady: true,
      folderId: "folder_modpacks",
      icon: "diamond_sword",
    };
    setInstances((prev) => [newInst, ...prev]);
    setSelectedInstanceId(newInst.id);
    showToast(`Сборка "${pack.title}" успешно скачана из каталога и добавлена в ваши версии!`);
  };

  const handleUpdateInstance = (updated: InstanceData) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === updated.id ? updated : inst))
    );
  };

  const handleDeleteInstance = useCallback((id: string) => {
    void ipc.dbDeleteInstance(id).catch(() => {});
    setInstances((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (selectedInstanceId === id) {
        setSelectedInstanceId(next[0]?.id || "");
      }
      return next;
    });
    showToast("Версия удалена");
  }, [selectedInstanceId]);

  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (activeAccountId === id) {
        setActiveAccountId(next[0]?.id || "");
      }
      return next;
    });
    showToast("Профиль удален");
  };

  const handleDirectConnect = useCallback(
    async (serverName: string, ip: string, targetInstanceId?: string) => {
      const inst =
        (targetInstanceId ? instances.find((i) => i.id === targetInstanceId) : null) ||
        selectedInstance ||
        instances[0];
      if (!inst) {
        showToast("Нет доступной сборки для запуска");
        return;
      }
      if (inst.id !== selectedInstanceId) {
        setSelectedInstanceId(inst.id);
      }
      const settings = (() => {
        try {
          const raw = localStorage.getItem("omega_launcher_settings");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      const customJvmArgs = typeof settings?.jvmArgs === "string" && settings.jvmArgs.trim()
        ? settings.jvmArgs.trim()
        : "-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions";
      const ramToUse = inst.ramGb || settings?.ram || 4;
      const enableGamemode = Boolean(settings?.enableGameMode);

      const loader = inst.loader || "Vanilla";
      const versionToLaunch =
        loader !== "Vanilla" && !inst.mcVersion.toLowerCase().includes(loader.toLowerCase())
          ? `${inst.mcVersion}-${loader.toLowerCase()}`
          : inst.mcVersion;

      const fullscreen = Boolean(settings?.fullscreen);
      const resolution = typeof settings?.resolution === "string" ? settings.resolution : undefined;

      let cleanIp = ip.trim();
      if (cleanIp.startsWith("https://")) cleanIp = cleanIp.slice(8);
      else if (cleanIp.startsWith("http://")) cleanIp = cleanIp.slice(7);
      else if (cleanIp.startsWith("//")) cleanIp = cleanIp.slice(2);
      if (cleanIp.includes("/")) cleanIp = cleanIp.split("/")[0].trim();

      // Ensure server entry exists in instance's servers.dat
      try {
        void ipc.addInstanceServer(inst.id, serverName || cleanIp, cleanIp).catch(() => {});
      } catch {}

      setIsRunning(true);
      setActiveScreen("home");
      pushLog(`[launcher/INFO] Прямое подключение к серверу "${serverName}" (${cleanIp}) через сборку "${inst.name}" (${versionToLaunch}) [RAM: ${ramToUse}G, JVM: ${customJvmArgs}]...`, "INFO");
      try {
        await ipc.launchMinecraft({
          version: versionToLaunch,
          server: cleanIp,
          username: activeAccount.name,
          ram: ramToUse,
          instanceId: inst.id,
          customJvmArgs,
          enableGamemode,
          fullscreen,
          resolution,
        });

        if (Boolean(settings?.closeOnLaunch)) {
          pushLog(`[launcher/INFO] Закрытие лаунчера согласно настройкам (closeOnLaunch)...`, "INFO");
          setTimeout(async () => {
            try {
              await ipc.appExit();
            } catch {}
          }, 1200);
        }
      } catch (e: any) {
        pushLog(`[launcher/ERROR] Ошибка прямого подключения: ${e?.message || e}`, "ERROR");
        setIsRunning(false);
      }
    },
    [selectedInstance, instances, activeAccount.name, pushLog]
  );

  const handleLoginMicrosoft = useCallback(async () => {
    pushLog("[MS_AUTH] Запуск официальной Microsoft OAuth2 авторизации...", "AUTH");
    try {
      const res = await ipc.loginMicrosoft();
      pushLog(`[MS_AUTH] Авторизация Microsoft успешна: ${res}`, "AUTH");
      const cached = await ipc.getCachedMicrosoftAccount();
      if (cached && cached.name) {
        const msAcc: AccountData = {
          id: "acc_ms_" + Date.now(),
          name: cached.name,
          type: "microsoft",
          isOnline: true,
          skinUrl: "/skins/steve.png",
        };
        setAccounts((prev) => [...prev.filter((a) => a.type !== "microsoft"), msAcc]);
        setActiveAccountId(msAcc.id);
        const skin = await ipc.getMicrosoftSkin(cached.name);
        if (skin) {
          setActiveSkinUrl(skin);
        }
      }
    } catch (err: any) {
      pushLog(`[MS_AUTH] Ошибка авторизации Microsoft: ${err?.message || err}`, "ERROR");
    }
  }, [pushLog]);

  const handleLoginEly = useCallback(async () => {
    pushLog("[ELY_AUTH] Открытие окна авторизации Ely.by...", "AUTH");
    try {
      await ipc.openElyLogin();
    } catch (err: any) {
      pushLog(`[ELY_AUTH] Ошибка: ${err?.message || err}`, "ERROR");
    }
  }, [pushLog]);

  const handleSelectAccount = (acc: AccountData) => {
    setActiveAccountId(acc.id);
    if (acc.skinUrl) {
      setActiveSkinUrl(acc.skinUrl);
      setSkinModel(acc.name === "Alex_Gamer" ? "slim" : "default");
    }
    showToast(`Активен профиль: ${acc.name} (${acc.type === "microsoft" ? "Microsoft" : "Офлайн"})`);
  };

  const handleCreateOfflineAccount = (name: string) => {
    const newAcc: AccountData = {
      id: "acc_" + Date.now(),
      name,
      type: "offline",
      isOnline: true,
      skinUrl: "/skins/steve.png",
    };
    setAccounts((prev) => [...prev, newAcc]);
    handleSelectAccount(newAcc);
    showToast(`Создан новый офлайн профиль: ${name}`);
  };

  const handleOpenOmegaLogin = () => {
    setIsOmegaModalOpen(true);
  };

  const handleLoginOmega = (username: string) => {
    setOmegaAccount({
      isLinked: true,
      omegaUsername: username,
    });
    showToast(`Аккаунт Omega "${username}" успешно подключен! Доступна совместная игра с друзьями.`);
  };

  const handleUnlinkOmega = () => {
    setOmegaAccount({ isLinked: false });
    showToast("Аккаунт Omega отключен.");
  };

  return (
    <div className={`launcher-viewport btn-shape-${buttonShapePreset}`}>
      <AtmosphereLayer
        visible={activeScreen === "home"}
        activeIndex={bgIndex}
        isAutoPlay={isBgAutoPlay}
        onNextBg={handleNextBg}
        backgroundCustomization={menusCustomization.background}
      />

      {!disable3DCharacter && (
        <Stage3DLayer
          visible={activeScreen === "home" && !menuCustomizerModal.isOpen && !isOmegaModalOpen && !isRunning}
          skinUrl={activeSkinUrl}
          capeUrl={activeCapeUrl}
          model={skinModel}
        />
      )}

      <HudLayer
        visible={true}
        account={activeAccount}
        accounts={accounts}
        omegaAccount={omegaAccount}
        onSelectAccount={handleSelectAccount}
        onOpenOmegaLogin={handleOpenOmegaLogin}
        onUnlinkOmega={handleUnlinkOmega}
        soundMuted={soundMuted}
        activeScreen={activeScreen}
        skinUrl={activeSkinUrl}
        onNavigate={(screen) => setActiveScreen(screen as ScreenId)}
        onToggleSound={handleToggleSound}
        onOpenModal={(modal: ActiveModal) => {
          if (modal) setActiveScreen(modal as ScreenId);
        }}
        selectedInstance={selectedInstance}
        instances={instances}
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        onSelectInstanceById={(id) => {
          const inst = instances.find((i) => i.id === id);
          if (inst) {
            setSelectedInstanceId(inst.id);
          }
        }}
        onDirectConnect={handleDirectConnect}
        topBarLayout={topBarLayout}
        topBarCustomization={menusCustomization.topbar}
        onLoginMicrosoft={handleLoginMicrosoft}
        onCreateOfflineAccount={handleCreateOfflineAccount}
      />

      <DockLayer
        visible={activeScreen === "home"}
        selectedInstance={selectedInstance}
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        onOpenInstancesModal={() => setActiveScreen("instances")}
        bottomBarLayout={bottomBarLayout}
        bottomBarAlignment={bottomBarAlignment}
      />

      <ScreensLayer
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        onEquipSkin={handleEquipSkin}
        onEquipCape={handleEquipCape}
        instances={instances}
        selectedInstanceId={selectedInstanceId}
        onSelectInstance={(inst) => {
          setSelectedInstanceId(inst.id);
        }}
        onCreateInstance={(inst) => {
          setInstances((prev) => [...prev, inst]);
          setSelectedInstanceId(inst.id);
          showToast(`Версия "${inst.name}" создана!`);
        }}
        onDeleteInstance={handleDeleteInstance}
        onUpdateInstance={handleUpdateInstance}
        onDeleteAccount={handleDeleteAccount}
        onLaunchInstance={(inst) => {
          setSelectedInstanceId(inst.id);
          handleTogglePlay();
        }}
        account={activeAccount}
        accounts={accounts}
        omegaAccount={omegaAccount}
        onSelectAccount={handleSelectAccount}
        onOpenOmegaLogin={handleOpenOmegaLogin}
        onUnlinkOmega={handleUnlinkOmega}
        onCreateOfflineAccount={handleCreateOfflineAccount}
        onLoginMicrosoft={handleLoginMicrosoft}
        onLoginEly={handleLoginEly}
        logs={liveLogs}
        onClearLogs={() => setLiveLogs([])}
        onDirectConnect={handleDirectConnect}
        isRunning={isRunning}
        gamePid={gamePid}
        gameStartTime={gameStartTime}
        exitStatus={exitStatus}
        onKillMinecraft={handleKillMinecraft}
        onOpenLogsFolder={handleOpenLogsFolder}
        bgIndex={bgIndex}
        isBgAutoPlay={isBgAutoPlay}
        onSelectBg={handleSelectBg}
        onNextBg={handleNextBg}
        onPrevBg={handlePrevBg}
        onToggleBgAutoPlay={handleToggleBgAutoPlay}
        onInstallMod={handleInstallMod}
        onInstallModpack={handleInstallModpack}
        onPushLog={pushLog}
        onRefreshInstance={handleRefreshSelectedInstanceMods}
        topBarLayout={topBarLayout}
        onSaveTopBarLayout={handleSaveTopBarLayout}
        onResetTopBarLayout={handleResetTopBarLayout}
        bottomBarLayout={bottomBarLayout}
        onSaveBottomBarLayout={handleSaveBottomBarLayout}
        onResetBottomBarLayout={handleResetBottomBarLayout}
        bottomBarAlignment={bottomBarAlignment}
        onChangeBottomBarAlignment={setBottomBarAlignment}
        buttonShapePreset={buttonShapePreset}
        onChangeButtonShapePreset={handleChangeButtonShapePreset}
        skinUrl={activeSkinUrl}
        capeUrl={activeCapeUrl}
        model={skinModel}
        selectedInstance={selectedInstance}
        menusCustomization={menusCustomization}
        onOpenMenuCustomizer={handleOpenMenuCustomizer}
        onUpdateMenusCustomization={handleUpdateMenusCustomization}
        onResetZoneCustomization={handleResetZoneCustomization}
      />

      <OmegaLoginModal
        isOpen={isOmegaModalOpen}
        onClose={() => setIsOmegaModalOpen(false)}
        onLogin={handleLoginOmega}
        baseAccountName={activeAccount?.name ?? "Гость"}
      />

      <MenuCustomizerModal
        isOpen={menuCustomizerModal.isOpen}
        onClose={handleCloseMenuCustomizer}
        initialZone={menuCustomizerModal.zone}
        state={menusCustomization}
        onChange={handleUpdateMenusCustomization}
        onResetZone={handleResetZoneCustomization}
      />
    </div>
  );
};
