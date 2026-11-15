import React, { useState, useEffect, useRef } from "react";
import {
  type BottomBarItemId,
  type BottomBarAlignment,
  DEFAULT_BOTTOMBAR_LAYOUT,
  DEFAULT_BOTTOMBAR_ALIGNMENT,
  BOTTOMBAR_ITEMS_META,
} from "../../../constants/launcherLayout";
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  Check,
  Trash2,
  Plus,
} from "lucide-react";
import { IsometricCube } from "../../icons/IsometricCube";
import { InstanceAvatarIcon } from "../../icons/MinecraftIcons";
import type { InstanceData } from "../../../types";
import "../../../styles/layer3-dock.css";

interface BottomBarCustomizerProps {
  layout?: BottomBarItemId[];
  alignment?: BottomBarAlignment;
  onSave?: (layout: BottomBarItemId[], alignment: BottomBarAlignment) => void;
  onReset?: () => void;
  selectedInstance?: InstanceData | null;
  onFeedback?: (msg: string) => void;
}

export const BottomBarCustomizer: React.FC<BottomBarCustomizerProps> = ({
  layout = DEFAULT_BOTTOMBAR_LAYOUT,
  alignment = DEFAULT_BOTTOMBAR_ALIGNMENT,
  onSave,
  onReset,
  selectedInstance,
  onFeedback,
}) => {
  const [draftLayout, setDraftLayout] = useState<BottomBarItemId[]>(() => [...layout]);
  const [draftAlignment, setDraftAlignment] = useState<BottomBarAlignment>(() => alignment);
  const [selectedId, setSelectedId] = useState<BottomBarItemId | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const updateScale = () => {
      if (canvasRef.current && dockRef.current) {
        dockRef.current.style.transform = "none";
        const availableWidth = canvasRef.current.clientWidth - 24;
        const naturalWidth = dockRef.current.scrollWidth;
        if (availableWidth > 0 && naturalWidth > 0) {
          if (naturalWidth > availableWidth) {
            const fitScale = Math.max(0.6, availableWidth / naturalWidth);
            setScale(fitScale);
            dockRef.current.style.transform = `scale(${fitScale})`;
          } else {
            setScale(1);
            dockRef.current.style.transform = "none";
          }
        }
      }
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (canvasRef.current) ro.observe(canvasRef.current);
    window.addEventListener("resize", updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [draftLayout, draftAlignment]);

  useEffect(() => {
    setDraftLayout([...layout]);
  }, [layout]);

  useEffect(() => {
    setDraftAlignment(alignment);
  }, [alignment]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (!selectedId) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteItem(selectedId);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const idx = draftLayout.indexOf(selectedId);
        if (idx > 0) nudgeItem(idx, -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const idx = draftLayout.indexOf(selectedId);
        if (idx !== -1 && idx < draftLayout.length - 1) nudgeItem(idx, 1);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedId, draftLayout]);

  const hasUnsavedChanges =
    JSON.stringify(draftLayout) !== JSON.stringify(layout) || draftAlignment !== alignment;

  const deletedItems = DEFAULT_BOTTOMBAR_LAYOUT.filter((id) => !draftLayout.includes(id));

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= draftLayout.length || toIdx >= draftLayout.length) {
      return;
    }
    setDraftLayout((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, removed);
      return next;
    });
  };

  const nudgeItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draftLayout.length) return;
    moveItem(index, target);
  };

  const deleteItem = (idToDelete: BottomBarItemId) => {
    if (draftLayout.length <= 1) {
      return;
    }
    setDraftLayout((prev) => prev.filter((id) => id !== idToDelete));
    if (selectedId === idToDelete) {
      setSelectedId(null);
    }
  };

  const restoreItem = (idToRestore: BottomBarItemId) => {
    setDraftLayout((prev) => [...prev, idToRestore]);
  };

  const handleSave = () => {
    onSave?.(draftLayout, draftAlignment);
  };

  const handleReset = () => {
    setDraftLayout([...DEFAULT_BOTTOMBAR_LAYOUT]);
    setDraftAlignment(DEFAULT_BOTTOMBAR_ALIGNMENT);
    setSelectedId(null);
    onReset?.();
  };

  const handleItemClick = (id: BottomBarItemId, index: number) => {
    if (selectedId && selectedId !== id) {
      const fromIdx = draftLayout.indexOf(selectedId);
      if (fromIdx !== -1) {
        moveItem(fromIdx, index);
        setSelectedId(null);
        return;
      }
    }
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingIdx(index);
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (targetIndex: number) => {
    if (draggingIdx !== null && draggingIdx !== targetIndex) {
      moveItem(draggingIdx, targetIndex);
      setDraggingIdx(targetIndex);
    }
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
  };

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

  const renderBottomBlockContent = (id: BottomBarItemId) => {
    switch (id) {
      case "instance_icon":
        return (
          <div className="dock-icon" style={{ pointerEvents: "none" }} aria-hidden="true">
            {renderIcon()}
          </div>
        );

      case "instance_title":
        return (
          <div className="dock-title-block" style={{ pointerEvents: "none" }}>
            <h1 className="dock-title" style={{ margin: 0 }}>
              {selectedInstance ? selectedInstance.name : "Minecraft Rust (Beta)"}
            </h1>
          </div>
        );

      case "instance_tags":
        return (
          <div className="dock-tags" style={{ pointerEvents: "none" }}>
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
        );

      case "play_button":
        return (
          <div className="dock-play" style={{ pointerEvents: "none" }}>
            <svg viewBox="0 0 24 24" className="dock-play-svg" aria-hidden="true">
              <path d="M6 4l14 8-14 8z" />
            </svg>
            <span>ИГРАТЬ</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="customizer-container customizer-rounded-theme">
      <div>
        <h2>Настройка нижней панели (Кнопка «Играть»)</h2>
        <div className="customizer-sub">
          Нажимайте на стрелки или перетаскивайте для автоматического перемещения блоков. Нажмите правой кнопкой мыши или Delete для удаления блока.
        </div>
      </div>

      <div className="customizer-preview-box">
        <div className="customizer-preview-header">
          <div className="customizer-preview-title">
            <Sparkles size={14} />
            <span>Предварительный просмотр нижней карточки</span>
          </div>
          <span className="customizer-preview-hint">
            ПКМ или Delete — удалить блок | Клик или стрелки — автоперемещение
          </span>
        </div>

        <div
          ref={canvasRef}
          className="customizer-preview-canvas bottom-dock-canvas align-center"
        >
          <div
            ref={dockRef}
            className="dock-container dock-card customizer-dock-bottom-preview"
          >
            {(() => {
              const titleIdx = draftLayout.indexOf("instance_title");
              const tagsIdx = draftLayout.indexOf("instance_tags");
              const areTitleAndTagsAdjacent =
                titleIdx !== -1 && tagsIdx !== -1 && Math.abs(titleIdx - tagsIdx) === 1;

              const renderBlock = (id: BottomBarItemId, index: number) => {
                const isSelected = selectedId === id;
                const isDragging = draggingIdx === index;
                const meta = BOTTOMBAR_ITEMS_META[id] || { title: id, description: "" };

                return (
                  <div
                    key={`${id}-${index}`}
                    tabIndex={0}
                    className={`customizer-dock-item-wrapper customizer-bottom-block-wrapper block-${id} ${
                      isSelected ? "selected" : ""
                    } ${isDragging ? "dragging" : ""}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleItemClick(id, index)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      deleteItem(id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Delete" || e.key === "Backspace") {
                        e.preventDefault();
                        deleteItem(id);
                      } else if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        nudgeItem(index, -1);
                      } else if (e.key === "ArrowRight") {
                        e.preventDefault();
                        nudgeItem(index, 1);
                      }
                    }}
                    title={`${meta.title} (Кликните для выбора, стрелки ◀/▶ для сдвига, ПКМ для удаления)`}
                  >
                    <div className="customizer-dock-item-controls">
                      <button
                        type="button"
                        className="dock-item-nudge-btn"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          nudgeItem(index, -1);
                        }}
                        title="Сдвинуть влево"
                      >
                        <ChevronLeft size={12} />
                      </button>

                      <button
                        type="button"
                        className="dock-item-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(id);
                        }}
                        title="Удалить этот блок (ПКМ / Delete)"
                      >
                        <Trash2 size={11} />
                      </button>

                      <button
                        type="button"
                        className="dock-item-nudge-btn"
                        disabled={index === draftLayout.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          nudgeItem(index, 1);
                        }}
                        title="Сдвинуть вправо"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>

                    <div className="customizer-dock-item-body">
                      {renderBottomBlockContent(id)}
                    </div>
                  </div>
                );
              };

              return draftLayout.map((id, index) => {
                if (areTitleAndTagsAdjacent) {
                  if (id === "instance_title" && titleIdx < tagsIdx) {
                    return (
                      <div key="group_title_tags" className="dock-info customizer-dock-info-grouped">
                        {renderBlock("instance_title", titleIdx)}
                        {renderBlock("instance_tags", tagsIdx)}
                      </div>
                    );
                  }
                  if (id === "instance_tags" && titleIdx < tagsIdx) {
                    return null;
                  }
                  if (id === "instance_tags" && tagsIdx < titleIdx) {
                    return (
                      <div key="group_tags_title" className="dock-info customizer-dock-info-grouped">
                        {renderBlock("instance_tags", tagsIdx)}
                        {renderBlock("instance_title", titleIdx)}
                      </div>
                    );
                  }
                  if (id === "instance_title" && tagsIdx < titleIdx) {
                    return null;
                  }
                }

                return renderBlock(id, index);
              });
            })()}
          </div>
        </div>

        {selectedId && (
          <div className="customizer-active-item-bar">
            <div className="customizer-active-label">
              <span className="customizer-active-tag">Выбран блок:</span>
              <span className="customizer-active-name">{BOTTOMBAR_ITEMS_META[selectedId]?.title || selectedId}</span>
            </div>
            <div className="customizer-active-actions">
              <button
                type="button"
                className="customizer-active-btn"
                disabled={draftLayout.indexOf(selectedId) === 0}
                onClick={() => {
                  const idx = draftLayout.indexOf(selectedId);
                  if (idx > 0) nudgeItem(idx, -1);
                }}
                title="Сдвинуть влево"
              >
                <ChevronLeft size={14} />
                <span>Влево</span>
              </button>

              <button
                type="button"
                className="customizer-active-btn"
                disabled={draftLayout.indexOf(selectedId) === draftLayout.length - 1}
                onClick={() => {
                  const idx = draftLayout.indexOf(selectedId);
                  if (idx !== -1 && idx < draftLayout.length - 1) nudgeItem(idx, 1);
                }}
                title="Сдвинуть вправо"
              >
                <span>Вправо</span>
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                className="customizer-active-btn customizer-active-delete"
                onClick={() => deleteItem(selectedId)}
                title="Удалить этот блок (Delete / Backspace / ПКМ)"
              >
                <Trash2 size={13} />
                <span>Удалить (Del / ПКМ)</span>
              </button>

              <button
                type="button"
                className="customizer-active-btn customizer-active-deselect"
                onClick={() => setSelectedId(null)}
                title="Снять выделение"
              >
                <span>Снять выделение</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="customizer-bottom-actions-bar">
        <div className="customizer-actions-left">
          <button
            type="button"
            className="customizer-rounded-btn customizer-save-btn"
            onClick={handleSave}
            title="Сохранить изменения нижней панели"
          >
            <Check size={16} />
            <span>Сохранить изменения</span>
          </button>

          <button
            type="button"
            className="customizer-rounded-btn customizer-reset-btn"
            onClick={handleReset}
            title="Сбросить порядок и вернуть все удаленные блоки"
          >
            <RotateCcw size={14} />
            <span>Сбросить по умолчанию</span>
          </button>

          {hasUnsavedChanges && (
            <span className="customizer-dirty-badge">Есть несохраненные изменения</span>
          )}
        </div>

        <div className="customizer-presets-rounded">
          <button
            type="button"
            className="customizer-preset-rounded-btn"
            onClick={() => {
              setDraftLayout([...DEFAULT_BOTTOMBAR_LAYOUT]);
              setDraftAlignment("center");
            }}
          >
            По умолчанию
          </button>
          <button
            type="button"
            className="customizer-preset-rounded-btn"
            onClick={() => {
              setDraftLayout(["play_button", "instance_icon", "instance_title", "instance_tags"]);
              setDraftAlignment("center");
            }}
          >
            Играть слева
          </button>
        </div>
      </div>

      {deletedItems.length > 0 && (
        <div className="customizer-deleted-shelf">
          <div className="customizer-deleted-header">
            <span>Удаленные блоки (нажмите для возврата в панель):</span>
          </div>
          <div className="customizer-deleted-items">
            {deletedItems.map((id) => {
              const meta = BOTTOMBAR_ITEMS_META[id] || { title: id, description: "" };
              return (
                <button
                  key={`restore-bottom-${id}`}
                  type="button"
                  className="customizer-restore-chip"
                  onClick={() => restoreItem(id)}
                  title={`Вернуть «${meta.title}» в панель`}
                >
                  <Plus size={13} />
                  <span>{meta.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
