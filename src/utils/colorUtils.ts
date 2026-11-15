
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
    return { r: 89, g: 212, b: 164 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbaString(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha.toFixed(3)})`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (val: number) => clamp(val).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

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

export function adjustLightness(hex: string, deltaPercent: number): string {
  const { h, s, l } = hexToHsl(hex);
  const newL = Math.max(5, Math.min(95, l + deltaPercent));
  return hslToHex(h, s, newL);
}

export interface PanelThemeStyles {
  panelBg: string;
  panelPattern: string;
  panelPatternSize: string;
  panelPatternPosition: string;
  panelPatternOpacity: string;
  panelBorder: string;
  itemBg: string;
  itemBorder: string;
  itemHover: string;
  itemActive: string;
  itemActiveBorder: string;
  itemPlay: string;
  cardBg: string;
  cardBorder: string;
  accentColor: string;
}

export function computePanelTheme(
  hex: string,
  intensity: number,
  patternIntensity: number = 30,
  mode: "dynamic" | "light" | "dark" = "dynamic"
): PanelThemeStyles {
  const { r, g, b } = hexToRgb(hex);
  const factor = Math.max(0.1, Math.min(1, intensity / 100));

  const mult = mode === "light" ? 0.88 : mode === "dark" ? 0.68 : 0.78;
  const baseR = 14, baseG = 17, baseB = 22;

  const targetR = Math.round(r * mult + 6);
  const targetG = Math.round(g * mult + 6);
  const targetB = Math.round(b * mult + 6);

  const finalR = Math.round(baseR * (1 - factor) + targetR * factor);
  const finalG = Math.round(baseG * (1 - factor) + targetG * factor);
  const finalB = Math.round(baseB * (1 - factor) + targetB * factor);

  const panelBg = `rgb(${finalR}, ${finalG}, ${finalB})`;

  const borderR = Math.min(255, Math.round(finalR * 1.35 + 24));
  const borderG = Math.min(255, Math.round(finalG * 1.35 + 24));
  const borderB = Math.min(255, Math.round(finalB * 1.35 + 24));
  const panelBorder = `rgba(${borderR}, ${borderG}, ${borderB}, 0.35)`;

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

  const cardR = Math.round(finalR * 0.88);
  const cardG = Math.round(finalG * 0.88);
  const cardB = Math.round(finalB * 0.88);
  const cardBg = `rgb(${cardR}, ${cardG}, ${cardB})`;
  const cardBorder = `rgba(${borderR}, ${borderG}, ${borderB}, 0.28)`;

  const patternPct = Math.max(0, Math.min(100, Math.round(patternIntensity)));
  let panelPattern = "none";
  let panelPatternSize = "180px 180px";
  let panelPatternPosition = "0 0";
  let panelPatternOpacity = "0";

  if (patternPct > 0) {
    const norm = patternPct / 100;

    panelPatternOpacity = (norm * 0.75).toFixed(3);

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
    light = Math.round(18 + normDist * 12);
  }

  return hslToHex(h, sat, light);
}

export function findZenCoordsForColor(
  hex: string,
  maxRadius: number = 38
): { baseAngle: number; distance: number } {
  const { h, s } = hexToHsl(hex);
  const baseAngle = (Math.round(h) % 360 + 360) % 360;
  const distance = Math.max(16, Math.min(maxRadius, Math.round((s / 100) * maxRadius)));
  return { baseAngle, distance };
}

export function sampleCanvasColor(
  nx: number,
  ny: number,
  mode: "dynamic" | "light" | "dark" = "dynamic"
): string {
  const clampedX = Math.max(0, Math.min(100, nx)) / 100;
  const clampedY = Math.max(0, Math.min(100, ny)) / 100;

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
