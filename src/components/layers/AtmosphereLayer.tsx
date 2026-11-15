import React, { useState, useEffect, useRef } from "react";
import { MINECRAFT_BACKGROUNDS } from "../../constants/backgrounds";
import type { ZoneCustomizationConfig } from "../../types/menuCustomization";
import { rgbaString, computePanelTheme } from "../../utils/colorUtils";
import "../../styles/layer0-atmosphere.css";

interface AtmosphereLayerProps {
  visible: boolean;
  activeIndex: number;
  isAutoPlay?: boolean;
  onNextBg?: () => void;
  backgroundCustomization?: ZoneCustomizationConfig;
}

const AUTO_CYCLE_INTERVAL_MS = 28000;

export const AtmosphereLayer: React.FC<AtmosphereLayerProps> = React.memo(({
  visible,
  activeIndex,
  isAutoPlay = true,
  onNextBg,
  backgroundCustomization,
}) => {
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const lastActiveIndex = useRef<number>(activeIndex);

  useEffect(() => {
    if (activeIndex !== lastActiveIndex.current) {
      setPrevIndex(lastActiveIndex.current);
      lastActiveIndex.current = activeIndex;
      setIsTransitioning(true);

      const timer = window.setTimeout(() => {
        setIsTransitioning(false);
        setPrevIndex(null);
      }, 1400);

      return () => clearTimeout(timer);
    }
  }, [activeIndex]);

  useEffect(() => {
    const nextIdx = (activeIndex + 1) % MINECRAFT_BACKGROUNDS.length;
    const prevIdx = (activeIndex - 1 + MINECRAFT_BACKGROUNDS.length) % MINECRAFT_BACKGROUNDS.length;
    [MINECRAFT_BACKGROUNDS[nextIdx]?.url, MINECRAFT_BACKGROUNDS[prevIdx]?.url].forEach((url) => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [activeIndex]);

  useEffect(() => {
    if (!isAutoPlay || !onNextBg) return;

    const timer = window.setInterval(() => {
      onNextBg();
    }, AUTO_CYCLE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isAutoPlay, onNextBg]);

  const activeBg = MINECRAFT_BACKGROUNDS[activeIndex] || MINECRAFT_BACKGROUNDS[0];

  return (
    <div
      className={`layer-atmosphere ${!visible ? "hidden" : ""}`}
      aria-hidden="true"
    >
      <div className="atmosphere-canvas">
        {prevIndex !== null && MINECRAFT_BACKGROUNDS[prevIndex] && (
          <img
            src={MINECRAFT_BACKGROUNDS[prevIndex].url}
            alt=""
            className={`atmosphere-bg-img ${!isTransitioning ? "active" : ""}`}
            style={{ opacity: isTransitioning ? 0 : 1, zIndex: 1 }}
          />
        )}

        <img
          key={activeBg.url}
          src={activeBg.url}
          alt={activeBg.title}
          className="atmosphere-bg-img active"
          style={{ zIndex: 2 }}
        />
      </div>

      {backgroundCustomization?.enabled && (() => {
        const t = computePanelTheme(
          backgroundCustomization.color,
          backgroundCustomization.intensity,
          backgroundCustomization.patternIntensity,
          backgroundCustomization.mode
        );
        return (
          <div
            className="atmosphere-custom-tint-layer"
            style={{
              backgroundColor: `var(--custom-bg-color, ${t.panelBg})`,
              backgroundImage: `var(--custom-bg-pattern, ${t.panelPattern})`,
              backgroundRepeat: "repeat",
              backgroundSize: `var(--custom-bg-pattern-size, ${t.panelPatternSize || "66px 66px"})`,
              backgroundPosition: `var(--custom-bg-pattern-pos, ${t.panelPatternPosition || "0 0"})`,
              opacity: `var(--custom-bg-opacity, ${Math.max(0.3, (backgroundCustomization.intensity / 100) * 0.85)})` as any,
              mixBlendMode: (backgroundCustomization.mode === "light"
                ? "screen"
                : backgroundCustomization.mode === "dynamic"
                ? "color"
                : "multiply") as any,
            }}
          />
        );
      })()}

      <div className="atmosphere-matte-scrim" />
    </div>
  );
});
