import React from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ModpackInstance } from "../../types";
import { IconBox, IconFolder, IconPlay, IconPlus } from "../../ui/icons";
import { EditModal } from "./InstanceModals";

export interface InstanceModalsState {
  editModalOpen: string | null;
  editNameInput: string;
  setEditNameInput: (v: string) => void;
  editVersionInput: string;
  setEditVersionInput: (v: string) => void;
  editLoaderInput: string;
  setEditLoaderInput: (v: string) => void;
}

export const InstancesPanel = React.memo(({
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
}: {
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
  onDropMod: (instanceId: string, payload: { projectId: string; projectType: string }) => void;
  installProgress: { step: string; current: number; total: number } | null;
}) => {
  const [dropTarget, setDropTarget] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    setConfirmDelete(false);
  }, [selectedInstanceId]);

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
                ? t.installingMods
                : installProgress.step === "overrides"
                  ? t.applyingConfig
                  : t.installingBuild}
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
        <h2>{t.myBuilds}</h2>
        <button className="play-btn" style={{ height: "36px", fontSize: "0.85rem" }} onClick={onCreate}>
          <IconPlus /> {t.createBuild}
        </button>
      </div>

      <div className="assemblies-horizontal-list">
        {visibleInstances.map((inst) => (
          <div
            key={inst.id}
            className={`assembly-scroll-card ${selectedInstanceId === inst.id ? "active" : ""} ${dropTarget === inst.id ? "drop-target" : ""}`}
            onClick={() => onSelectInstance(inst.id)}
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

      <input type="file" ref={fileInputRef} onChange={onIconChange} style={{ display: "none" }} accept="image/*" />

      {selectedInstance && (
        <div className="assembly-info-card-detail">
          <div
            className="recent-inst-icon"
            style={{ width: 64, height: 64, borderRadius: 16, cursor: "pointer" }}
            onClick={() => fileInputRef.current?.click()}
            title={t.changeIconHint}
          >
            {selectedInstance.icon ? <img src={selectedInstance.icon.startsWith("data:") || selectedInstance.icon.startsWith("http") ? selectedInstance.icon : convertFileSrc(selectedInstance.icon)} alt="icon" style={{ width: 44, height: 44, borderRadius: 10 }} /> : <IconBox />}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "4px" }}>{selectedInstance.name}</h3>
            <div style={{ fontSize: "0.85rem", color: "#8b8b9c", marginBottom: "8px" }}>
              {t.versionLabel} <span style={{ color: "#AB3DF5", fontWeight: 600 }}>{selectedInstance.mcVersion}</span> • {t.loaderLabel}{" "}
              <span style={{ color: "#fff" }}>{selectedInstance.loader}</span>
            </div>
            <div className="mod-chips-container">
              <span className="mod-chip"><span className="mod-chip-dot" /> {t.installedMods} {modCount}</span>
              <span className="mod-chip"><span className="mod-chip-dot" /> Fabric API</span>
              <span className="mod-chip"><span className="mod-chip-dot" /> Sodium (Оптимизация)</span>
              <span className="mod-chip"><span className="mod-chip-dot" /> Iris Shaders</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button className="play-btn" onClick={onPlay}>
              <IconPlay /> {t.playShort}
            </button>
            <button
              className="play-btn"
              style={{ background: "rgba(255,255,255,0.08)", boxShadow: "none", fontSize: "0.82rem" }}
              onClick={() => onOpenFolder(selectedInstance.id)}
            >
              <IconFolder /> {t.openFolderShort}
            </button>
            <button
              className="play-btn"
              style={{ background: "rgba(255,255,255,0.08)", boxShadow: "none", fontSize: "0.82rem" }}
              onClick={() => onEditInstance(selectedInstance.id)}
            >
              🛠️ {t.editBuildBtn}
            </button>
            <button
              className="play-btn"
              style={{ background: confirmDelete ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.05)", boxShadow: "none", fontSize: "0.82rem", color: confirmDelete ? "#f87171" : "#f87171" }}
              onClick={() => {
                if (confirmDelete) onDeleteInstance(selectedInstance.id);
                else setConfirmDelete(true);
              }}
            >
              🗑️ {confirmDelete ? t.confirmDelete : t.deleteBuild}
            </button>
          </div>
        </div>
      )}

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
});