/**
 * Color manipulation utilities for Menu Customization
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

/**
 * Converts a 3 or 6 digit hex string to RGB object
 */
export function hexToRgb(hex: string): RgbColor {
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) {
    return { r: 89, g: 212, b: 164 }; // fallback mint
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Formats hex and alpha to rgba(...) CSS string
 */
export function rgbaString(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha.toFixed(3)})`;
}

/**
 * Converts RGB to hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (val: number) => clamp(val).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts Hex to HSL
 */
export function hexToHsl(hex: string): HslColor {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL to Hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/**
 * Modifies lightness/brightness of a hex color
 */
export function adjustLightness(hex: string, deltaPercent: number): string {
  const { h, s, l } = hexToHsl(hex);
  const newL = Math.max(5, Math.min(95, l + deltaPercent));
  return hslToHex(h, s, newL);
}

export interface PanelThemeStyles {
  panelBg: string;              // Rich solid matte background color (e.g. #35381f for olive, matches Image 5)
  panelPattern: string;         // Multi-layer dynamic texture CSS background-image
  panelPatternSize: string;     // Multi-layer dynamic background-size
  panelPatternPosition: string; // Multi-layer dynamic background-position
  panelPatternOpacity: string;  // Dynamic hardware-accelerated grain opacity (0.0 to 1.0)
  panelBorder: string;          // Soft subtle border
  itemBg: string;               // Inner buttons default bg (solid, non-transparent, tinted to theme)
  itemBorder: string;           // Inner buttons border
  itemHover: string;            // Inner buttons hover (solid, non-transparent, tinted to theme)
  itemActive: string;           // Inner buttons active (solid, non-transparent, tinted to theme)
  itemActiveBorder: string;     // Active button border highlight
  itemPlay: string;             // Play button bg (solid, non-transparent, tinted to theme)
  cardBg: string;               // Card background for catalog
  cardBorder: string;           // Card border
  accentColor: string;          // Clean accent color
}

/**
 * Computes the rich matte panel background matching user examples (Image 5 / Image 2 / Image 0)
 * The panel background ITSELF receives this color, NOT just a stroke/border!
 */
export function computePanelTheme(
  hex: string,
  intensity: number,
  patternIntensity: number = 30,
  mode: "dynamic" | "light" | "dark" = "dynamic"
): PanelThemeStyles {
  const { r, g, b } = hexToRgb(hex);
  const factor = Math.max(0.1, Math.min(1, intensity / 100));

  // Multiplier for brightness based on mode
  const mult = mode === "light" ? 0.88 : mode === "dark" ? 0.68 : 0.78;
  const baseR = 14, baseG = 17, baseB = 22;

  // Saturated matte fill: for olive (#6F7326) at 50% intensity, produces rgb(53, 56, 32) (exact Image 5)
  const targetR = Math.round(r * mult + 6);
  const targetG = Math.round(g * mult + 6);
  const targetB = Math.round(b * mult + 6);

  const finalR = Math.round(baseR * (1 - factor) + targetR * factor);
  const finalG = Math.round(baseG * (1 - factor) + targetG * factor);
  const finalB = Math.round(baseB * (1 - factor) + targetB * factor);

  const panelBg = `rgb(${finalR}, ${finalG}, ${finalB})`;

  // Subtle border: 20-30% lighter, non-neon, matte
  const borderR = Math.min(255, Math.round(finalR * 1.35 + 24));
  const borderG = Math.min(255, Math.round(finalG * 1.35 + 24));
  const borderB = Math.min(255, Math.round(finalB * 1.35 + 24));
  const panelBorder = `rgba(${borderR}, ${borderG}, ${borderB}, 0.35)`;

  // Inner buttons: 100% SOLID, non-transparent, tinted to match the chosen style & color
  const btnR = Math.min(255, Math.max(16, Math.round(finalR * 1.1 + 8)));
  const btnG = Math.min(255, Math.max(16, Math.round(finalG * 1.1 + 8)));
  const btnB = Math.min(255, Math.max(16, Math.round(finalB * 1.1 + 8)));
  const itemBg = `rgb(${btnR}, ${btnG}, ${btnB})`;

  const itemBorder = `rgba(${borderR}, ${borderG}, ${borderB}, 0.22)`;
  const itemActiveBorder = `rgba(${borderR}, ${borderG}, ${borderB}, 0.55)`;

  const hoverR = Math.min(255, Math.max(24, Math.round(finalR * 1.25 + 16)));
  const hoverG = Math.min(255, Math.max(24, Math.round(finalG * 1.25 + 16)));
  const hoverB = Math.min(255, Math.max(24, Math.round(finalB * 1.25 + 16)));
  const itemHover = `rgb(${hoverR}, ${hoverG}, ${hoverB})`;

  const activeR = Math.min(255, Math.max(30, Math.round(finalR * 1.45 + 26)));
  const activeG = Math.min(255, Math.max(30, Math.round(finalG * 1.45 + 26)));
  const activeB = Math.min(255, Math.max(30, Math.round(finalB * 1.45 + 26)));
  const itemActive = `rgb(${activeR}, ${activeG}, ${activeB})`;

  const playR = Math.min(255, Math.max(20, Math.round(finalR * 1.15 + 12)));
  const playG = Math.min(255, Math.max(20, Math.round(finalG * 1.15 + 12)));
  const playB = Math.min(255, Math.max(20, Math.round(finalB * 1.15 + 12)));
  const itemPlay = `rgb(${playR}, ${playG}, ${playB})`;

  // Cards in catalog: slightly deeper than panel wrap
  const cardR = Math.round(finalR * 0.88);
  const cardG = Math.round(finalG * 0.88);
  const cardB = Math.round(finalB * 0.88);
  const cardBg = `rgb(${cardR}, ${cardG}, ${cardB})`;
  const cardBorder = `rgba(${borderR}, ${borderG}, ${borderB}, 0.28)`;

  // Dynamic proportional texture intensity & density:
  // Every single percent point (1% - 100%) dynamically scales both grain contrast and particle visibility!
  const patternPct = Math.max(0, Math.min(100, Math.round(patternIntensity)));
  let panelPattern = "none";
  let panelPatternSize = "180px 180px";
  let panelPatternPosition = "0 0";
  let panelPatternOpacity = "0";

  if (patternPct > 0) {
    const norm = patternPct / 100; // 0.01 to 1.0

    // Direct proportional opacity for every single percent (from 0.008 to 0.75)
    // Small percentages (1-10%) are very faint micro-textures, scaling smoothly up to 100%
    panelPatternOpacity = (norm * 0.75).toFixed(3);

    // Fine, microscopic grain tile:
    // Kept at high resolution (180px-220px) so each noise speck remains a tiny 1-pixel micro-particle
    if (norm > 0.4) {
      panelPattern = "url('/textures/menu_pattern.png'), url('/textures/menu_pattern.png')";
      panelPatternSize = "180px 180px, 220px 220px";
      panelPatternPosition = "0 0, 47px 53px";
    } else {
      panelPattern = "url('/textures/menu_pattern.png')";
      panelPatternSize = "180px 180px";
      panelPatternPosition = "0 0";
    }
  }

  return {
    panelBg,
    panelPattern,
    panelPatternSize,
    panelPatternPosition,
    panelPatternOpacity,
    panelBorder,
    itemBg,
    itemBorder,
    itemHover,
    itemActive,
    itemActiveBorder,
    itemPlay,
    cardBg,
    cardBorder,
    accentColor: hex,
  };
}

/**
 * Samples a color in Zen Browser's polar wheel system:
 * - Angle represents Hue (0° to 360°)
 * - Distance from center represents Saturation (low at center, high at rim)
 * - Lightness is governed by mode
 */
export function sampleZenColor(
  hue: number,
  dist: number,
  maxRadius: number = 38,
  mode: "dynamic" | "light" | "dark" = "dynamic"
): string {
  const normDist = Math.max(0, Math.min(1, dist / maxRadius));
  const h = (Math.round(hue) % 360 + 360) % 360;
  const sat = Math.round(20 + normDist * 50);

  let light = 18;
  if (mode === "dark") {
    light = Math.round(14 + normDist * 10);
  } else if (mode === "light") {
    light = Math.round(24 + normDist * 12);
  } else {
    // dynamic
    light = Math.round(18 + normDist * 12);
  }

  return hslToHex(h, sat, light);
}

/**
 * Finds polar angle and distance in Zen Browser's system for a given hex color
 */
export function findZenCoordsForColor(
  hex: string,
  maxRadius: number = 38
): { baseAngle: number; distance: number } {
  const { h, s } = hexToHsl(hex);
  const baseAngle = (Math.round(h) % 360 + 360) % 360;
  const distance = Math.max(16, Math.min(maxRadius, Math.round((s / 100) * maxRadius)));
  return { baseAngle, distance };
}

/**
 * Samples color on the 2D canvas based on (nx, ny) in % (0 - 100)
 */
export function sampleCanvasColor(
  nx: number,
  ny: number,
  mode: "dynamic" | "light" | "dark" = "dynamic"
): string {
  const clampedX = Math.max(0, Math.min(100, nx)) / 100;
  const clampedY = Math.max(0, Math.min(100, ny)) / 100;

  // Spectrum mapping:
  // Center (0.59) gives olive green (hue ~ 63)
  // Right gives warmer tones (terracotta/orange/pink)
  // Left gives cooler tones (forest green/mint/blue/lavender)
  let hue = Math.round((210 - clampedX * 250 + 360) % 360);

  let sat = 50;
  let light = 30;

  if (mode === "dark") {
    sat = Math.round(40 + clampedY * 18);
    light = Math.round(20 + (1 - clampedY) * 14);
  } else if (mode === "light") {
    sat = Math.round(55 + clampedY * 15);
    light = Math.round(35 + (1 - clampedY) * 18);
  } else {
    sat = Math.round(45 + clampedY * 15);
    light = Math.round(22 + (1 - clampedY) * 16);
  }

  return hslToHex(hue, sat, light);
}

/**
 * Finds canvas coordinates (x, y in %) corresponding to a given hex color
 */
export function findCanvasCoordsForColor(hex: string): { x: number; y: number } {
  const { h, l } = hexToHsl(hex);
  let diff = (210 - h + 360) % 360;
  let nx = diff / 250;
  if (nx > 0.88) nx = 0.82;
  if (nx < 0.14) nx = 0.18;
  const x = Math.max(16, Math.min(84, Math.round(nx * 100)));
  const ny = Math.max(0.2, Math.min(0.8, 1 - (l - 22) / 16));
  const y = Math.max(20, Math.min(80, Math.round(ny * 100)));

  return { x, y };
}
