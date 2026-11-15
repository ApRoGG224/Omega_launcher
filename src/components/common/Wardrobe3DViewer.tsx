import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { SkinViewer } from "skinview3d";
import { createCrownObject, disposeThreeHierarchy } from "../../utils/cosmetics3D";
import { PRESET_SKINS } from "../../constants/skinPresets";

export type WardrobeFocusZone = "full" | "head" | "back" | "body";

interface Wardrobe3DViewerProps {
  skinUrl?: string;
  capeUrl?: string | null;
  model?: "default" | "slim";
  focusZone?: WardrobeFocusZone;
  equippedHead?: string | null;
  className?: string;
}

export const Wardrobe3DViewer: React.FC<Wardrobe3DViewerProps> = ({
  skinUrl = PRESET_SKINS.dream,
  capeUrl,
  model = "default",
  focusZone = "full",
  equippedHead = null,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  const focusZoneRef = useRef<WardrobeFocusZone>(focusZone);
  focusZoneRef.current = focusZone;

  // Camera targets for smooth cinematic lerp transitions
  const curPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3.2, 68.0));
  const curLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3.0, 0));
  const targetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3.2, 68.0));
  const targetLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3.0, 0));

  // Initialize static 3D SkinViewer
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let disposed = false;
    const initialW = container.clientWidth || 400;
    const initialH = container.clientHeight || 440;

    const viewer = new SkinViewer({
      canvas,
      width: initialW,
      height: initialH,
      skin: skinUrl,
      model: model,
      cape: capeUrl || undefined,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      enableControls: false,
    });
    viewerRef.current = viewer;

    // Fixed clean pose: player stands completely still in authentic Minecraft stance
    viewer.playerObject.rotation.y = 0.22; // subtle isometric 3D angle
    viewer.playerObject.skin.rightArm.rotation.x = 0.04;
    viewer.playerObject.skin.leftArm.rotation.x = -0.04;

    // Disabled controls to ensure player stands completely still
    viewer.controls.enableRotate = false;
    viewer.controls.enableZoom = false;
    viewer.controls.enablePan = false;

    // Direct WebGL render bypass for maximum performance
    (viewer as any).render = function () {
      this.renderer.render(this.scene, this.camera);
    };

    // Smooth camera transition animation loop
    let animId: number | null = null;
    const renderLoop = () => {
      if (disposed) return;

      // Update camera targets based on current focusZone
      switch (focusZoneRef.current) {
        case "head":
          targetPosRef.current.set(0, 18.2, 30.0);
          targetLookRef.current.set(0, 18.0, 0);
          break;
        case "back":
          targetPosRef.current.set(0, 7.0, -48.0);
          targetLookRef.current.set(0, 5.0, 0);
          break;
        case "body":
          targetPosRef.current.set(0, 5.0, 44.0);
          targetLookRef.current.set(0, 4.0, 0);
          break;
        case "full":
        default:
          targetPosRef.current.set(0, 3.2, 68.0);
          targetLookRef.current.set(0, 3.0, 0);
          break;
      }

      // Exponential smoothing (lerp) for smooth cinematic glide
      curPosRef.current.lerp(targetPosRef.current, 0.08);
      curLookRef.current.lerp(targetLookRef.current, 0.08);

      viewer.camera.position.copy(curPosRef.current);
      viewer.camera.lookAt(curLookRef.current);

      viewer.renderer.render(viewer.scene, viewer.camera);
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);

    // Responsive resize handler
    const handleResize = () => {
      if (container && viewer && !disposed) {
        const w = container.clientWidth || 320;
        const h = container.clientHeight || 440;
        viewer.setSize(w, h);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
      window.removeEventListener("resize", handleResize);
      viewerRef.current = null;
      viewer.dispose();
    };
  }, []);

  // Update skin & model
  useEffect(() => {
    if (viewerRef.current && skinUrl) {
      viewerRef.current.loadSkin(skinUrl, { model: model })?.catch?.((err) => {
        console.warn("Failed to load wardrobe skin:", err);
      });
    }
  }, [skinUrl, model]);

  // Update cape
  useEffect(() => {
    if (viewerRef.current) {
      if (capeUrl) {
        viewerRef.current.loadCape(capeUrl)?.catch?.((err) => {
          console.warn("Failed to load wardrobe cape:", err);
        });
      } else {
        viewerRef.current.resetCape();
      }
    }
  }, [capeUrl]);

  // Attach / Detach 3D Crown on character head
  useEffect(() => {
    const head = viewerRef.current?.playerObject?.skin?.head;
    if (!head) return;

    const existing = head.getObjectByName("omega_crown");
    if (equippedHead === "crown") {
      if (!existing) {
        const crown = createCrownObject();
        head.add(crown);
      }
    } else {
      if (existing) {
        head.remove(existing);
        disposeThreeHierarchy(existing);
      }
    }
  }, [equippedHead]);

  return (
    <div
      ref={containerRef}
      className={`wardrobe-3d-viewer-container ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "380px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        pointerEvents: "none", // Stays in place, completely unmovable per user requirement
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          outline: "none",
        }}
      />
    </div>
  );
};
