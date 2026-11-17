import React, { useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import type { CatalogItem, CatalogTab } from "../../services/catalogService";
import type { InstanceData } from "../../types";
import { ipc } from "../../services/ipc";
import { IsometricCube } from "../icons/IsometricCube";
import { InstanceAvatarIcon } from "../icons/MinecraftIcons";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/cart-modal.css";

export interface CartItem {
  id: string; // unique key e.g. `${item.source}-${item.id}`
  catalogItem: CatalogItem;
  checked: boolean;
  status: "idle" | "installing" | "done" | "error";
  errorMessage?: string;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onToggleItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClearCart: () => void;
  selectedInstance: InstanceData | null;
  onInstallSuccess: (installedItems: CartItem[]) => void;
  onPushLog?: (message: string, level?: "INFO" | "WARN" | "ERROR") => void;
}

function renderCategoryFallback(type: CatalogTab) {
  switch (type) {
    case "shaders":
      return <IsometricCube size={20} variant="diamond" />;
    case "tex":
      return <IsometricCube size={20} variant="obsidian" />;
    case "mods":
    default:
      return <IsometricCube size={20} variant="stone" />;
  }
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  items,
  onToggleItem,
  onRemoveItem,
  onSelectAll,
  onDeselectAll,
  onClearCart,
  selectedInstance,
  onInstallSuccess,
  onPushLog,
}) => {
  const { lang } = useLanguage();
  const [isInstalling, setIsInstalling] = useState(false);
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const [currentProgressTotal, setCurrentProgressTotal] = useState(0);
  const [currentProgressTitle, setCurrentProgressTitle] = useState("");
  const [overallSuccess, setOverallSuccess] = useState(false);
  const [itemStatuses, setItemStatuses] = useState<
    Record<string, { status: "idle" | "installing" | "done" | "error"; error?: string }>
  >({});

  const checkedItems = useMemo(() => items.filter((i) => i.checked), [items]);

  const handleStartInstall = useCallback(async () => {
    if (!selectedInstance) {
      alert("Сначала выберите сборку или версию для установки!");
      return;
    }
    const toInstall = items.filter((i) => i.checked && itemStatuses[i.id]?.status !== "done");
    if (toInstall.length === 0) return;

    setIsInstalling(true);
    setOverallSuccess(false);
    setCurrentProgressTotal(toInstall.length);

    const successfullyInstalled: CartItem[] = [];

    for (let idx = 0; idx < toInstall.length; idx++) {
      const item = toInstall[idx];
      setCurrentProgressIndex(idx + 1);
      setCurrentProgressTitle(item.catalogItem.title);

      setItemStatuses((prev) => ({
        ...prev,
        [item.id]: { status: "installing" },
      }));

      const pType =
        item.catalogItem.projectType === "shaders"
          ? "shader"
          : item.catalogItem.projectType === "tex"
          ? "resourcepack"
          : "mod";

      const modId = item.catalogItem.slug || item.catalogItem.id;

      onPushLog?.(
        `[DOWNLOADER] Установка "${item.catalogItem.title}" (${pType}) в версию "${selectedInstance.name}"...`,
        "INFO"
      );

      try {
        await ipc.downloadMod({
          modId,
          mcVersion: selectedInstance.mcVersion,
          loader: selectedInstance.loader.toLowerCase(),
          instanceId: selectedInstance.id,
          projectType: pType,
        });

        setItemStatuses((prev) => ({
          ...prev,
          [item.id]: { status: "done" },
        }));
        successfullyInstalled.push(item);
        onPushLog?.(
          `[DOWNLOADER] "${item.catalogItem.title}" успешно установлен!`,
          "INFO"
        );
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (errMsg.includes("ALREADY_EXISTS")) {
          setItemStatuses((prev) => ({
            ...prev,
            [item.id]: { status: "done" },
          }));
          successfullyInstalled.push(item);
          onPushLog?.(
            `[DOWNLOADER] "${item.catalogItem.title}" уже существует в папке сборки`,
            "INFO"
          );
        } else {
          setItemStatuses((prev) => ({
            ...prev,
            [item.id]: { status: "error", error: errMsg },
          }));
          onPushLog?.(
            `[DOWNLOADER] Ошибка загрузки "${item.catalogItem.title}": ${errMsg}`,
            "ERROR"
          );
        }
      }
    }

    setIsInstalling(false);
    if (successfullyInstalled.length > 0) {
      setOverallSuccess(true);
      onInstallSuccess(successfullyInstalled);
    }
  }, [selectedInstance, items, itemStatuses, onPushLog, onInstallSuccess]);

  if (!isOpen) return null;

  const totalCount = items.length;
  const checkedCount = checkedItems.length;

  const titleText =
    lang === "uk"
      ? "Черга встановлення"
      : lang === "ru"
      ? "Очередь установки"
      : "Installation Queue";

  return createPortal(
    <div
      className="cart-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isInstalling) {
          onClose();
        }
      }}
    >
      <div className="cart-modal-dialog" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="cart-modal-header">
          <div className="cart-modal-title-wrap">
            <div className="cart-modal-header-icon">
              <IsometricCube size={24} variant="grass" />
            </div>
            <div className="cart-modal-title-col">
              <h2 className="cart-modal-title">{titleText}</h2>
              {selectedInstance && (
                <div className="cart-target-instance-chip" title="Целевая сборка для установки">
                  <InstanceAvatarIcon icon={selectedInstance.icon || "diamond_sword"} size={14} />
                  <span>{selectedInstance.name} ({selectedInstance.loader} {selectedInstance.mcVersion})</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="cart-modal-close-btn"
            onClick={onClose}
            disabled={isInstalling}
            title={lang === "uk" ? "Закрити" : lang === "ru" ? "Закрыть" : "Close"}
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="cart-modal-toolbar">
          <div className="cart-toolbar-stats">
            <span>
              {lang === "uk" ? "Обрано для встановлення: " : lang === "ru" ? "Выбрано для установки: " : "Selected: "}
              <b style={{ color: "#f3f4f6" }}>{checkedCount}</b> {lang === "uk" ? "з" : lang === "ru" ? "из" : "of"} {totalCount}
            </span>
          </div>
          <div className="cart-toolbar-actions">
            <button
              type="button"
              className="cart-toolbar-btn"
              onClick={onSelectAll}
              disabled={isInstalling || totalCount === 0}
            >
              {lang === "uk" ? "Вибрати всі" : lang === "ru" ? "Выбрать все" : "Select all"}
            </button>
            <button
              type="button"
              className="cart-toolbar-btn"
              onClick={onDeselectAll}
              disabled={isInstalling || totalCount === 0}
            >
              {lang === "uk" ? "Зняти всі" : lang === "ru" ? "Снять все" : "Deselect all"}
            </button>
            <button
              type="button"
              className="cart-toolbar-btn clear"
              onClick={onClearCart}
              disabled={isInstalling || totalCount === 0}
            >
              {lang === "uk" ? "Очистити список" : lang === "ru" ? "Очистить список" : "Clear"}
            </button>
          </div>
        </div>

        {/* List of Cart Items */}
        <div className="cart-modal-list">
          {items.length === 0 ? (
            <div className="cart-empty-state">
              <IsometricCube size={40} variant="stone" />
              <span>
                {lang === "uk"
                  ? "Черга порожня. Натисніть «+ Встановити» на будь-якому моді, шейдері або текстурах у каталозі!"
                  : lang === "ru"
                  ? "Очередь пуста. Нажмите «+ Установить» на любом моде, шейдере или текстурах в каталоге!"
                  : "Queue is empty. Click '+ Install' on any mod, shader or texture in the catalog!"}
              </span>
            </div>
          ) : (
            items.map((item) => {
              const statusInfo = itemStatuses[item.id] || { status: item.status };
              const isChecked = item.checked;
              const typeLabel =
                item.catalogItem.projectType === "shaders"
                  ? lang === "uk" ? "Шейдер" : lang === "ru" ? "Шейдер" : "Shader"
                  : item.catalogItem.projectType === "tex"
                  ? lang === "uk" ? "Текстури" : lang === "ru" ? "Текстуры" : "Texture"
                  : lang === "uk" ? "Мод" : lang === "ru" ? "Мод" : "Mod";

              const typeBadgeClass =
                item.catalogItem.projectType === "shaders"
                  ? "type-shader"
                  : item.catalogItem.projectType === "tex"
                  ? "type-tex"
                  : "type-mod";

              return (
                <div
                  key={item.id}
                  className={`cart-modal-item ${!isChecked ? "unchecked" : ""} ${
                    statusInfo.status === "done" ? "done" : ""
                  } ${statusInfo.status === "error" ? "error" : ""}`}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={`cart-item-checkbox ${isChecked ? "checked" : ""}`}
                    onClick={() => {
                      if (!isInstalling) onToggleItem(item.id);
                    }}
                    title={isChecked ? "Исключить из установки" : "Включить в установку"}
                  >
                    {isChecked && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="cart-item-thumb">
                    {item.catalogItem.iconUrl ? (
                      <img src={item.catalogItem.iconUrl} alt="" loading="lazy" />
                    ) : (
                      renderCategoryFallback(item.catalogItem.projectType)
                    )}
                  </div>

                  {/* Info */}
                  <div className="cart-item-info">
                    <div className="cart-item-title-row">
                      <div className="cart-item-title" title={item.catalogItem.title}>
                        {item.catalogItem.title}
                      </div>
                    </div>
                    <div className="cart-item-badges">
                      <span className={`cart-badge ${typeBadgeClass}`}>{typeLabel}</span>
                      <span
                        className={`cart-badge ${
                          item.catalogItem.source === "Modrinth" ? "src-modrinth" : "src-curseforge"
                        }`}
                      >
                        {item.catalogItem.source}
                      </span>
                    </div>
                  </div>

                  {/* Action / Status */}
                  <div className="cart-item-action">
                    {statusInfo.status === "installing" ? (
                      <div className="cart-item-status-spinner">
                        <IsometricCube size={16} variant="rust" />
                        <span>Загрузка...</span>
                      </div>
                    ) : statusInfo.status === "done" ? (
                      <div className="cart-item-status-done">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Установлено</span>
                      </div>
                    ) : statusInfo.status === "error" ? (
                      <div className="cart-item-status-error" title={statusInfo.error}>
                        <span>⚠ {statusInfo.error || "Ошибка"}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="cart-item-remove-btn"
                        onClick={() => onRemoveItem(item.id)}
                        disabled={isInstalling}
                        title="Удалить из очереди"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="cart-modal-footer">
          {isInstalling && (
            <div className="cart-progress-box">
              <div className="cart-progress-header">
                <span>
                  Установка {currentProgressIndex} из {currentProgressTotal}:{" "}
                  <b style={{ color: "#93c5fd" }}>{currentProgressTitle}</b>
                </span>
                <span>
                  {Math.round(((currentProgressIndex - 0.5) / (currentProgressTotal || 1)) * 100)}%
                </span>
              </div>
              <div className="cart-progress-bar-track">
                <div
                  className="cart-progress-bar-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((currentProgressIndex) / (currentProgressTotal || 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {overallSuccess && !isInstalling && (
            <div style={{ color: "#4ade80", fontSize: "12.5px", fontWeight: 700, textAlign: "center" }}>
              ✓ Все выбранные элементы успешно установлены в сборку!
            </div>
          )}

          <div className="cart-footer-buttons">
            <button
              type="button"
              className="cart-btn-cancel"
              onClick={onClose}
              disabled={isInstalling}
            >
              {overallSuccess
                ? lang === "uk" ? "Готово" : lang === "ru" ? "Готово" : "Done"
                : lang === "uk" ? "Закрити" : lang === "ru" ? "Закрыть" : "Close"}
            </button>
            <button
              type="button"
              className="cart-btn-install"
              onClick={handleStartInstall}
              disabled={isInstalling || checkedCount === 0 || !selectedInstance}
            >
              {isInstalling ? (
                <>
                  <IsometricCube size={18} variant="rust" />
                  <span>
                    {lang === "uk" ? "Встановлення..." : lang === "ru" ? "Установка..." : "Installing..."}
                  </span>
                </>
              ) : (
                <>
                  <IsometricCube size={16} variant="grass" />
                  <span>
                    {lang === "uk"
                      ? `Встановити в збірку (${checkedCount})`
                      : lang === "ru"
                      ? `Установить в сборку (${checkedCount})`
                      : `Install (${checkedCount})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
