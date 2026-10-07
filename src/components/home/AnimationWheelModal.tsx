import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ANIMATION_CATALOG,
  type AnimationId,
} from "../../utils/skinAnimations";

interface AnimationWheelModalProps {
  isOpen: boolean;
  currentAnimation: AnimationId | string;
  onSelectAnimation: (id: AnimationId) => void;
  onClose: () => void;
  t: any;
}

const RADIUS_OUTER = 150;
const RADIUS_INNER = 50;
const CENTER_COORD = 170; // SVG viewBox 340x340
const COUNT = ANIMATION_CATALOG.length;
const SECTOR_ANGLE = 360 / COUNT;

// Precompute static geometry once at module level to eliminate runtime trigonometry & SVG re-tessellation
const PRECOMPUTED_SLICES = ANIMATION_CATALOG.map((emote, idx) => {
  const startAngle = (idx * SECTOR_ANGLE - 90) * (Math.PI / 180);
  const endAngle = ((idx + 1) * SECTOR_ANGLE - 90) * (Math.PI / 180);
  const midAngle = ((idx + 0.5) * SECTOR_ANGLE - 90) * (Math.PI / 180);

  const x1 = CENTER_COORD + RADIUS_INNER * Math.cos(startAngle);
  const y1 = CENTER_COORD + RADIUS_INNER * Math.sin(startAngle);
  const x2 = CENTER_COORD + RADIUS_OUTER * Math.cos(startAngle);
  const y2 = CENTER_COORD + RADIUS_OUTER * Math.sin(startAngle);
  const x3 = CENTER_COORD + RADIUS_OUTER * Math.cos(endAngle);
  const y3 = CENTER_COORD + RADIUS_OUTER * Math.sin(endAngle);
  const x4 = CENTER_COORD + RADIUS_INNER * Math.cos(endAngle);
  const y4 = CENTER_COORD + RADIUS_INNER * Math.sin(endAngle);

  const pathData = [
    `M ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${RADIUS_OUTER} ${RADIUS_OUTER} 0 0 1 ${x3} ${y3}`,
    `L ${x4} ${y4}`,
    `A ${RADIUS_INNER} ${RADIUS_INNER} 0 0 0 ${x1} ${y1}`,
    "Z",
  ].join(" ");

  const rMid = (RADIUS_INNER + RADIUS_OUTER) / 2;
  const labelX = Math.round(CENTER_COORD + rMid * Math.cos(midAngle));
  const labelY = Math.round(CENTER_COORD + rMid * Math.sin(midAngle));

  return {
    emote,
    pathData,
    labelX,
    labelY,
  };
});

export const AnimationWheelModal: React.FC<AnimationWheelModalProps> =
  React.memo(({ isOpen, currentAnimation, onSelectAnimation, onClose, t }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rectRef = useRef<DOMRect | null>(null);
    const openedAtRef = useRef<number>(Date.now());

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        let rect = rectRef.current;
        if (!rect && containerRef.current) {
          rect = containerRef.current.getBoundingClientRect();
          rectRef.current = rect;
        }
        if (!rect) return;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const distSq = dx * dx + dy * dy;

        const scale = rect.width / 340;
        const rIn = RADIUS_INNER * scale;
        const rOut = RADIUS_OUTER * scale * 1.5;

        // Deadzone in the center (empty hole)
        if (distSq < rIn * rIn) {
          setHoveredIndex((prev) => (prev === null ? prev : null));
          return;
        }

        // Beyond outer edge tolerance
        if (distSq > rOut * rOut) {
          setHoveredIndex((prev) => (prev === null ? prev : null));
          return;
        }

        // Calculate angle from 12 o'clock (-90 deg) clockwise
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        if (deg < 0) deg += 360;

        const index = Math.floor(deg / SECTOR_ANGLE) % COUNT;
        setHoveredIndex((prev) => (prev === index ? prev : index));
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
        rectRef.current = null;
        return;
      }
      openedAtRef.current = Date.now();

      // Cache rect to avoid layout thrashing during mouse movement
      if (containerRef.current) {
        rectRef.current = containerRef.current.getBoundingClientRect();
      }

      const handleResize = () => {
        if (containerRef.current) {
          rectRef.current = containerRef.current.getBoundingClientRect();
        }
      };

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
          const duration = Date.now() - openedAtRef.current;
          setHoveredIndex((curr) => {
            if (curr !== null && ANIMATION_CATALOG[curr]) {
              onSelectAnimation(ANIMATION_CATALOG[curr].id);
              onClose();
              return null;
            }
            // If held and released in deadzone center, close wheel
            if (duration >= 250) {
              onClose();
              return null;
            }
            // If rapid tap (<250ms) without hover, leave open for click selection
            return curr;
          });
        }
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [isOpen, onClose, onSelectAnimation]);

    if (!isOpen) return null;

    const activeEmote =
      hoveredIndex !== null ? ANIMATION_CATALOG[hoveredIndex] : null;

    return (
      <div
        className="anim-wheel-overlay"
        onClick={() => handleSelect(hoveredIndex)}
        onPointerMove={handlePointerMove}
        role="dialog"
        aria-modal="true"
      >
        <div className="anim-wheel-backdrop-glow" aria-hidden="true" />

        <div className="anim-wheel-panel" onClick={(e) => e.stopPropagation()}>
          {/* Circular Wheel Stage with SVG Pie */}
          <div
            ref={containerRef}
            className="anim-wheel-stage-donut"
            onClick={() => handleSelect(hoveredIndex)}
          >
            <svg
              className="anim-wheel-svg"
              viewBox="0 0 340 340"
              width="340"
              height="340"
            >
              {/* Slices */}
              {PRECOMPUTED_SLICES.map(({ emote, pathData }, idx) => {
                const isHovered = hoveredIndex === idx;
                const isCurrent = currentAnimation === emote.id;

                return (
                  <path
                    key={emote.id}
                    d={pathData}
                    className={`anim-wheel-pie-slice ${isHovered ? "hovered" : ""} ${isCurrent ? "current" : ""}`}
                    fill={isHovered ? emote.color : `${emote.color}cc`}
                    stroke={
                      isHovered ? "#ffffff" : isCurrent ? "#38bdf8" : "#1a2234"
                    }
                    strokeWidth={isHovered ? 3.5 : isCurrent ? 3 : 2}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(idx);
                    }}
                  />
                );
              })}

              {/* Empty Center Hole (Hollow Cutout) */}
              <circle
                cx={CENTER_COORD}
                cy={CENTER_COORD}
                r={RADIUS_INNER}
                className="anim-wheel-empty-hole"
              />
              <circle
                cx={CENTER_COORD}
                cy={CENTER_COORD}
                r={RADIUS_INNER}
                className="anim-wheel-hole-border"
              />
            </svg>

            {/* Slice Content (Icons and Labels overlayed at polar coordinates) */}
            {PRECOMPUTED_SLICES.map(({ emote, labelX, labelY }, idx) => {
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={emote.id}
                  className={`anim-wheel-slice-label ${isHovered ? "hovered" : ""}`}
                  style={{
                    left: `${labelX}px`,
                    top: `${labelY}px`,
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
                <span className="bottom-pill-desc">
                  {activeEmote.descriptionRu}
                </span>
              </div>
            ) : (
              <div className="bottom-pill-hint">
                <span>
                  {t.hoverToSelect ||
                    "Наведите курсор на эмоцию или отпустите [B]"}
                </span>
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
  });
