import React, { useEffect, useRef } from "react";
import {
  SkinViewer,
  IdleAnimation,
  WalkingAnimation,
  RunningAnimation,
} from "skinview3d";

export const FALLBACK_STEVE_SKIN = "https://minotar.net/skin/MHF_Steve";

export interface Skin3DViewerProps {
  skinUrl?: string | null;
  capeUrl?: string | null;
  model?: "default" | "slim" | "auto-detect";
  width?: number;
  height?: number;
  animation?: "idle" | "walk" | "run" | "none";
  loading?: boolean;
}

export const Skin3DViewer: React.FC<Skin3DViewerProps> = ({
  skinUrl,
  capeUrl,
  model = "auto-detect",
  width = 230,
  height = 250,
  animation = "idle",
  loading = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const initialSkin = skinUrl || FALLBACK_STEVE_SKIN;
    const initialModel =
      model === "slim"
        ? "slim"
        : model === "default"
          ? "default"
          : "auto-detect";
    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      skin: initialSkin,
      model: initialModel,
    });

    // Prevent transparent pixels in skin layer 1 from rendering as black artifacts/stripes
    const skinAny = viewer.playerObject.skin as any;
    if (skinAny?.layer1Material) {
      skinAny.layer1Material.alphaTest = 0.5;
      skinAny.layer1Material.transparent = true;
      skinAny.layer1Material.needsUpdate = true;
    }
    if (skinAny?.layer1MaterialBiased) {
      skinAny.layer1MaterialBiased.alphaTest = 0.5;
      skinAny.layer1MaterialBiased.transparent = true;
      skinAny.layer1MaterialBiased.needsUpdate = true;
    }

    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = false;
    viewer.camera.position.set(0, 0, 42);

    // Initial animation
    viewer.animation = new IdleAnimation();

    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.setSize(width, height);
    }
  }, [width, height]);

  // Update skin texture
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const targetSkin = skinUrl || FALLBACK_STEVE_SKIN;
    const targetModel =
      model === "slim"
        ? "slim"
        : model === "default"
          ? "default"
          : "auto-detect";
    viewer
      .loadSkin(targetSkin, {
        model: targetModel,
      })
      .catch(() => {
        if (targetSkin !== FALLBACK_STEVE_SKIN) {
          viewer
            .loadSkin(FALLBACK_STEVE_SKIN, { model: "default" })
            .catch(() => {});
        }
      });
  }, [skinUrl, model]);

  // Update cape
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (capeUrl) {
      viewer.loadCape(capeUrl).catch(() => {
        viewer.resetCape();
      });
    } else {
      viewer.resetCape();
    }
  }, [capeUrl]);

  // Update animation mode
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (animation === "idle") {
      viewer.animation = new IdleAnimation();
    } else if (animation === "walk") {
      viewer.animation = new WalkingAnimation();
    } else if (animation === "run") {
      viewer.animation = new RunningAnimation();
    } else {
      viewer.animation = null;
    }
  }, [animation]);

  return (
    <div
      className="skin-3d-wrapper"
      style={{ width, height, position: "relative" }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {loading && (
        <div className="skin-3d-loading">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
};
