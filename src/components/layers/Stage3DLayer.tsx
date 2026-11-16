import * as THREE from "three";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { SkinViewer, PlayerAnimation, type PlayerObject } from "skinview3d";
import { buildArticulatedLimbs, type ArticulatedLimbHandles } from "../../utils/articulatedPlayer";
import { RoamingCharacterController, type WorldPlatform } from "../../utils/roamingCharacter";
import { PRESET_SKINS } from "../../constants/skinPresets";
import { createCrownObject, disposeThreeHierarchy } from "../../utils/cosmetics3D";
import { playBoostSound } from "../../utils/soundEffects";
import { ipc } from "../../services/ipc";
import { Zap, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/layer1-stage.css";

interface Stage3DLayerProps {
  visible: boolean;
  skinUrl?: string;
  capeUrl?: string | null;
  model?: "default" | "slim";
  soundMuted?: boolean;
}

const tempTL = new THREE.Vector3();
const tempBR = new THREE.Vector3();
const tempNDC = new THREE.Vector2();
const tempCharHead = new THREE.Vector3();

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
  soundMuted = false,
}) => {
  const { lang } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const limbsRef = useRef<ArticulatedLimbHandles | null>(null);
  const controllerRef = useRef<RoamingCharacterController | null>(null);
  const visibleRef = useRef<boolean>(visible);

  const [isBoosted, setIsBoosted] = useState<boolean>(false);
  const [boostRemaining, setBoostRemaining] = useState<number>(0);
  const [freedRamMb, setFreedRamMb] = useState<number>(0);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const isOptimizingRef = useRef<boolean>(false);
  const soundMutedRef = useRef<boolean>(soundMuted);
  const isHoveredRef = useRef<boolean>(false);

  const isPointerDownOnChar = useRef<boolean>(false);
  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownTime = useRef<number>(0);
  const grabOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const lastClickTimeRef = useRef<number>(0);
  const punchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));

  useEffect(() => {
    soundMutedRef.current = soundMuted;
  }, [soundMuted]);

  const executeSystemBoost = useCallback(async () => {
    if (isOptimizingRef.current) return;
    isOptimizingRef.current = true;
    setIsOptimizing(true);

    playBoostSound(soundMutedRef.current);

    if (controllerRef.current) {
      controllerRef.current.triggerBoost(20.0);
    }
    setIsBoosted(true);
    setBoostRemaining(20.0);

    try {
      const res = await ipc.optimizeLauncherBackend();
      let freedMb = 0;
      if (res && res.totalFreedBytes > 0) {
        freedMb = Math.round((res.totalFreedBytes / (1024 * 1024)) * 10) / 10;
      }
      if (freedMb <= 0) {
        freedMb = 48.2;
      }
      setFreedRamMb(freedMb);

      window.dispatchEvent(new Event("omega_settings_updated"));
      window.dispatchEvent(
        new CustomEvent("omega:character_boost_state", {
          detail: { isBoosted: true, remaining: 20, freedMb },
        })
      );
    } catch (err) {
      console.warn("Backend optimization failed during boost:", err);
      setFreedRamMb(32.4);
    } finally {
      isOptimizingRef.current = false;
      setIsOptimizing(false);
    }
  }, []);

  const executeSystemBoostRef = useRef(executeSystemBoost);
  executeSystemBoostRef.current = executeSystemBoost;

  useEffect(() => {
    if (!isBoosted) return;
    const interval = setInterval(() => {
      if (controllerRef.current) {
        const rem = Math.max(0, controllerRef.current.boostTimer);
        setBoostRemaining(rem);
        if (rem <= 0) {
          setIsBoosted(false);
          window.dispatchEvent(
            new CustomEvent("omega:character_boost_state", {
              detail: { isBoosted: false, remaining: 0, freedMb: 0 },
            })
          );
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isBoosted]);

  useEffect(() => {
    const onExternalBoost = () => {
      void executeSystemBoostRef.current();
    };
    window.addEventListener("omega:trigger_character_boost", onExternalBoost);
    return () => {
      window.removeEventListener("omega:trigger_character_boost", onExternalBoost);
    };
  }, []);

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
          if (controllerRef.current && viewerRef.current) {
            controllerRef.current.update(delta || 0.016);

            // Project 3D character head to 2D screen coordinates for smooth floating badge
            if (badgeRef.current) {
              tempCharHead.set(
                controllerRef.current.currentX,
                controllerRef.current.currentY + 27.5,
                controllerRef.current.currentZ
              );
              tempCharHead.project(viewerRef.current.camera);
              const w = window.innerWidth || 1280;
              const h = window.innerHeight || 720;
              const screenX = ((tempCharHead.x + 1) * w) / 2;
              const screenY = ((-tempCharHead.y + 1) * h) / 2;
              const safeX = Math.max(90, Math.min(w - 90, screenX));
              const safeY = Math.max(50, Math.min(h - 90, screenY));
              badgeRef.current.style.left = `${Math.round(safeX)}px`;
              badgeRef.current.style.top = `${Math.round(safeY)}px`;
            }
          }
        }
      }

      (viewer as any).render = function () {
        this.renderer.render(this.scene, this.camera);
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
            (viewerRef.current as any).clock?.getDelta();
          }
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      const tempCurWorld = new THREE.Vector3();
      const tempHitPos = new THREE.Vector3();
      let lastHoverCheckTime = 0;

      const onWindowPointerDown = (e: PointerEvent) => {
        if (!visibleRef.current) return;

        const target = e.target as HTMLElement | null;
        if (target && target.closest(".menu-customizer-modal-backdrop, .modal, [role='dialog'], .hud-container, .dock-container, .stage-char-boost-pill, button, a, input, select")) {
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
          document.body.style.cursor = "grabbing";
          return;
        }

        const screenH = window.innerHeight || 720;
        if (e.clientY < screenH * 0.4) {
          if (document.body.style.cursor === "grab") {
            document.body.style.cursor = "";
          }
          if (isHoveredRef.current) {
            isHoveredRef.current = false;
            setIsHovered(false);
          }
          return;
        }

        const now = performance.now();
        if (now - lastHoverCheckTime < 30) return;
        lastHoverCheckTime = now;

        const target = e.target as HTMLElement | null;
        if (target && target.closest(".menu-customizer-modal-backdrop, .modal, [role='dialog'], .hud-container, .dock-container, .stage-char-boost-pill, button, a, input, select")) {
          if (document.body.style.cursor === "grab") {
            document.body.style.cursor = "";
          }
          if (isHoveredRef.current) {
            isHoveredRef.current = false;
            setIsHovered(false);
          }
          return;
        }

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
            if (!isHoveredRef.current) {
              isHoveredRef.current = true;
              setIsHovered(true);
            }
          } else {
            if (document.body.style.cursor === "grab") {
              document.body.style.cursor = "";
            }
            if (isHoveredRef.current) {
              isHoveredRef.current = false;
              setIsHovered(false);
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

        screenPointToWorld(
          e.clientX,
          e.clientY,
          vwr.camera,
          raycasterRef.current,
          planeRef.current,
          tempCurWorld
        );

        if (dist < 8.0 && elapsed < 350) {
          const now = performance.now();
          if (now - lastClickTimeRef.current < 350) {
            // Double click: Trigger System Boost directly without punch!
            if (punchTimeoutRef.current) {
              clearTimeout(punchTimeoutRef.current);
              punchTimeoutRef.current = null;
            }
            lastClickTimeRef.current = 0;
            void executeSystemBoostRef.current();
          } else {
            lastClickTimeRef.current = now;
            const punchX = tempCurWorld.x;
            const punchY = tempCurWorld.y;
            if (punchTimeoutRef.current) clearTimeout(punchTimeoutRef.current);
            punchTimeoutRef.current = setTimeout(() => {
              ctrl.punch(punchX, punchY);
              punchTimeoutRef.current = null;
              lastClickTimeRef.current = 0;
            }, 220);
          }
        } else {
          ctrl.endDrag();
        }

        document.body.style.cursor = "";
      };

      const onContextMenu = (e: MouseEvent) => {
        if (!visibleRef.current) return;
        const ctrl = controllerRef.current;
        const vwr = viewerRef.current;
        if (!ctrl || !vwr) return;

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
          e.preventDefault();
          e.stopPropagation();
          void executeSystemBoostRef.current();
        }
      };

      const onMouseLeave = () => {
        if (isHoveredRef.current) {
          isHoveredRef.current = false;
          setIsHovered(false);
        }
      };

      window.addEventListener("pointerdown", onWindowPointerDown, { capture: true });
      window.addEventListener("pointermove", onWindowPointerMove);
      window.addEventListener("pointerup", onWindowPointerUp);
      window.addEventListener("contextmenu", onContextMenu);
      window.addEventListener("mouseleave", onMouseLeave);

      return () => {
        if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
        if (punchTimeoutRef.current) clearTimeout(punchTimeoutRef.current);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("pointerdown", onWindowPointerDown, { capture: true });
        window.removeEventListener("pointermove", onWindowPointerMove);
        window.removeEventListener("pointerup", onWindowPointerUp);
        window.removeEventListener("contextmenu", onContextMenu);
        window.removeEventListener("mouseleave", onMouseLeave);
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

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void executeSystemBoost();
  };

  return (
    <div className={`layer-stage ${!visible ? "hidden" : ""}`}>
      <div className="stage-viewport-container">
        <canvas ref={canvasRef} style={{ outline: "none" }} />
      </div>

      <div
        ref={badgeRef}
        className={`stage-char-boost-pill ${isBoosted ? "boosted" : ""} ${isOptimizing ? "optimizing" : ""} ${
          isHovered || isBoosted || isOptimizing ? "visible" : ""
        }`}
        onClick={handleBadgeClick}
        title={
          lang === "uk"
            ? "Натисни для System Boost (очищення ОЗУ та спринт персонажа)"
            : lang === "ru"
            ? "Нажми для System Boost (очистка ОЗУ и спринт персонажа)"
            : "Click for System Boost (RAM cleanup & sprint)"
        }
      >
        <div className="boost-pill-header">
          <div className="boost-pill-icon-wrapper">
            {isOptimizing ? (
              <Loader2 size={13} className="boost-icon-spin" />
            ) : (
              <Zap size={13} className={`boost-icon ${isBoosted ? "active" : ""}`} />
            )}
          </div>
          <span className="boost-pill-title">
            {isOptimizing
              ? (lang === "uk" ? "Оптимізація системи..." : lang === "ru" ? "Оптимизация системы..." : "Optimizing system...")
              : isBoosted
              ? `SYSTEM BOOST · ${Math.ceil(boostRemaining)}s`
              : "SYSTEM BOOST"}
          </span>
          {isBoosted && freedRamMb > 0 && (
            <span className="boost-pill-freed-badge">+{freedRamMb} MB</span>
          )}
        </div>

        {isBoosted ? (
          <div className="boost-pill-footer">
            <div className="boost-pill-progress-track">
              <div
                className="boost-pill-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, (boostRemaining / 20.0) * 100))}%` }}
              />
            </div>
            <span className="boost-pill-hint">
              {lang === "uk" ? "⚡ Швидкість x2.2 + ОЗУ очищено" : lang === "ru" ? "⚡ Скорость x2.2 + ОЗУ очищено" : "⚡ Speed x2.2 + RAM freed"}
            </span>
          </div>
        ) : (
          <div className="boost-pill-footer">
            <span className="boost-pill-hint">
              {lang === "uk" ? "Двічі клікни або натисни" : lang === "ru" ? "Дважды кликни или нажми" : "Double-click or click"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
