import React from "react";
import type { ModpackInstance, ProjectType } from "../../types";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconBox, IconDownload, IconX } from "../../ui/icons";

export const InstallTargetModal = React.memo(({
  projectType,
  instances,
  t,
  onPick,
  onClose,
}: {
  projectType: ProjectType;
  instances: ModpackInstance[];
  t: any;
  onPick: (instanceId: string) => void;
  onClose: () => void;
}) => {
  const titles: Record<ProjectType, string> = {
    mod: t.installTo,
    shader: "Установить шейдер в сборку",
    datapack: "Установить датапак в сборку",
    resourcepack: "Установить ресурспак в сборку",
    modpack: "Установить сборку",
  };

  return (
    <DraggableWindow
      storageKey={`omega:install-window:${projectType}`}
      className="global-modal-content draggable-window"
      defaultPosition={{ x: 220, y: 90 }}
    >
      <div className="global-modal-header draggable-window-handle">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: "rgba(var(--accent-color-rgb), 0.2)", padding: "8px", borderRadius: "12px", display: "flex" }}>
            <IconDownload />
          </div>
          <h3 className="global-modal-title">{titles[projectType]}</h3>
        </div>
        <button onClick={onClose} className="global-modal-close">
          <IconX />
        </button>
      </div>

      <div className="global-modal-body">
        {instances.length === 0 ? (
          <div className="modal-empty-state">{t.noInstances}</div>
        ) : (
          instances.map((inst, idx) => (
            <button key={inst.id} onClick={() => onPick(inst.id)} className="modal-item-btn" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", display: "flex", color: "var(--accent-color)" }}>
                  <IconBox />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "1.05rem", fontWeight: "600", letterSpacing: "0.3px" }}>{inst.name}</span>
                  <span style={{ color: "#8b8b9c", fontSize: "0.85rem" }}>
                    {t.version}: {inst.mcVersion}
                  </span>
                </div>
              </div>
              <div className="modal-item-tag">{inst.loader}</div>
            </button>
          ))
        )}
      </div>
    </DraggableWindow>
  );
});