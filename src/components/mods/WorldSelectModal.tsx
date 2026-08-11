import React from "react";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconBox, IconFolder, IconX } from "../../ui/icons";

export interface WorldSelectState {
  modId: string;
  instanceId: string;
  worlds: string[];
  loading: boolean;
  error: string | null;
}

export const WorldSelectModal = React.memo(({
  state,
  selectedWorld,
  onSelectWorld,
  onConfirm,
  onCancel,
}: {
  state: WorldSelectState;
  selectedWorld: string;
  onSelectWorld: (world: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <DraggableWindow
      storageKey="omega:datapack-world-window"
      className="global-modal-content draggable-window"
      defaultPosition={{ x: 240, y: 110 }}
    >
      <div className="global-modal-header draggable-window-handle">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: "rgba(var(--accent-color-rgb), 0.2)", padding: "8px", borderRadius: "12px", display: "flex" }}>
            <IconBox />
          </div>
          <h3 className="global-modal-title">Выберите мир для датапака</h3>
        </div>
        <button onClick={onCancel} className="global-modal-close">
          <IconX />
        </button>
      </div>

      <div className="global-modal-body">
        {state.error ? (
          <div className="modal-empty-state">{state.error}</div>
        ) : state.worlds.length === 0 ? (
          <div className="modal-empty-state">В папке saves не найдено миров</div>
        ) : (
          state.worlds.map((world, idx) => (
            <button
              key={world}
              onClick={() => onSelectWorld(world)}
              className="modal-item-btn"
              style={{
                animationDelay: `${idx * 0.05}s`,
                border: selectedWorld === world ? "1px solid rgba(var(--accent-color-rgb), 0.6)" : undefined,
                background: selectedWorld === world ? "rgba(var(--accent-color-rgb), 0.15)" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", display: "flex", color: "var(--accent-color)" }}>
                  <IconFolder />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
                  <span style={{ fontSize: "1.05rem", fontWeight: "600", letterSpacing: "0.3px" }}>{world}</span>
                  <span style={{ color: "#8b8b9c", fontSize: "0.85rem" }}>saves/{world}</span>
                </div>
              </div>
            </button>
          ))
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button
            className="play-btn"
            style={{ flex: 1, whiteSpace: "normal", textAlign: "center", lineHeight: 1.2 }}
            onClick={onConfirm}
            disabled={!selectedWorld || state.worlds.length === 0}
          >
            Установить в мир
          </button>
          <button
            className="play-btn"
            style={{ flex: 1, background: "rgba(255,255,255,0.1)", boxShadow: "none" }}
            onClick={onCancel}
          >
            Отмена
          </button>
        </div>
      </div>
    </DraggableWindow>
  );
});