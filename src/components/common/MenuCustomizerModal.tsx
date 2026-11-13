import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Sparkles,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Palette,
} from "lucide-react";
import {
  type CustomizerZoneId,
  type MenusCustomizationState,
  type ZoneCustomizationConfig,
  DEFAULT_MENUS_CUSTOMIZATION,
  COLOR_PALETTE_PAGES,
} from "../../types/menuCustomization";
import {
  computePanelTheme,
  sampleZenColor,
  findZenCoordsForColor,
} from "../../utils/colorUtils";
import "../../styles/menu-customizer.css";

interface MenuCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialZone?: CustomizerZoneId;
  state: MenusCustomizationState;
  onChange: (newState: MenusCustomizationState) => void;
  onResetZone?: (zone: CustomizerZoneId) => void;
}

/**
 * Directly writes CSS custom properties to document root.
 * Bypasses virtual DOM diffing for 60/120/144fps GPU-accelerated live preview.
 */
function applyZoneCssVariables(zone: CustomizerZoneId, config: ZoneCustomizationConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const theme = computePanelTheme(
    config.color || "#5f7a4a",
    config.intensity,
    config.patternIntensity,
    config.mode
  );

  if (zone === "topbar") {
    root.style.setProperty("--custom-topbar-bg", theme.panelBg);
    root.style.setProperty("--custom-topbar-border", theme.panelBorder);
    root.style.setProperty("--custom-topbar-pattern", theme.panelPattern);
    root.style.setProperty("--custom-topbar-pattern-size", theme.panelPatternSize);
    root.style.setProperty("--custom-topbar-pattern-pos", theme.panelPatternPosition);
    root.style.setProperty("--custom-topbar-pattern-opacity", theme.panelPatternOpacity);
    root.style.setProperty("--custom-topbar-btn-bg", theme.itemBg);
    root.style.setProperty("--custom-topbar-btn-border", theme.itemBorder);
    root.style.setProperty("--custom-topbar-btn-hover", theme.itemHover);
    root.style.setProperty("--custom-topbar-btn-active", theme.itemActive);
    root.style.setProperty("--custom-topbar-btn-play", theme.itemPlay);
    root.style.setProperty("--custom-topbar-btn-active-border", theme.itemActiveBorder);
    root.style.setProperty("--custom-topbar-accent", theme.accentColor);
  } else if (zone === "background") {
    root.style.setProperty("--custom-bg-color", theme.panelBg);
    root.style.setProperty("--custom-bg-pattern", theme.panelPattern);
    root.style.setProperty("--custom-bg-pattern-size", theme.panelPatternSize);
    root.style.setProperty("--custom-bg-pattern-pos", theme.panelPatternPosition);
    root.style.setProperty("--custom-bg-pattern-opacity", theme.panelPatternOpacity);
    root.style.setProperty(
      "--custom-bg-opacity",
      String(Math.max(0.3, (config.intensity / 100) * 0.85))
    );
    root.style.setProperty(
      "--custom-bg-blend",
      config.mode === "light"
        ? "screen"
        : config.mode === "dynamic"
        ? "color"
        : "multiply"
    );
  }
}

function getHarmonyOffsets(numDots: number, harmonyType: string): number[] {
  if (numDots === 1) return [];
  if (numDots === 2) {
    if (harmonyType === "singleAnalogous") return [50];
    return [180]; // complementary
  }
  // 3 dots
  if (harmonyType === "triadic") return [120, 240];
  if (harmonyType === "splitComplementary") return [150, 210];
  return [50, 310]; // analogous (±50°)
}

const MAX_RADIUS = 38;
const CANVAS_CENTER = { x: 50, y: 50 };

export const MenuCustomizerModal: React.FC<MenuCustomizerModalProps> = React.memo(({
  isOpen,
  onClose,
  initialZone = "topbar",
  state,
  onChange,
  onResetZone,
}) => {
  const [activeZone, setActiveZone] = useState<CustomizerZoneId>(() => {
    return initialZone === "catalog" ? "topbar" : initialZone;
  });
  const [palettePageIndex, setPalettePageIndex] = useState<number>(0);

  // Active configuration for current zone
  const currentConfig = state[activeZone] || DEFAULT_MENUS_CUSTOMIZATION[activeZone];

  // Local state for React UI elements
  const [numDots, setNumDots] = useState<number>(currentConfig.numDots ?? 3);
  const [harmonyType, setHarmonyType] = useState<
    "analogous" | "triadic" | "splitComplementary" | "complementary" | "singleAnalogous"
  >((currentConfig.harmonyType as any) ?? "analogous");

  const [baseAngle, setBaseAngle] = useState<number>(() => {
    if (currentConfig.baseAngle !== undefined) return currentConfig.baseAngle;
    if (currentConfig.color) return findZenCoordsForColor(currentConfig.color).baseAngle;
    return 63;
  });

  const [distance, setDistance] = useState<number>(() => {
    if (currentConfig.distance !== undefined) return currentConfig.distance;
    if (currentConfig.color) return findZenCoordsForColor(currentConfig.color).distance;
    return 28;
  });

  const [localIntensity, setLocalIntensity] = useState<number>(currentConfig.intensity ?? 60);
  const [localPatternIntensity, setLocalPatternIntensity] = useState<number>(currentConfig.patternIntensity ?? 30);
  const [localMode, setLocalMode] = useState<"dynamic" | "light" | "dark">(currentConfig.mode ?? "dynamic");
  const [localColor, setLocalColor] = useState<string>(() => {
    return currentConfig.color || sampleZenColor(baseAngle, distance, MAX_RADIUS, currentConfig.mode);
  });

  // Direct DOM Refs for 0-latency, 0-React-render drag operations
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dot0Ref = useRef<HTMLDivElement>(null);
  const dot1Ref = useRef<HTMLDivElement>(null);
  const dot2Ref = useRef<HTMLDivElement>(null);

  const previewBgRef = useRef<HTMLDivElement>(null);
  const previewColorPipRef = useRef<HTMLSpanElement>(null);
  const previewHexRef = useRef<HTMLElement>(null);
  const previewIntensityRef = useRef<HTMLSpanElement>(null);
  const previewTextureRef = useRef<HTMLSpanElement>(null);

  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const sliderThumbRef = useRef<HTMLDivElement>(null);
  const sliderActivePathRef = useRef<SVGPathElement>(null);
  const sliderValLabelRef = useRef<HTMLElement>(null);

  const knobRef = useRef<HTMLDivElement>(null);
  const knobDialRef = useRef<HTMLDivElement>(null);
  const knobTicksSvgRef = useRef<SVGSVGElement>(null);
  const knobValLabelRef = useRef<HTMLDivElement>(null);

  // Cached layout rects
  const canvasRectRef = useRef<DOMRect | null>(null);
  const sliderRectRef = useRef<DOMRect | null>(null);
  const knobRectRef = useRef<DOMRect | null>(null);

  // Drag coordinates & refs
  const canvasPointerCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeDragDotRef = useRef<number>(0);
  const sliderPointerXRef = useRef<number>(0);
  const knobPointerCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Running values during active drag (so onPointerUp can commit cleanly)
  const dragBaseAngleRef = useRef<number>(baseAngle);
  const dragDistanceRef = useRef<number>(distance);
  const dragColorRef = useRef<string>(localColor);
  const dragIntensityRef = useRef<number>(localIntensity);
  const dragPatternIntensityRef = useRef<number>(localPatternIntensity);

  // requestAnimationFrame handle
  const rafIdRef = useRef<number | null>(null);

  // References to latest state
  const latestStateRef = useRef<MenusCustomizationState>(state);
  const latestConfigRef = useRef<ZoneCustomizationConfig>(currentConfig);
  const activeZoneRef = useRef<CustomizerZoneId>(activeZone);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    activeZoneRef.current = activeZone;
  }, [activeZone]);

  useEffect(() => {
    if (initialZone) {
      setActiveZone(initialZone === "catalog" ? "topbar" : initialZone);
    }
  }, [initialZone, isOpen]);

  // Synchronize local state when switching zone or reopening
  useEffect(() => {
    const cfg = state[activeZone] || DEFAULT_MENUS_CUSTOMIZATION[activeZone];
    latestConfigRef.current = cfg;
    setNumDots(cfg.numDots ?? 3);
    setHarmonyType((cfg.harmonyType as any) ?? "analogous");
    setLocalIntensity(cfg.intensity ?? 60);
    setLocalPatternIntensity(cfg.patternIntensity ?? 30);
    setLocalMode(cfg.mode ?? "dynamic");

    const angle = cfg.baseAngle ?? 63;
    const dist = cfg.distance ?? 28;
    const clr = cfg.color || sampleZenColor(angle, dist, MAX_RADIUS, cfg.mode);

    if (cfg.color) {
      const { baseAngle: h, distance: d } = findZenCoordsForColor(cfg.color);
      setBaseAngle(h);
      setDistance(d);
      setLocalColor(cfg.color);
      dragBaseAngleRef.current = h;
      dragDistanceRef.current = d;
      dragColorRef.current = cfg.color;
    } else {
      setBaseAngle(angle);
      setDistance(dist);
      setLocalColor(clr);
      dragBaseAngleRef.current = angle;
      dragDistanceRef.current = dist;
      dragColorRef.current = clr;
    }
    dragIntensityRef.current = cfg.intensity ?? 60;
    dragPatternIntensityRef.current = cfg.patternIntensity ?? 30;

    if (previewIntensityRef.current) {
      previewIntensityRef.current.textContent = `Интенсивность: ${cfg.intensity ?? 60}%`;
    }
    if (previewTextureRef.current) {
      previewTextureRef.current.textContent = `Текстура: ${cfg.patternIntensity ?? 30}%`;
    }
  }, [activeZone, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Geometry calculations for ball orbits
  const offsets = useMemo(() => {
    return getHarmonyOffsets(numDots, harmonyType);
  }, [numDots, harmonyType]);

  const rad0 = (baseAngle * Math.PI) / 180;
  const dot0_x = CANVAS_CENTER.x + distance * Math.cos(rad0);
  const dot0_y = CANVAS_CENTER.y + distance * Math.sin(rad0);
  const color0 = localColor;

  let dot1_x = dot0_x, dot1_y = dot0_y, color1 = color0;
  if (numDots >= 2) {
    const rad1 = ((baseAngle + offsets[0]) * Math.PI) / 180;
    dot1_x = CANVAS_CENTER.x + distance * Math.cos(rad1);
    dot1_y = CANVAS_CENTER.y + distance * Math.sin(rad1);
    color1 = sampleZenColor((baseAngle + offsets[0]) % 360, distance, MAX_RADIUS, localMode);
  }

  let dot2_x = dot0_x, dot2_y = dot0_y, color2 = color0;
  if (numDots === 3) {
    const rad2 = ((baseAngle + offsets[1]) * Math.PI) / 180;
    dot2_x = CANVAS_CENTER.x + distance * Math.cos(rad2);
    dot2_y = CANVAS_CENTER.y + distance * Math.sin(rad2);
    color2 = sampleZenColor((baseAngle + offsets[1]) % 360, distance, MAX_RADIUS, localMode);
  }

  const panelTheme = useMemo(() => {
    return computePanelTheme(color0, localIntensity, localPatternIntensity, localMode);
  }, [color0, localIntensity, localPatternIntensity, localMode]);

  // Helper to commit changes to parent and save
  const commitConfigChange = useCallback((updates: Partial<ZoneCustomizationConfig>) => {
    const updated: ZoneCustomizationConfig = {
      ...latestConfigRef.current,
      ...updates,
    };
    latestConfigRef.current = updated;
    applyZoneCssVariables(activeZoneRef.current, updated);
    onChangeRef.current({
      ...latestStateRef.current,
      [activeZoneRef.current]: updated,
    });
  }, []);

  // =========================================================================
  // Zero-React-Render Direct DOM Tick for Orbital Balls
  // =========================================================================

  const processCanvasDragTick = useCallback(() => {
    rafIdRef.current = null;
    const rect = canvasRectRef.current;
    if (!rect) return;

    const centerX_px = rect.left + rect.width / 2;
    const centerY_px = rect.top + rect.height / 2;
    const px = canvasPointerCoordsRef.current.x - centerX_px;
    const py = canvasPointerCoordsRef.current.y - centerY_px;

    const pointerAngle = (Math.atan2(py, px) * 180 / Math.PI + 360) % 360;
    const maxCanvasRadiusPx = (Math.min(rect.width, rect.height) / 2) * 0.78;
    const rawDist = (Math.hypot(px, py) / maxCanvasRadiusPx) * MAX_RADIUS;
    const newDist = Math.max(8, Math.min(MAX_RADIUS, Math.round(rawDist * 10) / 10));

    let newBaseAngle = pointerAngle;
    const dotIdx = activeDragDotRef.current;
    const curOffsets = getHarmonyOffsets(
      latestConfigRef.current.numDots ?? 3,
      latestConfigRef.current.harmonyType ?? "analogous"
    );
    if (dotIdx === 1 && curOffsets.length >= 1) {
      newBaseAngle = (pointerAngle - curOffsets[0] + 360) % 360;
    } else if (dotIdx === 2 && curOffsets.length >= 2) {
      newBaseAngle = (pointerAngle - curOffsets[1] + 360) % 360;
    }
    newBaseAngle = Math.round(newBaseAngle);

    const newPrimaryColor = sampleZenColor(
      newBaseAngle,
      newDist,
      MAX_RADIUS,
      latestConfigRef.current.mode
    );

    dragBaseAngleRef.current = newBaseAngle;
    dragDistanceRef.current = newDist;
    dragColorRef.current = newPrimaryColor;

    // DIRECT DOM MUTATIONS (0ms Virtual DOM overhead)
    const curRad0 = (newBaseAngle * Math.PI) / 180;
    const curDot0_x = CANVAS_CENTER.x + newDist * Math.cos(curRad0);
    const curDot0_y = CANVAS_CENTER.y + newDist * Math.sin(curRad0);

    if (dot0Ref.current) {
      dot0Ref.current.style.left = `${curDot0_x}%`;
      dot0Ref.current.style.top = `${curDot0_y}%`;
      dot0Ref.current.style.backgroundColor = newPrimaryColor;
    }

    if (dot1Ref.current && (latestConfigRef.current.numDots ?? 3) >= 2) {
      const curRad1 = ((newBaseAngle + curOffsets[0]) * Math.PI) / 180;
      const curDot1_x = CANVAS_CENTER.x + newDist * Math.cos(curRad1);
      const curDot1_y = CANVAS_CENTER.y + newDist * Math.sin(curRad1);
      const curColor1 = sampleZenColor(
        (newBaseAngle + curOffsets[0]) % 360,
        newDist,
        MAX_RADIUS,
        latestConfigRef.current.mode
      );
      dot1Ref.current.style.left = `${curDot1_x}%`;
      dot1Ref.current.style.top = `${curDot1_y}%`;
      dot1Ref.current.style.backgroundColor = curColor1;
    }

    if (dot2Ref.current && (latestConfigRef.current.numDots ?? 3) >= 3) {
      const curRad2 = ((newBaseAngle + curOffsets[1]) * Math.PI) / 180;
      const curDot2_x = CANVAS_CENTER.x + newDist * Math.cos(curRad2);
      const curDot2_y = CANVAS_CENTER.y + newDist * Math.sin(curRad2);
      const curColor2 = sampleZenColor(
        (newBaseAngle + curOffsets[1]) % 360,
        newDist,
        MAX_RADIUS,
        latestConfigRef.current.mode
      );
      dot2Ref.current.style.left = `${curDot2_x}%`;
      dot2Ref.current.style.top = `${curDot2_y}%`;
      dot2Ref.current.style.backgroundColor = curColor2;
    }

    // Live panel surface preview direct DOM update
    const curTheme = computePanelTheme(
      newPrimaryColor,
      latestConfigRef.current.intensity,
      latestConfigRef.current.patternIntensity,
      latestConfigRef.current.mode
    );
    if (previewBgRef.current) {
      previewBgRef.current.style.backgroundColor = curTheme.panelBg;
      previewBgRef.current.style.borderColor = curTheme.panelBorder;
      previewBgRef.current.style.removeProperty("background-image");
      previewBgRef.current.style.setProperty("--preview-pattern", curTheme.panelPattern);
      previewBgRef.current.style.setProperty("--preview-pattern-size", curTheme.panelPatternSize);
      previewBgRef.current.style.setProperty("--preview-pattern-pos", curTheme.panelPatternPosition);
      previewBgRef.current.style.setProperty("--preview-pattern-opacity", curTheme.panelPatternOpacity);
    }
    if (previewColorPipRef.current) {
      previewColorPipRef.current.style.backgroundColor = newPrimaryColor;
    }
    if (previewHexRef.current) {
      previewHexRef.current.textContent = curTheme.panelBg;
    }

    const updated: ZoneCustomizationConfig = {
      ...latestConfigRef.current,
      color: newPrimaryColor,
      baseAngle: newBaseAngle,
      distance: newDist,
    };
    latestConfigRef.current = updated;

    // Instant CSS update on documentElement (0ms latency, direct GPU composition)
    applyZoneCssVariables(activeZoneRef.current, updated);
  }, []);

  // Pointer Down for Zen Balls
  const handleStartDragBall = useCallback((dotIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (canvasRef.current) {
      canvasRectRef.current = canvasRef.current.getBoundingClientRect();
      canvasRef.current.classList.add("dragging");
    }
    if (cardRef.current) {
      cardRef.current.classList.add("is-dragging");
    }

    activeDragDotRef.current = dotIndex;
    canvasPointerCoordsRef.current = { x: e.clientX, y: e.clientY };

    const onWindowMove = (ev: PointerEvent) => {
      canvasPointerCoordsRef.current = { x: ev.clientX, y: ev.clientY };
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(processCanvasDragTick);
      }
    };

    const onWindowUp = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);

      canvasRef.current?.classList.remove("dragging");
      cardRef.current?.classList.remove("is-dragging");
      canvasRectRef.current = null;

      // Sync React state once on release
      setBaseAngle(dragBaseAngleRef.current);
      setDistance(dragDistanceRef.current);
      setLocalColor(dragColorRef.current);

      commitConfigChange({
        color: dragColorRef.current,
        baseAngle: dragBaseAngleRef.current,
        distance: dragDistanceRef.current,
      });
    };

    window.addEventListener("pointermove", onWindowMove, { passive: true });
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);

    // Initial tick
    processCanvasDragTick();
  }, [processCanvasDragTick, commitConfigChange]);

  // =========================================================================
  // Zero-React-Render Direct DOM Tick for Wavy Slider
  // =========================================================================

  const processSliderDragTick = useCallback(() => {
    rafIdRef.current = null;
    const rect = sliderRectRef.current;
    if (!rect) return;

    const rawPct = ((sliderPointerXRef.current - rect.left) / rect.width) * 100;
    const clampedPct = Math.max(0, Math.min(100, Math.round(rawPct)));
    dragIntensityRef.current = clampedPct;

    if (sliderThumbRef.current) {
      sliderThumbRef.current.style.left = `${clampedPct}%`;
    }
    if (sliderActivePathRef.current) {
      sliderActivePathRef.current.style.strokeDashoffset = String(200 - (200 * clampedPct) / 100);
    }
    if (sliderValLabelRef.current) {
      sliderValLabelRef.current.textContent = `${clampedPct}%`;
    }
    if (previewIntensityRef.current) {
      previewIntensityRef.current.textContent = `Интенсивность: ${clampedPct}%`;
    }

    const curTheme = computePanelTheme(
      dragColorRef.current,
      clampedPct,
      dragPatternIntensityRef.current,
      latestConfigRef.current.mode
    );
    if (previewBgRef.current) {
      previewBgRef.current.style.backgroundColor = curTheme.panelBg;
      previewBgRef.current.style.borderColor = curTheme.panelBorder;
      previewBgRef.current.style.removeProperty("background-image");
      previewBgRef.current.style.setProperty("--preview-pattern", curTheme.panelPattern);
      previewBgRef.current.style.setProperty("--preview-pattern-size", curTheme.panelPatternSize);
      previewBgRef.current.style.setProperty("--preview-pattern-pos", curTheme.panelPatternPosition);
      previewBgRef.current.style.setProperty("--preview-pattern-opacity", curTheme.panelPatternOpacity);
    }
    if (previewHexRef.current) {
      previewHexRef.current.textContent = curTheme.panelBg;
    }

    const updated: ZoneCustomizationConfig = {
      ...latestConfigRef.current,
      intensity: clampedPct,
    };
    latestConfigRef.current = updated;

    applyZoneCssVariables(activeZoneRef.current, updated);
  }, []);

  const handleStartSlider = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (sliderTrackRef.current) {
      sliderRectRef.current = sliderTrackRef.current.getBoundingClientRect();
      sliderTrackRef.current.classList.add("dragging");
    }
    if (cardRef.current) {
      cardRef.current.classList.add("is-dragging");
    }

    sliderPointerXRef.current = e.clientX;

    const onWindowMove = (ev: PointerEvent) => {
      sliderPointerXRef.current = ev.clientX;
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(processSliderDragTick);
      }
    };

    const onWindowUp = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);

      sliderTrackRef.current?.classList.remove("dragging");
      cardRef.current?.classList.remove("is-dragging");
      sliderRectRef.current = null;

      setLocalIntensity(dragIntensityRef.current);
      commitConfigChange({ intensity: dragIntensityRef.current });
    };

    window.addEventListener("pointermove", onWindowMove, { passive: true });
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);

    processSliderDragTick();
  }, [processSliderDragTick, commitConfigChange]);

  // =========================================================================
  // Zero-React-Render Direct DOM Tick for Rotary Knob
  // =========================================================================

  const processKnobDragTick = useCallback(() => {
    rafIdRef.current = null;
    const rect = knobRectRef.current;
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radians = Math.atan2(
      knobPointerCoordsRef.current.y - centerY,
      knobPointerCoordsRef.current.x - centerX
    );
    let degrees = radians * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;

    const pct = Math.max(0, Math.min(100, Math.round((degrees / 360) * 100)));
    dragPatternIntensityRef.current = pct;

    if (knobDialRef.current) {
      knobDialRef.current.style.transform = `rotate(${degrees}deg)`;
    }
    if (knobValLabelRef.current) {
      knobValLabelRef.current.textContent = `Текстура ${pct}%`;
    }
    if (previewTextureRef.current) {
      previewTextureRef.current.textContent = `Текстура: ${pct}%`;
    }

    // Direct update of tick marks around rotary dial
    if (knobTicksSvgRef.current) {
      const circles = knobTicksSvgRef.current.querySelectorAll("circle");
      circles.forEach((c, i) => {
        const isLit = (i / 16) * 100 <= pct;
        c.setAttribute("r", isLit ? "1.8" : "1.2");
        c.setAttribute("fill", isLit ? dragColorRef.current : "#3e4758");
      });
    }

    // Live update of panel preview texture pattern in real time
    const curTheme = computePanelTheme(
      dragColorRef.current,
      dragIntensityRef.current,
      pct,
      latestConfigRef.current.mode
    );
    if (previewBgRef.current) {
      previewBgRef.current.style.removeProperty("background-image");
      previewBgRef.current.style.setProperty("--preview-pattern", curTheme.panelPattern);
      previewBgRef.current.style.setProperty("--preview-pattern-size", curTheme.panelPatternSize);
      previewBgRef.current.style.setProperty("--preview-pattern-pos", curTheme.panelPatternPosition);
      previewBgRef.current.style.setProperty("--preview-pattern-opacity", curTheme.panelPatternOpacity);
    }
    if (canvasRef.current) {
      canvasRef.current.style.setProperty("--canvas-pattern", curTheme.panelPattern);
      canvasRef.current.style.setProperty("--canvas-pattern-size", curTheme.panelPatternSize);
      canvasRef.current.style.setProperty("--canvas-pattern-pos", curTheme.panelPatternPosition);
      canvasRef.current.style.setProperty("--canvas-pattern-opacity", curTheme.panelPatternOpacity);
    }

    const updated: ZoneCustomizationConfig = {
      ...latestConfigRef.current,
      patternIntensity: pct,
    };
    latestConfigRef.current = updated;

    applyZoneCssVariables(activeZoneRef.current, updated);
  }, []);

  const handleStartKnob = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (knobRef.current) {
      knobRectRef.current = knobRef.current.getBoundingClientRect();
      knobRef.current.classList.add("dragging");
    }
    if (cardRef.current) {
      cardRef.current.classList.add("is-dragging");
    }

    knobPointerCoordsRef.current = { x: e.clientX, y: e.clientY };

    const onWindowMove = (ev: PointerEvent) => {
      knobPointerCoordsRef.current = { x: ev.clientX, y: ev.clientY };
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(processKnobDragTick);
      }
    };

    const onWindowUp = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);

      knobRef.current?.classList.remove("dragging");
      cardRef.current?.classList.remove("is-dragging");
      knobRectRef.current = null;

      setLocalPatternIntensity(dragPatternIntensityRef.current);
      commitConfigChange({ patternIntensity: dragPatternIntensityRef.current });
    };

    window.addEventListener("pointermove", onWindowMove, { passive: true });
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);

    processKnobDragTick();
  }, [processKnobDragTick, commitConfigChange]);

  // Action: Add ball (+)
  const handleAddDot = useCallback(() => {
    if (numDots >= 3) return;
    const next = (numDots + 1) as 1 | 2 | 3;
    const newHarmony = next === 3 ? "analogous" : "complementary";
    setNumDots(next);
    setHarmonyType(newHarmony);
    commitConfigChange({ numDots: next, harmonyType: newHarmony });
  }, [numDots, commitConfigChange]);

  // Action: Remove ball (—)
  const handleRemoveDot = useCallback(() => {
    if (numDots <= 1) return;
    const next = (numDots - 1) as 1 | 2 | 3;
    const newHarmony = next === 2 ? "complementary" : "analogous";
    setNumDots(next);
    setHarmonyType(newHarmony);
    commitConfigChange({ numDots: next, harmonyType: newHarmony });
  }, [numDots, commitConfigChange]);

  // Action: Toggle harmony algorithm (∴)
  const handleToggleAlgo = useCallback(() => {
    if (numDots === 3) {
      const harmonies: Array<"analogous" | "triadic" | "splitComplementary"> = [
        "analogous",
        "triadic",
        "splitComplementary",
      ];
      const nextIdx = (harmonies.indexOf(harmonyType as any) + 1) % harmonies.length;
      const next = harmonies[nextIdx];
      setHarmonyType(next);
      commitConfigChange({ harmonyType: next });
    } else if (numDots === 2) {
      const next = harmonyType === "complementary" ? "singleAnalogous" : "complementary";
      setHarmonyType(next);
      commitConfigChange({ harmonyType: next });
    }
  }, [numDots, harmonyType, commitConfigChange]);

  // Mode button toggle (dynamic / light / dark)
  const handleSetMode = useCallback((newMode: "dynamic" | "light" | "dark") => {
    setLocalMode(newMode);
    const newColor = sampleZenColor(baseAngle, distance, MAX_RADIUS, newMode);
    setLocalColor(newColor);
    commitConfigChange({ mode: newMode, color: newColor });
  }, [baseAngle, distance, commitConfigChange]);

  if (!isOpen) return null;

  const currentPalettes = COLOR_PALETTE_PAGES[palettePageIndex] || COLOR_PALETTE_PAGES[0];
  const knobAngle = (localPatternIntensity / 100) * 360;

  // 16 Tick marks around rotary knob
  const tickCount = 16;
  const tickRadius = 24;
  const tickCenter = 29;
  const ticks = Array.from({ length: tickCount }).map((_, i) => {
    const angleRad = (i / tickCount) * 2 * Math.PI - Math.PI / 2;
    const x = tickCenter + tickRadius * Math.cos(angleRad);
    const y = tickCenter + tickRadius * Math.sin(angleRad);
    const isLit = (i / tickCount) * 100 <= localPatternIntensity;
    return { x, y, isLit, id: i };
  });

  const zoneTitles: Record<CustomizerZoneId, { title: string; desc: string }> = {
    topbar: {
      title: "Верхняя панель",
      desc: "Настройка цвета и текстуры самой верхней панели",
    },
    background: {
      title: "Задний фон",
      desc: "Тонировка и микро-текстура игрового фона",
    },
    catalog: {
      title: "Каталог",
      desc: "Цвет и текстура заднего фона каталога",
    },
  };

  return (
    <div
      className="menu-customizer-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div ref={cardRef} className="menu-customizer-card">
        {/* Header: Zone Selector & Master On/Off Toggle */}
        <div className="customizer-header">
          <div className="customizer-title-group">
            <div className="customizer-title">
              <Palette size={15} color={color0} />
              <span>{zoneTitles[activeZone].title}</span>
            </div>
            <div className="customizer-zone-badge">{zoneTitles[activeZone].desc}</div>
          </div>

          <div className="customizer-toggle-group">
            <button
              type="button"
              className={`customizer-toggle-btn ${currentConfig.enabled ? "on" : ""}`}
              onClick={() => commitConfigChange({ enabled: !currentConfig.enabled })}
              title={currentConfig.enabled ? "Отключить кастомизацию" : "Включить кастомизацию"}
            >
              <div className="customizer-toggle-indicator" />
              <span>{currentConfig.enabled ? "Вкл" : "Выкл"}</span>
            </button>

            <button
              type="button"
              className="customizer-close-btn"
              onClick={onClose}
              title="Закрыть"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Zone Switcher Tabs (Верхняя панель / Задний фон) */}
        <div className="customizer-zone-pills">
          <button
            type="button"
            className={`customizer-zone-pill-btn ${activeZone === "topbar" ? "active" : ""}`}
            onClick={() => setActiveZone("topbar")}
          >
            <span>Панель</span>
            {state.topbar.enabled && <div className="customizer-status-dot active" />}
          </button>
          <button
            type="button"
            className={`customizer-zone-pill-btn ${activeZone === "background" ? "active" : ""}`}
            onClick={() => setActiveZone("background")}
          >
            <span>Фон</span>
            {state.background.enabled && <div className="customizer-status-dot active" />}
          </button>
        </div>

        {/* 3 Mode Icons (✦ Sparkles, ☼ Sun, ☾ Moon) */}
        <div className="customizer-modes-bar">
          <button
            type="button"
            className={`customizer-mode-btn ${localMode === "dynamic" ? "active" : ""}`}
            onClick={() => handleSetMode("dynamic")}
            title="Динамический / Акцентный режим"
          >
            <Sparkles size={16} />
          </button>
          <button
            type="button"
            className={`customizer-mode-btn ${localMode === "light" ? "active" : ""}`}
            onClick={() => handleSetMode("light")}
            title="Светлый / Насыщенный режим"
          >
            <Sun size={17} />
          </button>
          <button
            type="button"
            className={`customizer-mode-btn ${localMode === "dark" ? "active" : ""}`}
            onClick={() => handleSetMode("dark")}
            title="Тёмный / Глубокий тактический режим"
          >
            <Moon size={16} />
          </button>
        </div>

        {/* Interactive Zen Browser Canvas Area with Orbital Color Balls */}
        <div
          ref={canvasRef}
          className="customizer-canvas zen-canvas"
          style={{
            ["--canvas-pattern" as any]: panelTheme.panelPattern,
            ["--canvas-pattern-size" as any]: panelTheme.panelPatternSize,
            ["--canvas-pattern-pos" as any]: panelTheme.panelPatternPosition,
            ["--canvas-pattern-opacity" as any]: panelTheme.panelPatternOpacity,
          }}
          onPointerDown={(e) => handleStartDragBall(0, e)}
        >
          {/* Circular Orbit Boundary Guide matching Zen Browser */}
          <div className="zen-canvas-orbit-guide" />
          <div className="zen-canvas-center-dot" />

          {/* Primary Ball (Dot 0 - Large) */}
          <div
            ref={dot0Ref}
            className="zen-ball primary"
            style={{
              left: `${dot0_x}%`,
              top: `${dot0_y}%`,
              backgroundColor: color0,
            }}
            onPointerDown={(e) => handleStartDragBall(0, e)}
            title="Основной цвет темы (перетаскивайте по кругу)"
          />

          {/* Ball 1 (Secondary) */}
          {numDots >= 2 && (
            <div
              ref={dot1Ref}
              className="zen-ball secondary"
              style={{
                left: `${dot1_x}%`,
                top: `${dot1_y}%`,
                backgroundColor: color1,
              }}
              onPointerDown={(e) => handleStartDragBall(1, e)}
              title="Дополнительный цвет гармонии"
            />
          )}

          {/* Ball 2 (Tertiary) */}
          {numDots >= 3 && (
            <div
              ref={dot2Ref}
              className="zen-ball tertiary"
              style={{
                left: `${dot2_x}%`,
                top: `${dot2_y}%`,
                backgroundColor: color2,
              }}
              onPointerDown={(e) => handleStartDragBall(2, e)}
              title="Третий акцентный цвет гармонии"
            />
          )}

          {/* Canvas Tools underneath: + (add), — (remove), ∴ (toggle algo) */}
          <div className="canvas-tools-bar">
            <button
              type="button"
              className="canvas-tool-btn"
              disabled={numDots >= 3}
              onClick={(e) => {
                e.stopPropagation();
                handleAddDot();
              }}
              title={numDots >= 3 ? "Максимум 3 шарика" : "Добавить цвет (+)"}
            >
              +
            </button>
            <button
              type="button"
              className="canvas-tool-btn"
              disabled={numDots <= 1}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveDot();
              }}
              title={numDots <= 1 ? "Минимум 1 шарик" : "Удалить цвет (—)"}
            >
              —
            </button>
            <button
              type="button"
              className="canvas-tool-btn"
              disabled={numDots === 1}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAlgo();
              }}
              title={`Сменить гармонию (сейчас: ${
                harmonyType === "analogous"
                  ? "Аналогичная"
                  : harmonyType === "triadic"
                  ? "Триада"
                  : harmonyType === "splitComplementary"
                  ? "Раздельная"
                  : harmonyType === "complementary"
                  ? "Комплементарная"
                  : "Акцентная"
              })`}
            >
              ∴
            </button>
          </div>
        </div>

        {/* Live Panel Surface Preview (Demonstrating the actual panel background color & texture) */}
        <div
          ref={previewBgRef}
          className="customizer-panel-live-preview"
          style={{
            backgroundColor: panelTheme.panelBg,
            borderColor: panelTheme.panelBorder,
            ["--preview-pattern" as any]: panelTheme.panelPattern,
            ["--preview-pattern-size" as any]: panelTheme.panelPatternSize,
            ["--preview-pattern-pos" as any]: panelTheme.panelPatternPosition,
            ["--preview-pattern-opacity" as any]: panelTheme.panelPatternOpacity,
          }}
        >
          <div className="customizer-preview-inner-label">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                ref={previewColorPipRef}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: color0,
                  display: "inline-block",
                }}
              />
              {activeZone === "topbar"
                ? "Фон панельки:"
                : activeZone === "background"
                ? "Фон атмосферы:"
                : "Фон каталога:"}{" "}
              <b ref={previewHexRef}>{panelTheme.panelBg}</b>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
              <span ref={previewIntensityRef}>Интенсивность: {localIntensity}%</span>
              <span style={{ opacity: 0.35 }}>·</span>
              <span ref={previewTextureRef}>Текстура: {localPatternIntensity}%</span>
            </span>
          </div>
        </div>

        {/* Swatches Palette Row with Pagination */}
        <div className="customizer-swatches-row">
          <button
            type="button"
            className="swatch-nav-btn"
            onClick={() => {
              const prev =
                (palettePageIndex - 1 + COLOR_PALETTE_PAGES.length) %
                COLOR_PALETTE_PAGES.length;
              setPalettePageIndex(prev);
            }}
            title="Предыдущая палитра"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="swatches-track">
            {currentPalettes.colors.map((hex, idx) => {
              const isSelected = (color0 || "").toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={`${palettePageIndex}-${hex}-${idx}`}
                  type="button"
                  className={`color-swatch-item ${isSelected ? "active" : ""}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => {
                    const { baseAngle: h, distance: d } = findZenCoordsForColor(hex);
                    setBaseAngle(h);
                    setDistance(d);
                    setLocalColor(hex);
                    dragBaseAngleRef.current = h;
                    dragDistanceRef.current = d;
                    dragColorRef.current = hex;
                    commitConfigChange({
                      color: hex,
                      baseAngle: h,
                      distance: d,
                      activeSwatchIndex: idx,
                    });
                  }}
                  title={`Выбрать цвет: ${hex}`}
                />
              );
            })}
          </div>

          <button
            type="button"
            className="swatch-nav-btn"
            onClick={() => {
              const next = (palettePageIndex + 1) % COLOR_PALETTE_PAGES.length;
              setPalettePageIndex(next);
            }}
            title="Следующая палитра"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Bottom Controls: Wavy Slider + Rotary Dial */}
        <div className="customizer-controls-row">
          {/* Wavy Slider for Intensity (0% - 100%) */}
          <div className="wavy-slider-container">
            <div className="wavy-slider-label-row">
              <span>Интенсивность цвета</span>
              <b ref={sliderValLabelRef}>{localIntensity}%</b>
            </div>

            <div
              ref={sliderTrackRef}
              className="wavy-slider-track-wrap"
              onPointerDown={handleStartSlider}
            >
              <svg
                className="wavy-slider-svg"
                viewBox="0 0 200 24"
                preserveAspectRatio="none"
              >
                {/* Background dark wavy track */}
                <path
                  d="M 6 12 Q 18 2, 30 12 T 54 12 T 78 12 T 102 12 T 126 12 T 150 12 T 174 12 T 194 12"
                  fill="none"
                  stroke="#2b3240"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {/* Active colored wavy track overlay */}
                <path
                  ref={sliderActivePathRef}
                  d="M 6 12 Q 18 2, 30 12 T 54 12 T 78 12 T 102 12 T 126 12 T 150 12 T 174 12 T 194 12"
                  fill="none"
                  stroke={color0}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="200"
                  strokeDashoffset={200 - (200 * localIntensity) / 100}
                  style={{ opacity: 0.85 }}
                />
              </svg>

              {/* Draggable vertical white pill thumb */}
              <div
                ref={sliderThumbRef}
                className="wavy-slider-thumb"
                style={{
                  left: `${localIntensity}%`,
                }}
              />
            </div>
          </div>

          {/* Rotary Dial Knob for Texture / Pattern Grain (0% - 100%) */}
          <div className="rotary-knob-container">
            <div
              ref={knobRef}
              className="rotary-knob-wrap"
              onPointerDown={handleStartKnob}
              title="Поверните для настройки зернистости / микро-текстуры"
            >
              {/* Radial tick marks */}
              <svg ref={knobTicksSvgRef} className="rotary-ticks-svg" viewBox="0 0 58 58">
                {ticks.map((t) => (
                  <circle
                    key={t.id}
                    cx={t.x}
                    cy={t.y}
                    r={t.isLit ? 1.8 : 1.2}
                    fill={t.isLit ? color0 : "#3e4758"}
                  />
                ))}
              </svg>

              {/* Inner metallic rotating dial */}
              <div
                ref={knobDialRef}
                className="rotary-inner-dial"
                style={{
                  transform: `rotate(${knobAngle}deg)`,
                }}
              >
                <div className="rotary-notch-pip" />
              </div>
            </div>

            <div ref={knobValLabelRef} className="rotary-label-val">
              Текстура {localPatternIntensity}%
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="customizer-footer">
          <button
            type="button"
            className="customizer-reset-btn"
            onClick={() => {
              const def = DEFAULT_MENUS_CUSTOMIZATION[activeZone];
              setNumDots(def.numDots ?? 3);
              setHarmonyType((def.harmonyType as any) ?? "analogous");
              setBaseAngle(def.baseAngle ?? 63);
              setDistance(def.distance ?? 28);
              setLocalIntensity(def.intensity ?? 60);
              setLocalPatternIntensity(def.patternIntensity ?? 30);
              setLocalMode(def.mode ?? "dynamic");
              const defColor = def.color || sampleZenColor(def.baseAngle ?? 63, def.distance ?? 28, MAX_RADIUS, def.mode);
              setLocalColor(defColor);
              dragBaseAngleRef.current = def.baseAngle ?? 63;
              dragDistanceRef.current = def.distance ?? 28;
              dragColorRef.current = defColor;
              dragIntensityRef.current = def.intensity ?? 60;
              dragPatternIntensityRef.current = def.patternIntensity ?? 30;

              if (onResetZone) {
                onResetZone(activeZone);
              } else {
                commitConfigChange(def);
              }
            }}
            title="Восстановить настройки по умолчанию для этого раздела"
          >
            <RotateCcw size={12} />
            <span>Сброс</span>
          </button>

          <div className="customizer-status-pill">
            <div
              className={`customizer-status-dot ${currentConfig.enabled ? "active" : ""}`}
            />
            <span>{currentConfig.enabled ? "Активно" : "Отключено"}</span>
          </div>
        </div>
      </div>
    </div>
  );
});