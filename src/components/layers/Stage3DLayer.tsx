import * as THREE from "three";
import React, { useEffect, useRef } from "react";
import { SkinViewer, WaveAnimation } from "skinview3d";
import { CleanIdleAnimation } from "../../utils/skinAnimations";
import { PRESET_SKINS } from "../../constants/skinPresets";
import { createCrownObject, disposeThreeHierarchy } from "../../utils/cosmetics3D";
import "../../styles/layer1-stage.css";

interface Stage3DLayerProps {
  visible: boolean;
  skinUrl?: string;
  capeUrl?: string | null;
  model?: "default" | "slim";
}

function createContactShadow(): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.65)");
    gradient.addColorStop(0.35, "rgba(0, 0, 0, 0.38)");
    gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(16.0, 9.0);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "contact_shadow";
  mesh.position.set(0, -16.05, 0);
  return mesh;
}

export const Stage3DLayer: React.FC<Stage3DLayerProps> = React.memo(({
  visible,
  skinUrl = PRESET_SKINS.dream,
  capeUrl,
  model = "default",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const visibleRef = useRef<boolean>(visible);
  visibleRef.current = visible;

  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartTime = useRef<number>(0);
  const lastX = useRef<number>(0);
  const lastTime = useRef<number>(0);
  const angularVelocity = useRef<number>(0);

  const targetHeadYaw = useRef<number>(0);
  const targetHeadPitch = useRef<number>(0);
  const curHeadYaw = useRef<number>(0);
  const curHeadPitch = useRef<number>(0);

  const animTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let disposed = false;
    let animId: number | null = null;

    const initialW = container.clientWidth || 460;
    const initialH = container.clientHeight || 560;

    const viewer = new SkinViewer({
      canvas,
      width: initialW,
      height: initialH,
      skin: skinUrl,
      model: model || "default",
      cape: capeUrl || undefined,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.25),
      enableControls: false,
    });
    viewerRef.current = viewer;

    viewer.camera.position.set(0, 1.5, 46);
    viewer.camera.lookAt(0, 0, 0);

    viewer.playerObject.position.set(0, 0, 0);
    viewer.playerObject.rotation.y = 0.28;

    const shadow = createContactShadow();
    viewer.scene.add(shadow);

    const clock = new THREE.Clock();
    const idleAnimation = new CleanIdleAnimation();
    viewer.animation = idleAnimation;

    (viewer as any).render = function () {
      this.renderer.render(this.scene, this.camera);
    };

    const renderLoop = () => {
      if (disposed) return;

      if (!visibleRef.current || document.hidden) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      const player = viewer.playerObject;

      if (!isDragging.current) {
        if (Math.abs(angularVelocity.current) > 0.0002) {
          player.rotation.y += angularVelocity.current;
          angularVelocity.current *= 0.92;
        } else {
          angularVelocity.current = 0;
        }
      }

      curHeadYaw.current += (targetHeadYaw.current - curHeadYaw.current) * 0.08;
      curHeadPitch.current += (targetHeadPitch.current - curHeadPitch.current) * 0.08;

      if (player.skin?.head) {
        player.skin.head.rotation.y = curHeadYaw.current;
        player.skin.head.rotation.x = curHeadPitch.current;
      }

      const dt = clock.getDelta();
      if (viewer.animation && !viewer.animation.paused) {
        viewer.animation.update(player, dt);
      }

      (viewer as any).render();

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    const onPointerDown = (e: PointerEvent) => {
      if (!visibleRef.current) return;
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartTime.current = performance.now();
      lastX.current = e.clientX;
      lastTime.current = performance.now();
      angularVelocity.current = 0;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - lastX.current;
      const now = performance.now();
      const dt = Math.max(1, now - lastTime.current);

      viewer.playerObject.rotation.y += deltaX * 0.012;
      angularVelocity.current = (deltaX / dt) * 0.16;

      lastX.current = e.clientX;
      lastTime.current = now;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}

      const elapsed = performance.now() - dragStartTime.current;
      const dist = Math.abs(e.clientX - dragStartX.current);

      if (dist < 6 && elapsed < 280) {
        if (animTimeoutRef.current) {
          window.clearTimeout(animTimeoutRef.current);
        }
        viewer.animation = new WaveAnimation();
        animTimeoutRef.current = window.setTimeout(() => {
          if (!disposed && viewerRef.current) {
            viewerRef.current.animation = new CleanIdleAnimation();
          }
        }, 1300);
      }
    };

    const onDoubleClick = () => {
      angularVelocity.current = 0;
      viewer.playerObject.rotation.y = 0.28;
    };

    const viewportEl = container;
    viewportEl.addEventListener("pointerdown", onPointerDown);
    viewportEl.addEventListener("pointermove", onPointerMove);
    viewportEl.addEventListener("pointerup", onPointerUp);
    viewportEl.addEventListener("pointercancel", onPointerUp);
    viewportEl.addEventListener("dblclick", onDoubleClick);

    const onWindowPointerMove = (e: PointerEvent) => {
      if (!visibleRef.current || isDragging.current) return;
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.35;

      const dx = (e.clientX - centerX) / (window.innerWidth * 0.45);
      const dy = (e.clientY - centerY) / (window.innerHeight * 0.45);

      targetHeadYaw.current = Math.max(-0.45, Math.min(0.45, dx));
      targetHeadPitch.current = Math.max(-0.35, Math.min(0.35, -dy));
    };

    const onMouseLeave = () => {
      targetHeadYaw.current = 0;
      targetHeadPitch.current = 0;
    };

    window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);

    const onResize = () => {
      if (!container || !viewerRef.current) return;
      const w = container.clientWidth || 460;
      const h = container.clientHeight || 560;
      viewerRef.current.setSize(w, h);
      viewerRef.current.camera.aspect = w / h;
      viewerRef.current.camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      if (animId !== null) cancelAnimationFrame(animId);
      if (animTimeoutRef.current) window.clearTimeout(animTimeoutRef.current);

      viewportEl.removeEventListener("pointerdown", onPointerDown);
      viewportEl.removeEventListener("pointermove", onPointerMove);
      viewportEl.removeEventListener("pointerup", onPointerUp);
      viewportEl.removeEventListener("pointercancel", onPointerUp);
      viewportEl.removeEventListener("dblclick", onDoubleClick);

      window.removeEventListener("pointermove", onWindowPointerMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);

      const existingShadow = viewer.scene.getObjectByName("contact_shadow");
      if (existingShadow) {
        viewer.scene.remove(existingShadow);
        disposeThreeHierarchy(existingShadow);
      }

      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    if (viewerRef.current) {
      viewerRef.current.loadSkin(skinUrl, { model: model || "default" })?.catch?.((err: any) => {
        if (!canceled) {
          console.warn("Failed to load skin:", err);
        }
      });
    }
    return () => {
      canceled = true;
    };
  }, [skinUrl, model]);

  useEffect(() => {
    if (viewerRef.current) {
      if (capeUrl) {
        viewerRef.current.loadCape(capeUrl)?.catch?.((err: any) => {
          console.warn("Failed to load cape:", err);
        });
      } else {
        viewerRef.current.resetCape();
      }
    }
  }, [capeUrl]);

  useEffect(() => {
    const updateCrown = () => {
      const head = viewerRef.current?.playerObject?.skin?.head;
      if (!head) return;

      let isCrownEquipped = false;
      try {
        const raw = localStorage.getItem("omega:equipped_cosmetics");
        if (raw) {
          const parsed = JSON.parse(raw);
          isCrownEquipped = parsed.head === "crown";
        } else {
          const activeCos = localStorage.getItem("omega:equipped_cosmetic");
          isCrownEquipped = activeCos === "Корона Монарха" || activeCos === "crown";
        }
      } catch {
        isCrownEquipped = false;
      }

      const existing = head.getObjectByName("omega_crown");
      if (isCrownEquipped) {
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
    };

    updateCrown();

    const onCosmeticsUpdated = () => {
      updateCrown();
    };

    window.addEventListener("omega:cosmetics_updated", onCosmeticsUpdated);
    return () => {
      window.removeEventListener("omega:cosmetics_updated", onCosmeticsUpdated);
      const head = viewerRef.current?.playerObject?.skin?.head;
      if (head) {
        const existing = head.getObjectByName("omega_crown");
        if (existing) {
          head.remove(existing);
          disposeThreeHierarchy(existing);
        }
      }
    };
  }, []);

  return (
    <div className={`layer-stage ${!visible ? "hidden" : ""}`}>
      <div className="stage-character-viewport" ref={containerRef}>
        <canvas ref={canvasRef} style={{ outline: "none" }} />
      </div>
    </div>
  );
});
