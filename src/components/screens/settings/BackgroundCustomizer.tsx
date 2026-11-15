import React, { useState } from "react";
import { MINECRAFT_BACKGROUNDS } from "../../../constants/backgrounds";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Check,
  Palette,
} from "lucide-react";
import type { ZoneCustomizationConfig } from "../../../types/menuCustomization";
import { rgbaString, computePanelTheme } from "../../../utils/colorUtils";

interface BackgroundCustomizerProps {
  bgIndex: number;
  isBgAutoPlay: boolean;
  onSelectBg: (index: number) => void;
  onNextBg: () => void;
  onPrevBg: () => void;
  onToggleBgAutoPlay: () => void;
  buttonShapePreset?: string;
  onChangeButtonShapePreset?: (preset: any) => void;
  onFeedback?: (msg: string) => void;
  backgroundCustomization?: ZoneCustomizationConfig;
  onOpenCustomizer?: () => void;
}

export const BackgroundCustomizer: React.FC<BackgroundCustomizerProps> = ({
  bgIndex,
  isBgAutoPlay,
  onSelectBg,
  onNextBg,
  onPrevBg,
  onToggleBgAutoPlay,
  onFeedback,
  backgroundCustomization,
  onOpenCustomizer,
}) => {
  const [bgFilter, setBgFilter] = useState<"all" | "shader" | "official" | "user">("all");

  const activeBg = MINECRAFT_BACKGROUNDS[bgIndex] || MINECRAFT_BACKGROUNDS[0];

  const shaderCount = MINECRAFT_BACKGROUNDS.filter((b) => b.category === "shader").length;
  const officialCount = MINECRAFT_BACKGROUNDS.filter((b) => b.category === "official").length;
  const userCount = MINECRAFT_BACKGROUNDS.filter((b) => b.category === "user").length;

  const filteredBgs = MINECRAFT_BACKGROUNDS.map((bg, originalIndex) => ({
    bg,
    originalIndex,
  })).filter(({ bg }) => {
    if (bgFilter === "all") return true;
    return bg.category === bgFilter;
  });

  return (
    <div className="customizer-container set-bg-customizer-root customizer-rounded-theme">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
        <div>
          <h2>Оформление и фон лаунчера</h2>
          <div className="customizer-sub">
            Управление фоновыми обоями Minecraft, авто-ротацией и оформлением.
          </div>
        </div>

        {onOpenCustomizer && (
          <button
            type="button"
            className={`catalog-customizer-btn ${backgroundCustomization?.enabled ? "active" : ""}`}
            onClick={onOpenCustomizer}
            title="Настроить тонировку, интенсивность и текстуру фона"
          >
            <Palette size={14} />
            <span>Кастомизация тонировки</span>
            {backgroundCustomization?.enabled && (
              <span style={{ fontSize: "11px", opacity: 0.85 }}>({backgroundCustomization.intensity}%)</span>
            )}
          </button>
        )}
      </div>

      <div>
        <div className="set-lab">
          <span>Текущий фон:</span>
          <b>{activeBg.title} ({bgIndex + 1} из {MINECRAFT_BACKGROUNDS.length})</b>
        </div>

        <div className="set-bg-preview-card" style={{ position: "relative", overflow: "hidden" }}>
          <img
            src={activeBg.url}
            alt={activeBg.title}
            className="set-bg-preview-img"
          />

          {backgroundCustomization?.enabled && (() => {
            const t = computePanelTheme(
              backgroundCustomization.color,
              backgroundCustomization.intensity,
              backgroundCustomization.patternIntensity,
              backgroundCustomization.mode
            );
            return (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: t.panelBg,
                  backgroundImage: t.panelPattern,
                  backgroundRepeat: "repeat",
                  backgroundSize: t.panelPatternSize || "66px 66px",
                  backgroundPosition: t.panelPatternPosition || "0 0",
                  opacity: Math.max(0.3, (backgroundCustomization.intensity / 100) * 0.85),
                  pointerEvents: "none",
                  zIndex: 1,
                  mixBlendMode:
                    backgroundCustomization.mode === "light"
                      ? "screen"
                      : backgroundCustomization.mode === "dynamic"
                      ? "color"
                      : "multiply",
                }}
              />
            );
          })()}
          <div className="set-bg-preview-overlay">
            <div className="set-bg-preview-badges">
              <span className="set-bg-cat-chip">
                {activeBg.category === "shader"
                  ? "Шейдеры"
                  : activeBg.category === "official"
                  ? "Официальный арт"
                  : "Скриншот"}
              </span>
              <span className="set-bg-index-chip">
                {bgIndex + 1} / {MINECRAFT_BACKGROUNDS.length}
              </span>
            </div>
            <div className="set-bg-preview-info">
              <div className="set-bg-preview-title">{activeBg.title}</div>
              <div className="set-bg-preview-sub">{activeBg.subtitle}</div>
            </div>
          </div>
        </div>

        <div className="set-bg-ctrl-bar">
          <button
            type="button"
            className="set-b set-bg-btn set-bg-rounded-btn"
            onClick={() => {
              onPrevBg();
            }}
            title="Переключить на предыдущий фон"
          >
            <ChevronLeft size={16} />
            <span>Предыдущий</span>
          </button>

          <div className="set-bg-counter-box">
            <span className="set-bg-counter-num">{bgIndex + 1}</span>
            <span className="set-bg-counter-sep">/</span>
            <span className="set-bg-counter-total">{MINECRAFT_BACKGROUNDS.length}</span>
          </div>

          <button
            type="button"
            className="set-b set-bg-btn set-bg-rounded-btn"
            onClick={() => {
              onNextBg();
            }}
            title="Переключить на следующий фон"
          >
            <span>Следующий</span>
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className={`set-b set-bg-btn set-bg-autoplay-btn set-bg-rounded-btn ${isBgAutoPlay ? "active" : ""}`}
            onClick={() => {
              onToggleBgAutoPlay();
            }}
            title={isBgAutoPlay ? "Отключить авто-смену фонов" : "Включить авто-смену фонов каждые 28 сек"}
          >
            {isBgAutoPlay ? <Pause size={14} /> : <Play size={14} />}
            <span>{isBgAutoPlay ? "Авто-смена: Вкл (28с)" : "Авто-смена: Выкл"}</span>
          </button>
        </div>
      </div>

      <div>
        <div className="set-lab">
          <span>Коллекция фонов Minecraft:</span>
          <small className="set-lab-hint">Кликните по карточке для выбора</small>
        </div>

        <div className="set-bg-filters">
          <button
            type="button"
            className={`set-bg-filter-chip ${bgFilter === "all" ? "on" : ""}`}
            onClick={() => setBgFilter("all")}
          >
            <span>Все</span>
            <span className="set-bg-filter-count">{MINECRAFT_BACKGROUNDS.length}</span>
          </button>
          <button
            type="button"
            className={`set-bg-filter-chip ${bgFilter === "shader" ? "on" : ""}`}
            onClick={() => setBgFilter("shader")}
          >
            <span>Шейдеры</span>
            <span className="set-bg-filter-count">{shaderCount}</span>
          </button>
          <button
            type="button"
            className={`set-bg-filter-chip ${bgFilter === "official" ? "on" : ""}`}
            onClick={() => setBgFilter("official")}
          >
            <span>Официальные</span>
            <span className="set-bg-filter-count">{officialCount}</span>
          </button>
          <button
            type="button"
            className={`set-bg-filter-chip ${bgFilter === "user" ? "on" : ""}`}
            onClick={() => setBgFilter("user")}
          >
            <span>Скриншоты</span>
            <span className="set-bg-filter-count">{userCount}</span>
          </button>
        </div>

        <div className="set-bg-grid">
          {filteredBgs.map(({ bg, originalIndex }) => {
            const isSelected = originalIndex === bgIndex;
            return (
              <button
                key={bg.id}
                type="button"
                className={`set-bg-card set-bg-rounded-card ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onSelectBg(originalIndex);
                }}
              >
                <div className="set-bg-thumb-wrap">
                  <img src={bg.url} alt={bg.title} className="set-bg-thumb" loading="lazy" />
                  {isSelected && (
                    <div className="set-bg-selected-badge">
                      <Check size={12} strokeWidth={3} />
                      <span>Активен</span>
                    </div>
                  )}
                  <span className="set-bg-card-cat">
                    {bg.category === "shader"
                      ? "Шейдеры"
                      : bg.category === "official"
                      ? "Официальный"
                      : "Скриншот"}
                  </span>
                </div>
                <div className="set-bg-card-info">
                  <div className="set-bg-card-title">{bg.title}</div>
                  <div className="set-bg-card-sub">{bg.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
