import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { IsometricCube } from "../icons/IsometricCube";
import {
  InstanceAvatarIcon,
  INSTANCE_AVATAR_OPTIONS,
  type InstanceAvatarVariant,
} from "../icons/MinecraftIcons";
import { FolderPlus, Settings2, Trash2, Check, Folder, Edit3, ChevronDown, Plus } from "lucide-react";
import type { InstanceData, InstanceFolder } from "../../types";
import { ipc } from "../../services/ipc";
import { useVersions, FALLBACK_UI_VERSIONS } from "../../hooks/useVersions";
import { useLanguage } from "../../context/LanguageContext";
import { ImportModal } from "../modals/ImportModal";
import { InstanceEditorModal } from "../modals/InstanceEditorModal";
import "../../styles/screens.css";
import "../../design-system/pixelPlates.css";

interface InstancesScreenProps {
  onBack: () => void;
  instances: InstanceData[];
  selectedInstanceId: string;
  onSelectInstance: (instance: InstanceData) => void;
  onCreateInstance: (instance: InstanceData) => void;
  onDeleteInstance?: (id: string) => void;
  onUpdateInstance?: (instance: InstanceData) => void;
  onLaunchInstance: (instance: InstanceData) => void;
  onOpenCatalog?: () => void;
}

const DEFAULT_FOLDERS: InstanceFolder[] = [
  { id: "all", name: "Все версии", icon: "grass", iconType: "cube", cubeVariant: "grass", isSystem: true },
  { id: "folder_rust", name: "Rust (beta)", icon: "rust", iconType: "cube", cubeVariant: "rust" },
  { id: "folder_modpacks", name: "Сборки", icon: "stone", iconType: "cube", cubeVariant: "stone" },
  { id: "folder_survival", name: "Выживание", icon: "grass", iconType: "cube", cubeVariant: "grass" },
  { id: "folder_pvp", name: "PvP", icon: "diamond", iconType: "cube", cubeVariant: "diamond" },
  { id: "folder_vanilla", name: "Ванилла", icon: "obsidian", iconType: "cube", cubeVariant: "obsidian" },
];

const PRESET_FOLDER_ICONS = [
  { id: "rust", label: "Rust (Beta)", type: "cube" as const, cubeVariant: "rust" as const },
  { id: "grass", label: "Трава", type: "cube" as const, cubeVariant: "grass" as const },
  { id: "stone", label: "Камень", type: "cube" as const, cubeVariant: "stone" as const },
  { id: "diamond", label: "Алмаз", type: "cube" as const, cubeVariant: "diamond" as const },
  { id: "obsidian", label: "Обсидиан", type: "cube" as const, cubeVariant: "obsidian" as const },
  { id: "tnt", label: "ТНТ", type: "cube" as const, cubeVariant: "tnt" as const },
];

const formatVersionCount = (count: number) => {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} версия`;
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return `${count} версии`;
  return `${count} версий`;
};

const AVAILABLE_LOADERS: Array<{ id: InstanceData["loader"]; label: string; isRust?: boolean }> = [
  { id: "Rust", label: "Rust (Beta)", isRust: true },
  { id: "Fabric", label: "Fabric" },
  { id: "Forge", label: "Forge" },
  { id: "NeoForge", label: "NeoForge" },
  { id: "Vanilla", label: "Vanilla" },
  { id: "Quilt", label: "Quilt" },
];

const getFolderColor = (folder: InstanceFolder) => {
  if (folder.id === "all") return "#a3a3a3";
  if (folder.id === "folder_rust" || folder.name.toLowerCase().includes("rust")) return "#f97316";
  if (
    folder.id === "folder_modpacks" ||
    folder.name.toLowerCase().includes("сборк") ||
    folder.name.toLowerCase().includes("модпак")
  )
    return "#9ca3af";
  if (folder.id === "folder_survival" || folder.name.toLowerCase().includes("выживание")) return "#84cc16";
  if (folder.id === "folder_pvp" || folder.name.toLowerCase().includes("pvp")) return "#22d3ee";
  if (folder.id === "folder_vanilla" || folder.name.toLowerCase().includes("ванил")) return "#4b3a6b";
  return "#9ca3af";
};

const getLoaderTagClass = (loader?: string) => {
  if (!loader) return "";
  const l = loader.toLowerCase();
  if (l.includes("rust")) return "rust";
  if (l.includes("fabric")) return "fabric";
  if (l.includes("neoforge")) return "neoforge";
  if (l.includes("forge")) return "forge";
  return "";
};

const AVATAR_PRESETS: Array<{ id: InstanceAvatarVariant; label: string; fullName: string }> = [
  { id: "diamond_sword", label: "Меч", fullName: "Алмазный меч" },
  { id: "diamond_pickaxe", label: "Кирка", fullName: "Алмазная кирка" },
  { id: "obsidian", label: "Обсидиан", fullName: "Обсидиан" },
  { id: "end_crystal", label: "Кристалл", fullName: "Кристалл Энда" },
  { id: "totem_of_undying", label: "Тотем", fullName: "Тотем бессмертия" },
  { id: "golden_apple", label: "Яблоко", fullName: "Золотое яблоко" },
  { id: "ender_pearl", label: "Жемчуг", fullName: "Жемчуг Энда" },
  { id: "tnt", label: "ТНТ", fullName: "Динамит (TNT)" },
  { id: "netherite_sword", label: "Незерит", fullName: "Незеритовый меч" },
];

const LOADER_OPTIONS: Array<{ id: InstanceData["loader"]; label: string; colorClass: string }> = [
  { id: "Rust", label: "Rust (Beta)", colorClass: "c0" },
  { id: "Fabric", label: "Fabric", colorClass: "c1" },
  { id: "Forge", label: "Forge", colorClass: "c2" },
  { id: "NeoForge", label: "NeoForge", colorClass: "c3" },
  { id: "Vanilla", label: "Vanilla", colorClass: "c4" },
  { id: "Quilt", label: "Quilt", colorClass: "c5" },
];

export const InstancesScreen: React.FC<InstancesScreenProps> = ({
  onBack,
  instances,
  selectedInstanceId,
  onSelectInstance,
  onCreateInstance,
  onDeleteInstance,
  onUpdateInstance,
  onLaunchInstance,
  onOpenCatalog,
}) => {
  const { t, lang } = useLanguage();
  const [editingInstance, setEditingInstance] = useState<InstanceData | null>(null);

  const getDisplayFolderName = (folder: InstanceFolder) => {
    if (folder.id === "all") return t("foldersAll", "Всі версії");
    if (folder.id === "folder_modpacks") return t("foldersModpacks", "Збірки");
    if (folder.id === "folder_survival") return t("foldersSurvival", "Виживання");
    if (folder.id === "folder_pvp") return t("foldersPvP", "PvP");
    if (folder.id === "folder_vanilla") return t("foldersVanilla", "Ваніла");
    return folder.name;
  };
  const [folders, setFolders] = useState<InstanceFolder[]>(() => {
    try {
      const saved = localStorage.getItem("omega_instance_folders");
      if (saved) {
        const parsed: InstanceFolder[] = JSON.parse(saved);
        if (!parsed.some((f) => f.id === "folder_rust")) {
          const allIdx = parsed.findIndex((f) => f.id === "all");
          const rustFolder: InstanceFolder = {
            id: "folder_rust",
            name: "Rust (beta)",
            icon: "rust",
            iconType: "cube",
            cubeVariant: "rust",
          };
          if (allIdx !== -1) {
            parsed.splice(allIdx + 1, 0, rustFolder);
          } else {
            parsed.unshift(rustFolder);
          }
        }
        return parsed;
      }
      return DEFAULT_FOLDERS;
    } catch {
      return DEFAULT_FOLDERS;
    }
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");

  useEffect(() => {
    try {
      localStorage.setItem("omega_instance_folders", JSON.stringify(folders));
    } catch {}
  }, [folders]);

  const [editingFolder, setEditingFolder] = useState<InstanceFolder | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [folderNameInput, setFolderNameInput] = useState<string>("");
  const [folderIconType, setFolderIconType] = useState<"cube" | "emoji" | "image">("cube");
  const [folderCubeVariant, setFolderCubeVariant] = useState<"grass" | "stone" | "obsidian" | "tnt" | "diamond" | "rust">("rust");
  const [folderEmojiIcon, setFolderEmojiIcon] = useState<string>("grass");
  const [folderCustomImageUrl, setFolderCustomImageUrl] = useState<string>("");

  const [isCreating, setIsCreating] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("modal") === "create";
    } catch {
      return false;
    }
  });
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVersion, setNewVersion] = useState("1.21.4");
  const [newLoader, setNewLoader] = useState<InstanceData["loader"]>("Fabric");
  const [newInstanceFolder, setNewInstanceFolder] = useState<string>("folder_survival");
  const [newRamGb, setNewRamGb] = useState<number>(4);
  const [newIcon, setNewIcon] = useState<InstanceAvatarVariant | "custom">("diamond_sword");
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [versionSearchQuery, setVersionSearchQuery] = useState<string>("");
  const [versionCategory, setVersionCategory] = useState<"popular" | "releases" | "snapshots" | "legacy">("popular");
  const [versionDisplayLimit, setVersionDisplayLimit] = useState<number>(60);
  const {
    allVersions,
    popularVersions,
    releasesCount,
    snapshotsCount,
    betaAlphaCount,
    latestRelease,
  } = useVersions();

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomAvatarUrl(reader.result);
        setNewIcon("custom");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  useEffect(() => {
    const isAnyModalOpen = isCreating || isImporting || isCreatingFolder || !!editingFolder;
    if (isAnyModalOpen) {
      document.body.classList.add("modal-open-hide-hud");
    } else {
      document.body.classList.remove("modal-open-hide-hud");
    }
    return () => {
      document.body.classList.remove("modal-open-hide-hud");
    };
  }, [isCreating, isImporting, isCreatingFolder, editingFolder]);

  const handleSelectLoader = (loaderId: InstanceData["loader"]) => {
    setNewLoader(loaderId);
    if (loaderId === "Rust") {
      setNewVersion("26.3");
      setNewInstanceFolder("folder_rust");
      setNewIcon("obsidian");
      if (!newName.trim() || newName === "Мой клиент 1.21" || newName === "Моя сборка 1.21" || newName === "Моя версия 1.21") {
        setNewName("Minecraft Rust");
      }
    } else {
      if (newVersion === "26.3") {
        setNewVersion("1.21.4");
      }
      if (newInstanceFolder === "folder_rust") {
        setNewInstanceFolder("folder_survival");
      }
      if (newName === "Minecraft Rust" || newName === "Minecraft Rust (Beta)") {
        setNewName("Моя версия 1.21");
      }
    }
  };

  const currentInstance =
    instances.find((i) => i.id === selectedInstanceId) || instances[0];

  const handleOpenFolderEdit = (folder: InstanceFolder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingFolder(folder);
    setFolderNameInput(folder.name);
    setFolderIconType(folder.iconType || "cube");
    setFolderCubeVariant(folder.cubeVariant || "grass");
    setFolderEmojiIcon(folder.icon || "grass");
    setFolderCustomImageUrl(folder.iconType === "image" ? folder.icon : "");
  };

  const handleSaveFolderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !folderNameInput.trim()) return;

    let finalIcon = folderEmojiIcon;
    if (folderIconType === "image" && folderCustomImageUrl.trim()) {
      finalIcon = folderCustomImageUrl.trim();
    }

    setFolders((prev) =>
      prev.map((f) =>
        f.id === editingFolder.id
          ? {
              ...f,
              name: folderNameInput.trim(),
              icon: finalIcon,
              iconType: folderIconType,
              cubeVariant: folderCubeVariant,
            }
          : f
      )
    );
    setEditingFolder(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    instances.forEach((inst) => {
      if (inst.folderId === folderId && onUpdateInstance) {
        onUpdateInstance({ ...inst, folderId: undefined });
      }
    });
    if (selectedFolderId === folderId) {
      setSelectedFolderId("all");
    }
    setEditingFolder(null);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;

    let finalIcon = folderEmojiIcon;
    if (folderIconType === "image" && folderCustomImageUrl.trim()) {
      finalIcon = folderCustomImageUrl.trim();
    }

    const newFolder: InstanceFolder = {
      id: "folder_" + Date.now(),
      name: folderNameInput.trim(),
      icon: finalIcon,
      iconType: folderIconType,
      cubeVariant: folderCubeVariant,
    };

    setFolders((prev) => [...prev, newFolder]);
    setSelectedFolderId(newFolder.id);
    setIsCreatingFolder(false);
    setFolderNameInput("");
  };

  const handleCreateSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const finalName = newName.trim() || (newLoader === "Rust" ? "Minecraft Rust" : "Моя версия 1.21");

    const created: InstanceData = {
      id: "inst_" + Date.now(),
      name: finalName,
      mcVersion: newLoader === "Rust" ? "26.3" : newVersion,
      loader: newLoader,
      playTimeMinutes: 0,
      modCount: 0,
      isReady: true,
      folderId: newInstanceFolder === "all" ? undefined : newInstanceFolder,
      ramGb: newRamGb || 4,
      icon: newIcon === "custom" && customAvatarUrl ? customAvatarUrl : (newIcon as InstanceAvatarVariant),
    };

    onCreateInstance(created);
    setIsCreating(false);
    setNewName("Моя версия 1.21");
  };

  const filteredInstances = instances.filter((inst) => {
    if (selectedFolderId === "all") return true;
    return inst.folderId === selectedFolderId;
  });

  const filteredVersions = useMemo(() => {
    const list = allVersions.length > 0 ? allVersions : FALLBACK_UI_VERSIONS;
    const query = versionSearchQuery.trim().toLowerCase();

    if (query) {
      return list.filter(
        (v) =>
          v.version.toLowerCase().includes(query) ||
          v.tag.toLowerCase().includes(query)
      );
    }

    if (versionCategory === "popular") {
      return popularVersions.length > 0 ? popularVersions : list.slice(0, 15);
    }
    if (versionCategory === "snapshots") {
      return list.filter((v) => v.isSnapshot || v.type === "snapshot");
    }
    if (versionCategory === "legacy") {
      return list.filter((v) => v.type === "old_beta" || v.type === "old_alpha");
    }
    return list.filter((v) => !v.isSnapshot && v.type === "release");
  }, [allVersions, popularVersions, versionCategory, versionSearchQuery]);

  const visibleVersions = useMemo(() => {
    return filteredVersions.slice(0, versionDisplayLimit);
  }, [filteredVersions, versionDisplayLimit]);

  useEffect(() => {
    setVersionDisplayLimit(60);
  }, [versionSearchQuery, versionCategory]);

  const activeFolder = folders.find((f) => f.id === selectedFolderId);

  const renderInstanceIcon = (inst: InstanceData, isHero = false) => {
    if (inst.icon) {
      return <InstanceAvatarIcon icon={inst.icon} size={isHero ? 42 : 24} />;
    }
    const letter = (inst.name || "M").charAt(0).toUpperCase();
    return <span>{letter}</span>;
  };

  return (
    <div className="screens-overlay-layer instances-screen-overlay">
      <div className="instances-screen-wrap">
        <div className="instances-top-bar">
          <button
            type="button"
            className="sb-btn"
            onClick={() => setIsImporting(true)}
            title={lang === "uk" ? "Імпортувати версію з архіву (.zip, .mrpack)" : lang === "ru" ? "Импортировать версию из архива (.zip, .mrpack)" : "Import version from archive (.zip, .mrpack)"}
          >
            {lang === "uk" ? "Імпорт" : lang === "ru" ? "Импорт" : "Import"}
          </button>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="sb-btn sb-btn-go"
              onClick={() => setIsCreateMenuOpen((prev) => !prev)}
              title={lang === "uk" ? "Створити версію або папку" : lang === "ru" ? "Создать версию или папку" : "Create version or folder"}
            >
              {lang === "uk" ? "+ Створити" : lang === "ru" ? "+ Создать" : "+ Create"}
              <ChevronDown
                size={14}
                style={{
                  transform: isCreateMenuOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s ease",
                }}
              />
            </button>

            {isCreateMenuOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 99 }}
                  onClick={() => setIsCreateMenuOpen(false)}
                />
                <div className="sb-create-dropdown">
                  <button
                    type="button"
                    className="sb-create-item"
                    onClick={() => {
                      const isRust = selectedFolderId === "folder_rust";
                      setNewLoader(isRust ? "Rust" : "Fabric");
                      setNewVersion(isRust ? "26.3" : "1.21.4");
                      setNewName(isRust ? "Minecraft Rust" : (lang === "uk" ? "Моя версія 1.21" : lang === "ru" ? "Моя версия 1.21" : "My Version 1.21"));
                      setNewInstanceFolder(selectedFolderId === "all" ? "folder_survival" : selectedFolderId);
                      setNewRamGb(4);
                      setVersionSearchQuery("");
                      setVersionCategory("popular");
                      setIsCreating(true);
                      setIsCreateMenuOpen(false);
                    }}
                  >
                    <IsometricCube size={18} variant="grass" />
                    <div>
                      <div style={{ color: "#fff", fontSize: "12.5px" }}>
                        {lang === "uk" ? "Створити версію" : lang === "ru" ? "Создать версию" : "Create Version"}
                      </div>
                      <div style={{ color: "#8b919c", fontSize: "11px", fontWeight: 500 }}>
                        {lang === "uk" ? "Нова версія Minecraft" : lang === "ru" ? "Новая версия Minecraft" : "New Minecraft version"}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="sb-create-item"
                    onClick={() => {
                      setFolderNameInput("");
                      setFolderIconType("cube");
                      setFolderCubeVariant("stone");
                      setIsCreatingFolder(true);
                      setIsCreateMenuOpen(false);
                    }}
                  >
                    <FolderPlus size={18} color="#60a5fa" />
                    <div>
                      <div style={{ color: "#fff", fontSize: "12.5px" }}>
                        {lang === "uk" ? "Створити папку" : lang === "ru" ? "Создать папку" : "Create Folder"}
                      </div>
                      <div style={{ color: "#8b919c", fontSize: "11px", fontWeight: 500 }}>
                        {lang === "uk" ? "Нова категорія для версій" : lang === "ru" ? "Новая категория для версий" : "New category for versions"}
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {currentInstance ? (
          <div className="sb-hero">
            <div className="sb-ico">
              {renderInstanceIcon(currentInstance, true)}
            </div>

            <div className="sb-hero-info">
              <div className="sb-hero-title">
                <h1>{currentInstance.name}</h1>
                <span className="sb-st">ГОТОВА К ИГРЕ</span>
              </div>

              <div className="sb-meta">
                <span className={`sb-tag ${getLoaderTagClass(currentInstance.loader)}`}>
                  {currentInstance.loader?.toUpperCase() || "FABRIC"}
                </span>
                <span className="sb-tag">{currentInstance.mcVersion}</span>
                <span>{currentInstance.modCount} модов</span>
                <span>{currentInstance.playTimeMinutes} мин в игре</span>
                {onUpdateInstance && (
                  <span className="sb-folder-select-wrap">
                    <span className="sb-folder-label">Папка:</span>
                    <div className="sb-folder-dropdown-container">
                      <button
                        type="button"
                        className={`sb-folder-btn ${isFolderMenuOpen ? "open" : ""}`}
                        onClick={() => setIsFolderMenuOpen((prev) => !prev)}
                        title="Выбрать папку"
                      >
                        <span className="sb-folder-name">
                          {currentInstance.folderId
                            ? folders.find((f) => f.id === currentInstance.folderId)?.name || "Без папки"
                            : "Без папки"}
                        </span>
                        <ChevronDown size={12} className="sb-folder-chevron" />
                      </button>

                      {isFolderMenuOpen && (
                        <>
                          <div
                            className="sb-folder-backdrop"
                            onClick={() => setIsFolderMenuOpen(false)}
                          />
                          <div className="sb-folder-menu">
                            <button
                              type="button"
                              className={`sb-folder-item ${!currentInstance.folderId || currentInstance.folderId === "all" ? "active" : ""}`}
                              onClick={() => {
                                onUpdateInstance({
                                  ...currentInstance,
                                  folderId: undefined,
                                });
                                setIsFolderMenuOpen(false);
                              }}
                            >
                              <span>Без папки</span>
                              {(!currentInstance.folderId || currentInstance.folderId === "all") && (
                                <Check size={13} className="sb-folder-check" />
                              )}
                            </button>
                            {folders
                              .filter((f) => !f.isSystem)
                              .map((f) => {
                                const isSelected = currentInstance.folderId === f.id;
                                return (
                                  <button
                                    key={f.id}
                                    type="button"
                                    className={`sb-folder-item ${isSelected ? "active" : ""}`}
                                    onClick={() => {
                                      onUpdateInstance({
                                        ...currentInstance,
                                        folderId: f.id,
                                      });
                                      setIsFolderMenuOpen(false);
                                    }}
                                  >
                                    <span>{f.name}</span>
                                    {isSelected && <Check size={13} className="sb-folder-check" />}
                                  </button>
                                );
                              })}
                          </div>
                        </>
                      )}
                    </div>
                  </span>
                )}
              </div>
            </div>

            <div className="sb-hero-acts">
              <button
                type="button"
                className="sb-btn"
                title={lang === "uk" ? "Відкрити директорію версії у файловому менеджері" : lang === "ru" ? "Открыть директорию версии в файловом менеджере" : "Open version directory"}
                onClick={() => void ipc.openFolder(currentInstance.id)}
              >
                {lang === "uk" ? "Тека" : lang === "ru" ? "Папка" : "Folder"}
              </button>
              <button
                type="button"
                className="sb-btn sb-btn-edit"
                title={lang === "uk" ? "Змінити збірку (моди, ресурспаки, шейдери, параметри)" : lang === "ru" ? "Изменить сборку (моды, ресурспаки, шейдеры, параметры)" : "Edit instance (mods, packs, settings)"}
                onClick={() => setEditingInstance(currentInstance)}
              >
                {lang === "uk" ? "Змінити" : lang === "ru" ? "Изменить" : "Edit"}
              </button>
              <button
                type="button"
                className="sb-btn sb-btn-go"
                onClick={() => {
                  onLaunchInstance(currentInstance);
                  onBack();
                }}
              >
                {lang === "uk" ? "Грати зараз" : lang === "ru" ? "Играть сейчас" : "Play now"}
              </button>
            </div>
          </div>
        ) : (
          <div className="sb-hero">
            <div className="sb-hero-info">
              <h1 style={{ margin: 0, fontSize: "20px", color: "#8b919c" }}>
                {lang === "uk" ? "Версію не обрано" : lang === "ru" ? "Версия не выбрана" : "No version selected"}
              </h1>
            </div>
          </div>
        )}

        <div>
          <div className="sb-section-head">
            {lang === "uk" ? "Папки версій" : lang === "ru" ? "Папки версий" : "Version Folders"} ({folders.length})
          </div>

          <div className="sb-dock">
            {folders.map((folder) => {
              const isActive = selectedFolderId === folder.id;
              const count =
                folder.id === "all"
                  ? instances.length
                  : instances.filter((i) => i.folderId === folder.id).length;
              const dotColor = getFolderColor(folder);
              const displayName = getDisplayFolderName(folder);

              return (
                <button
                  key={folder.id}
                  type="button"
                  className={`sb-folder-btn ${isActive ? "on" : ""}`}
                  onClick={() => setSelectedFolderId(folder.id)}
                  onContextMenu={(e) => {
                    if (!folder.isSystem) {
                      e.preventDefault();
                      handleOpenFolderEdit(folder);
                    }
                  }}
                  title={
                    folder.isSystem
                      ? (lang === "uk" ? "Показати всі версії" : lang === "ru" ? "Показать все версии" : "Show all versions")
                      : `${lang === "uk" ? "Папка" : lang === "ru" ? "Папка" : "Folder"}: ${displayName}`
                  }
                >
                  <i style={{ background: dotColor }} />
                  <span>{displayName}</span>
                  <em>({count})</em>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="sb-section-head">
            {lang === "uk" ? "Доступні версії" : lang === "ru" ? "Доступные версии" : "Available Versions"} ({filteredInstances.length})
          </div>

          {filteredInstances.length === 0 ? (
            <div className="sb-empty">
              {lang === "uk" ? "У цій папці поки немає версій" : lang === "ru" ? "В этой папке пока нет версий" : "No versions in this folder yet"}
            </div>
          ) : (
            <div className="sb-grid">
              {filteredInstances.map((inst) => {
                const isActive = inst.id === selectedInstanceId;

                return (
                  <div
                    key={inst.id}
                    className={`sb-card ${isActive ? "act" : ""}`}
                    onClick={() => onSelectInstance(inst)}
                  >
                    <div className="sb-ch">
                      <div className="sb-ico">
                        {renderInstanceIcon(inst, false)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="sb-cn" title={inst.name}>
                          {inst.name}
                        </div>
                        <div className="sb-cm">
                          {inst.modCount} {lang === "uk" ? "модів" : lang === "ru" ? "модов" : "mods"}
                        </div>
                      </div>
                    </div>

                    <div className="sb-tags">
                      <span className={`sb-tag ${getLoaderTagClass(inst.loader)}`}>
                        {inst.loader?.toUpperCase() || "FABRIC"}
                      </span>
                      <span className="sb-tag">{inst.mcVersion}</span>
                    </div>

                    <div
                      className="sb-cb"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className={`sb-btn ${isActive ? "sb-btn-go" : ""}`}
                        onClick={() => {
                          if (isActive) {
                            onLaunchInstance(inst);
                            onBack();
                          } else {
                            onSelectInstance(inst);
                          }
                        }}
                      >
                        {isActive
                          ? (lang === "uk" ? "Грати" : lang === "ru" ? "Играть" : "Play")
                          : (lang === "uk" ? "Обрати" : lang === "ru" ? "Выбрать" : "Select")}
                      </button>

                      <button
                        type="button"
                        className="sb-btn"
                        title={lang === "uk" ? "Відкрити директорію версії у файловому менеджері" : lang === "ru" ? "Открыть директорию версии в файловом менеджере" : "Open version directory"}
                        onClick={() => void ipc.openFolder(inst.id)}
                      >
                        {lang === "uk" ? "Тека" : lang === "ru" ? "Папка" : "Folder"}
                      </button>

                      <button
                        type="button"
                        className="sb-btn sb-btn-edit"
                        title={lang === "uk" ? "Змінити збірку (моди, ресурспаки, шейдери, параметри)" : lang === "ru" ? "Изменить сборку (моды, ресурспаки, шейдеры, параметры)" : "Edit instance (mods, packs, settings)"}
                        onClick={() => setEditingInstance(inst)}
                      >
                        {lang === "uk" ? "Змінити" : lang === "ru" ? "Изменить" : "Edit"}
                      </button>

                      <button
                        type="button"
                        className="sb-btn"
                        title={lang === "uk" ? "Створити ярлик версії на робочому столі" : lang === "ru" ? "Создать ярлык версии на рабочем столе" : "Create shortcut on desktop"}
                        onClick={() => void ipc.createShortcut(inst.id)}
                      >
                        {lang === "uk" ? "Ярлик" : lang === "ru" ? "Ярлык" : "Shortcut"}
                      </button>

                      {instances.length > 1 && onDeleteInstance && (
                        <button
                          type="button"
                          className="sb-btn sb-btn-del"
                          onClick={() => {
                            if (confirm(`${lang === "uk" ? "Видалити версію" : lang === "ru" ? "Удалить версию" : "Delete version"} "${inst.name}"?`)) {
                              onDeleteInstance(inst.id);
                            }
                          }}
                        >
                          {lang === "uk" ? "Видалити" : lang === "ru" ? "Удалить" : "Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isCreating &&
        createPortal(
          <div
            className="nc-backdrop"
            onClick={() => setIsCreating(false)}
          >
            <form
              className="nc-modal"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleCreateSubmit}
            >
              <div className="nc-head">
                <div className="nc-ico">
                  {newIcon === "custom" && customAvatarUrl ? (
                    <img src={customAvatarUrl} alt="Avatar" />
                  ) : (
                    <InstanceAvatarIcon icon={newIcon} size={24} />
                  )}
                </div>
                <h1 className="nc-title">Новая версия</h1>
                <button
                  type="button"
                  className="nc-close"
                  aria-label="Закрыть"
                  onClick={() => setIsCreating(false)}
                >
                  ×
                </button>
              </div>

              <div className="nc-body">
                <div className="nc-lab">
                  <span>Название</span>
                </div>
                <input
                  type="text"
                  className="nc-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Моя версия 1.21"
                />

                <div className="nc-lab">
                  <span>Аватарка версии</span>
                  <b>
                    {newIcon === "custom"
                      ? "Своя картинка"
                      : AVATAR_PRESETS.find((p) => p.id === newIcon)?.fullName || "Алмазный меч"}
                  </b>
                </div>
                <div className="nc-grid nc-g5">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`nc-opt nc-av ${newIcon === preset.id ? "on" : ""}`}
                      onClick={() => setNewIcon(preset.id)}
                    >
                      <InstanceAvatarIcon icon={preset.id} size={22} />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`nc-opt nc-av nc-up ${newIcon === "custom" ? "on" : ""}`}
                    onClick={() => {
                      if (customAvatarUrl && newIcon !== "custom") {
                        setNewIcon("custom");
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    {customAvatarUrl ? (
                      <img src={customAvatarUrl} alt="Своя" />
                    ) : (
                      <Plus size={22} />
                    )}
                    <span>Своя</span>
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleCustomAvatarUpload}
                />

                <div className="nc-lab">
                  <span>Загрузчик</span>
                  <b>{LOADER_OPTIONS.find((l) => l.id === newLoader)?.label || newLoader}</b>
                </div>
                <div className="nc-grid nc-g3">
                  {LOADER_OPTIONS.map((ld) => (
                    <button
                      key={ld.id}
                      type="button"
                      className={`nc-opt nc-ld ${ld.colorClass} ${newLoader === ld.id ? "on" : ""}`}
                      onClick={() => handleSelectLoader(ld.id)}
                    >
                      {ld.label}
                    </button>
                  ))}
                </div>

                <div className="nc-lab" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Версия игры</span>
                  <b>{newLoader === "Rust" ? "26.3" : newVersion}</b>
                  <span className="nc-versions-count">
                    {filteredVersions.length}{" "}
                    {versionCategory === "snapshots"
                      ? "снапшотов"
                      : versionCategory === "popular"
                      ? "популярных"
                      : versionCategory === "legacy"
                      ? "старых версий"
                      : "релизов"}
                  </span>
                </div>

                {newLoader !== "Rust" && (
                  <div className="nc-vtabs">
                    <button
                      type="button"
                      className={`nc-vtab ${versionCategory === "popular" ? "active" : ""}`}
                      onClick={() => setVersionCategory("popular")}
                    >
                      ⭐ Популярные (1.8, 1.7.10...)
                    </button>
                    <button
                      type="button"
                      className={`nc-vtab ${versionCategory === "releases" ? "active" : ""}`}
                      onClick={() => setVersionCategory("releases")}
                    >
                      Все релизы ({releasesCount})
                    </button>
                    <button
                      type="button"
                      className={`nc-vtab ${versionCategory === "snapshots" ? "active" : ""}`}
                      onClick={() => setVersionCategory("snapshots")}
                    >
                      Снапшоты ({snapshotsCount})
                    </button>
                    <button
                      type="button"
                      className={`nc-vtab ${versionCategory === "legacy" ? "active" : ""}`}
                      onClick={() => setVersionCategory("legacy")}
                    >
                      Beta / Alpha ({betaAlphaCount})
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  className="nc-input"
                  placeholder="Поиск версии (например: 1.8, 1.7.10, 1.20, snapshot, 25w...)"
                  value={versionSearchQuery}
                  onChange={(e) => setVersionSearchQuery(e.target.value)}
                />
                <div className="nc-list">
                  {newLoader === "Rust" ? (
                    <button
                      type="button"
                      className="nc-v on"
                      onClick={() => setNewVersion("26.3")}
                    >
                      <span>26.3</span>
                      <small className="nc-tag-badge tag-rust">RUST CLIENT</small>
                    </button>
                  ) : filteredVersions.length === 0 ? (
                    <div className="nc-none">Ничего не найдено</div>
                  ) : (
                    <>
                      {visibleVersions.map((v) => {
                        const isLatest = v.tag.includes("ПОСЛЕДНИЙ");
                        const isNewSnap = v.tag.includes("НОВЫЙ");
                        const isPvp = v.tag.includes("PVP");
                        const isMods = v.tag.includes("МОДОВ");
                        const isClassic = v.tag.includes("КЛАССИКА") || v.tag.includes("LEGACY");
                        return (
                          <button
                            key={v.version}
                            type="button"
                            className={`nc-v ${newVersion === v.version ? "on" : ""}`}
                            onClick={() => setNewVersion(v.version)}
                          >
                            <span>{v.version}</span>
                            <small
                              className={`nc-tag-badge tag-${v.type} ${
                                isLatest ? "tag-latest" : ""
                              } ${isNewSnap ? "tag-new-snap" : ""} ${
                                isPvp ? "tag-pvp" : ""
                              } ${isMods ? "tag-mods" : ""} ${
                                isClassic ? "tag-classic" : ""
                              }`}
                            >
                              {v.tag}
                            </small>
                          </button>
                        );
                      })}
                      {filteredVersions.length > versionDisplayLimit && (
                        <button
                          type="button"
                          className="nc-load-more-btn"
                          onClick={() => setVersionDisplayLimit((prev) => prev + 60)}
                        >
                          Показать ещё ({filteredVersions.length - versionDisplayLimit} осталось)...
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="nc-lab">
                  <span>Папка</span>
                  <b>
                    {newInstanceFolder === "all"
                      ? "Все версии"
                      : folders.find((f) => f.id === newInstanceFolder)?.name || newInstanceFolder}
                  </b>
                </div>
                <div className="nc-chips">
                  <button
                    type="button"
                    className={`nc-opt ${newInstanceFolder === "all" ? "on" : ""}`}
                    onClick={() => setNewInstanceFolder("all")}
                  >
                    Все версии
                  </button>
                  {folders.map((f) => {
                    if (f.id === "all") return null;
                    const isRust = f.id === "folder_rust" || f.name.toLowerCase().includes("rust");
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className={`nc-opt ${newInstanceFolder === f.id ? "on" : ""}`}
                        onClick={() => setNewInstanceFolder(f.id)}
                      >
                        {isRust && <span className="nc-tag">RUST</span>}
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="nc-foot">
                <button
                  type="button"
                  className="nc-btn nc-btn-cancel"
                  onClick={() => setIsCreating(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="nc-btn nc-btn-submit"
                >
                  + Создать
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      <ImportModal
        isOpen={isImporting}
        onClose={() => setIsImporting(false)}
        onImport={onCreateInstance}
        folderId={selectedFolderId}
      />

      {editingFolder &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
            }}
            onClick={() => setEditingFolder(null)}
          >
          <div
            className="tactical-modal-card"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Settings2 size={20} color="var(--accent-bright)" />
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-pure)" }}>
                  Настройки папки
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFolder(null)}
                title="Закрыть"
                className="btn-icon pixel-plate-dark"
                style={{
                  width: "32px",
                  height: "32px",
                  minHeight: "32px",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFolderEdit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Имя папки
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "6px",
                      background: "#080d17",
                      border: "1px solid #2c3b57",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title="Текущая иконка папки"
                  >
                    {folderIconType === "cube" ? (
                      <IsometricCube size={26} variant={folderCubeVariant} />
                    ) : folderIconType === "image" && folderCustomImageUrl ? (
                      <img
                        src={folderCustomImageUrl}
                        alt="icon"
                        style={{ width: "26px", height: "26px", objectFit: "cover", borderRadius: "3px" }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "20px" }}>{folderEmojiIcon}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={folderNameInput}
                    onChange={(e) => setFolderNameInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      background: "#080d17",
                      border: "1px solid #2c3b57",
                      borderRadius: "6px",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      fontFamily: "var(--font-primary)",
                    }}
                    placeholder="Например: PvP Версии"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Картинка / Иконка папки
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", marginBottom: "10px" }}>
                  {PRESET_FOLDER_ICONS.map((preset) => {
                    const isSelected =
                      folderIconType === "cube" && folderCubeVariant === preset.cubeVariant;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setFolderIconType("cube");
                          setFolderCubeVariant(preset.cubeVariant);
                        }}
                        className="pixel-plate-dark"
                        style={{
                          height: "42px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          borderColor: isSelected ? "var(--accent)" : undefined,
                          background: isSelected ? "#16243a" : undefined,
                          borderRadius: "0 8px 0 8px",
                        }}
                        title={preset.label}
                      >
                        <IsometricCube size={20} variant={preset.cubeVariant} />
                      </button>
                    );
                  })}
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Или ссылка на собственную картинку (URL):
                  </span>
                  <input
                    type="url"
                    value={folderCustomImageUrl}
                    onChange={(e) => {
                      setFolderCustomImageUrl(e.target.value);
                      if (e.target.value.trim()) {
                        setFolderIconType("image");
                      }
                    }}
                    placeholder="https://example.com/icon.png"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#080d17",
                      border: "1px solid #2c3b57",
                      borderRadius: "6px",
                      color: "#ffffff",
                      fontSize: "12px",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-delete"
                  style={{ minHeight: "36px", height: "36px", padding: "0 14px" }}
                  onClick={() => {
                    if (confirm(`Удалить папку "${editingFolder.name}"? Все версии из неё останутся в общем списке.`)) {
                      handleDeleteFolder(editingFolder.id);
                    }
                  }}
                >
                  <Trash2 size={14} style={{ marginRight: "6px" }} />
                  Удалить папку
                </button>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="screen-back-btn pixel-plate-dark"
                    style={{ minHeight: "36px", height: "36px" }}
                    onClick={() => setEditingFolder(null)}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="server-connect-btn pixel-plate-play"
                    style={{ minHeight: "36px", height: "36px" }}
                  >
                    <Check size={15} style={{ marginRight: "4px" }} />
                    Сохранить
                  </button>
                </div>
              </div>
            </form>
          </div>
          </div>,
          document.body
        )}

      {isCreatingFolder &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
            }}
            onClick={() => setIsCreatingFolder(false)}
          >
          <div
            className="tactical-modal-card"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FolderPlus size={20} color="var(--accent-bright)" />
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-pure)" }}>
                  Новая папка версий
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                title="Закрыть"
                className="btn-icon pixel-plate-dark"
                style={{
                  width: "32px",
                  height: "32px",
                  minHeight: "32px",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolderSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Имя папки
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "6px",
                      background: "#080d17",
                      border: "1px solid #2c3b57",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title="Выбранная иконка папки"
                  >
                    {folderIconType === "cube" ? (
                      <IsometricCube size={26} variant={folderCubeVariant} />
                    ) : folderIconType === "image" && folderCustomImageUrl ? (
                      <img
                        src={folderCustomImageUrl}
                        alt="icon"
                        style={{ width: "26px", height: "26px", objectFit: "cover", borderRadius: "3px" }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "20px" }}>{folderEmojiIcon}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={folderNameInput}
                    onChange={(e) => setFolderNameInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      background: "#080d17",
                      border: "1px solid #2c3b57",
                      borderRadius: "6px",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      fontFamily: "var(--font-primary)",
                    }}
                    placeholder="Например: Мои хардкор миры"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Выберите картинку или куб
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", marginBottom: "10px" }}>
                  {PRESET_FOLDER_ICONS.map((preset) => {
                    const isSelected =
                      folderIconType === "cube" && folderCubeVariant === preset.cubeVariant;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setFolderIconType("cube");
                          setFolderCubeVariant(preset.cubeVariant);
                        }}
                        className="pixel-plate-dark"
                        style={{
                          height: "42px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          borderColor: isSelected ? "var(--accent)" : undefined,
                          background: isSelected ? "#16243a" : undefined,
                          borderRadius: "0 8px 0 8px",
                        }}
                        title={preset.label}
                      >
                        <IsometricCube size={20} variant={preset.cubeVariant} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="screen-back-btn pixel-plate-dark"
                  style={{ minHeight: "36px", height: "36px" }}
                  onClick={() => setIsCreatingFolder(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="server-connect-btn pixel-plate-play"
                  style={{ minHeight: "36px", height: "36px" }}
                >
                  Создать папку
                </button>
              </div>
            </form>
          </div>
          </div>,
          document.body
        )}

      {editingInstance && (
        <InstanceEditorModal
          isOpen={!!editingInstance}
          onClose={() => setEditingInstance(null)}
          instance={editingInstance}
          onOpenCatalog={() => {
            setEditingInstance(null);
            onSelectInstance(editingInstance);
            if (onOpenCatalog) {
              onOpenCatalog();
            }
          }}
          onUpdateInstance={(updated) => {
            if (onUpdateInstance) {
              onUpdateInstance(updated);
            }
            setEditingInstance(updated);
          }}
        />
      )}
    </div>
  );
};
