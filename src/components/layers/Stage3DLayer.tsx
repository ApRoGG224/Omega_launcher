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

  const selectors = [
    ".dock-container",
  ];

  for (const sel of selectors) {
    const elements = document.querySelectorAll(sel);
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.closest(".hidden")) return;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 10) {
        screenPointToWorld(rect.left, rect.top, camera, raycaster, plane, tempTL);
        screenPointToWorld(rect.right, rect.bottom, camera, raycaster, plane, tempBR);

        const leftX = Math.min(tempTL.x, tempBR.x);
        const rightX = Math.max(tempTL.x, tempBR.x);
        const topWorldY = Math.max(tempTL.y, tempBR.y);
        const bottomWorldY = Math.min(tempTL.y, tempBR.y);

        const topY = topWorldY + 23.2;
        const bottomY = bottomWorldY - 8.8;

        const isDock = sel.includes("dock");
        const isGroundReaching = isDock || bottomWorldY <= (floorLevel - 24.0) + 8.0;

        platforms.push({
          id: sel,
          minX: leftX - 1.2,
          maxX: rightX + 1.2,
          topY: topY,
          bottomY: bottomY,
          isSolid: true,
          isGroundReaching: isGroundReaching,
        });
      }
    });
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
  if (dx > 8.5 || dy > 18.0) {
    return false;
  }

  if (dx <= 6.5 && dy <= 16.5) {
    return true;
  }

  const intersects = raycaster.intersectObject(viewer.playerObject, true);
  return intersects.length > 0;
}

export const Stage3DLayer: React.FC<Stage3DLayerProps> = React.memo(({
  visible,
  skinUrl = PRESET_SKINS.dream,
  capeUrl,
  model = "slim",
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
  const lastMouseWorld = useRef<THREE.Vector3>(new THREE.Vector3());

  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));

  useEffect(() => {
    visibleRef.current = visible;
    if (viewerRef.current) {
      viewerRef.current.renderPaused = !visible;
      if (viewerRef.current.animation) {
        viewerRef.current.animation.paused = !visible;
      }
      if (visible) {
        (viewerRef.current as any).clock?.getDelta();
        if (controllerRef.current) {
          const res = scanLauncherPlatforms(
            viewerRef.current.camera,
            raycasterRef.current,
            planeRef.current
          );
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

      const viewer = new SkinViewer({
        canvas: canvasRef.current,
        width: initialWidth,
        height: initialHeight,
        skin: skinUrl,
        model: model,
        cape: capeUrl || undefined,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.0),
        enableControls: false,
      });

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

      let lastRenderTime = performance.now();
      const TARGET_FPS_IDLE = 36;
      const TARGET_FPS_DRAG = 50;
      const FRAME_INTERVAL_IDLE = 1000 / TARGET_FPS_IDLE;
      const FRAME_INTERVAL_DRAG = 1000 / TARGET_FPS_DRAG;

      (viewer as any).draw = function () {
        if (this._disposed) return;
        if (this._renderPaused) {
          this.animationID = null;
          return;
        }

        const now = performance.now();
        const targetInterval = isPointerDownOnChar.current ? FRAME_INTERVAL_DRAG : FRAME_INTERVAL_IDLE;
        const elapsed = now - lastRenderTime;

        if (elapsed >= targetInterval) {
          lastRenderTime = now - (elapsed % targetInterval);
          const dt = this.clock.getDelta();

          if (this._animation !== null) {
            this._animation.update(this.playerObject, dt);
          }
          this.render();
        }

        this.animationID = window.requestAnimationFrame(() => this.draw());
      };

      viewer.animation = new PhysicalRoamingAnimation();
      viewerRef.current = viewer;
      (window as any).__skinViewer = viewer;
      (window as any).__controller = controller;

      const refreshPlatforms = () => {
        if (!viewerRef.current || !controllerRef.current) return;
        const res = scanLauncherPlatforms(
          viewerRef.current.camera,
          raycasterRef.current,
          planeRef.current
        );
        controllerRef.current.setPlatforms(res.platforms, res.floorLevel, res.minX, res.maxX);
      };

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          refreshPlatforms();
        });
        const dockEl = document.querySelector(".dock-container") || document.querySelector(".layer-dock");
        if (dockEl) {
          resizeObserver.observe(dockEl);
        }
      }

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

      const tempCurWorld = new THREE.Vector3();
      const tempHitPos = new THREE.Vector3();
      let lastHoverCheckTime = 0;

      const onWindowPointerDown = (e: PointerEvent) => {
        if (!visibleRef.current) return;

        const target = e.target as HTMLElement | null;
        if (target && target.closest(".menu-customizer-modal-backdrop, .modal, [role='dialog'], .hud-container")) {
          return;
        }

        const screenH = window.innerHeight || 720;
        if (e.clientY < screenH * 0.45) {
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
          lastMouseWorld.current.copy(tempHitPos);

          ctrl.startDrag(tempHitPos.x + grabOffset.current.x, tempHitPos.y + grabOffset.current.y);
          document.body.style.cursor = "grabbing";
        }
      };

      const onWindowPointerMove = (e: PointerEvent) => {
        if (!visibleRef.current) return;
        const ctrl = controllerRef.current;
        const vwr = viewerRef.current;
        if (!ctrl || !vwr) return;

        if (isPointerDownOnChar.current) {
          screenPointToWorld(
            e.clientX,
            e.clientY,
            vwr.camera,
            raycasterRef.current,
            planeRef.current,
            tempCurWorld
          );
          ctrl.updateDrag(
            tempCurWorld.x + grabOffset.current.x,
            tempCurWorld.y + grabOffset.current.y
          );
          lastMouseWorld.current.copy(tempCurWorld);
          document.body.style.cursor = "grabbing";
          return;
        }

        const screenH = window.innerHeight || 720;
        if (e.clientY < screenH * 0.45) {
          if (document.body.style.cursor === "grab") {
            document.body.style.cursor = "";
          }
          return;
        }

        const now = performance.now();
        if (now - lastHoverCheckTime < 24) return;
        lastHoverCheckTime = now;

        const target = e.target as HTMLElement | null;
        if (target && target.closest(".menu-customizer-modal-backdrop, .modal, [role='dialog'], .hud-container")) {
          if (document.body.style.cursor === "grab") {
            document.body.style.cursor = "";
          }
          return;
        }

        screenPointToWorld(
          e.clientX,
          e.clientY,
          vwr.camera,
          raycasterRef.current,
          planeRef.current,
          tempCurWorld
        );

        if (ctrl.state !== "unconscious" && ctrl.state !== "waking_up") {
          const isOver = isPointerOverCharacter(
            e.clientX,
            e.clientY,
            ctrl,
            vwr,
            raycasterRef.current,
            planeRef.current,
            tempCurWorld
          );
          if (isOver) {
            document.body.style.cursor = "grab";
          } else if (document.body.style.cursor === "grab") {
            document.body.style.cursor = "";
          }
        }
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

        document.body.style.cursor = "";
      };

      window.addEventListener("pointerdown", onWindowPointerDown, { capture: true });
      window.addEventListener("pointermove", onWindowPointerMove);
      window.addEventListener("pointerup", onWindowPointerUp);

      return () => {
        if (resizeObserver) resizeObserver.disconnect();
        if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointerdown", onWindowPointerDown, { capture: true });
        window.removeEventListener("pointermove", onWindowPointerMove);
        window.removeEventListener("pointerup", onWindowPointerUp);
        document.body.style.cursor = "";
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
      viewerRef.current.loadSkin(skinUrl, { model })?.then(() => {
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
        <div className="stage-canvas-wrapper">
          <canvas ref={canvasRef} style={{ outline: "none" }} />
        </div>
      </div>
    </div>
  );
});
