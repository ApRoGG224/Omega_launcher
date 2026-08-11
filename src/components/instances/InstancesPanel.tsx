import React from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ModpackInstance } from "../../types";
import { IconBox, IconFolder, IconPlay, IconPlus } from "../../ui/icons";
import { InstanceContextMenu, type InstanceContextMenuState } from "./InstanceContextMenu";
import { RenameModal, EditModal, GroupModal } from "./InstanceModals";

export interface InstanceModalsState {
  renameModalOpen: string | null;
  renameInput: string;
  setRenameInput: (v: string) => void;
  editModalOpen: string | null;
  editNameInput: string;
  setEditNameInput: (v: string) => void;
  editVersionInput: string;
  setEditVersionInput: (v: string) => void;
  editLoaderInput: string;
  setEditLoaderInput: (v: string) => void;
  groupModalOpen: string | null;
  groupInput: string;
  setGroupInput: (v: string) => void;
}

export const InstancesPanel = React.memo(({
  visibleInstances,
  selectedInstanceId,
  selectedInstance,
  modCount,
  contextMenu,
  fileInputRef,
  t,
  modals,
  onSelectInstance,
  onContextMenu,
  onCloseContextMenu,
  onIconChange,
  onPlay,
  onOpenFolder,
  onCreate,
  onModalAction,
  onDropMod,
  installProgress,
}: {
  visibleInstances: ModpackInstance[];
  selectedInstanceId: string | null;
  selectedInstance: ModpackInstance | null;
  modCount: number;
  contextMenu: InstanceContextMenuState | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  t: any;
  modals: InstanceModalsState;
  onSelectInstance: (id: string) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
  onCloseContextMenu: () => void;
  onIconChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlay: () => void;
  onOpenFolder: (instanceId: string) => void;
  onCreate: () => void;
  onModalAction: (action: string, instanceId: string) => void;
  onDropMod: (instanceId: string, payload: { projectId: string; projectType: string }) => void;
  installProgress: { step: string; current: number; total: number } | null;
}) => {
  const [dropTarget, setDropTarget] = React.useState<string | null>(null);

  const handleDrop = (e: React.DragEvent, instanceId: string) => {
    e.preventDefault();
    setDropTarget(null);
    const raw = e.dataTransfer.getData("application/x-omega-mod");
    if (!raw) return;
    try {
      onDropMod(instanceId, JSON.parse(raw));
    } catch {
      // ignore malformed payloads
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        flex: 1,
        minHeight: 0,
        height: "calc(100vh - 130px)",
        paddingBottom: "75px",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {installProgress && (
        <div style={{ background: "rgba(14, 11, 22, 0.85)", border: "1px solid rgba(171, 61, 245, 0.3)", borderRadius: 14, padding: "12px 16px" }}>
          <div className="install-progress-label">
            <span>
              {installProgress.step === "mods"
                ? "Установка модов сборки..."
                : installProgress.step === "overrides"
                  ? "Применение конфигураций..."
                  : "Установка сборки..."}
            </span>
            <span>
              {installProgress.current} / {installProgress.total}
            </span>
          </div>
          <div className="install-progress-bar">
            <div style={{ width: `${installProgress.total > 0 ? Math.min(100, (installProgress.current / installProgress.total) * 100) : 0}%` }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Ваши сборки</h2>
        <button className="play-btn" style={{ height: "36px", fontSize: "0.85rem" }} onClick={onCreate}>
          <IconPlus /> Создать сборку
        </button>
      </div>

      <div className="assemblies-horizontal-list">
        {visibleInstances.map((inst) => (
          <div
            key={inst.id}
            className={`assembly-scroll-card ${selectedInstanceId === inst.id ? "active" : ""} ${dropTarget === inst.id ? "drop-target" : ""}`}
            onClick={() => onSelectInstance(inst.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(inst.id, e.clientX, e.clientY);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dropTarget !== inst.id) setDropTarget(inst.id);
            }}
            onDragLeave={() => setDropTarget((c) => (c === inst.id ? null : c))}
            onDrop={(e) => handleDrop(e, inst.id)}
          >
            <div className="recent-inst-icon assembly-card-icon">
              {inst.icon ? (
                <img
                  src={inst.icon.startsWith("data:") || inst.icon.startsWith("http") ? inst.icon : convertFileSrc(inst.icon)}
                  alt="icon"
                  style={{ width: 36, height: 36, borderRadius: 8 }}
                />
              ) : (
                <IconBox />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: "1px" }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {inst.name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#8b8b9c", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {inst.mcVersion} ({inst.loader})
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedInstance && (
        <div className="assembly-info-card-detail">
          <input type="file" ref={fileInputRef} onChange={onIconChange} style={{ display: "none" }} accept="image/*" />
          <div
            className="recent-inst-icon"
            style={{ width: 64, height: 64, borderRadius: 16, cursor: "pointer" }}
            onClick={() => fileInputRef.current?.click()}
            title="Нажмите, чтобы сменить иконку"
          >
            {selectedInstance.icon ? <img src={selectedInstance.icon} alt="icon" style={{ width: 44, height: 44, borderRadius: 10 }} /> : <IconBox />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "4px" }}>{selectedInstance.name}</h3>
              <button
                className="play-btn"
                style={{ height: "26px", fontSize: "0.75rem", padding: "0 8px", background: "rgba(255,255,255,0.06)", boxShadow: "none" }}
                onClick={() => onModalAction("rename", selectedInstance.id)}
              >
                Переименовать
              </button>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#8b8b9c", marginBottom: "8px" }}>
              Версия: <span style={{ color: "#AB3DF5", fontWeight: 600 }}>{selectedInstance.mcVersion}</span> • Загрузчик:{" "}
              <span style={{ color: "#fff" }}>{selectedInstance.loader}</span>
            </div>
            <div className="mod-chips-container">
              <span className="mod-chip"><span className="mod-chip-dot" /> Установлено модов: {modCount}</span>
              <span className="mod-chip"><span className="mod-chip-dot" /> Fabric API</span>
              <span className="mod-chip"><span className="mod-chip-dot" /> Sodium (Оптимизация)</span>
              <span className="mod-chip"><span className="mod-chip-dot" /> Iris Shaders</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button className="play-btn" onClick={onPlay}>
              <IconPlay /> Играть
            </button>
            <button
              className="play-btn"
              style={{ background: "rgba(255,255,255,0.08)", boxShadow: "none", fontSize: "0.82rem" }}
              onClick={() => onOpenFolder(selectedInstance.id)}
            >
              <IconFolder /> Папка сборки
            </button>
          </div>
        </div>
      )}

      {contextMenu && (
        <InstanceContextMenu
          menu={contextMenu}
          onAction={(action) => {
            onModalAction(action, contextMenu.instanceId);
            onCloseContextMenu();
          }}
        />
      )}

      {modals.renameModalOpen && (
        <RenameModal
          instanceId={modals.renameModalOpen}
          value={modals.renameInput}
          onChange={modals.setRenameInput}
          onSave={() => {
            onModalAction("saveRename", modals.renameModalOpen!);
          }}
          onClose={() => onModalAction("closeRename", modals.renameModalOpen!)}
          t={t}
        />
      )}

      {modals.editModalOpen && (
        <EditModal
          instanceId={modals.editModalOpen}
          name={modals.editNameInput}
          setName={modals.setEditNameInput}
          version={modals.editVersionInput}
          setVersion={modals.setEditVersionInput}
          loader={modals.editLoaderInput}
          setLoader={modals.setEditLoaderInput}
          onSave={() => onModalAction("saveEdit", modals.editModalOpen!)}
          onClose={() => onModalAction("closeEdit", modals.editModalOpen!)}
        />
      )}

      {modals.groupModalOpen && (
        <GroupModal
          instanceId={modals.groupModalOpen}
          value={modals.groupInput}
          onChange={modals.setGroupInput}
          onSave={() => onModalAction("saveGroup", modals.groupModalOpen!)}
          onClose={() => onModalAction("closeGroup", modals.groupModalOpen!)}
        />
      )}
    </div>
  );
});