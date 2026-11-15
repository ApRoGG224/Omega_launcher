import React from "react";
import type { InstanceAvatarVariant } from "../../types";

export type { InstanceAvatarVariant };

export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// 100% Authentic Minecraft 16x16 Pixel Art PNG Textures
export const MC_TEXTURE_DIAMOND_SWORD =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAJFBMVEUAAAAOPzYIJSAz68uk/fArx6weincVY1VoTh5JNhUoHguJZycazUdMAAAAAXRSTlMAQObYZgAAAExJREFUGNN1jsENwDAMAgGndpLuv29/jZFa/+4QwkA/ks5jyPky8cHxwyQAxslZNAaYiux9Zlb4A0XjNcVu1r0hvYacGwB0Rq0OSC4ehwkBE0lygnsAAAAASUVORK5CYII=";

export const MC_TEXTURE_DIAMOND_PICKAXE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAHlBMVEUAAAAIJSAoHgtJNhUnspoOPzYrx6yJZydoTh4z68uk6/rmAAAAAXRSTlMAQObYZgAAAEpJREFUGJWNjDECwCAIA4lEqv//cNGhBqdmyx3B7Gf6ivYZZHQfhwAgn1ZmHkTpozGEeN5DTtKbAt//8E22TzChfpHire4l7epXXpodAQa2BjFiAAAAAElFTkSuQmCC";

export const MC_TEXTURE_OBSIDIAN =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAzklEQVQ4T22SQQ4CMQwDg5C4wIEHrLjuIxC/4P9fKUq1TmZND5HaNE5sp3G73kfE5RSZez62obf3/h376zPvGXlWLlQkUJ4drDvBXXNMzWR1PRrmOSOL2Zw1QYoqFF1NEXglbzYgmMUrbxTFYAWkZoUbWY0FFjWZRIBYtu5mVFtIsNylYSspNDs8SUnaAqf++aWE6+cKyZJbKBPdWYW/sUn7Yq6LDRvQVNKftSygefSBX5dmTyaulZTZyN/aXFxI23OUdvoH7jL1c0NkwPgBAzkxXiBf0HkAAAAASUVORK5CYII=";

export const MC_TEXTURE_END_CRYSTAL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAw0lEQVQ4y2NgoBbYfOPu/59//5GEUQzAEICCqb67sYrP2XuQsAEgzXeOP/uPzRCcBsSr1/4HYZCmfVOvgA0A0SA+TI6gATDNIHx+0104G2YILMywGoCu+RGbOoYhOA3Apnk7qwKYjWwIyBUYXgCZCPMzCIM0gzBI7BybCtwlIIzsFZRQxeV3ZD5MM85AxOYNkAtgmvGGAXIswAxCtpmoWEBOByAM8zN6OsBpADKAGYQRYLgMAAUMSAIZg8SwiWMYQC4AAHZOtPOs6NDkAAAAAElFTkSuQmCC";

export const MC_TEXTURE_TOTEM_OF_UNDYING =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAqUlEQVQ4y2NgoAVYEK38HxsmWvOr2y1YMVGGtDrwgxX//f0OjH+8WwrGIDGQHFEGXFweC8YwjTA+0QaAbHZ8Vg/XCOMTbQBIMcNuN7gXYHyiDTja7oThBZAYTgPQowtmCCz0YZpxRiss6mABhWwrzDUwQ2B8DNeABGC2gJwO8z/MFSBNMNfhDQtk1yBjvGGA7hJcSZkoA5ATEywMiLYdlwFEp0JsgUoo0AB0xECCbO2XnwAAAABJRU5ErkJggg==";

export const MC_TEXTURE_GOLDEN_APPLE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAArElEQVQ4y2NgoAco1WD6T7bmTSmC/0NUOP/T13aQrSAM0gyyHUQTZRBI0+1Fwv///X8GpkGaQWJvTruC+XgNgml+9S78/7cfk8CGwDCIDxLHawiyAdgwyBXIhuA0AKYQmYZhGD9ECEusgEwFGQAzBOZvGB/mOqIMQMbIBsG8gNUAbK7AZhBOzTADYGGBzTvgVClEIFWCFMAMgSUoojUjGwKLb3BqBPKJ1kwqAABFERaScNpZ2AAAAABJRU5ErkJggg==";

export const MC_TEXTURE_ENDER_PEARL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAqUlEQVQ4y2NgGNSAx9zgPwyTpdFkZgcYq7aUEG8QukaBuEAwBrFBmFlN4T9BzSCFPV8e/dc5u/E/t68TGCMbhNMQmAEwzWyWhnCMbBBWA5Bth2kGKYRhgoaABEAGgCRBinAZAAsXrAbAJPEZALMEqzdghsCcih4GIK+BDMAZiOiuQMYgzaDAxWk7siHS1dlwQ0AGwtIFQc3IhoAwLO5hGonSjM0gkjWSAgDdONCbms6SjgAAAABJRU5ErkJggg==";

export const MC_TEXTURE_TNT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAl0lEQVQ4y2N45SzxH4Rv60v93yiq/p9UPgOIAeNM1BX8Typ/OBjwHwjOnTv3/+7Nm2AMYiPzcYmBMAiADQBxzM3CwFhaygbOh2lEFoOpAYmDDQBJ7Nu0Ga4QpgmmGMaGuQDERnYFiheQJWFsZIOQLQFZCjcA5k+YJDYvoHsH7gWQSZRgBlB0wKIEhEnlD4eUCPMTTIBUPgDuSGGtq/CnywAAAABJRU5ErkJggg==";

export const MC_TEXTURE_NETHERITE_SWORD =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAmUlEQVQ4y2NgIAN4aTr8h2GyNLdVt4GxsoDQf7I0F6QXkG4ATHOgix95mkG2gjSDaJI1x4bFgjWDaJyasYUqiA/SaKSu/t/fxg6/zTCbYIaQpBndryAapIkkzcgGgDDJmrEFGsma9RWV/ieYGIE1wrxAtCEgzcWuznANIBqECRoCiz5rS2usCmEG4TWAJKeiAzEOkf8EbcEDACzTjmxkA+/EAAAAAElFTkSuQmCC";

const basePixelStyle: React.CSSProperties = {
  imageRendering: "pixelated",
  display: "block",
  objectFit: "contain",
  userSelect: "none",
  pointerEvents: "none",
};

/**
 * Authentic Minecraft Diamond Sword (16x16 pixel art)
 */
export const IconDiamondSword: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <img
    src={MC_TEXTURE_DIAMOND_SWORD}
    alt="Алмазный меч"
    width={size}
    height={size}
    className={className}
    style={{ ...basePixelStyle, width: size, height: size, ...style }}
    draggable={false}
  />
);

/**
 * Authentic Minecraft Diamond Pickaxe (16x16 pixel art)
 */
export const IconDiamondPickaxe: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <img
    src={MC_TEXTURE_DIAMOND_PICKAXE}
    alt="Алмазная кирка"
    width={size}
    height={size}
    className={className}
    style={{ ...basePixelStyle, width: size, height: size, ...style }}
    draggable={false}
  />
);

/**
 * Authentic Minecraft Obsidian Block (16x16 pixel art)
 */
export const IconObsidian: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <img
    src={MC_TEXTURE_OBSIDIAN}
    alt="Обсидиан"
    width={size}
    height={size}
    className={className}
    style={{ ...basePixelStyle, width: size, height: size, ...style }}
    draggable={false}
  />
);

/**
 * Authentic Minecraft End Crystal Item (16x16 pixel art)
 */
export const IconEndCrystal: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <img
    src={MC_TEXTURE_END_CRYSTAL}
    alt="Кристалл Энда"
    width={size}
    height={size}
    className={className}
    style={{ ...basePixelStyle, width: size, height: size, ...style }}
    draggable={false}
  />
);

/**
 * Authentic Minecraft Totem of Undying (16x16 pixel art)
 */
export const IconTotemOfUndying: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <img
    src={MC_TEXTURE_TOTEM_OF_UNDYING}
    alt="Тотем бессмертия"
    width={size}
    height={size}
    className={className}
    style={{ ...basePixelStyle, width: size, height: size, ...style }}
    draggable={false}
  />
);

/**
 * Authentic Minecraft Golden Apple (16x16 pixel art)
 */
export const IconGoldenApple: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <img
    src={MC_TEXTURE_GOLDEN_APPLE}
    alt="Золотое яблоко"
    width={size}
    height={size}
    className={className}
    style={{ ...basePixelStyle, width: size, height: size, ...style }}
    draggable={false}
  />
);

/**
 * Authentic Minecraft Ender Pearl (16x16 pixel art)
 */
export const IconEnderPearl: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <img
    src={MC_TEXTURE_ENDER_PEARL}
    alt="Жемчуг Энда"
    width={size}
    height={size}
    className={className}
    style={{ ...basePixelStyle, width: size, height: size, ...style }}
    draggable={false}
  />
);

/**
 * Authentic Minecraft TNT Block (16x16 pixel art)
 */
export const IconTNT: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <img
    src={MC_TEXTURE_TNT}
    alt="Динамит TNT"
    width={size}
    height={size}
    className={className}
    style={{ ...basePixelStyle, width: size, height: size, ...style }}
    draggable={false}
  />
);

/**
 * Authentic Minecraft Netherite Sword (16x16 pixel art)
 */
export const IconNetheriteSword: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <img
    src={MC_TEXTURE_NETHERITE_SWORD}
    alt="Незеритовый меч"
    width={size}
    height={size}
    className={className}
    style={{ ...basePixelStyle, width: size, height: size, ...style }}
    draggable={false}
  />
);

export const INSTANCE_AVATAR_OPTIONS: Array<{
  id: InstanceAvatarVariant;
  label: string;
  fullName: string;
  component: React.FC<IconProps>;
}> = [
  { id: "diamond_sword", label: "Меч", fullName: "Алмазный меч", component: IconDiamondSword },
  { id: "diamond_pickaxe", label: "Кирка", fullName: "Алмазная кирка", component: IconDiamondPickaxe },
  { id: "obsidian", label: "Обсидиан", fullName: "Обсидиан", component: IconObsidian },
  { id: "end_crystal", label: "Кристалл", fullName: "Кристалл Энда", component: IconEndCrystal },
  { id: "totem_of_undying", label: "Тотем", fullName: "Тотем бессмертия", component: IconTotemOfUndying },
  { id: "golden_apple", label: "Яблоко", fullName: "Золотое яблоко", component: IconGoldenApple },
  { id: "ender_pearl", label: "Жемчуг", fullName: "Жемчуг Энда", component: IconEnderPearl },
  { id: "tnt", label: "ТНТ", fullName: "Динамит (TNT)", component: IconTNT },
  { id: "netherite_sword", label: "Незерит", fullName: "Незеритовый меч", component: IconNetheriteSword },
];

/**
 * Universal Avatar Icon Resolver for Instances
 */
export const InstanceAvatarIcon: React.FC<{
  icon?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  fallbackVariant?: InstanceAvatarVariant;
}> = ({ icon, size = 22, className, style, fallbackVariant = "diamond_sword" }) => {
  if (
    icon &&
    (icon.startsWith("data:") ||
      icon.startsWith("http") ||
      icon.startsWith("blob:") ||
      icon.startsWith("/"))
  ) {
    return (
      <img
        src={icon}
        alt="Avatar"
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          imageRendering: "pixelated",
          borderRadius: Math.max(4, Math.floor(size / 5)),
          display: "block",
          ...style,
        }}
      />
    );
  }

  const normalized = (icon || fallbackVariant).toLowerCase();

  if (normalized.includes("pickaxe") || normalized.includes("кирка") || normalized.includes("pick")) {
    return <IconDiamondPickaxe size={size} className={className} style={style} />;
  }
  if (normalized.includes("crystal") || normalized.includes("кристалл") || normalized.includes("end")) {
    return <IconEndCrystal size={size} className={className} style={style} />;
  }
  if (normalized.includes("obsidian") || normalized.includes("обсидиан") || normalized === "rust") {
    return <IconObsidian size={size} className={className} style={style} />;
  }
  if (normalized.includes("totem") || normalized.includes("тотем")) {
    return <IconTotemOfUndying size={size} className={className} style={style} />;
  }
  if (normalized.includes("apple") || normalized.includes("яблоко") || normalized.includes("gold")) {
    return <IconGoldenApple size={size} className={className} style={style} />;
  }
  if (normalized.includes("pearl") || normalized.includes("жемчуг")) {
    return <IconEnderPearl size={size} className={className} style={style} />;
  }
  if (normalized.includes("tnt") || normalized.includes("тнт") || normalized.includes("динамит")) {
    return <IconTNT size={size} className={className} style={style} />;
  }
  if (normalized.includes("netherite") || normalized.includes("незерит")) {
    return <IconNetheriteSword size={size} className={className} style={style} />;
  }
  if (normalized.includes("sword") || normalized.includes("меч") || normalized === "pvp") {
    return <IconDiamondSword size={size} className={className} style={style} />;
  }

  // Fallback to Diamond Sword
  return <IconDiamondSword size={size} className={className} style={style} />;
};
