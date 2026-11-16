import * as THREE from "three";
import React, { useEffect, useRef } from "react";
import { SkinViewer } from "skinview3d";
import { PRESET_SKINS } from "../../constants/skinPresets";
import { createCrownObject, disposeThreeHierarchy } from "../../utils/cosmetics3D";
import "../../styles/layer1-stage.css";

interface Stage3DLayerProps {
  visible: boolean;
  skinUrl?: string;
  capeUrl?: string | null;
  model?: "default" | "slim";
}

const tempVec = new THREE.Vector3();
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
  return mesh;
}

export const Stage3DLayer: React.FC<Stage3DLayerProps> = React.memo(({
  visible,
  skinUrl = PRESET_SKINS.dream,
  capeUrl,
  model = "default",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const visibleRef = useRef<boolean>(visible);
  visibleRef.current = visible;

  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animId: number | null = null;

    const initialW = Math.max(1, window.innerWidth || 1280);
    const initialH = Math.max(1, window.innerHeight || 720);

    const viewer = new SkinViewer({
      canvas,
      width: initialW,
      height: initialH,
      skin: skinUrl,
      model: model || "default",
      cape: capeUrl || undefined,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.0),
      enableControls: false,
    });
    viewerRef.current = viewer;

    viewer.camera.position.set(0, 14, 95);
    viewer.camera.lookAt(0, -2, 0);
    viewer.controls.enableRotate = false;
    viewer.controls.enableZoom = false;
    viewer.controls.enablePan = false;

    const shadow = createContactShadow();
    viewer.scene.add(shadow);

    (viewer as any).render = function () {
      this.renderer.render(this.scene, this.camera);
    };

    let floorY = -54;
    let dockTopY = -34.6;
    let dockMinX = -50;
    let dockMaxX = 50;
    let screenMinX = -85;
    let screenMaxX = 85;

    const updateMetrics = () => {
      const w = Math.max(1, window.innerWidth || 1280);
      const h = Math.max(1, window.innerHeight || 720);

      viewer.setSize(w, h);
      viewer.camera.aspect = w / h;
      viewer.camera.updateProjectionMatrix();

      screenPointToWorld(w * 0.5, h - 8, viewer.camera, raycasterRef.current, planeRef.current, tempVec);
      floorY = tempVec.y + 16.0;

      const dockEl = document.querySelector(".dock-container") || document.querySelector(".layer-dock");
      if (dockEl) {
        const rect = dockEl.getBoundingClientRect();
        screenPointToWorld(rect.left, rect.top, viewer.camera, raycasterRef.current, planeRef.current, tempTL);
        screenPointToWorld(rect.right, rect.bottom, viewer.camera, raycasterRef.current, planeRef.current, tempBR);
        dockMinX = Math.min(tempTL.x, tempBR.x) + 2.0;
        dockMaxX = Math.max(tempTL.x, tempBR.x) - 2.0;
        dockTopY = Math.max(tempTL.y, tempBR.y) + 16.0;
      } else {
        dockMinX = -45;
        dockMaxX = 45;
        dockTopY = floorY + 20;
      }

      screenPointToWorld(24, h * 0.5, viewer.camera, raycasterRef.current, planeRef.current, tempTL);
      screenPointToWorld(w - 24, h * 0.5, viewer.camera, raycasterRef.current, planeRef.current, tempBR);
      screenMinX = Math.min(tempTL.x, tempBR.x);
      screenMaxX = Math.max(tempTL.x, tempBR.x);
    };

    updateMetrics();

    let charX = 0;
    let charY = dockTopY;
    let vx = 0;
    let vy = 0;
    let state: "idle" | "walking" | "falling" | "dragged" = "idle";
    let curRotationY = 0.28;
    let targetRotationY = 0.28;
    let curRotationZ = 0;
    let walkTargetX = 0;
    let walkTime = 0;
    let idleTimer = 2.5;
    let totalTime = 0;
    let flashTimer = 0;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartTime = 0;
    let grabOffsetX = 0;
    let grabOffsetY = 0;
    let lastDragWorldX = 0;
    let lastDragWorldY = 0;
    let lastDragTime = 0;
    let dragVelocityX = 0;
    let dragVelocityY = 0;

    let targetHeadYaw = 0;
    let targetHeadPitch = 0;
    let curHeadYaw = 0;
    let curHeadPitch = 0;

    const clock = new THREE.Clock();

    const getGroundY = (x: number, y: number): number => {
      if (x >= dockMinX && x <= dockMaxX && y >= dockTopY - 4) {
        return dockTopY;
      }
      return floorY;
    };

    const triggerDamageFlash = () => {
      flashTimer = 0.22;
      const skin = viewer.playerObject.skin as any;
      if (skin) {
        if (skin.layer1Material) skin.layer1Material.color.setRGB(1.0, 0.35, 0.35);
        if (skin.layer1MaterialBiased) skin.layer1MaterialBiased.color.setRGB(1.0, 0.35, 0.35);
        if (skin.layer2Material) skin.layer2Material.color.setRGB(1.0, 0.35, 0.35);
        if (skin.layer2MaterialBiased) skin.layer2MaterialBiased.color.setRGB(1.0, 0.35, 0.35);
      }
    };

    const resetSkinColor = () => {
      const skin = viewer.playerObject.skin as any;
      if (skin) {
        if (skin.layer1Material) skin.layer1Material.color.setRGB(1.0, 1.0, 1.0);
        if (skin.layer1MaterialBiased) skin.layer1MaterialBiased.color.setRGB(1.0, 1.0, 1.0);
        if (skin.layer2Material) skin.layer2Material.color.setRGB(1.0, 1.0, 1.0);
        if (skin.layer2MaterialBiased) skin.layer2MaterialBiased.color.setRGB(1.0, 1.0, 1.0);
      }
    };

    const renderLoop = () => {
      if (disposed) return;

      if (!visibleRef.current || document.hidden) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      const dt = Math.min(clock.getDelta(), 0.05);
      totalTime += dt;

      if (state === "falling") {
        vy -= 95 * dt;
        charX += vx * dt;
        charY += vy * dt;
        vx *= Math.pow(0.92, dt * 60);
        curRotationZ *= Math.pow(0.90, dt * 60);

        if (charX < screenMinX) {
          charX = screenMinX;
          vx = Math.abs(vx) * 0.6;
        } else if (charX > screenMaxX) {
          charX = screenMaxX;
          vx = -Math.abs(vx) * 0.6;
        }

        const groundY = getGroundY(charX, charY);
        if (charY <= groundY) {
          charY = groundY;
          vy = 0;
          vx = 0;
          curRotationZ = 0;
          state = "idle";
          idleTimer = 2.5 + Math.random() * 3.0;
        }
      } else if (state === "walking") {
        const dist = walkTargetX - charX;
        if (Math.abs(dist) < 0.8) {
          charX = walkTargetX;
          state = "idle";
          idleTimer = 3.0 + Math.random() * 4.0;
        } else {
          const dir = Math.sign(dist);
          charX += dir * 16 * dt;
          targetRotationY = dir > 0 ? 1.4 : -1.4;

          const groundY = getGroundY(charX, charY);
          if (charY > groundY + 1.0) {
            state = "falling";
            vy = 0;
          }
        }
      } else if (state === "idle") {
        idleTimer -= dt;
        if (idleTimer <= 0) {
          const isDock = charY >= dockTopY - 2;
          const minP = isDock ? dockMinX + 5 : screenMinX + 10;
          const maxP = isDock ? dockMaxX - 5 : screenMaxX - 10;
          walkTargetX = minP + Math.random() * (maxP - minP);
          state = "walking";
          walkTime = 0;
        }
      }

      const player = viewer.playerObject;
      const skin = player.skin as any;
      const cape = player.cape;

      if (skin) {
        if (state === "idle") {
          const t = totalTime * 2.2;
          const breath = Math.sin(t) * 0.03;
          skin.leftArm.rotation.x = breath;
          skin.leftArm.rotation.z = 0.06 + breath * 0.5;
          skin.rightArm.rotation.x = -breath;
          skin.rightArm.rotation.z = -0.06 - breath * 0.5;
          skin.leftLeg.rotation.set(0, 0, 0);
          skin.rightLeg.rotation.set(0, 0, 0);
          if (cape) cape.rotation.x = 0.16 + Math.sin(t) * 0.03;
        } else if (state === "walking") {
          walkTime += dt;
          const t = walkTime * 8.0;
          skin.leftLeg.rotation.x = Math.sin(t) * 0.65;
          skin.rightLeg.rotation.x = -Math.sin(t) * 0.65;
          skin.leftArm.rotation.x = -Math.sin(t) * 0.65;
          skin.leftArm.rotation.z = 0.08;
          skin.rightArm.rotation.x = Math.sin(t) * 0.65;
          skin.rightArm.rotation.z = -0.08;
          if (cape) cape.rotation.x = 0.38 + Math.abs(Math.sin(t)) * 0.15;
        } else if (state === "dragged") {
          skin.leftArm.rotation.z = 2.2 + Math.sin(totalTime * 6) * 0.1;
          skin.rightArm.rotation.z = -2.2 - Math.sin(totalTime * 6) * 0.1;
          skin.leftArm.rotation.x = 0.2;
          skin.rightArm.rotation.x = 0.2;
          skin.leftLeg.rotation.x = Math.sin(totalTime * 5) * 0.3;
          skin.rightLeg.rotation.x = -Math.sin(totalTime * 5) * 0.3;
          if (cape) cape.rotation.x = 0.6;
        } else if (state === "falling") {
          skin.leftArm.rotation.x = 2.0 + Math.sin(totalTime * 10) * 0.3;
          skin.rightArm.rotation.x = 2.0 - Math.sin(totalTime * 10) * 0.3;
          skin.leftArm.rotation.z = 0.8;
          skin.rightArm.rotation.z = -0.8;
          skin.leftLeg.rotation.x = -0.4 + Math.sin(totalTime * 8) * 0.3;
          skin.rightLeg.rotation.x = 0.4 - Math.sin(totalTime * 8) * 0.3;
          if (cape) cape.rotation.x = 0.7 + Math.sin(totalTime * 10) * 0.2;
        }

        if (state === "idle" || state === "walking") {
          curHeadYaw += (targetHeadYaw - curHeadYaw) * 0.08;
          curHeadPitch += (targetHeadPitch - curHeadPitch) * 0.08;
          if (skin.head) {
            skin.head.rotation.y = curHeadYaw;
            skin.head.rotation.x = curHeadPitch;
          }
        } else if (skin.head) {
          skin.head.rotation.set(0, 0, 0);
        }
      }

      curRotationY += (targetRotationY - curRotationY) * 0.1;
      player.rotation.y = curRotationY;
      player.rotation.z = curRotationZ;

      player.position.set(charX, charY, 0);

      const groundY = getGroundY(charX, charY);
      shadow.position.set(charX, groundY - 15.9, 0);
      const heightAboveGround = Math.max(0, charY - groundY);
      const shadowScale = Math.max(0.5, 1.0 - heightAboveGround * 0.025);
      shadow.scale.set(shadowScale, shadowScale, 1.0);
      (shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.85 - heightAboveGround * 0.035);

      if (flashTimer > 0) {
        flashTimer -= dt;
        if (flashTimer <= 0) {
          resetSkinColor();
        }
      }

      (viewer as any).render();

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    const onPointerDown = (e: PointerEvent) => {
      if (!visibleRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest("button, a, input, select, .hud-container, .dock-container, .modal, [role='dialog']")) {
        return;
      }

      screenPointToWorld(e.clientX, e.clientY, viewer.camera, raycasterRef.current, planeRef.current, tempVec);

      const dx = Math.abs(tempVec.x - charX);
      const dy = Math.abs(tempVec.y - (charY + 1.0));

      if (dx <= 7.0 && dy <= 16.5) {
        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        dragStartX = tempVec.x;
        dragStartTime = performance.now();
        grabOffsetX = charX - tempVec.x;
        grabOffsetY = charY - tempVec.y;
        lastDragWorldX = tempVec.x;
        lastDragWorldY = tempVec.y;
        lastDragTime = performance.now();
        dragVelocityX = 0;
        dragVelocityY = 0;

        state = "dragged";
        document.body.style.cursor = "grabbing";
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!visibleRef.current) return;

      screenPointToWorld(e.clientX, e.clientY, viewer.camera, raycasterRef.current, planeRef.current, tempVec);

      if (isDragging) {
        const now = performance.now();
        const dt = Math.max(1, now - lastDragTime);

        dragVelocityX = ((tempVec.x - lastDragWorldX) / dt) * 1000;
        dragVelocityY = ((tempVec.y - lastDragWorldY) / dt) * 1000;

        lastDragWorldX = tempVec.x;
        lastDragWorldY = tempVec.y;
        lastDragTime = now;

        charX = tempVec.x + grabOffsetX;
        charY = tempVec.y + grabOffsetY;
        document.body.style.cursor = "grabbing";
        return;
      }

      const dx = Math.abs(tempVec.x - charX);
      const dy = Math.abs(tempVec.y - (charY + 1.0));

      if (dx <= 7.0 && dy <= 16.5) {
        document.body.style.cursor = "grab";
      } else if (document.body.style.cursor === "grab") {
        document.body.style.cursor = "";
      }

      const lookDx = (tempVec.x - charX) / 40;
      const lookDy = (tempVec.y - (charY + 14)) / 30;
      targetHeadYaw = Math.max(-0.45, Math.min(0.45, lookDx));
      targetHeadPitch = Math.max(-0.35, Math.min(0.35, -lookDy));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = "";

      screenPointToWorld(e.clientX, e.clientY, viewer.camera, raycasterRef.current, planeRef.current, tempVec);

      const elapsed = performance.now() - dragStartTime;
      const dist = Math.abs(tempVec.x - dragStartX);

      if (dist < 4.0 && elapsed < 280) {
        triggerDamageFlash();
        const dir = tempVec.x < charX ? 1 : -1;
        vx = dir * (34 + Math.random() * 10);
        vy = 26 + Math.random() * 8;
        curRotationZ = -dir * 0.35;
        state = "falling";
      } else {
        vx = Math.max(-60, Math.min(60, dragVelocityX * 0.75));
        vy = Math.max(-30, Math.min(60, dragVelocityY * 0.75));
        state = "falling";
      }
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);

    let resizeTimer: number | null = null;
    const onResize = () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        updateMetrics();
      }, 100);
    };

    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      if (animId !== null) cancelAnimationFrame(animId);
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);

      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);

      document.body.style.cursor = "";

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
      <div className="stage-viewport-container">
        <canvas ref={canvasRef} style={{ outline: "none" }} />
      </div>
    </div>
  );
});
