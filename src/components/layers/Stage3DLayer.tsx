import * as THREE from "three";
import React, { useEffect, useRef } from "react";
import { SkinViewer, PlayerAnimation, type PlayerObject } from "skinview3d";
import { buildArticulatedLimbs, type ArticulatedLimbHandles } from "../../utils/articulatedPlayer";
import { RoamingCharacterController, type WorldPlatform } from "../../utils/roamingCharacter";
import { PRESET_SKINS } from "../../constants/skinPresets";
import { createCrownObject, disposeThreeHierarchy } from "../../utils/cosmetics3D";
import "../../styles/layer1-stage.css";

interface Stage3DLayerProps {
  visible: boolean;
  skinUrl?: string;
  capeUrl?: string | null;
  model?: "default" | "slim";
}

const tempTL = new THREE.Vector3();
const tempBR = new THREE.Vector3();
const tempNDC = new THREE.Vector2();

function screenPointToWorld(
  clientX: number,
  clientY: number,
  camera: THREE.PerspectiveCamera,
  raycaster: THREE.Raycaster,
  plane: THREE.Plane,
  outVec: THREE.Vector3
): boolean {
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  tempNDC.set((clientX / w) * 2 - 1, -(clientY / h) * 2 + 1);
  raycaster.setFromCamera(tempNDC, camera);
  const hit = raycaster.ray.intersectPlane(plane, outVec);
  return hit !== null;
}

function scanLauncherPlatforms(
  camera: THREE.PerspectiveCamera,
  raycaster: THREE.Raycaster,
  plane: THREE.Plane
): { platforms: WorldPlatform[]; floorLevel: number; minX: number; maxX: number } {
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;

  screenPointToWorld(0, h * 0.5, camera, raycaster, plane, tempTL);
  const minX = tempTL.x + 22.0;
  screenPointToWorld(w, h * 0.5, camera, raycaster, plane, tempTL);
  const maxX = tempTL.x - 22.0;

  screenPointToWorld(w * 0.5, h - 6, camera, raycaster, plane, tempTL);
  const floorLevel = tempTL.y + 24.0;

  const platforms: WorldPlatform[] = [];
  const dockEl = document.querySelector(".dock-container") || document.querySelector(".layer-dock");

  if (dockEl && !dockEl.closest(".hidden")) {
    const rect = dockEl.getBoundingClientRect();
    if (rect.width > 20 && rect.height > 10) {
      screenPointToWorld(rect.left, rect.top, camera, raycaster, plane, tempTL);
      screenPointToWorld(rect.right, rect.bottom, camera, raycaster, plane, tempBR);

      const leftX = Math.min(tempTL.x, tempBR.x);
      const rightX = Math.max(tempTL.x, tempBR.x);
      const topWorldY = Math.max(tempTL.y, tempBR.y);
      const bottomWorldY = Math.min(tempTL.y, tempBR.y);

      platforms.push({
        id: "dock",
        minX: leftX - 1.2,
        maxX: rightX + 1.2,
        topY: topWorldY + 23.2,
        bottomY: bottomWorldY - 8.8,
        isSolid: true,
        isGroundReaching: true,
      });
    }
  }

  return { platforms, floorLevel, minX, maxX };
}

function isPointerOverCharacter(
  clientX: number,
  clientY: number,
  controller: RoamingCharacterController,
  viewer: SkinViewer,
  raycaster: THREE.Raycaster,
  plane: THREE.Plane,
  outWorldPos: THREE.Vector3
): boolean {
  if (!screenPointToWorld(clientX, clientY, viewer.camera, raycaster, plane, outWorldPos)) {
    return false;
  }

  const dx = Math.abs(outWorldPos.x - controller.currentX);
  const dy = Math.abs(outWorldPos.y - (controller.currentY + 14.0));
  return dx <= 7.0 && dy <= 17.0;
}

export const Stage3DLayer: React.FC<Stage3DLayerProps> = React.memo(({
  visible,
  skinUrl = PRESET_SKINS.dream,
  capeUrl,
  model = "default",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const limbsRef = useRef<ArticulatedLimbHandles | null>(null);
  const controllerRef = useRef<RoamingCharacterController | null>(null);
  const visibleRef = useRef<boolean>(visible);

  const isPointerDownOnChar = useRef<boolean>(false);
  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownTime = useRef<number>(0);
  const grabOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));

  useEffect(() => {
    visibleRef.current = visible;
    const vwr = viewerRef.current;
    if (vwr) {
      vwr.renderPaused = !visible;
      if (vwr.animation) {
        vwr.animation.paused = !visible;
      }
      if (visible) {
        (vwr as any).clock?.getDelta();
        if (controllerRef.current) {
          const res = scanLauncherPlatforms(vwr.camera, raycasterRef.current, planeRef.current);
          controllerRef.current.setPlatforms(res.platforms, res.floorLevel, res.minX, res.maxX);
        }
      }
    }
  }, [visible]);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const initialWidth = Math.max(1, window.innerWidth || 1280);
      const initialHeight = Math.max(1, window.innerHeight || 720);

      // Initialize high-performance hardware-accelerated WebGL context
      canvasRef.current.getContext("webgl2", {
        powerPreference: "high-performance",
        alpha: true,
        depth: true,
        stencil: false,
        desynchronized: true,
        antialias: false,
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
      }) ||
      canvasRef.current.getContext("webgl", {
        powerPreference: "high-performance",
        alpha: true,
        depth: true,
        stencil: false,
        desynchronized: true,
        antialias: false,
        preserveDrawingBuffer: false,
      });

      const viewer = new SkinViewer({
        canvas: canvasRef.current,
        width: initialWidth,
        height: initialHeight,
        skin: skinUrl,
        model: model || "default",
        cape: capeUrl || undefined,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.0),
        enableControls: false,
      });

      // Explicit hardware acceleration configurations on WebGLRenderer
      viewer.renderer.sortObjects = false;

      viewer.camera.position.set(0, 14, 95);
      viewer.camera.lookAt(0, -2, 0);
      viewer.controls.target.set(0, -2, 0);
      viewer.controls.enableRotate = false;
      viewer.controls.enableZoom = false;
      viewer.controls.enablePan = false;
      viewer.controls.update();

      const isSlim = viewer.playerObject.skin.modelType === "slim" || model === "slim";
      const limbs = buildArticulatedLimbs(viewer.playerObject, isSlim);
      limbsRef.current = limbs;

      const controller = new RoamingCharacterController(viewer.playerObject, limbs, viewer.scene);
      controllerRef.current = controller;

      const initialData = scanLauncherPlatforms(viewer.camera, raycasterRef.current, planeRef.current);
      controller.setPlatforms(initialData.platforms, initialData.floorLevel, initialData.minX, initialData.maxX);

      class PhysicalRoamingAnimation extends PlayerAnimation {
        animate(_player: PlayerObject, delta: number): void {
          if (controllerRef.current) {
            controllerRef.current.update(delta || 0.016);
          }
        }
      }

      (viewer as any).render = function () {
        this.renderer.render(this.scene, this.camera);
      };

      const tempCurWorld = new THREE.Vector3();
      const tempHitPos = new THREE.Vector3();

      const pointerState = {
        clientX: 0,
        clientY: 0,
        target: null as HTMLElement | null,
        dirty: false,
      };

      let activeBodyCursor = "";
      const setBodyCursor = (cursor: string) => {
        if (activeBodyCursor !== cursor) {
          activeBodyCursor = cursor;
          document.body.style.cursor = cursor;
        }
      };

      const processPointerFrame = () => {
        const ctrl = controllerRef.current;
        const vwr = viewerRef.current;
        if (!ctrl || !vwr) return;

        if (isPointerDownOnChar.current) {
          screenPointToWorld(
            pointerState.clientX,
            pointerState.clientY,
            vwr.camera,
            raycasterRef.current,
            planeRef.current,
            tempCurWorld
          );
          ctrl.updateDrag(
            tempCurWorld.x + grabOffset.current.x,
            tempCurWorld.y + grabOffset.current.y
          );
          setBodyCursor("grabbing");
          return;
        }

        if (!pointerState.dirty) return;
        pointerState.dirty = false;

        const screenH = window.innerHeight || 720;
        if (pointerState.clientY < screenH * 0.4) {
          if (activeBodyCursor === "grab") {
            setBodyCursor("");
          }
          return;
        }

        const target = pointerState.target;
        if (
          target &&
          target.closest(
            ".menu-customizer-modal-backdrop, .modal, [role='dialog'], .hud-container, .dock-container, button, a, input, select"
          )
        ) {
          if (activeBodyCursor === "grab") {
            setBodyCursor("");
          }
          return;
        }

        if (ctrl.state !== "unconscious" && ctrl.state !== "waking_up") {
          const isOver = isPointerOverCharacter(
            pointerState.clientX,
            pointerState.clientY,
            ctrl,
            vwr,
            raycasterRef.current,
            planeRef.current,
            tempCurWorld
          );
          if (isOver) {
            setBodyCursor("grab");
          } else if (activeBodyCursor === "grab") {
            setBodyCursor("");
          }
        }
      };

      // Native VSync animation loop with adaptive frame pacing
      let lastDrawTime = 0;
      (viewer as any).draw = function (timestamp?: number) {
        if (this._renderPaused || this._disposed) return;

        const t = typeof timestamp === "number" ? timestamp : performance.now();
        if (lastDrawTime === 0) {
          lastDrawTime = t;
        }

        const elapsed = (t - lastDrawTime) / 1000;
        const ctrl = controllerRef.current;
        // Pacing: cap at 60 FPS for active states (prevent 144Hz/240Hz screen overheating),
        // and 36 FPS for idle/unconscious states to save CPU/GPU fill-rate.
        const isInteracting =
          isPointerDownOnChar.current ||
          (ctrl && (ctrl.state === "dragged" || ctrl.state === "falling"));
        const targetFPS = isInteracting
          ? 60
          : ctrl && (ctrl.state === "idle" || ctrl.state === "unconscious")
          ? 36
          : 48;
        const minInterval = 1 / (targetFPS + 2);

        if (elapsed < minInterval) {
          this.animationID = window.requestAnimationFrame((nextT) => (viewer as any).draw(nextT));
          return;
        }

        lastDrawTime = t;
        const dt = Math.min(Math.max(0.001, elapsed), 0.1);

        // Process pointer hover/drag once per visual frame
        processPointerFrame();

        if (this._animation !== null) {
          this._animation.update(this.playerObject, dt);
        }
        this.render();

        this.animationID = window.requestAnimationFrame((nextT) => (viewer as any).draw(nextT));
      };

      viewer.animation = new PhysicalRoamingAnimation();
      viewerRef.current = viewer;

      const refreshPlatforms = () => {
        if (!viewerRef.current || !controllerRef.current) return;
        const res = scanLauncherPlatforms(
          viewerRef.current.camera,
          raycasterRef.current,
          planeRef.current
        );
        controllerRef.current.setPlatforms(res.platforms, res.floorLevel, res.minX, res.maxX);
      };

      let resizeRaf: number | null = null;
      const onResize = () => {
        if (viewerRef.current && controllerRef.current) {
          const w = Math.max(1, window.innerWidth || 1280);
          const h = Math.max(1, window.innerHeight || 720);
          viewerRef.current.setSize(w, h);
          viewerRef.current.camera.aspect = w / h;
          viewerRef.current.camera.updateProjectionMatrix();

          if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
          resizeRaf = requestAnimationFrame(() => {
            refreshPlatforms();
            resizeRaf = null;
          });
        }
      };
      window.addEventListener("resize", onResize);

      const onVisibilityChange = () => {
        if (viewerRef.current) {
          const isHidden = document.hidden || !visibleRef.current;
          viewerRef.current.renderPaused = isHidden;
          if (viewerRef.current.animation) {
            viewerRef.current.animation.paused = isHidden;
          }
          if (!isHidden) {
            lastDrawTime = 0;
            (viewerRef.current as any).clock?.getDelta();
          }
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      const onWindowBlur = () => {
        if (viewerRef.current) {
          viewerRef.current.renderPaused = true;
          if (viewerRef.current.animation) {
            viewerRef.current.animation.paused = true;
          }
        }
      };

      const onWindowFocus = () => {
        if (viewerRef.current && visibleRef.current && !document.hidden) {
          viewerRef.current.renderPaused = false;
          if (viewerRef.current.animation) {
            viewerRef.current.animation.paused = false;
          }
          lastDrawTime = 0;
          (viewerRef.current as any).clock?.getDelta();
        }
      };

      window.addEventListener("blur", onWindowBlur);
      window.addEventListener("focus", onWindowFocus);

      const onWindowPointerDown = (e: PointerEvent) => {
        if (!visibleRef.current) return;

        pointerState.clientX = e.clientX;
        pointerState.clientY = e.clientY;

        const target = e.target as HTMLElement | null;
        if (target && target.closest(".menu-customizer-modal-backdrop, .modal, [role='dialog'], .hud-container, .dock-container, button, a, input, select")) {
          return;
        }

        const screenH = window.innerHeight || 720;
        if (e.clientY < screenH * 0.4) {
          return;
        }

        const ctrl = controllerRef.current;
        const vwr = viewerRef.current;
        if (!ctrl || !vwr) return;

        if (ctrl.state === "unconscious" || ctrl.state === "waking_up") return;

        if (
          isPointerOverCharacter(
            e.clientX,
            e.clientY,
            ctrl,
            vwr,
            raycasterRef.current,
            planeRef.current,
            tempHitPos
          )
        ) {
          e.stopPropagation();
          e.preventDefault();

          isPointerDownOnChar.current = true;
          pointerDownPos.current = { x: e.clientX, y: e.clientY };
          pointerDownTime.current = performance.now();
          grabOffset.current = {
            x: ctrl.currentX - tempHitPos.x,
            y: ctrl.currentY - tempHitPos.y,
          };

          ctrl.startDrag(tempHitPos.x + grabOffset.current.x, tempHitPos.y + grabOffset.current.y);
          setBodyCursor("grabbing");
        }
      };

      const onWindowPointerMove = (e: PointerEvent) => {
        if (!visibleRef.current) return;
        pointerState.clientX = e.clientX;
        pointerState.clientY = e.clientY;
        pointerState.target = e.target as HTMLElement | null;
        pointerState.dirty = true;
      };

      const onWindowPointerUp = (e: PointerEvent) => {
        if (!isPointerDownOnChar.current) return;
        isPointerDownOnChar.current = false;

        const ctrl = controllerRef.current;
        const vwr = viewerRef.current;
        if (!ctrl || !vwr) return;

        const elapsed = performance.now() - pointerDownTime.current;
        const dist = Math.hypot(
          e.clientX - pointerDownPos.current.x,
          e.clientY - pointerDownPos.current.y
        );

        screenPointToWorld(
          e.clientX,
          e.clientY,
          vwr.camera,
          raycasterRef.current,
          planeRef.current,
          tempCurWorld
        );

        if (dist < 8.0 && elapsed < 350) {
          ctrl.punch(tempCurWorld.x, tempCurWorld.y);
        } else {
          ctrl.endDrag();
        }

        setBodyCursor("");
      };

      window.addEventListener("pointerdown", onWindowPointerDown, { capture: true });
      window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
      window.addEventListener("pointerup", onWindowPointerUp);

      return () => {
        if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("blur", onWindowBlur);
        window.removeEventListener("focus", onWindowFocus);
        window.removeEventListener("pointerdown", onWindowPointerDown, { capture: true });
        window.removeEventListener("pointermove", onWindowPointerMove);
        window.removeEventListener("pointerup", onWindowPointerUp);
        setBodyCursor("");

        controller.dispose();
        viewer.dispose();
        viewerRef.current = null;
        limbsRef.current = null;
        controllerRef.current = null;
      };
    } catch (err) {
      console.warn("Failed to init Fullscreen 3D Stage:", err);
    }
  }, []);

  useEffect(() => {
    let canceled = false;
    if (viewerRef.current) {
      viewerRef.current.loadSkin(skinUrl, { model: model || "default" })?.then(() => {
        if (canceled) return;
        if (viewerRef.current) {
          const isSlim = viewerRef.current.playerObject.skin.modelType === "slim" || model === "slim";
          const limbs = buildArticulatedLimbs(viewerRef.current.playerObject, isSlim);
          limbsRef.current = limbs;
          if (controllerRef.current) {
            controllerRef.current.limbs = limbs;
          }
        }
      }).catch?.((err: any) => {
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
      <div className="stage-viewport-container">
        <canvas ref={canvasRef} style={{ outline: "none" }} />
      </div>
    </div>
  );
});
