import React, { useCallback, useEffect, useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ModpackInstance } from "../../types";
import {
  IconBox,
  IconCheck,
  IconClock,
  IconCopy,
  IconCpu,
  IconDownload,
  IconEdit,
  IconFolder,
  IconGlobe,
  IconPlay,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTrash,
} from "../../ui/icons";
import { EditModal } from "./InstanceModals";
import { IsometricCube } from "./IsometricCube";
import { ipc, type DbModRecord } from "../../services/ipc";

export interface InstanceModalsState {
  editModalOpen: string | null;
  editNameInput: string;
  setEditNameInput: (v: string) => void;
  editVersionInput: string;
  setEditVersionInput: (v: string) => void;
  editLoaderInput: string;
  setEditLoaderInput: (v: string) => void;
}

export interface InstancesPanelProps {
  visibleInstances: ModpackInstance[];
  selectedInstanceId: string | null;
  selectedInstance: ModpackInstance | null;
  modCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  t: any;
  modals: InstanceModalsState;
  onSelectInstance: (id: string) => void;
  onIconChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlay: () => void;
  onOpenFolder: (instanceId: string) => void;
  onEditInstance: (instanceId: string) => void;
  onDeleteInstance: (instanceId: string) => void;
  onSaveEdit: () => void;
  onCloseEdit: () => void;
  onCreate: () => void;
  onDropMod: (
    instanceId: string,
    payload: { projectId: string; projectType: string },
  ) => void;
  installProgress: { step: string; current: number; total: number } | null;
  onOpenCatalog?: () => void;
}

export const InstancesPanel = React.memo(
  ({
    visibleInstances,
    selectedInstanceId,
    selectedInstance,
    modCount,
    fileInputRef,
    t,
    modals,
    onSelectInstance,
    onIconChange,
    onPlay,
    onOpenFolder,
    onEditInstance,
    onDeleteInstance,
    onSaveEdit,
    onCloseEdit,
    onCreate,
    onDropMod,
    installProgress,
    onOpenCatalog,
  }: InstancesPanelProps) => {
    const [subTab, setSubTab] = useState<"mods" | "worlds" | "info">("mods");
    const [searchQuery, setSearchQuery] = useState("");
    const [installedMods, setInstalledMods] = useState<DbModRecord[]>([]);
    const [worlds, setWorlds] = useState<string[]>([]);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [copiedPath, setCopiedPath] = useState(false);

    useEffect(() => {
      setConfirmDelete(false);
    }, [selectedInstanceId]);

    // Load installed mods from DB and worlds whenever selected instance changes
    useEffect(() => {
      let cancelled = false;
      if (!selectedInstance?.id) {
        setInstalledMods([]);
        setWorlds([]);
        return;
      }

      void ipc
        .dbListInstalledMods(selectedInstance.id)
        .then((mods) => {
          if (!cancelled) setInstalledMods(mods || []);
        })
        .catch(() => {
          if (!cancelled) setInstalledMods([]);
        });

      void ipc
        .listWorlds(selectedInstance.id)
        .then((w) => {
          if (!cancelled) setWorlds(w || []);
        })
        .catch(() => {
          if (!cancelled) setWorlds([]);
        });

      return () => {
        cancelled = true;
      };
    }, [selectedInstance?.id]);

    const handleDrop = useCallback(
      (e: React.DragEvent, instanceId: string) => {
        e.preventDefault();
        setDropTarget(null);
        const raw = e.dataTransfer.getData("application/x-omega-mod");
        if (!raw) return;
        try {
          onDropMod(instanceId, JSON.parse(raw));
        } catch {
          // Ignore malformed payloads
        }
      },
      [onDropMod],
    );

    const formatPlayTime = useCallback((ms?: number) => {
      if (!ms || ms <= 0) return "0 мин";
      const totalMin = Math.floor(ms / 60000);
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      if (hours > 0) return `${hours} ч ${mins} мин`;
      return `${mins} мин`;
    }, []);

    const filteredMods = useMemo(() => {
      if (!searchQuery.trim()) return installedMods;
      const q = searchQuery.toLowerCase();
      return installedMods.filter(
        (m) =>
          m.modId.toLowerCase().includes(q) ||
          m.filename.toLowerCase().includes(q) ||
          (m.version && m.version.toLowerCase().includes(q)),
      );
    }, [installedMods, searchQuery]);

    const handleCopyPath = useCallback(async () => {
      if (!selectedInstance) return;
      const path = `instances/${selectedInstance.id}`;
      try {
        await navigator.clipboard.writeText(path);
        setCopiedPath(true);
        setTimeout(() => setCopiedPath(false), 2000);
      } catch {
        // Clipboard write failed
      }
    }, [selectedInstance]);

    return (
      <div className="instances-panel-container">
        {/* Installation Progress Bar */}
        {installProgress && (
          <div className="install-progress-card">
            <div className="install-progress-label">
              <span>
                {installProgress.step === "mods"
                  ? t.installingMods || "Установка модов сборки..."
                  : installProgress.step === "overrides"
                    ? t.applyingConfig || "Применение конфигураций..."
                    : t.installingBuild || "Установка сборки..."}
              </span>
              <span>
                {installProgress.current} / {installProgress.total}
              </span>
            </div>
            <div className="install-progress-bar">
              <div
                style={{
                  width: `${
                    installProgress.total > 0
                      ? Math.min(
                          100,
                          (installProgress.current / installProgress.total) *
                            100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="instances-header">
          <div className="instances-heading">
            <div className="instances-emblem">
              <IsometricCube size={26} variant="emerald" />
            </div>
            <div>
              <h2>{t.myBuilds || "Ваши сборки"}</h2>
              <p>
                {t.myBuildsDesc ||
                  "Управление установленными сборками, модами и мирами"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="instances-create-btn"
            onClick={onCreate}
          >
            <IconPlus size={16} />
            <span>{t.createBuild || "Создать сборку"}</span>
          </button>
        </div>

        {/* Horizontal Assemblies Carousel */}
        <div className="assemblies-horizontal-list">
          {visibleInstances.length === 0 ? (
            <div className="assemblies-empty-list">
              <IsometricCube size={32} variant="emerald" />
              <span>
                {t.noBuildsHome || "Сборок пока нет. Создайте первую!"}
              </span>
              <button
                type="button"
                className="instances-create-btn"
                onClick={onCreate}
              >
                <IconPlus size={14} />
                <span>{t.createBuild || "Создать"}</span>
              </button>
            </div>
          ) : (
            <>
              {visibleInstances.map((inst) => {
                const isActive = selectedInstanceId === inst.id;
                return (
                  <div
                    key={inst.id}
                    className={`assembly-scroll-card ${isActive ? "active" : ""} ${
                      dropTarget === inst.id ? "drop-target" : ""
                    }`}
                    onClick={() => onSelectInstance(inst.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dropTarget !== inst.id) setDropTarget(inst.id);
                    }}
                    onDragLeave={() =>
                      setDropTarget((c) => (c === inst.id ? null : c))
                    }
                    onDrop={(e) => handleDrop(e, inst.id)}
                  >
                    <div className="assembly-card-icon-wrap">
                      {inst.icon ? (
                        <img
                          src={
                            inst.icon.startsWith("data:") ||
                            inst.icon.startsWith("http")
                              ? inst.icon
                              : convertFileSrc(inst.icon)
                          }
                          alt=""
                          className="assembly-card-custom-icon"
                        />
                      ) : (
                        <IsometricCube
                          size={32}
                          variant={isActive ? "emerald" : "cyan"}
                        />
                      )}
                    </div>
                    <div className="assembly-card-text">
                      <div className="assembly-card-title">{inst.name}</div>
                      <div className="assembly-card-chips">
                        <span className="inst-chip-loader">{inst.loader}</span>
                        <span className="inst-chip-ver">{inst.mcVersion}</span>
                      </div>
                    </div>
                    {isActive && <div className="assembly-active-diode" />}
                  </div>
                );
              })}

              {/* Quick new build card at the end */}
              <button
                type="button"
                className="assembly-new-card"
                onClick={onCreate}
                title={t.createBuild || "Создать сборку"}
              >
                <IconPlus size={18} />
                <span>{t.createBuild || "Создать сборку"}</span>
              </button>
            </>
          )}
        </div>

        {/* Hidden File Input for Custom Icon */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onIconChange}
          style={{ display: "none" }}
          accept="image/*"
        />

        {/* Selected Instance Command Hero Card */}
        {selectedInstance && (
          <div className="assembly-hero-card">
            <div className="assembly-hero-left">
              <div
                className="assembly-hero-icon-box"
                onClick={() => fileInputRef.current?.click()}
                title={t.changeIconHint || "Нажмите, чтобы сменить иконку"}
              >
                {selectedInstance.icon ? (
                  <img
                    src={
                      selectedInstance.icon.startsWith("data:") ||
                      selectedInstance.icon.startsWith("http")
                        ? selectedInstance.icon
                        : convertFileSrc(selectedInstance.icon)
                    }
                    alt=""
                    className="assembly-hero-custom-img"
                  />
                ) : (
                  <IsometricCube size={52} variant="emerald" />
                )}
                <div className="assembly-icon-change-overlay">
                  <IconEdit size={16} />
                </div>
              </div>

              <div className="assembly-hero-info">
                <div className="assembly-hero-title-row">
                  <h3 className="assembly-hero-title">
                    {selectedInstance.name}
                  </h3>
                  <span className="assembly-ready-badge">
                    <span className="status-dot-active" />
                    Готова к игре
                  </span>
                </div>

                <div className="assembly-hero-meta">
                  <span>Minecraft {selectedInstance.mcVersion}</span>
                  <span className="meta-sep">•</span>
                  <span>Загрузчик: {selectedInstance.loader}</span>
                  <span className="meta-sep">•</span>
                  <span className="assembly-hero-playtime">
                    <IconClock size={12} />{" "}
                    {formatPlayTime(selectedInstance.playTimeMs)}
                  </span>
                </div>

                <div className="assembly-hero-badges">
                  <span className="hero-chip chip-mods">
                    <span className="hero-chip-dot green" />
                    {modCount} {t.tabMods || "модов"}
                  </span>
                  <span className="hero-chip chip-loader">
                    <span className="hero-chip-dot cyan" />
                    {selectedInstance.loader}
                  </span>
                  <span className="hero-chip chip-version">
                    <span className="hero-chip-dot gray" />
                    {selectedInstance.mcVersion}
                  </span>
                </div>
              </div>
            </div>

            <div className="assembly-hero-actions">
              <button
                type="button"
                className="assembly-play-btn"
                onClick={onPlay}
              >
                <IconPlay />
                <span>{t.playShort || "Играть"}</span>
              </button>

              <div className="assembly-sub-actions">
                <button
                  type="button"
                  className="assembly-action-btn"
                  onClick={() => onOpenFolder(selectedInstance.id)}
                  title={t.openFolderShort || "Папка сборки"}
                >
                  <IconFolder size={15} />
                  <span>{t.openFolderShort || "Папка"}</span>
                </button>
                <button
                  type="button"
                  className="assembly-action-btn"
                  onClick={() => onEditInstance(selectedInstance.id)}
                  title={t.editBuildBtn || "Изменить"}
                >
                  <IconEdit size={15} />
                  <span>{t.editBuildBtn || "Изменить"}</span>
                </button>
                <button
                  type="button"
                  className={`assembly-action-btn delete-btn ${confirmDelete ? "confirm" : ""}`}
                  onClick={() => {
                    if (confirmDelete) onDeleteInstance(selectedInstance.id);
                    else setConfirmDelete(true);
                  }}
                  title={
                    confirmDelete
                      ? t.confirmDelete || "Точно удалить?"
                      : t.deleteBuild || "Удалить сборку"
                  }
                >
                  <IconTrash size={15} />
                  <span>
                    {confirmDelete
                      ? t.confirmDelete || "Точно?"
                      : t.deleteBuild || "Удалить"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lower Tabbed Content Section (filling the void with useful details) */}
        {selectedInstance && (
          <div className="assembly-details-section">
            <div className="assembly-details-tabs">
              <button
                type="button"
                className={`assembly-tab-btn ${subTab === "mods" ? "active" : ""}`}
                onClick={() => setSubTab("mods")}
              >
                <IconBox size={16} />
                <span>{t.tabMods || "Моды"}</span>
                <span className="tab-counter-badge">{modCount}</span>
              </button>
              <button
                type="button"
                className={`assembly-tab-btn ${subTab === "worlds" ? "active" : ""}`}
                onClick={() => setSubTab("worlds")}
              >
                <IconGlobe size={16} />
                <span>Миры</span>
                <span className="tab-counter-badge">{worlds.length}</span>
              </button>
              <button
                type="button"
                className={`assembly-tab-btn ${subTab === "info" ? "active" : ""}`}
                onClick={() => setSubTab("info")}
              >
                <IconSettings size={16} />
                <span>Сведения о сборке</span>
              </button>
            </div>

            {/* Sub-tab 1: Installed Mods */}
            {subTab === "mods" && (
              <div className="assembly-tab-content">
                <div className="assembly-mods-toolbar">
                  <div className="assembly-mods-search">
                    <IconSearch />
                    <input
                      type="text"
                      placeholder={`Поиск среди ${modCount} установленных модов...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="assembly-mods-tools">
                    {onOpenCatalog && (
                      <button
                        type="button"
                        className="assembly-tool-btn primary"
                        onClick={onOpenCatalog}
                      >
                        <IconPlus size={14} />
                        <span>Добавить моды</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="assembly-tool-btn"
                      onClick={() => onOpenFolder(selectedInstance.id)}
                    >
                      <IconFolder size={14} />
                      <span>Папка mods</span>
                    </button>
                  </div>
                </div>

                {installedMods.length > 0 ? (
                  <div className="installed-mods-grid">
                    {filteredMods.map((mod) => (
                      <div key={mod.modId} className="installed-mod-card">
                        <div className="mod-card-icon">
                          <IsometricCube size={24} variant="cyan" />
                        </div>
                        <div className="mod-card-details">
                          <div className="mod-card-name">{mod.modId}</div>
                          <div className="mod-card-filename">
                            {mod.filename || `${mod.modId}.jar`}
                          </div>
                        </div>
                        <span className="mod-card-pill">
                          {mod.version || "jar"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="assembly-mods-overview">
                    <div className="mods-overview-card">
                      <div className="overview-icon">
                        <IsometricCube size={36} variant="emerald" />
                      </div>
                      <div className="overview-text">
                        <h4>В папке обнаружено {modCount} файлов модов</h4>
                        <p>
                          Сборка готова к запуску с загрузчиком{" "}
                          <b>{selectedInstance.loader}</b> на версии{" "}
                          <b>Minecraft {selectedInstance.mcVersion}</b>.
                        </p>
                      </div>
                    </div>

                    <div className="mods-quick-actions-row">
                      <div
                        className="quick-action-box"
                        onClick={() => onOpenFolder(selectedInstance.id)}
                      >
                        <div className="action-box-icon">
                          <IconFolder size={22} />
                        </div>
                        <div className="action-box-info">
                          <h5>Открыть папку mods</h5>
                          <p>
                            Быстрый доступ к .jar файлам в файловом менеджере
                          </p>
                        </div>
                      </div>

                      {onOpenCatalog && (
                        <div
                          className="quick-action-box highlight"
                          onClick={onOpenCatalog}
                        >
                          <div className="action-box-icon">
                            <IconPlus size={22} />
                          </div>
                          <div className="action-box-info">
                            <h5>Каталог модов</h5>
                            <p>
                              Устанавливайте тысячи модов из Modrinth в один
                              клик
                            </p>
                          </div>
                        </div>
                      )}

                      <div
                        className={`quick-action-box dropzone ${
                          dropTarget === selectedInstance.id ? "drag-over" : ""
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDropTarget(selectedInstance.id);
                        }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(e) => handleDrop(e, selectedInstance.id)}
                      >
                        <div className="action-box-icon">
                          <IconDownload size={22} />
                        </div>
                        <div className="action-box-info">
                          <h5>Перетаскивание файлов</h5>
                          <p>Перетащите .jar файлы прямо сюда для добавления</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Worlds */}
            {subTab === "worlds" && (
              <div className="assembly-tab-content">
                <div className="assembly-mods-toolbar">
                  <h4 style={{ margin: 0, color: "#ffffff", fontWeight: 700 }}>
                    Сохранения и миры ({worlds.length})
                  </h4>
                  <button
                    type="button"
                    className="assembly-tool-btn"
                    onClick={() => onOpenFolder(selectedInstance.id)}
                  >
                    <IconFolder size={14} />
                    <span>Папка saves</span>
                  </button>
                </div>

                {worlds.length > 0 ? (
                  <div className="installed-worlds-grid">
                    {worlds.map((world) => (
                      <div key={world} className="installed-world-card">
                        <div className="world-card-icon">
                          <IconGlobe size={24} />
                        </div>
                        <div className="world-card-info">
                          <div className="world-name">{world}</div>
                          <div className="world-sub">Одиночный мир</div>
                        </div>
                        <button
                          type="button"
                          className="world-play-btn"
                          onClick={onPlay}
                          title="Запустить игру"
                        >
                          <IconPlay size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="assembly-empty-state">
                    <IsometricCube size={44} variant="amber" />
                    <h4>Миров пока нет</h4>
                    <p>
                      Создайте новый мир прямо в игре после первого запуска
                      сборки!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Instance Info & Details */}
            {subTab === "info" && (
              <div className="assembly-tab-content">
                <div className="instance-info-grid">
                  <div className="info-stat-card">
                    <div className="stat-icon">
                      <IconBox size={20} />
                    </div>
                    <div className="stat-data">
                      <span className="stat-label">Версия Minecraft</span>
                      <span className="stat-value">
                        {selectedInstance.mcVersion}
                      </span>
                    </div>
                  </div>

                  <div className="info-stat-card">
                    <div className="stat-icon">
                      <IconCpu size={20} />
                    </div>
                    <div className="stat-data">
                      <span className="stat-label">Загрузчик модов</span>
                      <span className="stat-value">
                        {selectedInstance.loader}
                      </span>
                    </div>
                  </div>

                  <div className="info-stat-card">
                    <div className="stat-icon">
                      <IconClock size={20} />
                    </div>
                    <div className="stat-data">
                      <span className="stat-label">Время в игре</span>
                      <span className="stat-value">
                        {formatPlayTime(selectedInstance.playTimeMs)}
                      </span>
                    </div>
                  </div>

                  <div className="info-stat-card">
                    <div className="stat-icon">
                      <IconFolder size={20} />
                    </div>
                    <div className="stat-data">
                      <span className="stat-label">Каталог сборки</span>
                      <span className="stat-value-path">
                        instances/{selectedInstance.id}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="copy-path-btn"
                      onClick={() => void handleCopyPath()}
                      title="Скопировать путь"
                    >
                      {copiedPath ? (
                        <IconCheck size={14} />
                      ) : (
                        <IconCopy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Instance Modal */}
        {modals.editModalOpen && (
          <EditModal
            t={t}
            name={modals.editNameInput}
            setName={modals.setEditNameInput}
            version={modals.editVersionInput}
            setVersion={modals.setEditVersionInput}
            loader={modals.editLoaderInput}
            setLoader={modals.setEditLoaderInput}
            onSave={onSaveEdit}
            onClose={onCloseEdit}
          />
        )}
      </div>
    );
  },
);
