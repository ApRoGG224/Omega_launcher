import React, { useEffect, useRef } from "react";
import {
  SkinViewer,
  IdleAnimation,
  WalkingAnimation,
  RunningAnimation,
} from "skinview3d";

export interface Skin3DViewerProps {
  skinUrl?: string | null;
  capeUrl?: string | null;
  model?: "default" | "slim";
  width?: number;
  height?: number;
  animation?: "idle" | "walk" | "run" | "none";
  loading?: boolean;
}

export const Skin3DViewer: React.FC<Skin3DViewerProps> = ({
  skinUrl,
  capeUrl,
  model = "default",
  width = 190,
  height = 230,
  animation = "idle",
  loading = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      model: model === "slim" ? "slim" : "default",
    });

    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = false;
    viewer.camera.position.set(0, 0, 42);

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

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (skinUrl) {
      viewer
        .loadSkin(skinUrl, {
          model: model === "slim" ? "slim" : "default",
        })
        .catch(() => {
          // If skin texture fails to load (e.g. 404 or network error), reset
          viewer.resetSkin();
        });
    } else {
      viewer.resetSkin();
    }
  }, [skinUrl, model]);

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
