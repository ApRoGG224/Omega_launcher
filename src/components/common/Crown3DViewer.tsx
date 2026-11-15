import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createCrownObject, disposeThreeHierarchy } from "../../utils/cosmetics3D";

interface Crown3DViewerProps {
  width?: number;
  height?: number;
  interactive?: boolean;
  animated?: boolean;
  className?: string;
}

export const Crown3DViewer: React.FC<Crown3DViewerProps> = ({
  width = 140,
  height = 120,
  interactive = true,
  animated = true,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rotYRef = useRef<number>(0);
  const rotXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const prevPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const renderSceneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    const currentW = width;
    const currentH = height;
    const aspect = currentW / currentH;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, aspect, 0.1, 100);
    camera.position.set(0, 5, 25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(currentW, currentH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5e6, 0.7);
    mainLight.position.set(10, 15, 15);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x85a3c2, 0.3);
    fillLight.position.set(-10, -5, -10);
    scene.add(fillLight);

    const crown = createCrownObject();
    crown.position.set(0, -8.4, 0);

    const crownRoot = new THREE.Group();
    crownRoot.add(crown);
    const baseTiltX = 0.38;
    crownRoot.rotation.x = baseTiltX;
    scene.add(crownRoot);

    const renderScene = () => {
      if (disposed) return;
      crownRoot.rotation.x = baseTiltX + rotXRef.current;
      renderer.render(scene, camera);
    };
    renderSceneRef.current = renderScene;

    let animId: number | null = null;
    let baseAngle = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      if (disposed) return;
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (animated && !isDraggingRef.current) {
        baseAngle += delta * 0.9;
        crownRoot.position.y = Math.sin(elapsed * 2.0) * 0.4;
      }
      crownRoot.rotation.y = baseAngle + rotYRef.current;
      crownRoot.rotation.x = baseTiltX + rotXRef.current;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderFrame);
    };

    if (animated) {
      animId = requestAnimationFrame(renderFrame);
    } else {
      crownRoot.rotation.y = -0.45;
      renderScene();
    }

    return () => {
      disposed = true;
      renderSceneRef.current = null;
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
      disposeThreeHierarchy(scene);
      renderer.dispose();
    };
  }, [width, height, animated]);

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
    rotXRef.current = Math.max(-0.6, Math.min(0.6, rotXRef.current));

    if (renderSceneRef.current && !animated) {
      renderSceneRef.current();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
    }
  };

  const handlePointerLeave = () => {
    isDraggingRef.current = false;
  };

  const handleDoubleClick = () => {
    if (!interactive) return;
    rotYRef.current = 0;
    rotXRef.current = 0;
    if (renderSceneRef.current && !animated) {
      renderSceneRef.current();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`crown-3d-viewer-container ${className}`}
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
        }}
      />
    </div>
  );
};
