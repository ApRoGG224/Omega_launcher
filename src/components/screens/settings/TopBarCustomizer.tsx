import React, { useState, useEffect, useRef } from "react";
import {
  type TopBarItemId,
  DEFAULT_TOPBAR_LAYOUT,
  TOPBAR_ITEMS_META,
  getTopBarItemMeta,
} from "../../../constants/launcherLayout";
import { useLanguage } from "../../../context/LanguageContext";
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Play,
  Package,
  Puzzle,
  Server,
  ShoppingBag,
  Terminal,
  Users,
  Settings,
  Sparkles,
  Check,
  Trash2,
  Plus,
  Palette,
  User,
} from "lucide-react";
import { SkinHeadAvatar } from "../../common/SkinHeadAvatar";
import { InstanceAvatarIcon } from "../../icons/MinecraftIcons";
import type { AccountData, InstanceData } from "../../../types";
import type { ZoneCustomizationConfig } from "../../../types/menuCustomization";
import { rgbaString, computePanelTheme } from "../../../utils/colorUtils";

interface TopBarCustomizerProps {
  layout?: TopBarItemId[];
  onSave?: (layout: TopBarItemId[]) => void;
  onReset?: () => void;
  account?: AccountData | null;
  skinUrl?: string;
  selectedInstance?: InstanceData | null;
  instances?: InstanceData[];
  onFeedback?: (msg: string) => void;
  topBarCustomization?: ZoneCustomizationConfig;
  onOpenCustomizer?: () => void;
}

export const TopBarCustomizer: React.FC<TopBarCustomizerProps> = ({
  layout = DEFAULT_TOPBAR_LAYOUT,
  onSave,
  onReset,
  account,
  skinUrl = "/skins/dream.png",
  selectedInstance,
  instances = [],
  onFeedback,
  topBarCustomization,
  onOpenCustomizer,
}) => {
  const { t, lang } = useLanguage();
  const [draftLayout, setDraftLayout] = useState<TopBarItemId[]>(() => [...layout]);
  const [selectedId, setSelectedId] = useState<TopBarItemId | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLElement>(null);
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
  }, [draftLayout]);

  useEffect(() => {
    setDraftLayout([...layout]);
  }, [layout]);

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

  const hasUnsavedChanges = JSON.stringify(draftLayout) !== JSON.stringify(layout);

  const deletedItems = DEFAULT_TOPBAR_LAYOUT.filter((id) => !draftLayout.includes(id));

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

  const deleteItem = (idToDelete: TopBarItemId) => {
    setDraftLayout((prev) => prev.filter((id) => id !== idToDelete));
    if (selectedId === idToDelete) {
      setSelectedId(null);
    }
  };

  const restoreItem = (idToRestore: TopBarItemId) => {
    setDraftLayout((prev) => [...prev, idToRestore]);
  };

  const handleSave = () => {
    onSave?.(draftLayout);
  };

  const handleReset = () => {
    setDraftLayout([...DEFAULT_TOPBAR_LAYOUT]);
    setSelectedId(null);
    onReset?.();
  };

  const handleItemClick = (id: TopBarItemId, index: number) => {
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

  const renderDockItemContent = (id: TopBarItemId) => {
    switch (id) {
      case "profile":
        return (
          <div className="hud-dock-profile-btn" style={{ pointerEvents: "none" }}>
            <ChevronRight size={13} className="hud-dock-profile-chevron" style={{ transform: "rotate(90deg)" }} />
            <span className="hud-dock-profile-name">{account?.name ?? "Гость"}</span>
            <div className="hud-dock-profile-avatar">
              <SkinHeadAvatar skinUrl={skinUrl} size={26} />
            </div>
          </div>
        );

      case "divider_profile":
      case "divider_shortcuts":
      case "divider_friends":
        return (
          <div
            className={id === "divider_profile" ? "hud-dock-divider-mini" : "hud-dock-divider"}
            style={{ pointerEvents: "none" }}
          />
        );

      case "play":
        return (
          <div className="hud-dock-btn hud-dock-play active" style={{ pointerEvents: "none" }}>
            <Play size={16} fill="currentColor" />
          </div>
        );

      case "settings":
        return (
          <div className="hud-dock-btn" style={{ pointerEvents: "none" }}>
            <Settings size={18} />
          </div>
        );

      case "modrinth":
        return (
          <div className="hud-dock-btn" style={{ pointerEvents: "none" }}>
            <Puzzle size={18} />
          </div>
        );

      case "instances":
        return (
          <div className="hud-dock-btn" style={{ pointerEvents: "none" }}>
            <Package size={18} />
          </div>
        );

      case "servers":
        return (
          <div className="hud-dock-btn" style={{ pointerEvents: "none" }}>
            <Server size={18} />
          </div>
        );

      case "store":
        return (
          <div className="hud-dock-btn" style={{ pointerEvents: "none" }}>
            <ShoppingBag size={18} />
          </div>
        );

      case "console":
        return (
          <div className="hud-dock-btn" style={{ pointerEvents: "none" }}>
            <Terminal size={18} />
          </div>
        );

      case "shortcuts":
        return (
          <div className="hud-dock-shortcuts" style={{ pointerEvents: "none" }}>
            {(instances.length > 0 ? instances.slice(0, 4) : [
              { id: "inst_rust_beta", name: "Minecraft Rust (Beta)", icon: "obsidian" },
              { id: "inst_1", name: "test1", icon: "end_crystal" },
              { id: "inst_2", name: "Survival 1.20", icon: "diamond_pickaxe" },
              { id: "inst_3", name: "Omega PvP Pack", icon: "diamond_sword" },
            ]).map((inst) => (
              <div key={inst.id} className="hud-dock-shortcut-btn">
                <div className={`hud-shortcut-badge ${inst.icon || "diamond_sword"}`}>
                  <InstanceAvatarIcon icon={inst.icon} size={22} />
                </div>
              </div>
            ))}
          </div>
        );

      case "friends":
        return (
          <div className="hud-dock-btn" style={{ pointerEvents: "none" }}>
            <Users size={18} />
            <span className="hud-dock-badge">2</span>
          </div>
        );

      case "chevron":
        return (
          <div className="hud-dock-btn hud-dock-chevron" style={{ pointerEvents: "none" }}>
            <ChevronRight size={16} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="customizer-container customizer-rounded-theme">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
        <div>
          <h2>{t("topbarCustomizerTitle", "Налаштування верхньої панелі навігації")}</h2>
          <div className="customizer-sub">
            {t(
              "topbarCustomizerSub",
              "Натискайте на стрілки або перетягуйте для автоматичного переміщення. Натисніть правою кнопкою миші або Delete для видалення будь-якого елемента."
            )}
          </div>
        </div>

        {onOpenCustomizer && (
          <button
            type="button"
            className={`catalog-customizer-btn ${topBarCustomization?.enabled ? "active" : ""}`}
            onClick={onOpenCustomizer}
            title={t("styleCustomizationTitle", "Налаштувати колір, інтенсивність та текстуру панелі")}
          >
            <Palette size={14} />
            <span>{t("styleCustomizationBtn", "Кастомізація стилю")}</span>
            {topBarCustomization?.enabled && (
              <span style={{ fontSize: "11px", opacity: 0.85 }}>({topBarCustomization.intensity}%)</span>
            )}
          </button>
        )}
      </div>

      <div className="customizer-preview-box">
        <div className="customizer-preview-header">
          <div className="customizer-preview-title">
            <Sparkles size={14} />
            <span>{t("topbarPreviewTitle", "Попередній перегляд верхньої панелі")}</span>
          </div>
          <span className="customizer-preview-hint">
            {t("topbarPreviewHint", "ПКМ або Delete — видалити елемент | Клік або стрілки — автопереміщення")}
          </span>
        </div>

        <div className="customizer-preview-canvas" ref={canvasRef}>
          <nav
            ref={dockRef}
            className={`hud-top-dock customizer-dock-preview ${topBarCustomization?.enabled ? "custom-theme-active" : ""}`}
            style={
              topBarCustomization?.enabled
                ? (() => {
                    const ct = computePanelTheme(
                      topBarCustomization.color,
                      topBarCustomization.intensity,
                      topBarCustomization.patternIntensity,
                      topBarCustomization.mode
                    );
                    return {
                      backgroundColor: ct.panelBg,
                      borderColor: ct.panelBorder,
                      ["--custom-topbar-bg" as any]: ct.panelBg,
                      ["--custom-topbar-border" as any]: ct.panelBorder,
                      ["--custom-topbar-pattern" as any]: ct.panelPattern,
                      ["--custom-topbar-pattern-size" as any]: ct.panelPatternSize,
                      ["--custom-topbar-pattern-pos" as any]: ct.panelPatternPosition,
                      ["--custom-topbar-pattern-opacity" as any]: ct.panelPatternOpacity,
                      ["--custom-topbar-btn-bg" as any]: ct.itemBg,
                      ["--custom-topbar-btn-border" as any]: ct.itemBorder,
                      ["--custom-topbar-btn-hover" as any]: ct.itemHover,
                      ["--custom-topbar-btn-active" as any]: ct.itemActive,
                      ["--custom-topbar-btn-play" as any]: ct.itemPlay,
                      ["--custom-topbar-btn-active-border" as any]: ct.itemActiveBorder,
                      ["--custom-topbar-accent" as any]: ct.accentColor,
                    };
                  })()
                : undefined
            }
            aria-label="Interactive Navigation Bar"
          >
            {draftLayout.map((id, index) => {
              const isSelected = selectedId === id;
              const isDragging = draggingIdx === index;
              const isDivider = id.startsWith("divider_");
              const meta = getTopBarItemMeta(id, lang);

              return (
                <div
                  key={`${id}-${index}`}
                  tabIndex={0}
                  className={`customizer-dock-item-wrapper ${isDivider ? "customizer-divider-slot" : ""} ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
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
                  title={`${meta.title} ${t("itemHoverHint", "(Клікніть для вибору, стрілки ◀/▶ для зсуву, ПКМ для видалення)")}`}
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
                      title={t("itemNudgeLeft", "Зсунути вліво")}
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
                      title={t("itemDeleteTooltip", "Видалити цей елемент (ПКМ / Delete)")}
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
                      title={t("itemNudgeRight", "Зсунути вправо")}
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  <div className="customizer-dock-item-body">
                    {renderDockItemContent(id)}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {selectedId && (
          <div className="customizer-active-item-bar">
            <div className="customizer-active-label">
              <span className="customizer-active-tag">{t("itemSelectedLabel", "Обрано елемент:")}</span>
              <span className="customizer-active-name">{getTopBarItemMeta(selectedId, lang).title || selectedId}</span>
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
                title={t("itemNudgeLeft", "Зсунути вліво")}
              >
                <ChevronLeft size={14} />
                <span>{t("itemNudgeLeftBtn", "Вліво")}</span>
              </button>

              <button
                type="button"
                className="customizer-active-btn"
                disabled={draftLayout.indexOf(selectedId) === draftLayout.length - 1}
                onClick={() => {
                  const idx = draftLayout.indexOf(selectedId);
                  if (idx !== -1 && idx < draftLayout.length - 1) nudgeItem(idx, 1);
                }}
                title={t("itemNudgeRight", "Зсунути вправо")}
              >
                <span>{t("itemNudgeRightBtn", "Вправо")}</span>
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                className="customizer-active-btn customizer-active-delete"
                onClick={() => deleteItem(selectedId)}
                title={t("itemDeleteTooltip", "Видалити цей елемент (Delete / Backspace / ПКМ)")}
              >
                <Trash2 size={13} />
                <span>{t("itemDeleteBtn", "Видалити (Del / ПКМ)")}</span>
              </button>

              <button
                type="button"
                className="customizer-active-btn customizer-active-deselect"
                onClick={() => setSelectedId(null)}
                title={t("itemDeselectBtn", "Зняти виділення")}
              >
                <span>{t("itemDeselectBtn", "Зняти виділення")}</span>
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
            title={t("topbarSaveTooltip", "Зберегти зміни верхньої панелі")}
          >
            <Check size={16} />
            <span>{t("saveChangesBtn", "Зберегти зміни")}</span>
          </button>

          <button
            type="button"
            className="customizer-rounded-btn customizer-reset-btn"
            onClick={handleReset}
            title={t("topbarResetTooltip", "Скинути порядок і повернути всі видалені елементи")}
          >
            <RotateCcw size={14} />
            <span>{t("resetDefaultBtn", "Скинути за замовчуванням")}</span>
          </button>

          {hasUnsavedChanges && (
            <span className="customizer-dirty-badge">{t("unsavedChangesBadge", "Є незбережені зміни")}</span>
          )}
        </div>

        <div className="customizer-presets-rounded">
          <button
            type="button"
            className="customizer-preset-rounded-btn"
            onClick={() => {
              setDraftLayout([...DEFAULT_TOPBAR_LAYOUT]);
            }}
          >
            {t("presetDefault", "За замовчуванням")}
          </button>
          <button
            type="button"
            className="customizer-preset-rounded-btn"
            onClick={() => {
              const filtered = draftLayout.filter((id) => id !== "play" && id !== "profile" && id !== "divider_profile");
              setDraftLayout(["play", "profile", "divider_profile", ...filtered]);
            }}
          >
            {t("presetPlayFirst", "Грати першою")}
          </button>
          <button
            type="button"
            className="customizer-preset-rounded-btn"
            onClick={() => {
              setDraftLayout(draftLayout.filter((id) => !id.startsWith("divider_")));
            }}
          >
            {t("presetNoDividers", "Без роздільників")}
          </button>
        </div>
      </div>

      {deletedItems.length > 0 && (
        <div className="customizer-deleted-shelf">
          <div className="customizer-deleted-header">
            <span>{t("deletedItemsShelfTitle", "Видалені елементи (натисніть для повернення в панель):")}</span>
          </div>
          <div className="customizer-deleted-items">
            {deletedItems.map((id) => {
              const meta = getTopBarItemMeta(id, lang);
              return (
                <button
                  key={`restore-${id}`}
                  type="button"
                  className="customizer-restore-chip"
                  onClick={() => restoreItem(id)}
                  title={`${t("restoreItemTooltip", "Повернути в панель")}: «${meta.title}»`}
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
