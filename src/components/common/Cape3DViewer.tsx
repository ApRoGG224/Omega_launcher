import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CapeObject } from "skinview3d";
import { ipc } from "../../services/ipc";
import { IsometricCube } from "../icons/IsometricCube";

export interface Cape3DViewerProps {
  capeUrl: string;
  width?: number;
  height?: number;
  interactive?: boolean;
  animated?: boolean;
  className?: string;
}

export const Cape3DViewer: React.FC<Cape3DViewerProps> = ({
  capeUrl,
  width = 120,
  height = 140,
  interactive = false,
  animated = false,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rotation and dragging state refs
  const rotYRef = useRef<number>(0);
  const rotXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const prevPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const renderSceneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animId: number | null = null;
    let textureToDispose: THREE.Texture | null = null;

    // Sizing
    const currentW = width;
    const currentH = height;
    const aspect = currentW / currentH;

    // Three.js Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, aspect, 0.1, 100);
    camera.position.set(0, -8, 29);
    camera.lookAt(0, -8, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setSize(currentW, currentH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    // Subtle, authentic Minecraft directional & ambient lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
    mainLight.position.set(12, 18, 20);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8ba0be, 0.4);
    fillLight.position.set(-15, -12, -15);
    scene.add(fillLight);

    // Cape Object from skinview3d
    const cape = new CapeObject();
    // Base orientation: Minecraft capes have the decorated outside facing -Z.
    // Rotate 180 degrees so the back faces +Z towards the camera,
    // with a crisp 3D isometric tilt (~22 degrees) to show depth and edge thickness.
    const baseY = Math.PI - 0.38;
    const baseX = 0.12;
    cape.rotation.y = baseY;
    cape.rotation.x = baseX;
    scene.add(cape);

    // Direct render call
    const renderScene = () => {
      if (disposed) return;
      cape.rotation.y = baseY + rotYRef.current;
      cape.rotation.x = baseX + rotXRef.current;
      renderer.render(scene, camera);
    };
    renderSceneRef.current = renderScene;

    // Initial render placeholder
    renderScene();

    // Fetch and load cape texture as data URL to bypass any CORS restrictions
    const loadTexture = async () => {
      try {
        setLoading(true);
        setError(null);
        let finalUrl = capeUrl;
        if (capeUrl.startsWith("http://") || capeUrl.startsWith("https://")) {
          try {
            finalUrl = await ipc.fetchSkinAsDataUrl(capeUrl);
          } catch (fetchErr) {
            console.warn("Direct cape fetch proxy fallback:", fetchErr);
          }
        }

        if (disposed) return;

        const loader = new THREE.TextureLoader();
        loader.load(
          finalUrl,
          (tex) => {
            if (disposed) {
              tex.dispose();
              return;
            }
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            textureToDispose = tex;

            cape.map = tex;
            setLoading(false);
            renderScene();
          },
          undefined,
          (err) => {
            if (disposed) return;
            console.error("Failed to load 3D cape texture:", err);
            setError("Ошибка текстуры");
            setLoading(false);
          }
        );
      } catch (err: any) {
        if (disposed) return;
        setError(err?.message || "Ошибка загрузки");
        setLoading(false);
      }
    };

    void loadTexture();

    // Optional animation loop only if explicitly requested
    if (animated) {
      let startTime = performance.now();
      const renderFrame = (now: number) => {
        if (disposed) return;
        const elapsed = (now - startTime) / 1000;
        let waveY = 0;
        let waveX = 0;
        if (!isDraggingRef.current) {
          waveY = Math.sin(elapsed * 1.6) * 0.12;
          waveX = Math.cos(elapsed * 1.3) * 0.03;
        }
        cape.rotation.y = baseY + waveY + rotYRef.current;
        cape.rotation.x = baseX + waveX + rotXRef.current;
        renderer.render(scene, camera);
        animId = requestAnimationFrame(renderFrame);
      };
      animId = requestAnimationFrame(renderFrame);
    }

    return () => {
      disposed = true;
      renderSceneRef.current = null;
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
      if (textureToDispose) {
        textureToDispose.dispose();
      }
      cape.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [capeUrl, width, height, animated]);

  // Optional manual pointer interactions if interactive is true
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    prevPointerRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !isDraggingRef.current) return;
    const deltaX = e.clientX - prevPointerRef.current.x;
    const deltaY = e.clientY - prevPointerRef.current.y;
    prevPointerRef.current = { x: e.clientX, y: e.clientY };

    rotYRef.current += deltaX * 0.02;
    rotXRef.current += deltaY * 0.02;
    rotXRef.current = Math.max(-0.9, Math.min(0.9, rotXRef.current));

    if (renderSceneRef.current) {
      renderSceneRef.current();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerLeave = () => {
    isDraggingRef.current = false;
  };

  const handleDoubleClick = () => {
    if (!interactive) return;
    rotYRef.current = 0;
    rotXRef.current = 0;
    if (renderSceneRef.current) {
      renderSceneRef.current();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`cape-3d-viewer-container ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onDoubleClick={handleDoubleClick}
      style={{
        position: "relative",
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: interactive ? "grab" : "default",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          imageRendering: "pixelated",
        }}
      />

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(12, 16, 24, 0.4)",
            backdropFilter: "blur(2px)",
            borderRadius: "6px",
          }}
        >
          <IsometricCube size={26} variant="emerald" />
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f87171",
            fontSize: "11px",
            textAlign: "center",
            padding: "4px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
