export type CustomizerZoneId = "topbar" | "background" | "catalog";

export type CustomizerMode = "dynamic" | "light" | "dark";

export interface ZoneCustomizationConfig {
  enabled: boolean;
  color: string;
  intensity: number;
  patternIntensity: number;
  mode: CustomizerMode;
  activeSwatchIndex?: number;
  numDots?: number;
  harmonyType?: "analogous" | "triadic" | "splitComplementary" | "complementary" | "singleAnalogous";
  baseAngle?: number;
  distance?: number;
}

export interface MenusCustomizationState {
  topbar: ZoneCustomizationConfig;
  background: ZoneCustomizationConfig;
  catalog: ZoneCustomizationConfig;
}

export const DEFAULT_MENUS_CUSTOMIZATION: MenusCustomizationState = {
  topbar: {
    enabled: true,
    color: "#2f3822",
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
    color: "#1c2838",
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
    color: "#442219",
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
      "#383428",
      "#3d242c",
      "#31233e",
      "#421b22",
      "#442219",
      "#3e3016",
      "#1b3629",
      "#1c2838",
    ],
  },
  {
    name: "Тактические милитари & Стелс",
    colors: [
      "#2f3822",
      "#202a38",
      "#3d2114",
      "#133324",
      "#3a2e15",
      "#20223d",
      "#222833",
      "#3d161d",
    ],
  },
  {
    name: "Глубокие стелс-тона",
    colors: [
      "#123829",
      "#102f38",
      "#2d1840",
      "#162744",
      "#3d2b0e",
      "#3d1217",
      "#2b3616",
      "#3b142d",
    ],
  },
];
