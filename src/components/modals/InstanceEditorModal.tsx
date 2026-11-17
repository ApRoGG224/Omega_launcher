import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Layers,
  Package,
  Compass,
  Sun,
  Globe,
  Server,
  Camera,
  FileText,
  Terminal,
  Sliders,
  FolderOpen,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  ExternalLink,
  Copy,
  Folder,
  Download,
  Settings,
} from "lucide-react";
import type { InstanceData } from "../../types";
import {
  ipc,
  type InstanceModItem,
  type InstancePackItem,
  type InstanceWorldItem,
  type InstanceScreenshotItem,
  type InstanceConfigData,
} from "../../services/ipc";
import { InstanceAvatarIcon } from "../icons/MinecraftIcons";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/instance-editor.css";

interface InstanceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: InstanceData;
  onOpenCatalog?: () => void;
  onUpdateInstance?: (inst: InstanceData) => void;
}

type EditorTab =
  | "version"
  | "mods"
  | "resourcepacks"
  | "shaders"
  | "worlds"
  | "servers"
  | "screenshots"
  | "notes"
  | "logs"
  | "settings";

type SettingsSubTab = "general" | "java" | "native" | "commands" | "env";

export const InstanceEditorModal: React.FC<InstanceEditorModalProps> = ({
  isOpen,
  onClose,
  instance,
  onOpenCatalog,
  onUpdateInstance,
}) => {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<EditorTab>("mods");
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<SettingsSubTab>("general");

  // Mods
  const [mods, setMods] = useState<InstanceModItem[]>([]);
  const [modsSearch, setModsSearch] = useState("");
  const [isLoadingMods, setIsLoadingMods] = useState(false);

  // Resource Packs
  const [resourcePacks, setResourcePacks] = useState<InstancePackItem[]>([]);
  const [packsSearch, setPacksSearch] = useState("");

  // Shaders
  const [shaders, setShaders] = useState<InstancePackItem[]>([]);
  const [shadersSearch, setShadersSearch] = useState("");

  // Worlds
  const [worlds, setWorlds] = useState<InstanceWorldItem[]>([]);

  // Screenshots
  const [screenshots, setScreenshots] = useState<InstanceScreenshotItem[]>([]);

  // Notes
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Logs
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedLogFile, setSelectedLogFile] = useState("logs/latest.log");
  const [logContent, setLogContent] = useState("");
  const [logSearch, setLogSearch] = useState("");

  // Config / Parameters
  const [config, setConfig] = useState<InstanceConfigData>({
    fullscreen: false,
    windowWidth: 854,
    windowHeight: 480,
    hideLauncherOnStart: true,
    closeLauncherOnExit: false,
    showConsoleOnStart: false,
    showConsoleOnCrash: true,
    hideConsoleOnExit: false,
    showPlaytime: true,
    recordPlaytime: true,
    overrideAccount: "",
    autoconnectServer: "",
    autoconnectWorld: "",
    javaPath: "",
    skipJavaCompatibility: false,
    minMemoryMb: 1024,
    maxMemoryMb: 4096,
    permGenMb: 128,
    warnMemory: true,
    customJvmArgs: "",
    systemGlfwPath: "/usr/lib/libglfw.so",
    systemOpenalPath: "/usr/lib/libopenal.so",
    enableGamemode: false,
    enableMangohud: false,
    useDiscreteGpu: false,
    useZink: false,
    preLaunchCommand: "",
    wrapperCommand: "",
    postExitCommand: "",
    overrideEnvVars: false,
    envVars: {},
  });

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "mod" | "resourcepack" | "shader";
    item: any;
  } | null>(null);

  // Load Mods
  const loadMods = useCallback(async () => {
    setIsLoadingMods(true);
    try {
      const data = await ipc.listInstanceMods(instance.id);
      setMods(data);
    } catch (e) {
      console.error("Failed to load mods:", e);
    } finally {
      setIsLoadingMods(false);
    }
  }, [instance.id]);

  // Load Resourcepacks
  const loadResourcePacks = useCallback(async () => {
    try {
      const data = await ipc.listInstanceResourcepacks(instance.id);
      setResourcePacks(data);
    } catch (e) {
      console.error("Failed to load resourcepacks:", e);
    }
  }, [instance.id]);

  // Load Shaders
  const loadShaders = useCallback(async () => {
    try {
      const data = await ipc.listInstanceShaderpacks(instance.id);
      setShaders(data);
    } catch (e) {
      console.error("Failed to load shaders:", e);
    }
  }, [instance.id]);

  // Load Worlds
  const loadWorlds = useCallback(async () => {
    try {
      const data = await ipc.listInstanceWorldsDetail(instance.id);
      setWorlds(data);
    } catch (e) {
      console.error("Failed to load worlds:", e);
    }
  }, [instance.id]);

  // Load Screenshots
  const loadScreenshots = useCallback(async () => {
    try {
      const data = await ipc.listInstanceScreenshots(instance.id);
      setScreenshots(data);
    } catch (e) {
      console.error("Failed to load screenshots:", e);
    }
  }, [instance.id]);

  // Load Notes
  const loadNotes = useCallback(async () => {
    try {
      const text = await ipc.getInstanceNotes(instance.id);
      setNotes(text);
    } catch (e) {
      console.error("Failed to load notes:", e);
    }
  }, [instance.id]);

  // Load Logs
  const loadLogs = useCallback(async () => {
    try {
      const files = await ipc.listInstanceLogFiles(instance.id);
      setLogFiles(files);
      const text = await ipc.getInstanceLogContent(instance.id, selectedLogFile);
      setLogContent(text);
    } catch (e) {
      console.error("Failed to load logs:", e);
    }
  }, [instance.id, selectedLogFile]);

  // Load Config
  const loadConfig = useCallback(async () => {
    try {
      const cfg = await ipc.getInstanceConfig(instance.id);
      setConfig((prev) => ({ ...prev, ...cfg }));
    } catch (e) {
      console.error("Failed to load config:", e);
    }
  }, [instance.id]);

  useEffect(() => {
    if (!isOpen) return;
    loadMods();
    loadResourcePacks();
    loadShaders();
    loadWorlds();
    loadScreenshots();
    loadNotes();
    loadLogs();
    loadConfig();
  }, [isOpen, loadMods, loadResourcePacks, loadShaders, loadWorlds, loadScreenshots, loadNotes, loadLogs, loadConfig]);

  // Close context menu on outside click
  useEffect(() => {
    const handleWindowClick = () => setContextMenu(null);
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  // Mod Actions
  const handleToggleMod = async (mod: InstanceModItem) => {
    try {
      const newFilename = await ipc.toggleInstanceMod(instance.id, mod.filename, !mod.enabled);
      setMods((prev) =>
        prev.map((m) =>
          m.filename === mod.filename
            ? { ...m, filename: newFilename, enabled: !m.enabled }
            : m
        )
      );
    } catch (e) {
      alert(`Ошибка переключения мода: ${e}`);
    }
  };

  const handleDeleteMod = async (mod: InstanceModItem) => {
    if (!confirm(`Удалить мод "${mod.name}"?`)) return;
    try {
      await ipc.deleteInstanceMod(instance.id, mod.filename);
      setMods((prev) => prev.filter((m) => m.filename !== mod.filename));
    } catch (e) {
      alert(`Ошибка удаления мода: ${e}`);
    }
  };

  const handleAddModFile = async () => {
    const path = prompt("Введите абсолютный путь к .jar или .zip файлу мода:");
    if (!path || !path.trim()) return;
    try {
      await ipc.addInstanceModFile(instance.id, path.trim());
      await loadMods();
    } catch (e) {
      alert(`Ошибка добавления файла: ${e}`);
    }
  };

  // Resourcepack Actions
  const handleTogglePack = async (pack: InstancePackItem) => {
    try {
      const newFilename = await ipc.toggleInstanceResourcepack(instance.id, pack.filename, !pack.enabled);
      setResourcePacks((prev) =>
        prev.map((p) =>
          p.filename === pack.filename
            ? { ...p, filename: newFilename, enabled: !p.enabled }
            : p
        )
      );
    } catch (e) {
      alert(`Ошибка: ${e}`);
    }
  };

  const handleDeletePack = async (pack: InstancePackItem) => {
    if (!confirm(`Удалить ресурс-пак "${pack.name}"?`)) return;
    try {
      await ipc.deleteInstanceResourcepack(instance.id, pack.filename);
      setResourcePacks((prev) => prev.filter((p) => p.filename !== pack.filename));
    } catch (e) {
      alert(`Ошибка: ${e}`);
    }
  };

  // Shader Actions
  const handleToggleShader = async (shader: InstancePackItem) => {
    try {
      const newFilename = await ipc.toggleInstanceShaderpack(instance.id, shader.filename, !shader.enabled);
      setShaders((prev) =>
        prev.map((s) =>
          s.filename === shader.filename
            ? { ...s, filename: newFilename, enabled: !s.enabled }
            : s
        )
      );
    } catch (e) {
      alert(`Ошибка: ${e}`);
    }
  };

  const handleDeleteShader = async (shader: InstancePackItem) => {
    if (!confirm(`Удалить шейдер "${shader.name}"?`)) return;
    try {
      await ipc.deleteInstanceShaderpack(instance.id, shader.filename);
      setShaders((prev) => prev.filter((s) => s.filename !== shader.filename));
    } catch (e) {
      alert(`Ошибка: ${e}`);
    }
  };

  // Save Notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await ipc.saveInstanceNotes(instance.id, notes);
    } catch (e) {
      alert(`Ошибка сохранения заметок: ${e}`);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Save Config
  const handleSaveConfig = async () => {
    try {
      await ipc.saveInstanceConfig(instance.id, config);
      alert("Настройки сборки успешно сохранены!");
    } catch (e) {
      alert(`Ошибка сохранения настроек: ${e}`);
    }
  };

  // Find system java
  const handleFindJava = async () => {
    try {
      const java = await ipc.findSystemJava();
      if (java) {
        setConfig((prev) => ({ ...prev, javaPath: java }));
      } else {
        alert("Системная Java не найдена");
      }
    } catch (e) {
      alert(`Ошибка поиска Java: ${e}`);
    }
  };

  // Filtered lists
  const filteredMods = useMemo(() => {
    if (!modsSearch.trim()) return mods;
    const q = modsSearch.toLowerCase();
    return mods.filter(
      (m) => m.name.toLowerCase().includes(q) || m.filename.toLowerCase().includes(q)
    );
  }, [mods, modsSearch]);

  const filteredPacks = useMemo(() => {
    if (!packsSearch.trim()) return resourcePacks;
    const q = packsSearch.toLowerCase();
    return resourcePacks.filter((p) => p.name.toLowerCase().includes(q));
  }, [resourcePacks, packsSearch]);

  const filteredShaders = useMemo(() => {
    if (!shadersSearch.trim()) return shaders;
    const q = shadersSearch.toLowerCase();
    return shaders.filter((s) => s.name.toLowerCase().includes(q));
  }, [shaders, shadersSearch]);

  const filteredLogLines = useMemo(() => {
    if (!logSearch.trim()) return logContent;
    const q = logSearch.toLowerCase();
    return logContent
      .split("\n")
      .filter((line) => line.toLowerCase().includes(q))
      .join("\n");
  }, [logContent, logSearch]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="inst-editor-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="inst-editor-dialog" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="inst-editor-header">
          <div className="inst-editor-header-left">
            <div className="inst-editor-avatar-box">
              <InstanceAvatarIcon icon={instance.icon || "diamond_sword"} size={24} />
            </div>
            <div className="inst-editor-title-wrap">
              <h2>
                <span>{instance.name}</span>
                <span className={`inst-editor-tag ${instance.loader.toLowerCase()}`}>
                  {instance.loader} {instance.mcVersion}
                </span>
              </h2>
              <div className="inst-editor-sub">
                ID: {instance.id} | Редактирование модов, миров, параметров и журналов
              </div>
            </div>
          </div>
          <button type="button" className="inst-editor-close-btn" onClick={onClose} title="Закрыть">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="inst-editor-body">
          {/* Left Sidebar */}
          <div className="inst-editor-sidebar">
            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "version" ? "active" : ""}`}
              onClick={() => setActiveTab("version")}
            >
              <Layers />
              <span>Версия</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "mods" ? "active" : ""}`}
              onClick={() => setActiveTab("mods")}
            >
              <Package />
              <span>Моды</span>
              <span className="inst-editor-tab-count">{mods.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "resourcepacks" ? "active" : ""}`}
              onClick={() => setActiveTab("resourcepacks")}
            >
              <Compass />
              <span>Ресурс-паки</span>
              <span className="inst-editor-tab-count">{resourcePacks.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "shaders" ? "active" : ""}`}
              onClick={() => setActiveTab("shaders")}
            >
              <Sun />
              <span>Шейдеры</span>
              <span className="inst-editor-tab-count">{shaders.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "worlds" ? "active" : ""}`}
              onClick={() => setActiveTab("worlds")}
            >
              <Globe />
              <span>Миры</span>
              <span className="inst-editor-tab-count">{worlds.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "servers" ? "active" : ""}`}
              onClick={() => setActiveTab("servers")}
            >
              <Server />
              <span>Серверы</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "screenshots" ? "active" : ""}`}
              onClick={() => setActiveTab("screenshots")}
            >
              <Camera />
              <span>Снимки экрана</span>
              <span className="inst-editor-tab-count">{screenshots.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "notes" ? "active" : ""}`}
              onClick={() => setActiveTab("notes")}
            >
              <FileText />
              <span>Заметки</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "logs" ? "active" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              <Terminal />
              <span>Журналы</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <Sliders />
              <span>Параметры</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="inst-editor-content">
            {/* 1. VERSION / COMPONENTS (Screenshot 0) */}
            {activeTab === "version" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#f3f4f6" }}>
                      Компоненты сборки
                    </span>
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "")}
                    >
                      <FolderOpen size={14} />
                      <span>Папка сборки</span>
                    </button>
                  </div>
                </div>

                <div className="inst-table-container">
                  <table className="inst-table">
                    <thead>
                      <tr>
                        <th>Компонент</th>
                        <th>Версия</th>
                        <th>Тип</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <span className="component-status-bar" />
                          <b>Minecraft</b>
                        </td>
                        <td>{instance.mcVersion}</td>
                        <td>Официальный релиз</td>
                        <td>
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>Установлен</span>
                        </td>
                      </tr>
                      {instance.loader !== "Vanilla" && (
                        <tr>
                          <td>
                            <span className="component-status-bar" />
                            <b>{instance.loader} Loader</b>
                          </td>
                          <td>0.16.9 (Active)</td>
                          <td>Загрузчик модов</td>
                          <td>
                            <span style={{ color: "#4ade80", fontWeight: 700 }}>Установлен</span>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td>
                          <span className="component-status-bar" />
                          <b>Intermediary Mappings</b>
                        </td>
                        <td>{instance.mcVersion}</td>
                        <td>Таблицы маппингов</td>
                        <td>
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>Установлен</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span className="component-status-bar" />
                          <b>LWJGL 3</b>
                        </td>
                        <td>3.3.3</td>
                        <td>Системная библиотека</td>
                        <td>
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>Установлен</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. MODS (Screenshots 0 & 1) */}
            {activeTab === "mods" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <input
                      type="text"
                      className="inst-search-input"
                      placeholder="Поиск мода..."
                      value={modsSearch}
                      onChange={(e) => setModsSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      className="inst-tool-btn primary"
                      onClick={handleAddModFile}
                      title="Добавить .jar файл"
                    >
                      <Plus size={14} />
                      <span>Добавить файл</span>
                    </button>
                    {onOpenCatalog && (
                      <button
                        type="button"
                        className="inst-tool-btn"
                        onClick={() => {
                          onClose();
                          onOpenCatalog();
                        }}
                      >
                        <Download size={14} />
                        <span>Скачивание модов</span>
                      </button>
                    )}
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "mods")}
                      title="Открыть папку mods"
                    >
                      <Folder size={14} />
                      <span>Папка mods</span>
                    </button>
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "config")}
                      title="Открыть папку config"
                    >
                      <Settings size={14} />
                      <span>Конфигурации</span>
                    </button>
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={loadMods}
                      title="Обновить список"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="inst-table-container">
                  <table className="inst-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>Вкл</th>
                        <th>Название мода</th>
                        <th>Версия</th>
                        <th>Размер</th>
                        <th style={{ width: 70 }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMods.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                            Моды не найдены в папке mods. Добавьте .jar файлы или установите их из каталога!
                          </td>
                        </tr>
                      ) : (
                        filteredMods.map((mod) => (
                          <tr
                            key={mod.filename}
                            className={!mod.enabled ? "disabled-row" : ""}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                type: "mod",
                                item: mod,
                              });
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={mod.enabled}
                                onChange={() => handleToggleMod(mod)}
                                style={{ cursor: "pointer", accentColor: "#3b82f6" }}
                              />
                            </td>
                            <td>
                              <b>{mod.name}</b>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>{mod.filename}</div>
                            </td>
                            <td>{mod.version || "1.0.0"}</td>
                            <td>{(mod.fileSize / (1024 * 1024)).toFixed(2)} МБ</td>
                            <td>
                              <div style={{ display: "flex", gap: "6px" }}>
                                {mod.modUrl && (
                                  <button
                                    type="button"
                                    className="inst-editor-close-btn"
                                    onClick={() => void ipc.openUrl(mod.modUrl!)}
                                    title="Открыть страницу мода"
                                    style={{ width: 24, height: 24 }}
                                  >
                                    <ExternalLink size={12} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="inst-editor-close-btn"
                                  onClick={() => handleDeleteMod(mod)}
                                  title="Удалить мод"
                                  style={{ width: 24, height: 24, color: "#f87171" }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. RESOURCE PACKS */}
            {activeTab === "resourcepacks" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <input
                      type="text"
                      className="inst-search-input"
                      placeholder="Поиск ресурс-пака..."
                      value={packsSearch}
                      onChange={(e) => setPacksSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "resourcepacks")}
                    >
                      <Folder size={14} />
                      <span>Папка текстур</span>
                    </button>
                  </div>
                  <div className="inst-toolbar-right">
                    <button type="button" className="inst-tool-btn" onClick={loadResourcePacks}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="inst-table-container">
                  <table className="inst-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>Вкл</th>
                        <th>Название ресурс-пака</th>
                        <th>Файл</th>
                        <th>Размер</th>
                        <th style={{ width: 50 }}>Удалить</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPacks.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                            Ресурс-паки не найдены.
                          </td>
                        </tr>
                      ) : (
                        filteredPacks.map((pack) => (
                          <tr key={pack.filename} className={!pack.enabled ? "disabled-row" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                checked={pack.enabled}
                                onChange={() => handleTogglePack(pack)}
                                style={{ cursor: "pointer", accentColor: "#3b82f6" }}
                              />
                            </td>
                            <td>
                              <b>{pack.name}</b>
                            </td>
                            <td style={{ fontSize: "11px", color: "#8b919c" }}>{pack.filename}</td>
                            <td>{(pack.fileSize / (1024 * 1024)).toFixed(2)} МБ</td>
                            <td>
                              <button
                                type="button"
                                className="inst-editor-close-btn"
                                onClick={() => handleDeletePack(pack)}
                                style={{ width: 24, height: 24, color: "#f87171" }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. SHADERS */}
            {activeTab === "shaders" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <input
                      type="text"
                      className="inst-search-input"
                      placeholder="Поиск шейдера..."
                      value={shadersSearch}
                      onChange={(e) => setShadersSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "shaderpacks")}
                    >
                      <Folder size={14} />
                      <span>Папка шейдеров</span>
                    </button>
                  </div>
                  <div className="inst-toolbar-right">
                    <button type="button" className="inst-tool-btn" onClick={loadShaders}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="inst-table-container">
                  <table className="inst-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>Вкл</th>
                        <th>Название шейдера</th>
                        <th>Файл</th>
                        <th>Размер</th>
                        <th style={{ width: 50 }}>Удалить</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShaders.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                            Шейдеры не найдены в shaderpacks.
                          </td>
                        </tr>
                      ) : (
                        filteredShaders.map((shader) => (
                          <tr key={shader.filename} className={!shader.enabled ? "disabled-row" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                checked={shader.enabled}
                                onChange={() => handleToggleShader(shader)}
                                style={{ cursor: "pointer", accentColor: "#3b82f6" }}
                              />
                            </td>
                            <td>
                              <b>{shader.name}</b>
                            </td>
                            <td style={{ fontSize: "11px", color: "#8b919c" }}>{shader.filename}</td>
                            <td>{(shader.fileSize / (1024 * 1024)).toFixed(2)} МБ</td>
                            <td>
                              <button
                                type="button"
                                className="inst-editor-close-btn"
                                onClick={() => handleDeleteShader(shader)}
                                style={{ width: 24, height: 24, color: "#f87171" }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. WORLDS / SAVES */}
            {activeTab === "worlds" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#f3f4f6" }}>
                      Миры одиночной игры ({worlds.length})
                    </span>
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "saves")}
                    >
                      <FolderOpen size={14} />
                      <span>Папка saves</span>
                    </button>
                    <button type="button" className="inst-tool-btn" onClick={loadWorlds}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                  {worlds.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      В этой сборке пока нет сохранённых миров.
                    </div>
                  ) : (
                    <div className="inst-worlds-grid">
                      {worlds.map((w) => (
                        <div key={w.folderName} className="inst-world-card">
                          <div className="inst-world-icon">
                            {w.iconBase64 ? (
                              <img src={w.iconBase64} alt="" />
                            ) : (
                              <Globe size={24} color="#60a5fa" />
                            )}
                          </div>
                          <div className="inst-world-info">
                            <div className="inst-world-title" title={w.displayName}>
                              {w.displayName}
                            </div>
                            <div className="inst-world-meta">Папка: {w.folderName}</div>
                            <div className="inst-world-meta">
                              {(w.sizeBytes / (1024 * 1024)).toFixed(1)} МБ
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. SERVERS */}
            {activeTab === "servers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#f3f4f6" }}>
                      Серверы сетевой игры
                    </span>
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "")}
                    >
                      <Folder size={14} />
                      <span>Директория игры</span>
                    </button>
                  </div>
                </div>

                <div style={{ padding: "20px", background: "#090e17", borderRadius: "6px", color: "#94a3b8" }}>
                  Серверы автоматически синхронизируются из файла <code>servers.dat</code> при запуске игры.
                  Вы также можете подключаться к любому серверу напрямую из раздела «Серверы» лаунчера.
                </div>
              </div>
            )}

            {/* 7. SCREENSHOTS */}
            {activeTab === "screenshots" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#f3f4f6" }}>
                      Скриншоты ({screenshots.length})
                    </span>
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "screenshots")}
                    >
                      <FolderOpen size={14} />
                      <span>Папка screenshots</span>
                    </button>
                    <button type="button" className="inst-tool-btn" onClick={loadScreenshots}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                  {screenshots.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      Скриншотов пока нет. Нажмите F2 во время игры для создания скриншота!
                    </div>
                  ) : (
                    <div className="inst-screenshots-grid">
                      {screenshots.map((s) => (
                        <div key={s.filename} className="inst-screenshot-card">
                          <div className="inst-screenshot-img-wrap">
                            {s.dataUrl ? (
                              <img src={s.dataUrl} alt="" loading="lazy" />
                            ) : (
                              <Camera size={32} color="#64748b" />
                            )}
                          </div>
                          <div className="inst-screenshot-caption" title={s.filename}>
                            {s.filename}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 8. NOTES */}
            {activeTab === "notes" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#f3f4f6" }}>
                      Заметки к сборке
                    </span>
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn primary"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                    >
                      <Check size={14} />
                      <span>{isSavingNotes ? "Сохранение..." : "Сохранить заметку"}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  className="inst-notes-textarea"
                  placeholder="Напишите здесь любые заметки, крафты, цели или координаты для этой сборки..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}

            {/* 9. LOGS */}
            {activeTab === "logs" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <select
                      className="inst-search-input"
                      value={selectedLogFile}
                      onChange={(e) => setSelectedLogFile(e.target.value)}
                      style={{ width: "200px" }}
                    >
                      <option value="logs/latest.log">logs/latest.log</option>
                      {logFiles
                        .filter((f) => f !== "logs/latest.log")
                        .map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                    </select>
                    <input
                      type="text"
                      className="inst-search-input"
                      placeholder="Фильтр строк лога..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                    />
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(logContent);
                        alert("Лог скопирован в буфер обмена!");
                      }}
                      title="Копировать"
                    >
                      <Copy size={14} />
                      <span>Копировать</span>
                    </button>
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "logs")}
                    >
                      <Folder size={14} />
                      <span>Папка логов</span>
                    </button>
                    <button type="button" className="inst-tool-btn" onClick={loadLogs}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
                <pre className="inst-log-viewer">{filteredLogLines || "Лог пуст."}</pre>
              </div>
            )}

            {/* 10. PARAMETERS (Screenshots 2-8) */}
            {activeTab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                {/* Sub-tabs */}
                <div className="inst-params-tabs">
                  <button
                    type="button"
                    className={`inst-param-tab ${activeSettingsSubTab === "general" ? "active" : ""}`}
                    onClick={() => setActiveSettingsSubTab("general")}
                  >
                    Общие
                  </button>
                  <button
                    type="button"
                    className={`inst-param-tab ${activeSettingsSubTab === "java" ? "active" : ""}`}
                    onClick={() => setActiveSettingsSubTab("java")}
                  >
                    Java
                  </button>
                  <button
                    type="button"
                    className={`inst-param-tab ${activeSettingsSubTab === "native" ? "active" : ""}`}
                    onClick={() => setActiveSettingsSubTab("native")}
                  >
                    Настройки
                  </button>
                  <button
                    type="button"
                    className={`inst-param-tab ${activeSettingsSubTab === "commands" ? "active" : ""}`}
                    onClick={() => setActiveSettingsSubTab("commands")}
                  >
                    Пользовательские команды
                  </button>
                  <button
                    type="button"
                    className={`inst-param-tab ${activeSettingsSubTab === "env" ? "active" : ""}`}
                    onClick={() => setActiveSettingsSubTab("env")}
                  >
                    Переменные окружения
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                  {/* General (Screenshots 2, 3, 4) */}
                  {activeSettingsSubTab === "general" && (
                    <div className="inst-params-panel">
                      {/* Window Settings (Screenshot 2) */}
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Окно игры</div>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.fullscreen || false}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, fullscreen: e.target.checked }))
                            }
                          />
                          <span>Запускать Minecraft в полноэкранном режиме</span>
                        </label>
                        <div className="inst-input-row">
                          <label>Размер окна:</label>
                          <div className="inst-stepper">
                            <input
                              type="number"
                              value={config.windowWidth || 854}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  windowWidth: Number(e.target.value),
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  windowWidth: Math.max(640, (prev.windowWidth || 854) - 40),
                                }))
                              }
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  windowWidth: (prev.windowWidth || 854) + 40,
                                }))
                              }
                            >
                              +
                            </button>
                          </div>
                          <span>✕</span>
                          <div className="inst-stepper">
                            <input
                              type="number"
                              value={config.windowHeight || 480}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  windowHeight: Number(e.target.value),
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  windowHeight: Math.max(360, (prev.windowHeight || 480) - 40),
                                }))
                              }
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  windowHeight: (prev.windowHeight || 480) + 40,
                                }))
                              }
                            >
                              +
                            </button>
                          </div>
                          <span>пиксели</span>
                        </div>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.hideLauncherOnStart ?? true}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                hideLauncherOnStart: e.target.checked,
                              }))
                            }
                          />
                          <span>Когда открывается окно игры, спрятать лаунчер</span>
                        </label>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.closeLauncherOnExit || false}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                closeLauncherOnExit: e.target.checked,
                              }))
                            }
                          />
                          <span>Завершать работу лаунчера при закрытии окна игры</span>
                        </label>
                      </div>

                      {/* Console Settings (Screenshot 2) */}
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Окно консоли</div>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.showConsoleOnStart || false}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                showConsoleOnStart: e.target.checked,
                              }))
                            }
                          />
                          <span>Отображать окно консоли при запуске игры</span>
                        </label>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.showConsoleOnCrash ?? true}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                showConsoleOnCrash: e.target.checked,
                              }))
                            }
                          />
                          <span>Отображать окно консоли при возникновении сбоя игры</span>
                        </label>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.hideConsoleOnExit || false}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                hideConsoleOnExit: e.target.checked,
                              }))
                            }
                          />
                          <span>Скрывать окно консоли при завершении игры</span>
                        </label>
                      </div>

                      {/* Playtime (Screenshot 3) */}
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Время игры</div>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.showPlaytime ?? true}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, showPlaytime: e.target.checked }))
                            }
                          />
                          <span>Show time playing this instance</span>
                        </label>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.recordPlaytime ?? true}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, recordPlaytime: e.target.checked }))
                            }
                          />
                          <span>Record time playing this instance</span>
                        </label>
                      </div>

                      {/* Auto-connect (Screenshot 3) */}
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Активировать автоподключение</div>
                        <div className="inst-input-row">
                          <label>Адрес сервера:</label>
                          <input
                            type="text"
                            className="inst-text-input"
                            placeholder="Например: mc.hypixel.net"
                            value={config.autoconnectServer || ""}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                autoconnectServer: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Java (Screenshot 5) */}
                  {activeSettingsSubTab === "java" && (
                    <div className="inst-params-panel">
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Установка Java</div>
                        <div className="inst-input-row">
                          <label>Исполняемый файл Java:</label>
                          <input
                            type="text"
                            className="inst-text-input"
                            placeholder="Оставьте пустым для автоопределения или укажите путь к java"
                            value={config.javaPath || ""}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, javaPath: e.target.value }))
                            }
                          />
                          <button type="button" className="inst-tool-btn" onClick={handleFindJava}>
                            Найти
                          </button>
                        </div>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.skipJavaCompatibility || false}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                skipJavaCompatibility: e.target.checked,
                              }))
                            }
                          />
                          <span>Пропустить проверку совместимости Java</span>
                        </label>
                      </div>

                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Память</div>
                        <div className="inst-input-row">
                          <label>Минимальное использование памяти (-Xms):</label>
                          <div className="inst-stepper">
                            <input
                              type="number"
                              value={config.minMemoryMb || 1024}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  minMemoryMb: Number(e.target.value),
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  minMemoryMb: Math.max(256, (prev.minMemoryMb || 1024) - 256),
                                }))
                              }
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  minMemoryMb: (prev.minMemoryMb || 1024) + 256,
                                }))
                              }
                            >
                              +
                            </button>
                          </div>
                          <span>MiB</span>
                        </div>

                        <div className="inst-input-row">
                          <label>Максимальное использование памяти (-Xmx):</label>
                          <div className="inst-stepper">
                            <input
                              type="number"
                              value={config.maxMemoryMb || 4096}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  maxMemoryMb: Number(e.target.value),
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  maxMemoryMb: Math.max(512, (prev.maxMemoryMb || 4096) - 512),
                                }))
                              }
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  maxMemoryMb: (prev.maxMemoryMb || 4096) + 512,
                                }))
                              }
                            >
                              +
                            </button>
                          </div>
                          <span>MiB</span>
                        </div>

                        <div className="inst-input-row">
                          <label>Размер PermGen (-XX:PermSize):</label>
                          <div className="inst-stepper">
                            <input
                              type="number"
                              value={config.permGenMb || 128}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  permGenMb: Number(e.target.value),
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  permGenMb: Math.max(64, (prev.permGenMb || 128) - 32),
                                }))
                              }
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  permGenMb: (prev.permGenMb || 128) + 32,
                                }))
                              }
                            >
                              +
                            </button>
                          </div>
                          <span>MiB</span>
                        </div>
                      </div>

                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Аргументы Java</div>
                        <input
                          type="text"
                          className="inst-text-input"
                          placeholder="-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions..."
                          value={config.customJvmArgs || ""}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, customJvmArgs: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Native Libs & Performance (Screenshot 6) */}
                  {activeSettingsSubTab === "native" && (
                    <div className="inst-params-panel">
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Нативные библиотеки</div>
                        <div className="inst-input-row">
                          <label>Путь к библиотеке GLFW:</label>
                          <input
                            type="text"
                            className="inst-text-input"
                            value={config.systemGlfwPath || "/usr/lib/libglfw.so"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                systemGlfwPath: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="inst-input-row">
                          <label>Путь к библиотеке OpenAL:</label>
                          <input
                            type="text"
                            className="inst-text-input"
                            value={config.systemOpenalPath || "/usr/lib/libopenal.so"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                systemOpenalPath: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Производительность</div>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.enableGamemode || false}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                enableGamemode: e.target.checked,
                              }))
                            }
                          />
                          <span>Включить GameMode от Feral (gamemoderun)</span>
                        </label>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.enableMangohud || false}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                enableMangohud: e.target.checked,
                              }))
                            }
                          />
                          <span>Включить MangoHud</span>
                        </label>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.useDiscreteGpu || false}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                useDiscreteGpu: e.target.checked,
                              }))
                            }
                          />
                          <span>Использовать дискретную видеокарту (DRI_PRIME=1)</span>
                        </label>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.useZink || false}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, useZink: e.target.checked }))
                            }
                          />
                          <span>Использовать Zink (OpenGL over Vulkan)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Custom Commands (Screenshot 7) */}
                  {activeSettingsSubTab === "commands" && (
                    <div className="inst-params-panel">
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">Пользовательские команды</div>
                        <div className="inst-input-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                          <label>Предстартовая команда:</label>
                          <input
                            type="text"
                            className="inst-text-input"
                            style={{ width: "100%" }}
                            value={config.preLaunchCommand || ""}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                preLaunchCommand: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="inst-input-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                          <label>Команда обёртки:</label>
                          <input
                            type="text"
                            className="inst-text-input"
                            style={{ width: "100%" }}
                            value={config.wrapperCommand || ""}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                wrapperCommand: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="inst-input-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                          <label>Завершающая команда:</label>
                          <input
                            type="text"
                            className="inst-text-input"
                            style={{ width: "100%" }}
                            value={config.postExitCommand || ""}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                postExitCommand: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div style={{ marginTop: "10px", fontSize: "11.5px", color: "#8b919c", lineHeight: 1.6 }}>
                          Переменные среды, доступные в командах:
                          <div>• <code>$INST_NAME</code> - имя экземпляра</div>
                          <div>• <code>$INST_ID</code> - ID экземпляра</div>
                          <div>• <code>$INST_DIR</code> - полный путь к экземпляру</div>
                          <div>• <code>$INST_MC_DIR</code> - путь к папке minecraft</div>
                          <div>• <code>$INST_JAVA</code> - путь к исполняемому файлу Java</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Environment Variables (Screenshot 8) */}
                  {activeSettingsSubTab === "env" && (
                    <div className="inst-params-panel">
                      <div className="inst-settings-group">
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.overrideEnvVars || false}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                overrideEnvVars: e.target.checked,
                              }))
                            }
                          />
                          <span>Переопределять глобальные параметры</span>
                        </label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="inst-tool-btn"
                            onClick={() => {
                              const name = prompt("Имя переменной окружения:");
                              if (!name) return;
                              const val = prompt("Значение:") || "";
                              setConfig((prev) => ({
                                ...prev,
                                envVars: { ...(prev.envVars || {}), [name]: val },
                              }));
                            }}
                          >
                            Добавить
                          </button>
                          <button
                            type="button"
                            className="inst-tool-btn"
                            onClick={() => setConfig((prev) => ({ ...prev, envVars: {} }))}
                          >
                            Очистить
                          </button>
                        </div>

                        <div className="inst-table-container" style={{ maxHeight: "200px" }}>
                          <table className="inst-table">
                            <thead>
                              <tr>
                                <th>Имя</th>
                                <th>Значение</th>
                                <th style={{ width: 40 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(config.envVars || {}).length === 0 ? (
                                <tr>
                                  <td colSpan={3} style={{ textAlign: "center", color: "#64748b" }}>
                                    Нет пользовательских переменных окружения.
                                  </td>
                                </tr>
                              ) : (
                                Object.entries(config.envVars || {}).map(([k, v]) => (
                                  <tr key={k}>
                                    <td><code>{k}</code></td>
                                    <td>{v}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="inst-editor-close-btn"
                                        onClick={() => {
                                          setConfig((prev) => {
                                            const copy = { ...(prev.envVars || {}) };
                                            delete copy[k];
                                            return { ...prev, envVars: copy };
                                          });
                                        }}
                                        style={{ width: 22, height: 22, color: "#f87171" }}
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="inst-editor-footer">
          <button type="button" className="inst-footer-btn-close" onClick={onClose}>
            Закрыть
          </button>
          {activeTab === "settings" && (
            <button type="button" className="inst-footer-btn-save" onClick={handleSaveConfig}>
              <Check size={14} />
              <span>Сохранить параметры</span>
            </button>
          )}
        </div>

        {/* Context Menu (Screenshot 1) */}
        {contextMenu && (
          <div
            className="inst-context-menu"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 340),
              left: Math.min(contextMenu.x, window.innerWidth - 220),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {onOpenCatalog && (
              <div
                className="inst-ctx-item"
                onClick={() => {
                  setContextMenu(null);
                  onClose();
                  onOpenCatalog();
                }}
              >
                <span>Скачивание модов</span>
              </div>
            )}
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                alert(`Проверка обновлений для ${contextMenu.item.name}... Все моды актуальны!`);
              }}
            >
              <span>Проверить обновления</span>
            </div>
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                if (onOpenCatalog) {
                  onClose();
                  onOpenCatalog();
                }
              }}
            >
              <span>Изменить версию</span>
            </div>
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                handleAddModFile();
              }}
            >
              <span>Добавить файл</span>
            </div>
            <div className="inst-ctx-separator" />
            <div
              className="inst-ctx-item danger"
              onClick={() => {
                const item = contextMenu.item;
                setContextMenu(null);
                handleDeleteMod(item);
              }}
            >
              <span>Удалить</span>
            </div>
            {!contextMenu.item.enabled ? (
              <div
                className="inst-ctx-item"
                onClick={() => {
                  const item = contextMenu.item;
                  setContextMenu(null);
                  handleToggleMod(item);
                }}
              >
                <span style={{ color: "#4ade80" }}>Включить</span>
              </div>
            ) : (
              <div
                className="inst-ctx-item"
                onClick={() => {
                  const item = contextMenu.item;
                  setContextMenu(null);
                  handleToggleMod(item);
                }}
              >
                <span style={{ color: "#f87171" }}>Отключить</span>
              </div>
            )}
            <div className="inst-ctx-separator" />
            {contextMenu.item.modUrl && (
              <div
                className="inst-ctx-item"
                onClick={() => {
                  const url = contextMenu.item.modUrl;
                  setContextMenu(null);
                  void ipc.openUrl(url);
                }}
              >
                <span>Открыть домашнюю страницу</span>
              </div>
            )}
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                const list = mods.map((m) => `${m.name} (${m.filename})`).join("\n");
                navigator.clipboard.writeText(list);
                alert("Список модов скопирован в буфер обмена!");
              }}
            >
              <span>Экспортировать список</span>
            </div>
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                void ipc.openInstanceSubfolder(instance.id, "mods");
              }}
            >
              <span>Открыть папку</span>
            </div>
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                void ipc.openInstanceSubfolder(instance.id, "config");
              }}
            >
              <span>Открыть конфигурации</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
