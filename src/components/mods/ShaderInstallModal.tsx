import React from "react";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconBox, IconX } from "../../ui/icons";

export interface ShaderInstallState {
  modId: string;
  instanceId: string;
  loader: "fabric" | "forge" | "";
}

export const ShaderInstallModal = React.memo(({
  onPickLoader,
  onCancel,
}: {
  onPickLoader: (loader: "fabric" | "forge") => void;
  onCancel: () => void;
}) => {
  const pick = (loader: "fabric" | "forge") => {
    onPickLoader(loader);
  };

  return (
    <DraggableWindow
      storageKey="omega:shader-loader-window"
      className="global-modal-content draggable-window"
      defaultPosition={{ x: 260, y: 130 }}
    >
      <div className="global-modal-header draggable-window-handle">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: "rgba(var(--accent-color-rgb), 0.2)", padding: "8px", borderRadius: "12px", display: "flex" }}>
            <IconBox />
          </div>
          <h3 className="global-modal-title">Куда установить шейдер?</h3>
        </div>
        <button onClick={onCancel} className="global-modal-close">
          <IconX />
        </button>
      </div>

      <div className="global-modal-body">
        <button className="modal-item-btn" onClick={() => pick("fabric")}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", display: "flex", color: "var(--accent-color)" }}>
              <IconBox />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: "600" }}>Fabric</span>
              <span style={{ color: "#8b8b9c", fontSize: "0.8rem" }}>Будет установлен Iris</span>
            </div>
          </div>
          <div className="modal-item-tag">Рекомендуется</div>
        </button>
        <button className="modal-item-btn" onClick={() => pick("forge")} style={{ animationDelay: "0.05s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", display: "flex", color: "var(--accent-color)" }}>
              <IconBox />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: "600" }}>Forge</span>
              <span style={{ color: "#8b8b9c", fontSize: "0.8rem" }}>Для совместимости с Forge</span>
            </div>
          </div>
        </button>
      </div>
    </DraggableWindow>
  );
});