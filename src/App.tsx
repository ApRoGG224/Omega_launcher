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
import type { LogEntry } from "./components/screens/ConsoleScreen";
import type {
  ActiveModal,
  InstanceData,
  AccountData,
  OmegaAccountState,
  InstanceAvatarVariant,
} from "./types";
import "./styles/globals.css";
import "./design-system/pixelPlates.css";
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
  // Current active screen (Home + 8 full MVP screens from FEATURES.md)
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

  // Sound state
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Minecraft Background Atmosphere state (persisted)
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

  // Toast notifications disabled per user request
  const showToast = (_msg: string) => {};

  // 3D Skin & Cape state
  const [activeSkinUrl, setActiveSkinUrl] = useState<string>(PRESET_SKINS.dream);
  const [skinModel, setSkinModel] = useState<"default" | "slim">("slim");
  const [activeCapeUrl, setActiveCapeUrl] = useState<string | null>(null);

  // Instances state (Persisted in localStorage)
  const [instances, setInstances] = useState<InstanceData[]>(() => {
    const loaded = loadStorage<InstanceData[]>("omega_instances", DEFAULT_INSTANCES);
    // Ensure default Rust (beta) instance is present even if user had older localStorage
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
    // Enforce that Rust instances always have version 26.3 and ensure icon is populated
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

  // Accounts state (Persisted in localStorage)
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

  // Live console logs from Minecraft and Tauri IPC
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);

  const pushLog = useCallback((message: string, tag: LogEntry["tag"] = "INFO") => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setLiveLogs((prev) => [
      ...prev.slice(-300),
      { id: `${Date.now()}_${Math.random()}`, time, tag, message },
    ]);
  }, []);

  // Listen to Tauri events (process stdout, stderr, auth logs)
  useEffect(() => {
    let unlistenProg: (() => void) | null = null;
    let unlistenAuth: (() => void) | null = null;

    listen<string>("download-progress", (event) => {
      const line = event.payload;
      if (line.includes("Minecraft process spawned with PID:")) {
        setIsRunning(true);
      }
      if (line.includes("Minecraft process exited")) {
        setIsRunning(false);
      }
      const tag: LogEntry["tag"] = line.includes("[ERROR]")
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

  // Load instances from SQLite on mount & sync mod counts
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

  // Sync instances to SQLite
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

  // Load accounts from SQLite & reconcile with cached Microsoft account
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

  // Sync accounts to SQLite
  useEffect(() => {
    void ipc.dbSaveAccounts(accounts.map((a) => ({ name: a.name, type: a.type }))).catch(() => {});
  }, [accounts]);

  const activeAccount =
    accounts.find((a) => a.id === activeAccountId) || accounts[0] || FALLBACK_ACCOUNT;

  const selectedInstance =
    instances.find((i) => i.id === selectedInstanceId) || instances[0] || null;

  // Omega Network Account state (linked to base account for playing with friends)
  const [omegaAccount, setOmegaAccount] = useState<OmegaAccountState>(() =>
    loadStorage("omega_network_account", { isLinked: false })
  );

  useEffect(() => {
    try {
      localStorage.setItem("omega_network_account", JSON.stringify(omegaAccount));
    } catch {}
  }, [omegaAccount]);

  const [isOmegaModalOpen, setIsOmegaModalOpen] = useState<boolean>(false);

  // Game running state (Play / Stop simulation)
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Top Navigation Dock Layout state (Persisted in localStorage)
  const [topBarLayout, setTopBarLayout] = useState<TopBarItemId[]>(() => {
    const loaded = loadStorage("omega_topbar_layout", DEFAULT_TOPBAR_LAYOUT);
    return sanitizeTopBarLayout(loaded);
  });

  // Bottom Launch Dock Layout state (Persisted in localStorage)
  const [bottomBarLayout, setBottomBarLayout] = useState<BottomBarItemId[]>(() => {
    const loaded = loadStorage("omega_bottombar_layout", DEFAULT_BOTTOMBAR_LAYOUT);
    return sanitizeBottomBarLayout(loaded);
  });

  // Bottom Launch Dock Alignment state (Persisted in localStorage)
  const [bottomBarAlignment, setBottomBarAlignment] = useState<BottomBarAlignment>(() => {
    const loaded = loadStorage<BottomBarAlignment>("omega_bottombar_alignment", DEFAULT_BOTTOMBAR_ALIGNMENT);
    return ["center", "left", "right", "space-between"].includes(loaded) ? loaded : DEFAULT_BOTTOMBAR_ALIGNMENT;
  });

  // Button Shape Preset state (Persisted in localStorage)
  const [buttonShapePreset, setButtonShapePreset] = useState<ButtonShapePreset>(() => {
    const loaded = loadStorage<ButtonShapePreset>("omega_btn_shape_preset", DEFAULT_BUTTON_SHAPE_PRESET);
    return ["tactical", "cyber", "rounded", "chamfer"].includes(loaded) ? loaded : DEFAULT_BUTTON_SHAPE_PRESET;
  });

  // Menus Customization State (TopBar, Background, Catalog)
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

  // Sync root CSS custom properties for menus customization
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

    setIsRunning(true);
    pushLog(
      `[launcher/INFO] Запуск "${selectedInstance.name}" (Minecraft ${selectedInstance.mcVersion}, ${selectedInstance.loader}) от имени "${activeAccount.name}"...`,
      "INFO"
    );
    try {
      await ipc.launchMinecraft({
        version: selectedInstance.mcVersion,
        server: "",
        username: activeAccount.name,
        ram: selectedInstance.ramGb || 4,
        instanceId: selectedInstance.id,
      });
    } catch (e: any) {
      pushLog(`[launcher/ERROR] Ошибка запуска: ${e?.message || e}`, "ERROR");
      setIsRunning(false);
    }
  }, [selectedInstance, isRunning, activeAccount.name, pushLog]);

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
    async (serverName: string, ip: string) => {
      const inst = selectedInstance || instances[0];
      if (!inst) return;
      setIsRunning(true);
      setActiveScreen("home");
      pushLog(`[launcher/INFO] Прямое подключение к серверу "${serverName}" (${ip})...`, "INFO");
      try {
        await ipc.launchMinecraft({
          version: inst.mcVersion,
          server: ip,
          username: activeAccount.name,
          ram: inst.ramGb || 4,
          instanceId: inst.id,
        });
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
      {/* Layer 0: Background Atmosphere (Minecraft Screenshots) */}
      <AtmosphereLayer
        visible={activeScreen === "home"}
        activeIndex={bgIndex}
        isAutoPlay={isBgAutoPlay}
        onNextBg={handleNextBg}
        backgroundCustomization={menusCustomization.background}
      />

      {/* Layer 1: 3D Character Stage (Kept mounted to preserve WebGL context; pauses rendering when not on home) */}
      <Stage3DLayer
        visible={activeScreen === "home" && !menuCustomizerModal.isOpen && !isOmegaModalOpen}
        skinUrl={activeSkinUrl}
        capeUrl={activeCapeUrl}
        model={skinModel}
      />

      {/* Layer 2: HUD & Navigation (Configurable Top Dock) */}
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

      {/* Layer 3: Launch Dock (Configurable Bottom Bar) */}
      <DockLayer
        visible={activeScreen === "home"}
        selectedInstance={selectedInstance}
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        onOpenInstancesModal={() => setActiveScreen("instances")}
        bottomBarLayout={bottomBarLayout}
        bottomBarAlignment={bottomBarAlignment}
      />

      {/* Layer 4: Screen Overlays (Full MVP Screens from FEATURES.md) */}
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
        bgIndex={bgIndex}
        isBgAutoPlay={isBgAutoPlay}
        onSelectBg={handleSelectBg}
        onNextBg={handleNextBg}
        onPrevBg={handlePrevBg}
        onToggleBgAutoPlay={handleToggleBgAutoPlay}
        onInstallMod={handleInstallMod}
        onInstallModpack={handleInstallModpack}
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
        selectedInstance={selectedInstance}
        menusCustomization={menusCustomization}
        onOpenMenuCustomizer={handleOpenMenuCustomizer}
        onUpdateMenusCustomization={handleUpdateMenusCustomization}
        onResetZoneCustomization={handleResetZoneCustomization}
      />

      {/* Omega Account Login Modal */}
      <OmegaLoginModal
        isOpen={isOmegaModalOpen}
        onClose={() => setIsOmegaModalOpen(false)}
        onLogin={handleLoginOmega}
        baseAccountName={activeAccount?.name ?? "Гость"}
      />

      {/* Interactive Menu & Theme Customizer Modal */}
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
