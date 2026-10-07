import React, { useEffect, useRef, useState, useCallback } from "react";
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const radiusOuter = 150;
  const radiusInner = 50;
  const centerCoord = 170; // SVG viewBox 340x340

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Deadzone in the center (empty hole)
      if (distance < (radiusInner * (rect.width / 340))) {
        setHoveredIndex(null);
        return;
      }

      // Beyond outer edge tolerance
      if (distance > (radiusOuter * (rect.width / 340) * 1.5)) {
        setHoveredIndex(null);
        return;
      }

      // Calculate angle from 12 o'clock (-90 deg) clockwise
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;

      const sectorAngle = 360 / ANIMATION_CATALOG.length; // 45 deg
      const index = Math.floor(deg / sectorAngle) % ANIMATION_CATALOG.length;
      setHoveredIndex(index);
    },
    [],
  );

  const handleSelect = useCallback(
    (index: number | null) => {
      if (index !== null && ANIMATION_CATALOG[index]) {
        onSelectAnimation(ANIMATION_CATALOG[index].id);
      }
      onClose();
    },
    [onSelectAnimation, onClose],
  );

  useEffect(() => {
    if (!isOpen) {
      setHoveredIndex(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyB") {
        e.preventDefault();
        // If a sector was hovered while holding B, activate it on release!
        setHoveredIndex((curr) => {
          if (curr !== null && ANIMATION_CATALOG[curr]) {
            onSelectAnimation(ANIMATION_CATALOG[curr].id);
          }
          onClose();
          return null;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isOpen, onClose, onSelectAnimation]);

  if (!isOpen) return null;

  const count = ANIMATION_CATALOG.length;
  const sectorAngle = 360 / count;
  const activeEmote = hoveredIndex !== null ? ANIMATION_CATALOG[hoveredIndex] : null;

  return (
    <div
      className="anim-wheel-overlay"
      onClick={() => handleSelect(hoveredIndex)}
      onPointerMove={handlePointerMove}
      role="dialog"
      aria-modal="true"
    >
      <div className="anim-wheel-backdrop-glow" aria-hidden="true" />

      <div
        className="anim-wheel-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
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

        {/* Circular Wheel Stage with SVG Pie */}
        <div
          ref={containerRef}
          className="anim-wheel-stage-donut"
          onPointerMove={handlePointerMove}
          onClick={() => handleSelect(hoveredIndex)}
        >
          <svg
            className="anim-wheel-svg"
            viewBox="0 0 340 340"
            width="340"
            height="340"
          >
            <defs>
              <filter id="notch-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Slices */}
            {ANIMATION_CATALOG.map((emote, idx) => {
              const startAngle = (idx * sectorAngle - 90) * (Math.PI / 180);
              const endAngle = ((idx + 1) * sectorAngle - 90) * (Math.PI / 180);
              const isHovered = hoveredIndex === idx;
              const isCurrent = currentAnimation === emote.id;

              const rOut = isHovered ? radiusOuter + 8 : radiusOuter;
              const rIn = radiusInner;

              const x1 = centerCoord + rIn * Math.cos(startAngle);
              const y1 = centerCoord + rIn * Math.sin(startAngle);
              const x2 = centerCoord + rOut * Math.cos(startAngle);
              const y2 = centerCoord + rOut * Math.sin(startAngle);
              const x3 = centerCoord + rOut * Math.cos(endAngle);
              const y3 = centerCoord + rOut * Math.sin(endAngle);
              const x4 = centerCoord + rIn * Math.cos(endAngle);
              const y4 = centerCoord + rIn * Math.sin(endAngle);

              const pathData = [
                `M ${x1} ${y1}`,
                `L ${x2} ${y2}`,
                `A ${rOut} ${rOut} 0 0 1 ${x3} ${y3}`,
                `L ${x4} ${y4}`,
                `A ${rIn} ${rIn} 0 0 0 ${x1} ${y1}`,
                "Z",
              ].join(" ");

              return (
                <path
                  key={emote.id}
                  d={pathData}
                  className={`anim-wheel-pie-slice ${isHovered ? "hovered" : ""} ${isCurrent ? "current" : ""}`}
                  fill={isHovered ? emote.color : `${emote.color}cc`}
                  stroke={isHovered ? "#ffffff" : "#1a2234"}
                  strokeWidth={isHovered ? "3" : "2"}
                  onPointerEnter={() => setHoveredIndex(idx)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(idx);
                  }}
                />
              );
            })}

            {/* Empty Center Hole (Hollow Cutout) */}
            <circle
              cx={centerCoord}
              cy={centerCoord}
              r={radiusInner}
              className="anim-wheel-empty-hole"
            />
            <circle
              cx={centerCoord}
              cy={centerCoord}
              r={radiusInner}
              className="anim-wheel-hole-border"
            />
          </svg>

          {/* Slice Content (Icons and Labels overlayed at polar coordinates) */}
          {ANIMATION_CATALOG.map((emote, idx) => {
            const midAngle = ((idx + 0.5) * sectorAngle - 90) * (Math.PI / 180);
            const rMid = (radiusInner + radiusOuter) / 2 + (hoveredIndex === idx ? 4 : 0);
            const x = Math.round(centerCoord + rMid * Math.cos(midAngle));
            const y = Math.round(centerCoord + rMid * Math.sin(midAngle));
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={emote.id}
                className={`anim-wheel-slice-label ${isHovered ? "hovered" : ""}`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                }}
                onPointerEnter={() => setHoveredIndex(idx)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(idx);
                }}
              >
                <span className="slice-icon">{emote.icon}</span>
                <span className="slice-name">{emote.nameRu}</span>
              </div>
            );
          })}
        </div>

        {/* Selected Emote Bottom Card */}
        <div className="anim-wheel-bottom-pill">
          {activeEmote ? (
            <div className="bottom-pill-info">
              <span className="bottom-pill-icon">{activeEmote.icon}</span>
              <span className="bottom-pill-title">{activeEmote.nameRu}</span>
              <span className="bottom-pill-desc">{activeEmote.descriptionRu}</span>
            </div>
          ) : (
            <div className="bottom-pill-hint">
              <span>{t.hoverToSelect || "Наведите курсор на эмоцию или отпустите [B]"}</span>
            </div>
          )}

          <button
            type="button"
            className="bottom-pill-reset-btn"
            onClick={() => {
              onSelectAnimation("idle");
              onClose();
            }}
          >
            <span>{t.resetIdle || "Сбросить анимацию (Idle)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
