import * as THREE from "three";
import React, { useEffect, useRef } from "react";
import { SkinViewer, PlayerAnimation, type PlayerObject } from "skinview3d";
import { buildArticulatedLimbs, type ArticulatedLimbHandles } from "../../utils/articulatedPlayer";
import { RoamingCharacterController, type WorldPlatform } from "../../utils/roamingCharacter";
import { PRESET_SKINS } from "../../constants/skinPresets";
import "../../styles/layer1-stage.css";

interface Stage3DLayerProps {
  visible: boolean;
  skinUrl?: string;
  capeUrl?: string | null;
  model?: "default" | "slim";
}

/**
 * Converts screen pixel coordinates (clientX, clientY) to 3D world coordinates on plane Z = 0.
 */
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
  const ndcX = (clientX / w) * 2 - 1;
  const ndcY = -(clientY / h) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const hit = raycaster.ray.intersectPlane(plane, outVec);
  return hit !== null;
}

/**
 * Scans active UI elements (Dock and Top Bar panels) to create solid 3D walking platforms.
 * Calculates lower floor level below all buttons.
 */
function scanLauncherPlatforms(
  camera: THREE.PerspectiveCamera,
  raycaster: THREE.Raycaster,
  plane: THREE.Plane
): { platforms: WorldPlatform[]; floorLevel: number; minX: number; maxX: number } {
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  const tempTL = new THREE.Vector3();
  const tempBR = new THREE.Vector3();

  // Screen wall boundaries (framed so character body remains 100% visible on screen)
  screenPointToWorld(0, h * 0.5, camera, raycaster, plane, tempTL);
  const minX = tempTL.x + 22.0;
  screenPointToWorld(w, h * 0.5, camera, raycaster, plane, tempTL);
  const maxX = tempTL.x - 22.0;

  // Lower floor level (below all buttons near bottom edge of screen)
  screenPointToWorld(w * 0.5, h - 6, camera, raycaster, plane, tempTL);
  const floorLevel = tempTL.y + 24.0;

  const platforms: WorldPlatform[] = [];

  // Only the bottom dock buttons are solid platforms
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

        // Soles of shoes rest firmly on the top surface of the button plate
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

/**
 * Checks if the pointer coordinates intersect or are within the grab radius of the 3D character.
 */
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

  // 1. Raycast direct intersection with character meshes
  const intersects = raycaster.intersectObject(viewer.playerObject, true);
  if (intersects.length > 0) {
    return true;
  }

  // 2. Proximity check around character bounding cylinder (root is at feet, height is ~32)
  const dx = outWorldPos.x - controller.currentX;
  const dy = outWorldPos.y - (controller.currentY + 14.0);
  if (Math.abs(dx) <= 7.0 && Math.abs(dy) <= 17.0) {
    return true;
  }

  return false;
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

  // Interaction tracking state
  const isPointerDownOnChar = useRef<boolean>(false);
  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownTime = useRef<number>(0);
  const grabOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMouseWorld = useRef<THREE.Vector3>(new THREE.Vector3());

  // Three.js reusable math objects
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));

  useEffect(() => {
    visibleRef.current = visible;
    if (viewerRef.current) {
      viewerRef.current.renderPaused = !visible;
      if (viewerRef.current.animation) {
        viewerRef.current.animation.paused = !visible;
      }
    }
  }, [visible]);

  // Initialize Fullscreen 3D Stage with Articulated Limbs & Physical Platforming
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
      });

      // Camera positioned with wide cinematic angle over launcher floor
      viewer.camera.position.set(0, 14, 95);
      viewer.camera.lookAt(0, -2, 0);
      viewer.controls.target.set(0, -2, 0);
      viewer.controls.enableRotate = false;
      viewer.controls.enableZoom = false;
      viewer.controls.enablePan = false;
      viewer.controls.update();

      // Build articulated limbs with functional elbow & knee joints
      const isSlim = viewer.playerObject.skin.modelType === "slim" || model === "slim";
      const limbs = buildArticulatedLimbs(viewer.playerObject, isSlim);
      limbsRef.current = limbs;

      // Roaming character controller with physical platforming, dragging & wall collisions
      const controller = new RoamingCharacterController(viewer.playerObject, limbs);
      controllerRef.current = controller;

      // Initial platform scan
      const initialData = scanLauncherPlatforms(viewer.camera, raycasterRef.current, planeRef.current);
      controller.setPlatforms(initialData.platforms, initialData.floorLevel, initialData.minX, initialData.maxX);

      // Animation loop: drives character physics, platform collisions & animations
      class PhysicalRoamingAnimation extends PlayerAnimation {
        animate(_player: PlayerObject, delta: number): void {
          if (controllerRef.current) {
            controllerRef.current.update(delta || 0.016);
          }
        }
      }

      viewer.animation = new PhysicalRoamingAnimation();
      viewerRef.current = viewer;
      (window as any).__skinViewer = viewer;
      (window as any).__controller = controller;

      // Periodic platform update to stay synced with UI animations / layout
      const platformInterval = setInterval(() => {
        if (!viewerRef.current || !controllerRef.current) return;
        const res = scanLauncherPlatforms(
          viewerRef.current.camera,
          raycasterRef.current,
          planeRef.current
        );
        controllerRef.current.setPlatforms(res.platforms, res.floorLevel, res.minX, res.maxX);
      }, 500);

      // Handle window resize dynamically
      const onResize = () => {
        if (viewerRef.current && controllerRef.current) {
          const w = Math.max(1, window.innerWidth || 1280);
          const h = Math.max(1, window.innerHeight || 720);
          viewerRef.current.setSize(w, h);
          viewerRef.current.camera.aspect = w / h;
          viewerRef.current.camera.updateProjectionMatrix();

          const res = scanLauncherPlatforms(
            viewerRef.current.camera,
            raycasterRef.current,
            planeRef.current
          );
          controllerRef.current.setPlatforms(res.platforms, res.floorLevel, res.minX, res.maxX);
        }
      };
      window.addEventListener("resize", onResize);

      // =========================================================================
      // MOUSE DRAG & PUNCH INTERACTION (Capture phase)
      // If clicking character: drag or punch him!
      // If clicking outside: let events pass through cleanly to launcher buttons!
      // =========================================================================
      const onWindowPointerDown = (e: PointerEvent) => {
        if (!visibleRef.current) return;

        // Skip raycast if clicking over modals or customizer backdrop
        const target = e.target as HTMLElement | null;
        if (target && target.closest(".menu-customizer-modal-backdrop, .modal, [role='dialog']")) {
          return;
        }

        const ctrl = controllerRef.current;
        const vwr = viewerRef.current;
        if (!ctrl || !vwr) return;

        // Disallow grabbing while unconscious
        if (ctrl.state === "unconscious" || ctrl.state === "waking_up") return;

        const hitPos = new THREE.Vector3();
        if (
          isPointerOverCharacter(
            e.clientX,
            e.clientY,
            ctrl,
            vwr,
            raycasterRef.current,
            planeRef.current,
            hitPos
          )
        ) {
          // Interacting with character: capture event so buttons underneath don't fire
          e.stopPropagation();
          e.preventDefault();

          isPointerDownOnChar.current = true;
          pointerDownPos.current = { x: e.clientX, y: e.clientY };
          pointerDownTime.current = performance.now();
          grabOffset.current = {
            x: ctrl.currentX - hitPos.x,
            y: ctrl.currentY - hitPos.y,
          };
          lastMouseWorld.current.copy(hitPos);

          ctrl.startDrag(hitPos.x + grabOffset.current.x, hitPos.y + grabOffset.current.y);
          document.body.style.cursor = "grabbing";
        }
      };

      const onWindowPointerMove = (e: PointerEvent) => {
        if (!visibleRef.current) return;
        const ctrl = controllerRef.current;
        const vwr = viewerRef.current;
        if (!ctrl || !vwr) return;

        // Skip raycast work if pointer is over any modal or customizer dialog
        const target = e.target as HTMLElement | null;
        if (!isPointerDownOnChar.current && target && target.closest(".menu-customizer-modal-backdrop, .modal, [role='dialog']")) {
          if (document.body.style.cursor === "grab") {
            document.body.style.cursor = "";
          }
          return;
        }

        const curWorld = new THREE.Vector3();
        screenPointToWorld(
          e.clientX,
          e.clientY,
          vwr.camera,
          raycasterRef.current,
          planeRef.current,
          curWorld
        );

        if (isPointerDownOnChar.current) {
          ctrl.updateDrag(
            curWorld.x + grabOffset.current.x,
            curWorld.y + grabOffset.current.y
          );
          lastMouseWorld.current.copy(curWorld);
          document.body.style.cursor = "grabbing";
        } else {
          // Hover cursor feedback
          if (ctrl.state !== "unconscious" && ctrl.state !== "waking_up") {
            const isOver = isPointerOverCharacter(
              e.clientX,
              e.clientY,
              ctrl,
              vwr,
              raycasterRef.current,
              planeRef.current,
              curWorld
            );
            if (isOver) {
              document.body.style.cursor = "grab";
            } else if (document.body.style.cursor === "grab") {
              document.body.style.cursor = "";
            }
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

        const curWorld = new THREE.Vector3();
        screenPointToWorld(
          e.clientX,
          e.clientY,
          vwr.camera,
          raycasterRef.current,
          planeRef.current,
          curWorld
        );

        if (dist < 8.0 && elapsed < 350) {
          // CLICK / TAP: PUNCH THE CHARACTER!
          ctrl.punch(curWorld.x, curWorld.y);
        } else {
          // RELEASE FROM DRAG WITH MOMENTUM
          ctrl.endDrag();
        }

        document.body.style.cursor = "";
      };

      window.addEventListener("pointerdown", onWindowPointerDown, { capture: true });
      window.addEventListener("pointermove", onWindowPointerMove);
      window.addEventListener("pointerup", onWindowPointerUp);

      return () => {
        clearInterval(platformInterval);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointerdown", onWindowPointerDown, { capture: true });
        window.removeEventListener("pointermove", onWindowPointerMove);
        window.removeEventListener("pointerup", onWindowPointerUp);
        document.body.style.cursor = "";
        viewer.dispose();
        viewerRef.current = null;
        limbsRef.current = null;
        controllerRef.current = null;
      };
    } catch (err) {
      console.warn("Failed to init Fullscreen 3D Stage:", err);
    }
  }, []);

  // Pause render loop when hidden
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.renderPaused = !visible;
    if (viewer.animation) {
      viewer.animation.paused = !visible;
    }
  }, [visible]);

  // Update skin texture and model (with cancellation token against race conditions)
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

  // Update cape
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
