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


const tr = (lang: string, uk: string, ru: string, en: string): string => {
  if (lang === "uk") return uk;
  if (lang === "en") return en;
  return ru;
};

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
      alert(`${tr(lang, "Помилка перемикання мода: ", "Ошибка переключения мода: ", "Error toggling mod: ")}${e}`);
    }
  };

  const handleDeleteMod = async (mod: InstanceModItem) => {
    if (!confirm(`${tr(lang, "Видалити мод", "Удалить мод", "Delete mod")} "${mod.name}"?`)) return;
    try {
      await ipc.deleteInstanceMod(instance.id, mod.filename);
      setMods((prev) => prev.filter((m) => m.filename !== mod.filename));
    } catch (e) {
      alert(`${tr(lang, "Помилка видалення мода: ", "Ошибка удаления мода: ", "Error deleting mod: ")}${e}`);
    }
  };

  const handleAddModFile = async () => {
    const path = prompt(tr(lang, "Введіть абсолютний шлях до .jar або .zip файлу мода:", "Введите абсолютный путь к .jar или .zip файлу мода:", "Enter absolute path to mod .jar or .zip file:"));
    if (!path || !path.trim()) return;
    try {
      await ipc.addInstanceModFile(instance.id, path.trim());
      await loadMods();
    } catch (e) {
      alert(`${tr(lang, "Помилка додавання файлу: ", "Ошибка добавления файла: ", "Error adding file: ")}${e}`);
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
      alert(`${tr(lang, "Помилка: ", "Ошибка: ", "Error: ")}${e}`);
    }
  };

  const handleDeletePack = async (pack: InstancePackItem) => {
    if (!confirm(`${tr(lang, "Видалити ресурс-пак", "Удалить ресурс-пак", "Delete resource pack")} "${pack.name}"?`)) return;
    try {
      await ipc.deleteInstanceResourcepack(instance.id, pack.filename);
      setResourcePacks((prev) => prev.filter((p) => p.filename !== pack.filename));
    } catch (e) {
      alert(`${tr(lang, "Помилка: ", "Ошибка: ", "Error: ")}${e}`);
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
      alert(`${tr(lang, "Помилка: ", "Ошибка: ", "Error: ")}${e}`);
    }
  };

  const handleDeleteShader = async (shader: InstancePackItem) => {
    if (!confirm(`${tr(lang, "Видалити шейдер", "Удалить шейдер", "Delete shader")} "${shader.name}"?`)) return;
    try {
      await ipc.deleteInstanceShaderpack(instance.id, shader.filename);
      setShaders((prev) => prev.filter((s) => s.filename !== shader.filename));
    } catch (e) {
      alert(`${tr(lang, "Помилка: ", "Ошибка: ", "Error: ")}${e}`);
    }
  };

  // Save Notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await ipc.saveInstanceNotes(instance.id, notes);
    } catch (e) {
      alert(`${tr(lang, "Помилка збереження нотаток: ", "Ошибка сохранения заметок: ", "Error saving notes: ")}${e}`);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Save Config
  const handleSaveConfig = async () => {
    try {
      await ipc.saveInstanceConfig(instance.id, config);
      alert(tr(lang, "Налаштування збірки успішно збережено!", "Настройки сборки успешно сохранены!", "Assembly settings saved successfully!"));
    } catch (e) {
      alert(`${tr(lang, "Помилка збереження налаштувань: ", "Ошибка сохранения настроек: ", "Error saving settings: ")}${e}`);
    }
  };

  // Find system java
  const handleFindJava = async () => {
    try {
      const java = await ipc.findSystemJava();
      if (java) {
        setConfig((prev) => ({ ...prev, javaPath: java }));
      } else {
        alert(tr(lang, "Системну Java не знайдено", "Системная Java не найдена", "System Java not found"));
      }
    } catch (e) {
      alert(`${tr(lang, "Помилка пошуку Java: ", "Ошибка поиска Java: ", "Error detecting Java: ")}${e}`);
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
                ID: {instance.id} | {tr(lang, "Редагування модів, світів, параметрів та журналів", "Редактирование модов, миров, параметров и журналов", "Edit mods, worlds, settings, and logs")}
              </div>
            </div>
          </div>
          <button type="button" className="inst-editor-close-btn" onClick={onClose} title={tr(lang, "Закрити", "Закрыть", "Close")}>
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
              <span>{tr(lang, "Версія", "Версия", "Version")}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "mods" ? "active" : ""}`}
              onClick={() => setActiveTab("mods")}
            >
              <Package />
              <span>{tr(lang, "Моди", "Моды", "Mods")}</span>
              <span className="inst-editor-tab-count">{mods.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "resourcepacks" ? "active" : ""}`}
              onClick={() => setActiveTab("resourcepacks")}
            >
              <Compass />
              <span>{tr(lang, "Ресурс-паки", "Ресурс-паки", "Resource Packs")}</span>
              <span className="inst-editor-tab-count">{resourcePacks.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "shaders" ? "active" : ""}`}
              onClick={() => setActiveTab("shaders")}
            >
              <Sun />
              <span>{tr(lang, "Шейдери", "Шейдеры", "Shaders")}</span>
              <span className="inst-editor-tab-count">{shaders.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "worlds" ? "active" : ""}`}
              onClick={() => setActiveTab("worlds")}
            >
              <Globe />
              <span>{tr(lang, "Світи", "Миры", "Worlds")}</span>
              <span className="inst-editor-tab-count">{worlds.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "servers" ? "active" : ""}`}
              onClick={() => setActiveTab("servers")}
            >
              <Server />
              <span>{tr(lang, "Сервери", "Серверы", "Servers")}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "screenshots" ? "active" : ""}`}
              onClick={() => setActiveTab("screenshots")}
            >
              <Camera />
              <span>{tr(lang, "Знімки екрана", "Снимки экрана", "Screenshots")}</span>
              <span className="inst-editor-tab-count">{screenshots.length}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "notes" ? "active" : ""}`}
              onClick={() => setActiveTab("notes")}
            >
              <FileText />
              <span>{tr(lang, "Нотатки", "Заметки", "Notes")}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "logs" ? "active" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              <Terminal />
              <span>{tr(lang, "Журнали", "Журналы", "Logs")}</span>
            </button>

            <button
              type="button"
              className={`inst-editor-tab-btn ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <Sliders />
              <span>{tr(lang, "Параметри", "Параметры", "Settings")}</span>
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
                      {tr(lang, "Компоненти збірки", "Компоненты сборки", "Assembly Components")}
                    </span>
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "")}
                    >
                      <FolderOpen size={14} />
                      <span>{tr(lang, "Папка збірки", "Папка сборки", "Assembly Folder")}</span>
                    </button>
                  </div>
                </div>

                <div className="inst-table-container">
                  <table className="inst-table">
                    <thead>
                      <tr>
                        <th>{tr(lang, "Компонент", "Компонент", "Component")}</th>
                        <th>{tr(lang, "Версія", "Версия", "Version")}</th>
                        <th>{tr(lang, "Тип", "Тип", "Type")}</th>
                        <th>{tr(lang, "Статус", "Статус", "Status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <span className="component-status-bar" />
                          <b>Minecraft</b>
                        </td>
                        <td>{instance.mcVersion}</td>
                        <td>{tr(lang, "Офіційний реліз", "Официальный релиз", "Official Release")}</td>
                        <td>
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>{tr(lang, "Встановлено", "Установлен", "Installed")}</span>
                        </td>
                      </tr>
                      {instance.loader !== "Vanilla" && (
                        <tr>
                          <td>
                            <span className="component-status-bar" />
                            <b>{instance.loader} Loader</b>
                          </td>
                          <td>0.16.9 (Active)</td>
                          <td>{tr(lang, "Завантажувач модів", "Загрузчик модов", "Mod Loader")}</td>
                          <td>
                            <span style={{ color: "#4ade80", fontWeight: 700 }}>{tr(lang, "Встановлено", "Установлен", "Installed")}</span>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td>
                          <span className="component-status-bar" />
                          <b>Intermediary Mappings</b>
                        </td>
                        <td>{instance.mcVersion}</td>
                        <td>{tr(lang, "Таблиці мапінгів", "Таблицы маппингов", "Mapping Tables")}</td>
                        <td>
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>{tr(lang, "Встановлено", "Установлен", "Installed")}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span className="component-status-bar" />
                          <b>LWJGL 3</b>
                        </td>
                        <td>3.3.3</td>
                        <td>{tr(lang, "Системна бібліотека", "Системная библиотека", "System Library")}</td>
                        <td>
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>{tr(lang, "Встановлено", "Установлен", "Installed")}</span>
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
                      placeholder={tr(lang, "Пошук мода...", "Поиск мода...", "Search mod...")}
                      value={modsSearch}
                      onChange={(e) => setModsSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      className="inst-tool-btn primary"
                      onClick={handleAddModFile}
                      title={tr(lang, "Додати .jar файл", "Добавить .jar файл", "Add .jar file")}
                    >
                      <Plus size={14} />
                      <span>{tr(lang, "Додати файл", "Добавить файл", "Add File")}</span>
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
                        <span>{tr(lang, "Завантаження модів", "Скачивание модов", "Download Mods")}</span>
                      </button>
                    )}
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "mods")}
                      title={tr(lang, "Відкрити папку mods", "Открыть папку mods", "Open mods folder")}
                    >
                      <Folder size={14} />
                      <span>{tr(lang, "Папка mods", "Папка mods", "Mods Folder")}</span>
                    </button>
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "config")}
                      title={tr(lang, "Відкрити папку config", "Открыть папку config", "Open config folder")}
                    >
                      <Settings size={14} />
                      <span>{tr(lang, "Конфігурації", "Конфигурации", "Configurations")}</span>
                    </button>
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={loadMods}
                      title={tr(lang, "Оновити список", "Обновить список", "Refresh list")}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="inst-table-container">
                  <table className="inst-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>{tr(lang, "Увімк", "Вкл", "On")}</th>
                        <th>{tr(lang, "Назва мода", "Название мода", "Mod Name")}</th>
                        <th>{tr(lang, "Версія", "Версия", "Version")}</th>
                        <th>{tr(lang, "Розмір", "Размер", "Size")}</th>
                        <th style={{ width: 70 }}>{tr(lang, "Дії", "Действия", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMods.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                            {tr(lang, "Моди не знайдено в папці mods. Додайте .jar файли або встановіть їх з каталогу!", "Моды не найдены в папке mods. Добавьте .jar файлы или установите их из каталога!", "No mods found in mods folder. Add .jar files or install from catalog!")}
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
                            <td>{(mod.fileSize / (1024 * 1024)).toFixed(2)} {tr(lang, "МБ", "МБ", "MB")}</td>
                            <td>
                              <div style={{ display: "flex", gap: "6px" }}>
                                {mod.modUrl && (
                                  <button
                                    type="button"
                                    className="inst-editor-close-btn"
                                    onClick={() => void ipc.openUrl(mod.modUrl!)}
                                    title={tr(lang, "Відкрити сторінку мода", "Открыть страницу мода", "Open mod page")}
                                    style={{ width: 24, height: 24 }}
                                  >
                                    <ExternalLink size={12} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="inst-editor-close-btn"
                                  onClick={() => handleDeleteMod(mod)}
                                  title={tr(lang, "Видалити мод", "Удалить мод", "Delete mod")}
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
                      placeholder={tr(lang, "Пошук ресурс-пака...", "Поиск ресурс-пака...", "Search resource pack...")}
                      value={packsSearch}
                      onChange={(e) => setPacksSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "resourcepacks")}
                    >
                      <Folder size={14} />
                      <span>{tr(lang, "Папка текстур", "Папка текстур", "Textures Folder")}</span>
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
                        <th style={{ width: 40 }}>{tr(lang, "Увімк", "Вкл", "On")}</th>
                        <th>{tr(lang, "Назва ресурс-пака", "Название ресурс-пака", "Resource Pack Name")}</th>
                        <th>{tr(lang, "Файл", "Файл", "File")}</th>
                        <th>{tr(lang, "Розмір", "Размер", "Size")}</th>
                        <th style={{ width: 50 }}>{tr(lang, "Видалити", "Удалить", "Delete")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPacks.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                            {tr(lang, "Ресурс-паки не знайдено.", "Ресурс-паки не найдены.", "No resource packs found.")}
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
                            <td>{(pack.fileSize / (1024 * 1024)).toFixed(2)} {tr(lang, "МБ", "МБ", "MB")}</td>
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
                      placeholder={tr(lang, "Пошук шейдера...", "Поиск шейдера...", "Search shader...")}
                      value={shadersSearch}
                      onChange={(e) => setShadersSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "shaderpacks")}
                    >
                      <Folder size={14} />
                      <span>{tr(lang, "Папка шейдерів", "Папка шейдеров", "Shaders Folder")}</span>
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
                        <th style={{ width: 40 }}>{tr(lang, "Увімк", "Вкл", "On")}</th>
                        <th>{tr(lang, "Назва шейдера", "Название шейдера", "Shader Name")}</th>
                        <th>{tr(lang, "Файл", "Файл", "File")}</th>
                        <th>{tr(lang, "Розмір", "Размер", "Size")}</th>
                        <th style={{ width: 50 }}>{tr(lang, "Видалити", "Удалить", "Delete")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShaders.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                            {tr(lang, "Шейдери не знайдено в shaderpacks.", "Шейдеры не найдены в shaderpacks.", "No shaders found in shaderpacks.")}
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
                            <td>{(shader.fileSize / (1024 * 1024)).toFixed(2)} {tr(lang, "МБ", "МБ", "MB")}</td>
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
                      {tr(lang, "Світи одиночної гри", "Миры одиночной игры", "Singleplayer Worlds")} ({worlds.length})
                    </span>
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "saves")}
                    >
                      <FolderOpen size={14} />
                      <span>{tr(lang, "Папка saves", "Папка saves", "Saves Folder")}</span>
                    </button>
                    <button type="button" className="inst-tool-btn" onClick={loadWorlds}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                  {worlds.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      {tr(lang, "У цій збірці поки немає збережених світів.", "В этой сборке пока нет сохранённых миров.", "No saved worlds in this assembly yet.")}
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
                            <div className="inst-world-meta">{tr(lang, "Папка:", "Папка:", "Folder:")} {w.folderName}</div>
                            <div className="inst-world-meta">
                              {(w.sizeBytes / (1024 * 1024)).toFixed(1)} {tr(lang, "МБ", "МБ", "MB")}
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
                      {tr(lang, "Сервери мережевої гри", "Серверы сетевой игры", "Multiplayer Servers")}
                    </span>
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "")}
                    >
                      <Folder size={14} />
                      <span>{tr(lang, "Директорія гри", "Директория игры", "Game Directory")}</span>
                    </button>
                  </div>
                </div>

                <div style={{ padding: "20px", background: "#090e17", borderRadius: "6px", color: "#94a3b8" }}>
                  {tr(lang, "Сервери автоматично синхронізуються з файлу servers.dat при запуску гри.", "Серверы автоматически синхронизируются из файла servers.dat при запуске игры.", "Servers are automatically synchronized from servers.dat on game launch.")}
                  {tr(lang, "Ви також можете підключатися до будь-якого сервера напряму з розділу «Сервери» лаунчера.", "Вы также можете подключаться к любому серверу напрямую из раздела «Серверы» лаунчера.", "You can also connect to any server directly from the «Servers» screen of the launcher.")}
                </div>
              </div>
            )}

            {/* 7. SCREENSHOTS */}
            {activeTab === "screenshots" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                <div className="inst-content-toolbar">
                  <div className="inst-toolbar-left">
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#f3f4f6" }}>
                      {tr(lang, "Скріншоти", "Скриншоты", "Screenshots")} ({screenshots.length})
                    </span>
                  </div>
                  <div className="inst-toolbar-right">
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "screenshots")}
                    >
                      <FolderOpen size={14} />
                      <span>{tr(lang, "Папка screenshots", "Папка screenshots", "Screenshots Folder")}</span>
                    </button>
                    <button type="button" className="inst-tool-btn" onClick={loadScreenshots}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                  {screenshots.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      {tr(lang, "Скріншотів поки немає. Натисніть F2 під час гри для створення скріншоту!", "Скриншотов пока нет. Нажмите F2 во время игры для создания скриншота!", "No screenshots yet. Press F2 during the game to take a screenshot!")}
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
                      {tr(lang, "Нотатки до збірки", "Заметки к сборке", "Assembly Notes")}
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
                      <span>{isSavingNotes ? tr(lang, "Збереження...", "Сохранение...", "Saving...") : tr(lang, "Зберегти нотатку", "Сохранить заметку", "Save note")}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  className="inst-notes-textarea"
                  placeholder={tr(lang, "Напишіть тут будь-які нотатки, крафти, цілі або координати для цієї збірки...", "Напишите здесь любые заметки, крафты, цели или координаты для этой сборки...", "Write any notes, recipes, goals, or coordinates for this assembly here...")}
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
                      placeholder={tr(lang, "Фільтр рядків логу...", "Фильтр строк лога...", "Filter log lines...")}
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
                        alert(tr(lang, "Лог скопійовано в буфер обміну!", "Лог скопирован в буфер обмена!", "Log copied to clipboard!"));
                      }}
                      title={tr(lang, "Копіювати", "Копировать", "Copy")}
                    >
                      <Copy size={14} />
                      <span>{tr(lang, "Копіювати", "Копировать", "Copy")}</span>
                    </button>
                    <button
                      type="button"
                      className="inst-tool-btn"
                      onClick={() => void ipc.openInstanceSubfolder(instance.id, "logs")}
                    >
                      <Folder size={14} />
                      <span>{tr(lang, "Папка логів", "Папка логов", "Logs Folder")}</span>
                    </button>
                    <button type="button" className="inst-tool-btn" onClick={loadLogs}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
                <pre className="inst-log-viewer">{filteredLogLines || tr(lang, "Лог порожній.", "Лог пуст.", "Log is empty.")}</pre>
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
                    {tr(lang, "Загальні", "Общие", "General")}
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
                    {tr(lang, "Налаштування", "Настройки", "Settings")}
                  </button>
                  <button
                    type="button"
                    className={`inst-param-tab ${activeSettingsSubTab === "commands" ? "active" : ""}`}
                    onClick={() => setActiveSettingsSubTab("commands")}
                  >
                    {tr(lang, "Користувацькі команди", "Пользовательские команды", "Custom Commands")}
                  </button>
                  <button
                    type="button"
                    className={`inst-param-tab ${activeSettingsSubTab === "env" ? "active" : ""}`}
                    onClick={() => setActiveSettingsSubTab("env")}
                  >
                    {tr(lang, "Змінні оточення", "Переменные окружения", "Environment Variables")}
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                  {/* General (Screenshots 2, 3, 4) */}
                  {activeSettingsSubTab === "general" && (
                    <div className="inst-params-panel">
                      {/* Window Settings (Screenshot 2) */}
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">{tr(lang, "Вікно гри", "Окно игры", "Game Window")}</div>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.fullscreen || false}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, fullscreen: e.target.checked }))
                            }
                          />
                          <span>{tr(lang, "Запускати Minecraft у повноекранному режимі", "Запускать Minecraft в полноэкранном режиме", "Launch Minecraft in fullscreen mode")}</span>
                        </label>
                        <div className="inst-input-row">
                          <label>{tr(lang, "Розмір вікна:", "Размер окна:", "Window size:")}</label>
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
                          <span>{tr(lang, "пікселі", "пиксели", "pixels")}</span>
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
                          <span>{tr(lang, "Коли відкривається вікно гри, сховати лаунчер", "Когда открывается окно игры, спрятать лаунчер", "Hide launcher when game window opens")}</span>
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
                          <span>{tr(lang, "Завершувати роботу лаунчера при закритті вікна гри", "Завершать работу лаунчера при закрытии окна игры", "Close launcher when game window exits")}</span>
                        </label>
                      </div>

                      {/* Console Settings (Screenshot 2) */}
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">{tr(lang, "Вікно консолі", "Окно консоли", "Console Window")}</div>
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
                          <span>{tr(lang, "Відображати вікно консолі при запуску гри", "Отображать окно консоли при запуске игры", "Show console window on game launch")}</span>
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
                          <span>{tr(lang, "Відображати вікно консолі при виникненні збою гри", "Отображать окно консоли при возникновении сбоя игры", "Show console window on game crash")}</span>
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
                          <span>{tr(lang, "Ховати вікно консолі при завершенні гри", "Скрывать окно консоли при завершении игры", "Hide console window when game exits")}</span>
                        </label>
                      </div>

                      {/* Playtime (Screenshot 3) */}
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">{tr(lang, "Час гри", "Время игры", "Playtime")}</div>
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
                        <div className="inst-settings-title">{tr(lang, "Активувати автопідключення", "Активировать автоподключение", "Enable Auto-Connect")}</div>
                        <div className="inst-input-row">
                          <label>{tr(lang, "Адреса сервера:", "Адрес сервера:", "Server address:")}</label>
                          <input
                            type="text"
                            className="inst-text-input"
                            placeholder={tr(lang, "Наприклад: mc.hypixel.net", "Например: mc.hypixel.net", "e.g. mc.hypixel.net")}
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
                        <div className="inst-settings-title">{tr(lang, "Встановлення Java", "Установка Java", "Java Installation")}</div>
                        <div className="inst-input-row">
                          <label>{tr(lang, "Виконуваний файл Java:", "Исполняемый файл Java:", "Java Executable:")}</label>
                          <input
                            type="text"
                            className="inst-text-input"
                            placeholder={tr(lang, "Залиште порожнім для автовизначення або вкажіть шлях до java", "Оставьте пустым для автоопределения или укажите путь к java", "Leave empty for auto-detection or specify path to java")}
                            value={config.javaPath || ""}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, javaPath: e.target.value }))
                            }
                          />
                          <button type="button" className="inst-tool-btn" onClick={handleFindJava}>
                            {tr(lang, "Знайти", "Найти", "Find")}
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
                          <span>{tr(lang, "Пропустити перевірку сумісності Java", "Пропустить проверку совместимости Java", "Skip Java compatibility check")}</span>
                        </label>
                      </div>

                      <div className="inst-settings-group">
                        <div className="inst-settings-title">{tr(lang, "Пам'ять", "Память", "Memory")}</div>
                        <div className="inst-input-row">
                          <label>{tr(lang, "Мінімальне використання пам'яті (-Xms):", "Минимальное использование памяти (-Xms):", "Minimum memory allocation (-Xms):")}</label>
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
                          <label>{tr(lang, "Максимальне використання пам'яті (-Xmx):", "Максимальное использование памяти (-Xmx):", "Maximum memory allocation (-Xmx):")}</label>
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
                          <label>{tr(lang, "Розмір PermGen (-XX:PermSize):", "Размер PermGen (-XX:PermSize):", "PermGen size (-XX:PermSize):")}</label>
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
                        <div className="inst-settings-title">{tr(lang, "Аргументи Java", "Аргументы Java", "Java Arguments")}</div>
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
                        <div className="inst-settings-title">{tr(lang, "Нативні бібліотеки", "Нативные библиотеки", "Native Libraries")}</div>
                        <div className="inst-input-row">
                          <label>{tr(lang, "Шлях до бібліотеки GLFW:", "Путь к библиотеке GLFW:", "Path to GLFW library:")}</label>
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
                          <label>{tr(lang, "Шлях до бібліотеки OpenAL:", "Путь к библиотеке OpenAL:", "Path to OpenAL library:")}</label>
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
                        <div className="inst-settings-title">{tr(lang, "Продуктивність", "Производительность", "Performance")}</div>
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
                          <span>{tr(lang, "Увімкнути GameMode від Feral (gamemoderun)", "Включить GameMode от Feral (gamemoderun)", "Enable Feral GameMode (gamemoderun)")}</span>
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
                          <span>{tr(lang, "Увімкнути MangoHud", "Включить MangoHud", "Enable MangoHud")}</span>
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
                          <span>{tr(lang, "Використовувати дискретну відеокарту (DRI_PRIME=1)", "Использовать дискретную видеокарту (DRI_PRIME=1)", "Use discrete GPU (DRI_PRIME=1)")}</span>
                        </label>
                        <label className="inst-checkbox-row">
                          <input
                            type="checkbox"
                            checked={config.useZink || false}
                            onChange={(e) =>
                              setConfig((prev) => ({ ...prev, useZink: e.target.checked }))
                            }
                          />
                          <span>{tr(lang, "Використовувати Zink (OpenGL over Vulkan)", "Использовать Zink (OpenGL over Vulkan)", "Use Zink (OpenGL over Vulkan)")}</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Custom Commands (Screenshot 7) */}
                  {activeSettingsSubTab === "commands" && (
                    <div className="inst-params-panel">
                      <div className="inst-settings-group">
                        <div className="inst-settings-title">{tr(lang, "Користувацькі команди", "Пользовательские команды", "Custom Commands")}</div>
                        <div className="inst-input-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                          <label>{tr(lang, "Передстартова команда:", "Предстартовая команда:", "Pre-launch command:")}</label>
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
                          <label>{tr(lang, "Команда обгортки:", "Команда обёртки:", "Wrapper command:")}</label>
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
                          <label>{tr(lang, "Завершальна команда:", "Завершающая команда:", "Post-exit command:")}</label>
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
                          {tr(lang, "Змінні середовища, доступні в командах:", "Переменные среды, доступные в командах:", "Environment variables available in commands:")}
                          <div>• <code>$INST_NAME</code> - {tr(lang, "ім'я екземпляра", "имя экземпляра", "instance name")}</div>
                          <div>• <code>$INST_ID</code> - {tr(lang, "ID екземпляра", "ID экземпляра", "instance ID")}</div>
                          <div>• <code>$INST_DIR</code> - {tr(lang, "повний шлях до екземпляра", "полный путь к экземпляру", "full path to instance")}</div>
                          <div>• <code>$INST_MC_DIR</code> - {tr(lang, "шлях до папки minecraft", "путь к папке minecraft", "path to minecraft folder")}</div>
                          <div>• <code>$INST_JAVA</code> - {tr(lang, "шлях до виконуваного файлу Java", "путь к исполняемому файлу Java", "path to Java executable")}</div>
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
                          <span>{tr(lang, "Перевизначати глобальні параметри", "Переопределять глобальные параметры", "Override global settings")}</span>
                        </label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="inst-tool-btn"
                            onClick={() => {
                              const name = prompt(tr(lang, "Ім'я змінної оточення:", "Имя переменной окружения:", "Environment variable name:"));
                              if (!name) return;
                              const val = prompt(tr(lang, "Значення:", "Значение:", "Value:")) || "";
                              setConfig((prev) => ({
                                ...prev,
                                envVars: { ...(prev.envVars || {}), [name]: val },
                              }));
                            }}
                          >
                            {tr(lang, "Додати", "Добавить", "Add")}
                          </button>
                          <button
                            type="button"
                            className="inst-tool-btn"
                            onClick={() => setConfig((prev) => ({ ...prev, envVars: {} }))}
                          >
                            {tr(lang, "Очистити", "Очистить", "Clear")}
                          </button>
                        </div>

                        <div className="inst-table-container" style={{ maxHeight: "200px" }}>
                          <table className="inst-table">
                            <thead>
                              <tr>
                                <th>{tr(lang, "Ім'я", "Имя", "Name")}</th>
                                <th>{tr(lang, "Значення", "Значение", "Value")}</th>
                                <th style={{ width: 40 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(config.envVars || {}).length === 0 ? (
                                <tr>
                                  <td colSpan={3} style={{ textAlign: "center", color: "#64748b" }}>
                                    {tr(lang, "Немає користувацьких змінних оточення.", "Нет пользовательских переменных окружения.", "No custom environment variables.")}
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
          <div className="inst-footer-info">
            {activeTab === "mods" && <span>{tr(lang, "Всього модів:", "Всего модов:", "Total mods:")} {mods.length} ({tr(lang, "Увімкнено:", "Включено:", "Enabled:")} {mods.filter((m) => m.enabled).length})</span>}
            {activeTab === "resourcepacks" && <span>{tr(lang, "Всього ресурс-паків:", "Всего ресурс-паков:", "Total resource packs:")} {resourcePacks.length}</span>}
            {activeTab === "shaders" && <span>{tr(lang, "Всього шейдерів:", "Всего шейдеров:", "Total shaders:")} {shaders.length}</span>}
            {activeTab === "worlds" && <span>{tr(lang, "Всього світів:", "Всего миров:", "Total worlds:")} {worlds.length}</span>}
          </div>
          <div className="inst-footer-actions">
            {activeTab === "settings" && (
              <button type="button" className="inst-footer-btn-save" onClick={handleSaveConfig}>
                <Check size={14} />
                <span>{tr(lang, "Зберегти параметри", "Сохранить параметры", "Save Settings")}</span>
              </button>
            )}
            <button type="button" className="inst-footer-btn-close" onClick={onClose}>
              {tr(lang, "Закрити", "Закрыть", "Close")}
            </button>
          </div>
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
                <span>{tr(lang, "Завантаження модів", "Скачивание модов", "Download Mods")}</span>
              </div>
            )}
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                alert(`${tr(lang, "Перевірка оновлень для", "Проверка обновлений для", "Checking updates for")} ${contextMenu.item.name}... ${tr(lang, "Всі моди актуальні!", "Все моды актуальны!", "All mods are up to date!")}`);
              }}
            >
              <span>{tr(lang, "Перевірити оновлення", "Проверить обновления", "Check for updates")}</span>
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
              <span>{tr(lang, "Змінити версію", "Изменить версию", "Change Version")}</span>
            </div>
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                handleAddModFile();
              }}
            >
              <span>{tr(lang, "Додати файл", "Добавить файл", "Add File")}</span>
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
              <span>{tr(lang, "Видалити", "Удалить", "Delete")}</span>
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
                <span style={{ color: "#4ade80" }}>{tr(lang, "Увімкнути", "Включить", "Enable")}</span>
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
                <span style={{ color: "#f87171" }}>{tr(lang, "Вимкнути", "Отключить", "Disable")}</span>
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
                <span>{tr(lang, "Відкрити домашню сторінку", "Открыть домашнюю страницу", "Open home page")}</span>
              </div>
            )}
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                const list = mods.map((m) => `${m.name} (${m.filename})`).join("\n");
                navigator.clipboard.writeText(list);
                alert(tr(lang, "Список модів скопійовано в буфер обміну!", "Список модов скопирован в буфер обмена!", "Mod list copied to clipboard!"));
              }}
            >
              <span>{tr(lang, "Експортувати список", "Экспортировать список", "Export list")}</span>
            </div>
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                void ipc.openInstanceSubfolder(instance.id, "mods");
              }}
            >
              <span>{tr(lang, "Відкрити папку", "Открыть папку", "Open Folder")}</span>
            </div>
            <div
              className="inst-ctx-item"
              onClick={() => {
                setContextMenu(null);
                void ipc.openInstanceSubfolder(instance.id, "config");
              }}
            >
              <span>{tr(lang, "Відкрити конфігурації", "Открыть конфигурации", "Open configs")}</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
