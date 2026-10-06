import React, { useEffect, useState } from "react";
import {
  ANIMATION_CATALOG,
  type AnimationId,
  type EmoteDefinition,
} from "../../utils/skinAnimations";
import { IconX } from "../../ui/icons";

interface AnimationWheelModalProps {
  isOpen: boolean;
  currentAnimation: AnimationId | string;
  onSelectAnimation: (id: AnimationId) => void;
  onClose: () => void;
  t: any;
}

export const AnimationWheelModal: React.FC<AnimationWheelModalProps> = ({
  isOpen,
  currentAnimation,
  onSelectAnimation,
  onClose,
  t,
}) => {
  const [hoveredEmote, setHoveredEmote] = useState<EmoteDefinition | null>(
    () => {
      return (
        ANIMATION_CATALOG.find((e) => e.id === currentAnimation) ||
        ANIMATION_CATALOG[0]
      );
    },
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const match = ANIMATION_CATALOG.find((e) => e.id === currentAnimation);
    if (match) {
      setHoveredEmote(match);
    }
  }, [currentAnimation]);

  if (!isOpen) return null;

  const radius = 205;
  const count = ANIMATION_CATALOG.length;

  return (
    <div
      className="anim-wheel-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="anim-wheel-backdrop-glow"
        aria-hidden="true"
      />

      <div
        className="anim-wheel-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="anim-wheel-topbar">
          <div className="anim-wheel-title-group">
            <span className="anim-wheel-kbd">B</span>
            <span className="anim-wheel-heading">
              {t.emotesTitle || "Колесо анимаций"}
            </span>
          </div>
          <button
            type="button"
            className="anim-wheel-close-btn"
            onClick={onClose}
            title={t.cancel || "Закрыть"}
          >
            <IconX />
          </button>
        </div>

        {/* Circular Wheel Stage */}
        <div className="anim-wheel-stage">
          {/* Radial items */}
          {ANIMATION_CATALOG.map((emote, idx) => {
            const angleDeg = (idx * (360 / count)) - 90;
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = Math.round(Math.cos(angleRad) * radius);
            const y = Math.round(Math.sin(angleRad) * radius);
            const isSelected = currentAnimation === emote.id;
            const isHovered = hoveredEmote?.id === emote.id;

            return (
              <button
                key={emote.id}
                type="button"
                className={`anim-wheel-sector-btn ${
                  isSelected ? "selected" : ""
                } ${isHovered ? "hovered" : ""}`}
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
                onMouseEnter={() => setHoveredEmote(emote)}
                onClick={() => {
                  onSelectAnimation(emote.id);
                  onClose();
                }}
                title={emote.nameRu}
              >
                <div className="sector-icon">{emote.icon}</div>
                <div className="sector-name">{emote.nameRu}</div>
                {isSelected && <div className="sector-active-dot" />}
              </button>
            );
          })}

          {/* Central Hub */}
          <div className="anim-wheel-center-hub">
            <div className="hub-art-wrap">
              <span className="hub-icon">
                {hoveredEmote?.icon || "🕺"}
              </span>
            </div>
            <div className="hub-info">
              <span className="hub-name">
                {hoveredEmote?.nameRu || "Выберите эмоцию"}
              </span>
              <span className="hub-sub">
                {hoveredEmote?.nameEn || ""}
              </span>
              <p className="hub-desc">
                {hoveredEmote?.descriptionRu || ""}
              </p>
            </div>

            <div className="hub-actions">
              <button
                type="button"
                className={`hub-reset-btn ${currentAnimation === "idle" ? "active" : ""}`}
                onClick={() => {
                  onSelectAnimation("idle");
                  onClose();
                }}
              >
                <span>{t.resetIdle || "Сброс (Idle)"}</span>
              </button>
            </div>

            <div className="hub-keyhint">
              <span>{t.pressBToClose || "Нажмите [B] или ESC для закрытия"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
