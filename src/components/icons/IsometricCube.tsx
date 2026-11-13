import React from "react";

export type CubeVariant =
  | "grass"
  | "stone"
  | "obsidian"
  | "tnt"
  | "diamond"
  | "emerald"
  | "cyan"
  | "violet"
  | "rust";

export interface IsometricCubeProps {
  size?: number;
  className?: string;
  variant?: CubeVariant;
}

export const IsometricCube: React.FC<IsometricCubeProps> = ({
  size = 40,
  className,
  variant = "grass",
}) => {
  if (variant === "grass") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
      >
        {/* Top Face - Grass */}
        <polygon
          points="16,3 29,10 16,17 3,10"
          fill="#6eb327"
          stroke="#558f1e"
          strokeWidth="0.8"
        />
        {/* Grass highlights on top */}
        <line
          x1="10"
          y1="6.5"
          x2="22"
          y2="13.5"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.6"
        />

        {/* Left Face - Dirt */}
        <polygon
          points="3,10 16,17 16,29 3,22"
          fill="#845e41"
          stroke="#68472f"
          strokeWidth="0.8"
        />
        {/* Left Face - Grass Overhang */}
        <polygon
          points="3,10 16,17 16,20 13,18 10,21 7,17 3,18"
          fill="#598e21"
        />

        {/* Right Face - Dirt (Shadowed) */}
        <polygon
          points="16,17 29,10 29,22 16,29"
          fill="#6a4930"
          stroke="#523620"
          strokeWidth="0.8"
        />
        {/* Right Face - Grass Overhang */}
        <polygon
          points="16,17 29,10 29,18 25,17 22,21 19,18 16,20"
          fill="#446c17"
        />
      </svg>
    );
  }

  if (variant === "stone") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
      >
        <polygon points="16,3 29,10 16,17 3,10" fill="#8f9399" stroke="#72777f" strokeWidth="0.8" />
        <polygon points="3,10 16,17 16,29 3,22" fill="#757980" stroke="#5d6067" strokeWidth="0.8" />
        <polygon points="16,17 29,10 29,22 16,29" fill="#585c63" stroke="#464a50" strokeWidth="0.8" />
        <circle cx="12" cy="14" r="1" fill="#464a50" />
        <circle cx="20" cy="22" r="1.2" fill="#464a50" />
        <circle cx="16" cy="10" r="1.2" fill="#a4a9b2" />
      </svg>
    );
  }

  if (variant === "obsidian") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
      >
        <polygon points="16,3 29,10 16,17 3,10" fill="#2d1c3e" stroke="#1d112b" strokeWidth="0.8" />
        <polygon points="3,10 16,17 16,29 3,22" fill="#20132e" stroke="#13091c" strokeWidth="0.8" />
        <polygon points="16,17 29,10 29,22 16,29" fill="#140b20" stroke="#0b0512" strokeWidth="0.8" />
        <circle cx="15" cy="8" r="1" fill="#7a4ab5" />
        <circle cx="10" cy="18" r="1" fill="#603494" />
        <circle cx="22" cy="21" r="1" fill="#7a4ab5" />
      </svg>
    );
  }

  if (variant === "tnt") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
      >
        <polygon points="16,3 29,10 16,17 3,10" fill="#dc4a3b" stroke="#b03123" strokeWidth="0.8" />
        {/* Left red face */}
        <polygon points="3,10 16,17 16,29 3,22" fill="#c33729" stroke="#962216" strokeWidth="0.8" />
        {/* Left white stripe */}
        <polygon points="3,14 16,21 16,25 3,18" fill="#eae4db" />
        {/* Right red face */}
        <polygon points="16,17 29,10 29,22 16,29" fill="#9f251a" stroke="#79180e" strokeWidth="0.8" />
        {/* Right white stripe */}
        <polygon points="16,21 29,14 29,18 16,25" fill="#cfc7bd" />
      </svg>
    );
  }

  if (variant === "diamond") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
      >
        <polygon points="16,3 29,10 16,17 3,10" fill="#7ce4e8" stroke="#50c8cd" strokeWidth="0.8" />
        <polygon points="3,10 16,17 16,29 3,22" fill="#4fb9be" stroke="#379397" strokeWidth="0.8" />
        <polygon points="16,17 29,10 29,22 16,29" fill="#32969b" stroke="#216d71" strokeWidth="0.8" />
        <circle cx="16" cy="10" r="1.5" fill="#d9ffff" />
      </svg>
    );
  }

  if (variant === "rust") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
      >
        {/* Top Face - Warm Rust/Copper Metal */}
        <polygon points="16,3 29,10 16,17 3,10" fill="#df6436" stroke="#b34a21" strokeWidth="0.8" />
        <polygon points="16,6 24,10 16,14 8,10" fill="#ee794d" />
        <circle cx="16" cy="10" r="1.8" fill="#ffedd5" />
        <circle cx="16" cy="10" r="0.8" fill="#9a3412" />

        {/* Left Face - Industrial Oxidized Rust */}
        <polygon points="3,10 16,17 16,29 3,22" fill="#c24f24" stroke="#8c3311" strokeWidth="0.8" />
        <circle cx="8" cy="17" r="1" fill="#7c2d12" />
        <circle cx="12" cy="23" r="1" fill="#ea580c" />
        <line x1="6" y1="13" x2="14" y2="25" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />

        {/* Right Face - Dark Shaded Industrial Metal */}
        <polygon points="16,17 29,10 29,22 16,29" fill="#933614" stroke="#682108" strokeWidth="0.8" />
        <circle cx="24" cy="17" r="1" fill="#581a04" />
        <circle cx="20" cy="23" r="1" fill="#c2410c" />
        <line x1="18" y1="25" x2="26" y2="13" stroke="rgba(0,0,0,0.3)" strokeWidth="0.6" />
      </svg>
    );
  }

  if (variant === "emerald") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
      >
        <polygon points="16,3 29,10 16,17 3,10" fill="#4bd971" stroke="#31b253" strokeWidth="0.8" />
        <polygon points="3,10 16,17 16,29 3,22" fill="#34ba5a" stroke="#22883e" strokeWidth="0.8" />
        <polygon points="16,17 29,10 29,22 16,29" fill="#209242" stroke="#14672d" strokeWidth="0.8" />
        <circle cx="16" cy="10" r="1.5" fill="#dcffdf" />
      </svg>
    );
  }

  if (variant === "cyan") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
      >
        <polygon points="16,2 29,9.5 16,17 3,9.5" fill="#38bdf8" stroke="#7dd3fc" strokeWidth="0.8" />
        <polygon points="3,9.5 16,17 16,31 3,23.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
        <polygon points="16,17 29,9.5 29,23.5 16,31" fill="#0369a1" stroke="#0284c7" strokeWidth="0.8" />
        <circle cx="16" cy="17" r="2.2" fill="#ffffff" />
      </svg>
    );
  }

  // Futuristic Crystal Cubes (violet default fallback)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="cubeTop" x1="16" y1="2" x2="16" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="cubeLeft" x1="3" y1="9.5" x2="16" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id="cubeRight" x1="29" y1="9.5" x2="16" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
      <polygon points="16,2 29,9.5 16,17 3,9.5" fill="url(#cubeTop)" stroke="#c4b5fd" strokeWidth="0.8" />
      <polygon points="3,9.5 16,17 16,31 3,23.5" fill="url(#cubeLeft)" stroke="#a78bfa" strokeWidth="0.8" />
      <polygon points="16,17 29,9.5 29,23.5 16,31" fill="url(#cubeRight)" stroke="#8b5cf6" strokeWidth="0.8" />
      <circle cx="16" cy="17" r="2.2" fill="#ffffff" />
    </svg>
  );
};
