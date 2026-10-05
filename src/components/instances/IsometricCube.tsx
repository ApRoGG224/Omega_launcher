import React from "react";

export interface IsometricCubeProps {
  size?: number;
  variant?: "cyan" | "emerald" | "amber";
  className?: string;
}

export const IsometricCube = React.memo(
  ({ size = 38, variant = "emerald", className }: IsometricCubeProps) => {
    const id = React.useId().replace(/:/g, "");

    const colors =
      variant === "cyan"
        ? {
            top1: "#67e8f9",
            top2: "#06b6d4",
            left1: "#0891b2",
            left2: "#0e7490",
            right1: "#0e7490",
            right2: "#155e75",
            strokeTop: "#a5f3fc",
            strokeLeft: "#22d3ee",
            strokeRight: "#06b6d4",
            core: "#ffffff",
            coreGlow: "#cffafe",
          }
        : variant === "amber"
          ? {
              top1: "#fde047",
              top2: "#eab308",
              left1: "#ca8a04",
              left2: "#a16207",
              right1: "#a16207",
              right2: "#713f12",
              strokeTop: "#fef08a",
              strokeLeft: "#facc15",
              strokeRight: "#eab308",
              core: "#ffffff",
              coreGlow: "#fef9c3",
            }
          : {
              top1: "#a3e635",
              top2: "#65a30d",
              left1: "#4d7c0f",
              left2: "#365314",
              right1: "#365314",
              right2: "#1a2e05",
              strokeTop: "#bef264",
              strokeLeft: "#84cc16",
              strokeRight: "#4d7c0f",
              core: "#ffffff",
              coreGlow: "#ecfccb",
            };

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
      >
        <defs>
          <linearGradient
            id={`cubeTop_${id}`}
            x1="16"
            y1="2"
            x2="16"
            y2="17"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={colors.top1} />
            <stop offset="100%" stopColor={colors.top2} />
          </linearGradient>
          <linearGradient
            id={`cubeLeft_${id}`}
            x1="3"
            y1="9.5"
            x2="16"
            y2="31"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={colors.left1} />
            <stop offset="100%" stopColor={colors.left2} />
          </linearGradient>
          <linearGradient
            id={`cubeRight_${id}`}
            x1="29"
            y1="9.5"
            x2="16"
            y2="31"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={colors.right1} />
            <stop offset="100%" stopColor={colors.right2} />
          </linearGradient>
        </defs>

        {/* Top face */}
        <polygon
          points="16,2 29,9.5 16,17 3,9.5"
          fill={`url(#cubeTop_${id})`}
          stroke={colors.strokeTop}
          strokeWidth="1"
        />
        <line
          x1="9.5"
          y1="5.75"
          x2="22.5"
          y2="13.25"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.8"
        />
        <line
          x1="22.5"
          y1="5.75"
          x2="9.5"
          y2="13.25"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.8"
        />

        {/* Left face */}
        <polygon
          points="3,9.5 16,17 16,31 3,23.5"
          fill={`url(#cubeLeft_${id})`}
          stroke={colors.strokeLeft}
          strokeWidth="1"
        />
        <line
          x1="9.5"
          y1="13.25"
          x2="9.5"
          y2="27.25"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.8"
        />

        {/* Right face */}
        <polygon
          points="16,17 29,9.5 29,23.5 16,31"
          fill={`url(#cubeRight_${id})`}
          stroke={colors.strokeRight}
          strokeWidth="1"
        />
        <line
          x1="22.5"
          y1="13.25"
          x2="22.5"
          y2="27.25"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.8"
        />

        {/* Center glowing crystal core */}
        <circle cx="16" cy="17" r="2.2" fill={colors.core} />
        <circle
          cx="16"
          cy="17"
          r="3.6"
          stroke={colors.coreGlow}
          strokeWidth="0.8"
          strokeOpacity="0.8"
        />
      </svg>
    );
  },
);
