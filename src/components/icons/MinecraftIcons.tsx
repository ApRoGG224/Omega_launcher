import React from "react";

export type InstanceAvatarVariant =
  | "diamond_sword"
  | "diamond_pickaxe"
  | "end_crystal"
  | "obsidian";

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * Pixel-perfect authentic Minecraft Diamond Sword (16x16 crisp vector)
 */
export const IconDiamondSword: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    shapeRendering="crispEdges"
    className={className}
    style={{ display: "block" }}
  >
    <path
      fill="#a4ffff"
      d="M15,2h1v1h-1z M14,3h1v1h-1z M13,4h1v1h-1z M12,5h1v1h-1z M11,6h1v1h-1z M10,7h1v1h-1z M9,8h1v1h-1z M8,9h1v1h-1z M7,10h1v1h-1z"
    />
    <path
      fill="#32dbcb"
      d="M15,1h1v1h-1z M14,2h1v1h-1z M13,3h1v1h-1z M15,3h1v1h-1z M12,4h1v1h-1z M14,4h1v1h-1z M11,5h1v1h-1z M13,5h1v1h-1z M10,6h1v1h-1z M12,6h1v1h-1z M9,7h1v1h-1z M11,7h1v1h-1z M8,8h1v1h-1z M10,8h1v1h-1z M7,9h1v1h-1z M9,9h1v1h-1z M6,10h1v1h-1z M8,10h1v1h-1z"
    />
    <path
      fill="#178c82"
      d="M15,4h1v1h-1z M14,5h1v1h-1z M13,6h1v1h-1z M12,7h1v1h-1z M11,8h1v1h-1z M10,9h1v1h-1z M9,10h1v1h-1z M8,11h1v1h-1z"
    />
    <path
      fill="#0b403c"
      d="M15,0h1v1h-1z M14,1h1v1h-1z M13,2h1v1h-1z M12,3h1v1h-1z M11,4h1v1h-1z M10,5h1v1h-1z M9,6h1v1h-1z M8,7h1v1h-1z M7,8h1v1h-1z M6,9h1v1h-1z M4,10h1v1h-1z M5,10h1v1h-1z M5,11h1v1h-1z M7,12h1v1h-1z"
    />
    <path
      fill="#bfa254"
      d="M2,9h1v1h-1z M3,9h1v1h-1z M3,10h1v1h-1z M6,11h1v1h-1z"
    />
    <path fill="#885c33" d="M3,12h1v1h-1z M2,13h1v1h-1z" />
    <path
      fill="#54391e"
      d="M4,11h1v1h-1z M4,12h1v1h-1z M3,13h1v1h-1z M1,14h1v1h-1z"
    />
    <path
      fill="#281a0b"
      d="M2,8h1v1h-1z M1,9h1v1h-1z M4,9h1v1h-1z M2,10h1v1h-1z M3,11h1v1h-1z M7,11h1v1h-1z M2,12h1v1h-1z M5,12h1v1h-1z M1,13h1v1h-1z M4,13h1v1h-1z M0,14h1v1h-1z M2,14h1v1h-1z M1,15h1v1h-1z"
    />
  </svg>
);

/**
 * Pixel-perfect authentic Minecraft Diamond Pickaxe (16x16 crisp vector)
 */
export const IconDiamondPickaxe: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    shapeRendering="crispEdges"
    className={className}
    style={{ display: "block" }}
  >
    <path
      fill="#a4ffff"
      d="M11,1h1v1h-1z M6,2h1v1h-1z M7,2h1v1h-1z M12,2h1v1h-1z M13,3h1v1h-1z M4,4h1v1h-1z M3,5h1v1h-1z M13,8h1v1h-1z M12,9h1v1h-1z"
    />
    <path
      fill="#32dbcb"
      d="M7,1h1v1h-1z M8,1h1v1h-1z M9,1h1v1h-1z M10,1h1v1h-1z M12,1h1v1h-1z M13,1h1v1h-1z M5,2h1v1h-1z M10,2h1v1h-1z M11,2h1v1h-1z M13,2h1v1h-1z M14,2h1v1h-1z M4,3h1v1h-1z M12,3h1v1h-1z M14,3h1v1h-1z M3,4h1v1h-1z M13,4h1v1h-1z M14,4h1v1h-1z M2,5h1v1h-1z M13,5h1v1h-1z M14,5h1v1h-1z M2,6h1v1h-1z M13,6h1v1h-1z M14,6h1v1h-1z M13,7h1v1h-1z M14,7h1v1h-1z M12,8h1v1h-1z M14,8h1v1h-1z M11,9h1v1h-1z M13,9h1v1h-1z M10,10h1v1h-1z"
    />
    <path
      fill="#178c82"
      d="M8,2h1v1h-1z M9,2h1v1h-1z M5,3h1v1h-1z M6,3h1v1h-1z"
    />
    <path
      fill="#0b403c"
      d="M7,0h1v1h-1z M8,0h1v1h-1z M9,0h1v1h-1z M10,0h1v1h-1z M11,0h1v1h-1z M12,0h1v1h-1z M13,0h1v1h-1z M5,1h1v1h-1z M6,1h1v1h-1z M14,1h1v1h-1z M4,2h1v1h-1z M15,2h1v1h-1z M3,3h1v1h-1z M7,3h1v1h-1z M11,3h1v1h-1z M15,3h1v1h-1z M2,4h1v1h-1z M5,4h1v1h-1z M12,4h1v1h-1z M15,4h1v1h-1z M1,5h1v1h-1z M4,5h1v1h-1z M12,5h1v1h-1z M15,5h1v1h-1z M1,6h1v1h-1z M3,6h1v1h-1z M12,6h1v1h-1z M15,6h1v1h-1z M2,7h1v1h-1z M12,7h1v1h-1z M15,7h1v1h-1z M11,8h1v1h-1z M15,8h1v1h-1z M10,9h1v1h-1z M14,9h1v1h-1z M9,10h1v1h-1z M11,10h1v1h-1z M12,10h1v1h-1z M9,11h1v1h-1z"
    />
    <path
      fill="#885c33"
      d="M11,4h1v1h-1z M10,5h1v1h-1z M9,6h1v1h-1z M8,7h1v1h-1z M7,8h1v1h-1z M6,9h1v1h-1z M5,10h1v1h-1z M4,11h1v1h-1z M3,12h1v1h-1z M2,13h1v1h-1z M1,14h1v1h-1z M0,15h1v1h-1z"
    />
  </svg>
);

/**
 * Pixel-perfect authentic Minecraft End Crystal (16x16 crisp vector)
 */
export const IconEndCrystal: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    shapeRendering="crispEdges"
    className={className}
    style={{ display: "block" }}
  >
    <path
      fill="#f5d0fe"
      d="M7,0h1v1h-1z M8,0h1v1h-1z M6,1h1v1h-1z M9,1h1v1h-1z M5,2h1v1h-1z M10,2h1v1h-1z M4,3h1v1h-1z M11,3h1v1h-1z M3,4h1v1h-1z M12,4h1v1h-1z M2,5h1v1h-1z M13,5h1v1h-1z M2,6h1v1h-1z M13,6h1v1h-1z M3,7h1v1h-1z M12,7h1v1h-1z M4,8h1v1h-1z M11,8h1v1h-1z M5,9h1v1h-1z M10,9h1v1h-1z M6,10h1v1h-1z M9,10h1v1h-1z M7,11h1v1h-1z M8,11h1v1h-1z"
    />
    <path
      fill="#c084fc"
      d="M7,1h1v1h-1z M8,1h1v1h-1z M6,2h1v1h-1z M9,2h1v1h-1z M5,3h1v1h-1z M10,3h1v1h-1z M4,4h1v1h-1z M11,4h1v1h-1z M3,5h1v1h-1z M12,5h1v1h-1z M3,6h1v1h-1z M12,6h1v1h-1z M4,7h1v1h-1z M11,7h1v1h-1z M5,8h1v1h-1z M10,8h1v1h-1z M6,9h1v1h-1z M9,9h1v1h-1z M7,10h1v1h-1z M8,10h1v1h-1z"
    />
    <path
      fill="#db2777"
      d="M7,2h1v1h-1z M8,2h1v1h-1z M6,3h1v1h-1z M7,3h1v1h-1z M8,3h1v1h-1z M9,3h1v1h-1z M5,4h1v1h-1z M6,4h1v1h-1z M9,4h1v1h-1z M10,4h1v1h-1z M4,5h1v1h-1z M5,5h1v1h-1z M10,5h1v1h-1z M11,5h1v1h-1z M4,6h1v1h-1z M5,6h1v1h-1z M10,6h1v1h-1z M11,6h1v1h-1z M5,7h1v1h-1z M6,7h1v1h-1z M9,7h1v1h-1z M10,7h1v1h-1z M6,8h1v1h-1z M7,8h1v1h-1z M8,8h1v1h-1z M9,8h1v1h-1z M7,9h1v1h-1z M8,9h1v1h-1z"
    />
    <path
      fill="#ffffff"
      d="M7,4h1v1h-1z M8,4h1v1h-1z M6,5h1v1h-1z M7,5h1v1h-1z M8,5h1v1h-1z M9,5h1v1h-1z M6,6h1v1h-1z M7,6h1v1h-1z M8,6h1v1h-1z M9,6h1v1h-1z M7,7h1v1h-1z M8,7h1v1h-1z"
    />
    <path
      fill="#1e1b2e"
      d="M4,12h1v1h-1z M5,12h1v1h-1z M6,12h1v1h-1z M7,12h1v1h-1z M8,12h1v1h-1z M9,12h1v1h-1z M10,12h1v1h-1z M11,12h1v1h-1z M2,13h1v1h-1z M3,13h1v1h-1z M6,13h1v1h-1z M7,13h1v1h-1z M8,13h1v1h-1z M9,13h1v1h-1z M12,13h1v1h-1z M13,13h1v1h-1z M1,14h1v1h-1z M2,14h1v1h-1z M7,14h1v1h-1z M8,14h1v1h-1z M13,14h1v1h-1z M14,14h1v1h-1z M0,15h1v1h-1z M1,15h1v1h-1z M2,15h1v1h-1z M3,15h1v1h-1z M4,15h1v1h-1z M5,15h1v1h-1z M6,15h1v1h-1z M7,15h1v1h-1z M8,15h1v1h-1z M9,15h1v1h-1z M10,15h1v1h-1z M11,15h1v1h-1z M12,15h1v1h-1z M13,15h1v1h-1z M14,15h1v1h-1z M15,15h1v1h-1z"
    />
    <path
      fill="#4c1d95"
      d="M4,13h1v1h-1z M5,13h1v1h-1z M10,13h1v1h-1z M11,13h1v1h-1z M3,14h1v1h-1z M4,14h1v1h-1z M5,14h1v1h-1z M6,14h1v1h-1z M9,14h1v1h-1z M10,14h1v1h-1z M11,14h1v1h-1z M12,14h1v1h-1z"
    />
  </svg>
);

/**
 * Authentic Isometric Obsidian Cube with glowing purple facets
 */
export const IconObsidian: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    style={{ display: "block" }}
  >
    {/* Top Face */}
    <polygon
      points="16,3 29,10 16,17 3,10"
      fill="#2a183d"
      stroke="#190e25"
      strokeWidth="0.8"
    />
    {/* Left Face */}
    <polygon
      points="3,10 16,17 16,29 3,22"
      fill="#1c102b"
      stroke="#12081c"
      strokeWidth="0.8"
    />
    {/* Right Face */}
    <polygon
      points="16,17 29,10 29,22 16,29"
      fill="#12081d"
      stroke="#090310"
      strokeWidth="0.8"
    />
    {/* Purple Crystalline Flecks */}
    <circle cx="15" cy="8" r="1.1" fill="#c084fc" />
    <circle cx="21" cy="11" r="0.9" fill="#9333ea" />
    <circle cx="10" cy="18" r="1.2" fill="#a855f7" />
    <circle cx="8" cy="22" r="0.8" fill="#7c3aed" />
    <circle cx="22" cy="21" r="1.1" fill="#c084fc" />
    <circle cx="19" cy="25" r="0.8" fill="#9333ea" />
  </svg>
);

export const INSTANCE_AVATAR_OPTIONS: Array<{
  id: InstanceAvatarVariant;
  label: string;
  component: React.FC<IconProps>;
}> = [
  { id: "diamond_sword", label: "Алмазный меч", component: IconDiamondSword },
  { id: "diamond_pickaxe", label: "Алмазная кирка", component: IconDiamondPickaxe },
  { id: "end_crystal", label: "Кристалл Энда", component: IconEndCrystal },
  { id: "obsidian", label: "Обсидиан", component: IconObsidian },
];

/**
 * Universal Avatar Icon Resolver for Instance
 */
export const InstanceAvatarIcon: React.FC<{
  icon?: string;
  size?: number;
  className?: string;
  fallbackVariant?: InstanceAvatarVariant;
}> = ({ icon, size = 22, className, fallbackVariant = "diamond_sword" }) => {
  if (icon && (icon.startsWith("data:") || icon.startsWith("http") || icon.startsWith("blob:") || icon.startsWith("/"))) {
    return (
      <img
        src={icon}
        alt="Avatar"
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius: Math.max(4, Math.floor(size / 5)),
          display: "block",
        }}
      />
    );
  }

  const normalized = (icon || fallbackVariant).toLowerCase();

  if (normalized.includes("sword") || normalized.includes("меч") || normalized === "pvp") {
    return <IconDiamondSword size={size} className={className} />;
  }
  if (normalized.includes("pickaxe") || normalized.includes("кирка") || normalized.includes("pick")) {
    return <IconDiamondPickaxe size={size} className={className} />;
  }
  if (normalized.includes("crystal") || normalized.includes("кристалл") || normalized.includes("end")) {
    return <IconEndCrystal size={size} className={className} />;
  }
  if (normalized.includes("obsidian") || normalized.includes("обсидиан") || normalized === "rust") {
    return <IconObsidian size={size} className={className} />;
  }

  // Fallback to Diamond Sword
  return <IconDiamondSword size={size} className={className} />;
};
