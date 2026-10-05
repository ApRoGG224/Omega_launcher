import React, { useCallback, useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ModpackInstance } from "../../types";
import {
  IconClock,
  IconEdit,
  IconFolder,
  IconPlay,
  IconPlus,
  IconTrash,
} from "../../ui/icons";
import { EditModal } from "./InstanceModals";
import { IsometricCube } from "./IsometricCube";

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
  }: InstancesPanelProps) => {
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
      setConfirmDelete(false);
    }, [selectedInstanceId]);

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
              <IsometricCube size={20} variant="emerald" />
            </div>
            <div>
              <div className="instances-title-row">
                <h2>{t.myBuilds || "Ваши сборки"}</h2>
                <span className="instances-badge-pill">
                  {visibleInstances.length}{" "}
                  {visibleInstances.length === 1 ? "сборка" : "сборок"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="instances-create-btn"
            onClick={onCreate}
          >
            <IconPlus size={14} />
            <span>{t.createBuild || "Создать сборку"}</span>
          </button>
        </div>

        {/* Horizontal Assemblies Carousel */}
        <div className="assemblies-horizontal-list">
          {visibleInstances.length === 0 ? (
            <div className="assemblies-empty-list">
              <IsometricCube size={24} variant="emerald" />
              <span>
                {t.noBuildsHome || "Сборок пока нет. Создайте первую!"}
              </span>
              <button
                type="button"
                className="instances-create-btn"
                onClick={onCreate}
              >
                <IconPlus size={13} />
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
                          size={24}
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
                <IconPlus size={15} />
                <span>{t.createBuild || "Создать"}</span>
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
                  <IsometricCube size={38} variant="emerald" />
                )}
                <div className="assembly-icon-change-overlay">
                  <IconEdit size={14} />
                </div>
              </div>

              <div className="assembly-hero-info">
                <div className="assembly-hero-title-row">
                  <h3
                    className="assembly-hero-title"
                    title={selectedInstance.name}
                  >
                    {selectedInstance.name}
                  </h3>
                  <span className="assembly-ready-badge">
                    <span className="status-dot-active" />
                    Готова к игре
                  </span>
                </div>
                <div className="assembly-hero-chips-row">
                  <span className="hero-chip chip-loader">
                    <span className="hero-chip-dot cyan" />
                    {selectedInstance.loader}
                  </span>
                  <span className="hero-chip chip-version">
                    {selectedInstance.mcVersion}
                  </span>
                  <span className="hero-chip chip-mods">
                    <span className="hero-chip-dot green" />
                    {modCount} {t.modsCount || t.tabMods || "модов"}
                  </span>
                  <span className="assembly-hero-playtime">
                    <IconClock size={11} />{" "}
                    {formatPlayTime(selectedInstance.playTimeMs)}
                  </span>
                </div>
              </div>
            </div>

            <div className="assembly-hero-actions">
              <button
                type="button"
                className="assembly-action-btn"
                onClick={() => onOpenFolder(selectedInstance.id)}
                title={t.openFolderShort || "Папка сборки"}
              >
                <IconFolder size={14} />
                <span>{t.openFolderShort || "Папка"}</span>
              </button>
              <button
                type="button"
                className="assembly-action-btn"
                onClick={() => onEditInstance(selectedInstance.id)}
                title={t.editBuildBtn || "Изменить"}
              >
                <IconEdit size={14} />
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
                <IconTrash size={14} />
                <span>
                  {confirmDelete
                    ? t.confirmDelete || "Точно?"
                    : t.deleteBuild || "Удалить"}
                </span>
              </button>
              <button
                type="button"
                className="assembly-play-btn"
                onClick={onPlay}
              >
                <IconPlay size={16} />
                <span>{t.playShort || "Играть"}</span>
              </button>
            </div>
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
