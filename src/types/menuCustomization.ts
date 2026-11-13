export type CustomizerZoneId = "topbar" | "background" | "catalog";

export type CustomizerMode = "dynamic" | "light" | "dark";

export interface ZoneCustomizationConfig {
  enabled: boolean;
  color: string;           // Hex color code, e.g. '#59D4A4'
  intensity: number;       // 0 to 100 (percentage)
  patternIntensity: number;// 0 to 100 (percentage for rotary dial / texture)
  mode: CustomizerMode;    // 'dynamic' (✦), 'light' (☼), 'dark' (☾)
  activeSwatchIndex?: number;
  numDots?: number;        // 1, 2, or 3 balls (Zen Browser style)
  harmonyType?: "analogous" | "triadic" | "splitComplementary" | "complementary" | "singleAnalogous";
  baseAngle?: number;      // 0 to 360 degrees
  distance?: number;       // distance from center (radial saturation)
}

export interface MenusCustomizationState {
  topbar: ZoneCustomizationConfig;
  background: ZoneCustomizationConfig;
  catalog: ZoneCustomizationConfig;
}

export const DEFAULT_MENUS_CUSTOMIZATION: MenusCustomizationState = {
  topbar: {
    enabled: true,
    color: "#2f3822", // Dark tactical olive
    intensity: 45,
    patternIntensity: 25,
    mode: "dynamic",
    activeSwatchIndex: 6,
    numDots: 3,
    harmonyType: "analogous",
    baseAngle: 63,
    distance: 28,
  },
  background: {
    enabled: true,
    color: "#1c2838", // Deep slate / dark navy blue
    intensity: 30,
    patternIntensity: 20,
    mode: "dark",
    activeSwatchIndex: 7,
    numDots: 1,
    harmonyType: "analogous",
    baseAngle: 216,
    distance: 22,
  },
  catalog: {
    enabled: true,
    color: "#442219", // Dark terracotta / rust
    intensity: 35,
    patternIntensity: 25,
    mode: "dynamic",
    activeSwatchIndex: 4,
    numDots: 3,
    harmonyType: "analogous",
    baseAngle: 12,
    distance: 28,
  },
};

export const COLOR_PALETTE_PAGES: Array<{ name: string; colors: string[] }> = [
  {
    name: "Затемнённая классика",
    colors: [
      "#383428", // 1. Dark Sand / Deep Cream
      "#3d242c", // 2. Dark Muted Dusty Rose
      "#31233e", // 3. Deep Plum / Dark Lavender
      "#421b22", // 4. Deep Wine / Dark Crimson
      "#442219", // 5. Dark Terracotta / Rust
      "#3e3016", // 6. Deep Dark Ochre / Warm Umber
      "#1b3629", // 7. Deep Pine / Dark Jade
      "#1c2838", // 8. Deep Slate / Dark Navy Blue
    ],
  },
  {
    name: "Тактические милитари & Стелс",
    colors: [
      "#2f3822", // Tactical Olive
      "#202a38", // Deep Gunmetal Steel
      "#3d2114", // Dark Burnt Umber
      "#133324", // Deep Cold Emerald
      "#3a2e15", // Dark Bronze Gold
      "#20223d", // Deep Night Indigo
      "#222833", // Deep Obsidian Charcoal
      "#3d161d", // Dark Cherry Maroon
    ],
  },
  {
    name: "Глубокие стелс-тона",
    colors: [
      "#123829", // Deep Stealth Jade
      "#102f38", // Deep Abyssal Cyan
      "#2d1840", // Deep Shadow Violet
      "#162744", // Deep Midnight Cobalt
      "#3d2b0e", // Dark Molten Honey
      "#3d1217", // Deep Blood Crimson
      "#2b3616", // Dark Tactical Moss
      "#3b142d", // Deep Velvet Plum
    ],
  },
];
