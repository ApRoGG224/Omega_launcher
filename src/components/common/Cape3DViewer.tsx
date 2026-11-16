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

// Module-level singleton offscreen renderer to prevent WebGL context exhaustion (WEBGL_lose_context)
// and eliminate memory bloat across multiple cape cards.
const snapshotCache = new Map<string, string>();
let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.PerspectiveCamera | null = null;
let sharedCape: CapeObject | null = null;

function getSharedCapePipeline(width: number, height: number) {
  if (!sharedRenderer) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = width * 2;
    offCanvas.height = height * 2;
    sharedRenderer = new THREE.WebGLRenderer({
      canvas: offCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "default",
      preserveDrawingBuffer: true,
    });
    sharedRenderer.setSize(width * 2, height * 2, false);
    sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
    sharedRenderer.setClearColor(0x000000, 0);

    sharedScene = new THREE.Scene();
    const aspect = width / height;
    sharedCamera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
    sharedCamera.position.set(0, -8, 33);
    sharedCamera.lookAt(0, -8, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    sharedScene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.20);
    mainLight.position.set(12, 18, 20);
    sharedScene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x708090, 0.1);
    fillLight.position.set(-15, -12, -15);
    sharedScene.add(fillLight);

    sharedCape = new CapeObject();
    sharedCape.rotation.x = 0.12;
    sharedScene.add(sharedCape);
  }
  return {
    renderer: sharedRenderer,
    scene: sharedScene!,
    camera: sharedCamera!,
    cape: sharedCape!,
  };
}

async function renderSharedSnapshot(capeUrl: string, width: number, height: number): Promise<string> {
  const cacheKey = `${capeUrl}_${width}x${height}`;
  const existing = snapshotCache.get(cacheKey);
  if (existing) return existing;

  const { renderer, scene, camera, cape } = getSharedCapePipeline(width, height);

  let finalUrl = capeUrl;
  if (capeUrl.startsWith("http://") || capeUrl.startsWith("https://")) {
    try {
      finalUrl = await ipc.fetchSkinAsDataUrl(capeUrl);
    } catch (fetchErr) {
      console.warn("Direct cape fetch proxy fallback:", fetchErr);
    }
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Ошибка загрузки текстуры"));
    img.src = finalUrl;
  });

  const offCanvas = document.createElement("canvas");
  offCanvas.width = 64;
  offCanvas.height = 32;
  const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 64, 32);
  ctx.drawImage(img, 0, 0, 64, 32);

  const f1Data = ctx.getImageData(1, 1, 10, 16).data;
  const f2Data = ctx.getImageData(12, 1, 10, 16).data;

  const f1Colors = new Set<string>();
  const f2Colors = new Set<string>();
  for (let i = 0; i < f1Data.length; i += 4) {
    if (f1Data[i + 3] > 10) {
      f1Colors.add(`${f1Data[i]},${f1Data[i + 1]},${f1Data[i + 2]}`);
    }
  }
  for (let i = 0; i < f2Data.length; i += 4) {
    if (f2Data[i + 3] > 10) {
      f2Colors.add(`${f2Data[i]},${f2Data[i + 1]},${f2Data[i + 2]}`);
    }
  }

  const showF1 = f1Colors.size > f2Colors.size;
  cape.rotation.y = showF1 ? -0.38 : Math.PI - 0.38;

  const tex = new THREE.CanvasTexture(offCanvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  cape.map = tex;
  const capeMesh = cape.children[0] as THREE.Mesh | undefined;
  if (capeMesh && capeMesh.material instanceof THREE.MeshStandardMaterial) {
    capeMesh.material.roughness = 1.0;
    capeMesh.material.metalness = 0.0;
    capeMesh.material.needsUpdate = true;
  }

  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");

  // Dispose per-snapshot texture
  tex.dispose();

  snapshotCache.set(cacheKey, dataUrl);
  return dataUrl;
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
  const [staticImage, setStaticImage] = useState<string | null>(() => {
    if (!interactive && !animated) {
      return snapshotCache.get(`${capeUrl}_${width}x${height}`) || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(!staticImage);
  const [error, setError] = useState<string | null>(null);

  const baseYRef = useRef<number>(Math.PI - 0.38);
  const rotYRef = useRef<number>(0);
  const rotXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const prevPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const renderSceneRef = useRef<(() => void) | null>(null);

  // If component is static and not animated, use shared offscreen pipeline to prevent WebGL context spam
  useEffect(() => {
    if (interactive || animated) return;

    let disposed = false;
    const cacheKey = `${capeUrl}_${width}x${height}`;
    const cached = snapshotCache.get(cacheKey);
    if (cached) {
      setStaticImage(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    renderSharedSnapshot(capeUrl, width, height)
      .then((dataUrl) => {
        if (!disposed) {
          setStaticImage(dataUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!disposed) {
          setError(err?.message || "Ошибка загрузки");
          setLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [capeUrl, width, height, interactive, animated]);

  // Interactive or animated WebGL context pipeline
  useEffect(() => {
    if (!interactive && !animated) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animId: number | null = null;
    let textureToDispose: THREE.Texture | null = null;

    const currentW = width;
    const currentH = height;
    const aspect = currentW / currentH;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
    camera.position.set(0, -8, 33);
    camera.lookAt(0, -8, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "default",
    });
    renderer.setSize(currentW, currentH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.20);
    mainLight.position.set(12, 18, 20);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x708090, 0.1);
    fillLight.position.set(-15, -12, -15);
    scene.add(fillLight);

    const cape = new CapeObject();
    const baseX = 0.12;
    cape.rotation.x = baseX;
    cape.rotation.y = baseYRef.current;
    scene.add(cape);

    const renderScene = () => {
      if (disposed) return;
      cape.rotation.y = baseYRef.current + rotYRef.current;
      cape.rotation.x = baseX + rotXRef.current;
      renderer.render(scene, camera);
    };
    renderSceneRef.current = renderScene;

    renderScene();

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

        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Ошибка загрузки текстуры"));
          img.src = finalUrl;
        });

        if (disposed) return;

        const offCanvas = document.createElement("canvas");
        offCanvas.width = 64;
        offCanvas.height = 32;
        const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Canvas 2D context unavailable");

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 64, 32);
        ctx.drawImage(img, 0, 0, 64, 32);

        const f1Data = ctx.getImageData(1, 1, 10, 16).data;
        const f2Data = ctx.getImageData(12, 1, 10, 16).data;

        const f1Colors = new Set<string>();
        const f2Colors = new Set<string>();
        for (let i = 0; i < f1Data.length; i += 4) {
          if (f1Data[i + 3] > 10) {
            f1Colors.add(`${f1Data[i]},${f1Data[i + 1]},${f1Data[i + 2]}`);
          }
        }
        for (let i = 0; i < f2Data.length; i += 4) {
          if (f2Data[i + 3] > 10) {
            f2Colors.add(`${f2Data[i]},${f2Data[i + 1]},${f2Data[i + 2]}`);
          }
        }

        const showF1 = f1Colors.size > f2Colors.size;
        baseYRef.current = showF1 ? -0.38 : Math.PI - 0.38;

        const tex = new THREE.CanvasTexture(offCanvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        textureToDispose = tex;

        cape.map = tex;
        const capeMesh = cape.children[0] as THREE.Mesh | undefined;
        if (capeMesh && capeMesh.material instanceof THREE.MeshStandardMaterial) {
          capeMesh.material.roughness = 1.0;
          capeMesh.material.metalness = 0.0;
          capeMesh.material.needsUpdate = true;
        }

        setLoading(false);
        renderScene();
      } catch (err: any) {
        if (disposed) return;
        console.error("Failed to load 3D cape texture:", err);
        setError(err?.message || "Ошибка загрузки");
        setLoading(false);
      }
    };

    void loadTexture();

    if (animated) {
      const startTime = performance.now();
      const renderFrame = (now: number) => {
        if (disposed) return;
        const elapsed = (now - startTime) / 1000;
        let waveY = 0;
        let waveX = 0;
        if (!isDraggingRef.current) {
          waveY = Math.sin(elapsed * 1.6) * 0.12;
          waveX = Math.cos(elapsed * 1.3) * 0.03;
        }
        cape.rotation.y = baseYRef.current + waveY + rotYRef.current;
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
  }, [capeUrl, width, height, interactive, animated]);

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
      // Ignore
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
      {!interactive && !animated ? (
        staticImage ? (
          <img
            src={staticImage}
            alt="Cape 3D Preview"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              pointerEvents: "none",
            }}
          />
        ) : null
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      )}

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
