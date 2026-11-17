import React, { useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import type { CatalogItem, CatalogTab } from "../../services/catalogService";
import type { InstanceData } from "../../types";
import { ipc } from "../../services/ipc";
import { IsometricCube } from "../icons/IsometricCube";
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

function renderCategoryIcon(type: CatalogTab) {
  switch (type) {
    case "shaders":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </svg>
      );
    case "tex":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="9" />
          <path d="m15.5 8.5-2 5-5 2 2-5z" />
        </svg>
      );
    case "mods":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="m12 3 9 5-9 5-9-5z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
      );
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
      ? "Кошик встановлення"
      : lang === "ru"
      ? "Корзина установки"
      : "Installation Queue";

  const targetInstanceText = selectedInstance
    ? `${selectedInstance.name} (${selectedInstance.loader} ${selectedInstance.mcVersion})`
    : lang === "uk"
    ? "Не обрано збірку"
    : lang === "ru"
    ? "Сборка не выбрана"
    : "No instance selected";

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
            <h2 className="cart-modal-title">{titleText}</h2>
            <div className="cart-target-instance-chip" title="Целевая сборка для установки">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
              </svg>
              <span>{targetInstanceText}</span>
            </div>
          </div>
          <button
            type="button"
            className="cart-modal-close-btn"
            onClick={onClose}
            disabled={isInstalling}
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="cart-modal-toolbar">
          <span>
            {lang === "uk" ? "Обрано: " : lang === "ru" ? "Выбрано: " : "Selected: "}
            <b style={{ color: "#f3f4f6" }}>{checkedCount}</b> {lang === "uk" ? "з" : lang === "ru" ? "из" : "of"} {totalCount}
          </span>
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
              {lang === "uk" ? "Очистити кошик" : lang === "ru" ? "Очистить" : "Clear"}
            </button>
          </div>
        </div>

        {/* List of Cart Items */}
        <div className="cart-modal-list">
          {items.length === 0 ? (
            <div className="cart-empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              <span>
                {lang === "uk"
                  ? "Кошик порожній. Оберіть моди, шейдери або текстури в каталозі!"
                  : lang === "ru"
                  ? "Корзина пуста. Выберите моды, шейдеры или текстуры в каталоге!"
                  : "Cart is empty. Select mods, shaders or textures in catalog!"}
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
                      renderCategoryIcon(item.catalogItem.projectType)
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
                        title="Удалить из корзины"
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
                  <span>Установка...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>
                    {lang === "uk"
                      ? `Встановити (${checkedCount})`
                      : lang === "ru"
                      ? `Установить (${checkedCount})`
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
