export function getPixelPlateSvg(fill: string, stroke: string, strokeWidth: number = 1.5): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M5 1h14v4h4v14h-4v4H5v-4H1V5h4V1z' fill='${encodeURIComponent(
    fill,
  )}' stroke='${encodeURIComponent(stroke)}' stroke-width='${strokeWidth}' stroke-linejoin='miter'/></svg>`;
  return `data:image/svg+xml,${svg}`;
}

export function getPixelPlateStyle(
  fill: string,
  stroke: string,
  borderWidth: number = 6,
  strokeWidth: number = 1.5,
): React.CSSProperties {
  const url = getPixelPlateSvg(fill, stroke, strokeWidth);
  return {
    background: "transparent",
    borderStyle: "solid",
    borderWidth: `${borderWidth}px`,
    borderImage: `url("${url}") ${borderWidth} fill stretch`,
    clipPath: `polygon(
      3px 0,
      calc(100% - 3px) 0,
      calc(100% - 3px) 3px,
      100% 3px,
      100% calc(100% - 3px),
      calc(100% - 3px) calc(100% - 3px),
      calc(100% - 3px) 100%,
      3px 100%,
      3px calc(100% - 3px),
      0 calc(100% - 3px),
      0 3px,
      3px 3px
    )`,
  };
}

export const PIXEL_PLATE_PRESETS = {
  darkSlate: {
    normal: { fill: "#0f1624", stroke: "#223049" },
    hover: { fill: "#162238", stroke: "#38bdf8" },
    active: { fill: "#1b2d4c", stroke: "#60a5fa" },
  },
  instanceBlue: {
    normal: { fill: "#1d5dc7", stroke: "#2563eb" },
    hover: { fill: "#256ae3", stroke: "#3b82f6" },
    active: { fill: "#1a51b0", stroke: "#60a5fa" },
  },
  playTacticalGreen: {
    normal: { fill: "#4a6839", stroke: "#698852" },
    hover: { fill: "#587c44", stroke: "#7ea363" },
    active: { fill: "#3f5930", stroke: "#5f7c49" },
  },
  stopRed: {
    normal: { fill: "#7e3230", stroke: "#9e4a46" },
    hover: { fill: "#923b38", stroke: "#b55753" },
    active: { fill: "#6b2a28", stroke: "#873e3b" },
  },
  storeCard: {
    normal: { fill: "#101726", stroke: "#25364e" },
    hover: { fill: "#152033", stroke: "#3d567c" },
    active: { fill: "#1a2740", stroke: "#4b6b99" },
  },
  friendsCard: {
    normal: { fill: "#0f1624", stroke: "#24334d" },
    hover: { fill: "#162238", stroke: "#10b981" },
    active: { fill: "#1a2740", stroke: "#34d399" },
  },
  modalContainer: {
    normal: { fill: "#0b0f19", stroke: "#1e293b" },
  },
};
