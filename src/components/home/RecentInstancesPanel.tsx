import React from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ModpackInstance } from "../../types";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconBox, IconPlay, IconPlus } from "../../ui/icons";

const resolveIcon = (icon: string | undefined) => {
  if (!icon) return undefined;
  return icon.startsWith("data:") || icon.startsWith("http") ? icon : convertFileSrc(icon);
};

export const RecentInstancesPanel = React.memo(({
  t,
  instances,
  selectedInstanceId,
  onSelectInstance,
  onPlayInstance,
  onCreate,
}: {
  t: any;
  instances: ModpackInstance[];
  selectedInstanceId: string | null;
  onSelectInstance: (id: string) => void;
  onPlayInstance: (id: string) => void;
  onCreate: () => void;
}) => {
  return (
    <DraggableWindow
      storageKey="omega:recent-instances-panel"
      className="sketch-card floating-dashboard-window draggable-window"
      defaultPosition={{ x: 100, y: 94 }}
      defaultSize={{ width: 340, height: 330 }}
    >
      <div className="floating-dashboard-content" style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <div className="sketch-card-header draggable-window-handle">
          <span className="sketch-card-title">
            <IconBox /> {t.recentTitle}
          </span>
          <button className="play-btn" style={{ height: "28px", fontSize: "0.75rem", padding: "0 10px" }} onClick={onCreate}>
            <IconPlus /> {t.createShort}
          </button>
        </div>
        <div className="recent-instances-list recent-instances-fixed" style={{ overflowY: "hidden", flex: 1, minHeight: 0 }}>
          {instances.length === 0 ? (
            <div style={{ color: "#9da7ba", textAlign: "center", padding: "15px", fontSize: "0.85rem" }}>
              {t.noBuildsHome}
            </div>
          ) : (
            instances.slice(0, 3).map((inst) => (
              <div
                key={inst.id}
                className={`recent-instance-item ${selectedInstanceId === inst.id ? "selected" : ""}`}
                onClick={() => onSelectInstance(inst.id)}
              >
                <div className="recent-inst-info">
                  <div className="recent-inst-icon">
                    {inst.icon ? <img src={resolveIcon(inst.icon)} alt="icon" style={{ width: 24, height: 24, borderRadius: 6 }} /> : <IconBox />}
                  </div>
                  <div>
                    <div className="recent-inst-name" style={{ fontSize: "0.88rem" }}>{inst.name}</div>
                    <div className="recent-inst-ver" style={{ fontSize: "0.72rem" }}>
                      {inst.mcVersion} • {inst.loader}
                    </div>
                  </div>
                </div>
                <button
                  className="play-btn"
                  style={{ height: "28px", fontSize: "0.75rem", padding: "0 10px", flexShrink: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectInstance(inst.id);
                    onPlayInstance(inst.id);
                  }}
                >
                  <IconPlay />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </DraggableWindow>
  );
});