import React from "react";
import { IsometricCube } from "../icons/IsometricCube";
import { InstanceAvatarIcon } from "../icons/MinecraftIcons";
import type { InstanceData } from "../../types";
import {
  type BottomBarItemId,
  type BottomBarAlignment,
  DEFAULT_BOTTOMBAR_LAYOUT,
  DEFAULT_BOTTOMBAR_ALIGNMENT,
} from "../../constants/launcherLayout";
import "../../styles/layer3-dock.css";

interface DockLayerProps {
  visible: boolean;
  selectedInstance?: InstanceData | null;
  isRunning: boolean;
  onTogglePlay: () => void;
  onOpenInstancesModal: () => void;
  bottomBarLayout?: BottomBarItemId[];
  bottomBarAlignment?: BottomBarAlignment;
}

export const DockLayer: React.FC<DockLayerProps> = React.memo(({
  visible,
  selectedInstance,
  isRunning,
  onTogglePlay,
  onOpenInstancesModal,
  bottomBarLayout = DEFAULT_BOTTOMBAR_LAYOUT,
  bottomBarAlignment = DEFAULT_BOTTOMBAR_ALIGNMENT,
}) => {
  const isRust =
    selectedInstance?.loader === "Rust" ||
    selectedInstance?.folderId === "folder_rust" ||
    selectedInstance?.name?.toLowerCase().includes("rust");

  const renderIcon = () => {
    if (isRust) {
      return (
        <svg viewBox="0 0 24 24" className="dock-icon-svg" aria-hidden="true">
          <path
            d="M12 2l8 4.5v9L12 22l-8-6.5v-9z"
            fill="#2a1a4a"
            stroke="#9b5cff"
            strokeWidth="1.5"
          />
        </svg>
      );
    }

    if (selectedInstance?.icon) {
      return <InstanceAvatarIcon icon={selectedInstance.icon} size={36} />;
    }

    return <IsometricCube size={40} variant="grass" />;
  };

  const renderItem = (id: BottomBarItemId) => {
    switch (id) {
      case "instance_icon":
        return (
          <button
            key="instance_icon"
            type="button"
            className="dock-item-btn dock-icon-btn"
            onClick={onOpenInstancesModal}
            aria-label="Иконка версии"
          >
            <div className="dock-icon" aria-hidden="true">
              {renderIcon()}
            </div>
            <div className="dock-tooltip">Сменить версию</div>
          </button>
        );

      case "instance_title":
        return (
          <button
            key="instance_title"
            type="button"
            className="dock-item-btn dock-title-btn"
            onClick={onOpenInstancesModal}
            aria-label="Сменить версию"
          >
            <h1 className="dock-title">
              {selectedInstance ? selectedInstance.name : "Minecraft Rust (Beta)"}
            </h1>
            <div className="dock-tooltip">Сменить версию</div>
          </button>
        );

      case "instance_tags":
        return (
          <button
            key="instance_tags"
            type="button"
            className="dock-item-btn dock-tags-btn"
            onClick={onOpenInstancesModal}
            aria-label="Информация о версии"
          >
            <div className="dock-tags">
              {selectedInstance ? (
                <>
                  <span
                    className={`dock-chip ${
                      selectedInstance.loader === "Rust" ? "rust" : ""
                    }`}
                  >
                    {selectedInstance.loader}
                  </span>
                  <span className="dock-chip">{selectedInstance.mcVersion}</span>
                  <span className="dock-playtime">
                    {selectedInstance.playTimeMinutes} мин
                  </span>
                </>
              ) : (
                <>
                  <span className="dock-chip rust">RUST</span>
                  <span className="dock-chip">26.3</span>
                  <span className="dock-playtime">0 мин</span>
                </>
              )}
            </div>
            <div className="dock-tooltip">Сменить версию</div>
          </button>
        );

      case "play_button":
        return (
          <button
            key="play_button"
            type="button"
            className={`dock-play ${isRunning ? "running" : ""}`}
            onClick={selectedInstance ? onTogglePlay : onOpenInstancesModal}
            title={
              !selectedInstance
                ? "Создайте версию перед запуском"
                : isRunning
                ? "Принудительно закрыть Minecraft"
                : "Запустить версию Minecraft"
            }
          >
            <svg viewBox="0 0 24 24" className="dock-play-svg" aria-hidden="true">
              {isRunning ? (
                <rect x="5" y="5" width="14" height="14" rx="2" />
              ) : (
                <path d="M6 4l14 8-14 8z" />
              )}
            </svg>
            <span>{isRunning ? "СТОП" : "ИГРАТЬ"}</span>
          </button>
        );

      default:
        return null;
    }
  };

  const items = bottomBarLayout || DEFAULT_BOTTOMBAR_LAYOUT;
  const titleIdx = items.indexOf("instance_title");
  const tagsIdx = items.indexOf("instance_tags");
  const areTitleAndTagsAdjacent = Math.abs(titleIdx - tagsIdx) === 1;

  return (
    <footer className={`layer-dock ${!visible ? "hidden" : ""} dock-align-${bottomBarAlignment}`}>
      <div className={`dock-container dock-card dock-layout-mode-${areTitleAndTagsAdjacent ? "grouped" : "split"}`}>
        {items.map((id, index) => {
          if (areTitleAndTagsAdjacent) {
            if (id === "instance_title" && titleIdx < tagsIdx) {
              return (
                <button
                  key="instance_info_grouped"
                  type="button"
                  className="dock-instance-btn dock-info-group"
                  onClick={onOpenInstancesModal}
                  aria-label="Сменить версию Minecraft"
                >
                  <div className="dock-info">
                    <h1 className="dock-title">
                      {selectedInstance ? selectedInstance.name : "Minecraft Rust (Beta)"}
                    </h1>
                    <div className="dock-tags">
                      {selectedInstance ? (
                        <>
                          <span
                            className={`dock-chip ${
                              selectedInstance.loader === "Rust" ? "rust" : ""
                            }`}
                          >
                            {selectedInstance.loader}
                          </span>
                          <span className="dock-chip">{selectedInstance.mcVersion}</span>
                          <span className="dock-playtime">
                            {selectedInstance.playTimeMinutes} мин
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="dock-chip rust">RUST</span>
                          <span className="dock-chip">26.3</span>
                          <span className="dock-playtime">0 мин</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="dock-tooltip">Сменить версию</div>
                </button>
              );
            }
            if (id === "instance_tags" && titleIdx < tagsIdx) {
              return null;
            }
            if (id === "instance_tags" && tagsIdx < titleIdx) {
              return (
                <button
                  key="instance_info_grouped_rev"
                  type="button"
                  className="dock-instance-btn dock-info-group"
                  onClick={onOpenInstancesModal}
                  aria-label="Сменить версию Minecraft"
                >
                  <div className="dock-info">
                    <div className="dock-tags" style={{ marginBottom: 6 }}>
                      {selectedInstance ? (
                        <>
                          <span
                            className={`dock-chip ${
                              selectedInstance.loader === "Rust" ? "rust" : ""
                            }`}
                          >
                            {selectedInstance.loader}
                          </span>
                          <span className="dock-chip">{selectedInstance.mcVersion}</span>
                          <span className="dock-playtime">
                            {selectedInstance.playTimeMinutes} мин
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="dock-chip rust">RUST</span>
                          <span className="dock-chip">26.3</span>
                          <span className="dock-playtime">0 мин</span>
                        </>
                      )}
                    </div>
                    <h1 className="dock-title">
                      {selectedInstance ? selectedInstance.name : "Minecraft Rust (Beta)"}
                    </h1>
                  </div>
                  <div className="dock-tooltip">Сменить версию</div>
                </button>
              );
            }
            if (id === "instance_title" && tagsIdx < titleIdx) {
              return null;
            }
          }

          return renderItem(id);
        })}
      </div>
    </footer>
  );
});
