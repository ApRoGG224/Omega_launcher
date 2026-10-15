import React from "react";

export interface PixelLoaderProps {
  size?: "sm" | "md" | "lg";
  variant?: "emerald" | "cyan" | "purple" | "gold";
  text?: string;
  className?: string;
  showCube?: boolean;
}

export const PixelLoader: React.FC<PixelLoaderProps> = React.memo(
  ({
    size = "md",
    variant = "emerald",
    text,
    className = "",
    showCube = true,
  }) => {
    const sizePx = size === "sm" ? 22 : size === "lg" ? 44 : 32;

    return (
      <div
        className={`pixel-loader-container pixel-loader-${size} pixel-loader-${variant} ${className}`}
        role="status"
        aria-live="polite"
      >
        {showCube ? (
          <div className="pixel-cube-anim" style={{ width: sizePx, height: sizePx }}>
            <svg
              width={sizePx}
              height={sizePx}
              viewBox="0 0 32 32"
              fill="none"
              className="pixel-cube-svg"
            >
              {variant === "cyan" ? (
                <>
                  <polygon
                    points="16,3 29,10 16,17 3,10"
                    fill="#38bdf8"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                  <polygon
                    points="3,10 16,17 16,29 3,22"
                    fill="#0369a1"
                    stroke="#075985"
                    strokeWidth="1"
                  />
                  <polygon
                    points="16,17 29,10 29,22 16,29"
                    fill="#0c4a6e"
                    stroke="#082f49"
                    strokeWidth="1"
                  />
                </>
              ) : variant === "purple" ? (
                <>
                  <polygon
                    points="16,3 29,10 16,17 3,10"
                    fill="#c084fc"
                    stroke="#9333ea"
                    strokeWidth="1"
                  />
                  <polygon
                    points="3,10 16,17 16,29 3,22"
                    fill="#7e22ce"
                    stroke="#581c87"
                    strokeWidth="1"
                  />
                  <polygon
                    points="16,17 29,10 29,22 16,29"
                    fill="#4c1d95"
                    stroke="#2e1065"
                    strokeWidth="1"
                  />
                </>
              ) : variant === "gold" ? (
                <>
                  <polygon
                    points="16,3 29,10 16,17 3,10"
                    fill="#facc15"
                    stroke="#ca8a04"
                    strokeWidth="1"
                  />
                  <polygon
                    points="3,10 16,17 16,29 3,22"
                    fill="#a16207"
                    stroke="#713f12"
                    strokeWidth="1"
                  />
                  <polygon
                    points="16,17 29,10 29,22 16,29"
                    fill="#78350f"
                    stroke="#451a03"
                    strokeWidth="1"
                  />
                </>
              ) : (
                <>
                  {/* Default Minecraft Grass / Emerald Block */}
                  <polygon
                    points="16,3 29,10 16,17 3,10"
                    fill="#84cc16"
                    stroke="#65a30d"
                    strokeWidth="1"
                  />
                  <polygon
                    points="3,10 16,17 16,29 3,22"
                    fill="#866043"
                    stroke="#68472f"
                    strokeWidth="1"
                  />
                  <polygon
                    points="3,10 16,17 16,20 13,18 10,21 7,17 3,18"
                    fill="#65a30d"
                  />
                  <polygon
                    points="16,17 29,10 29,22 16,29"
                    fill="#6d4c32"
                    stroke="#543720"
                    strokeWidth="1"
                  />
                  <polygon
                    points="16,17 29,10 29,18 25,17 22,21 19,18 16,20"
                    fill="#4d7c0f"
                  />
                </>
              )}
            </svg>
            <div className="pixel-cube-shadow" />
          </div>
        ) : (
          <div className="pixel-ring-loader" />
        )}
        {text && <span className="pixel-loader-text">{text}</span>}
      </div>
    );
  },
);
