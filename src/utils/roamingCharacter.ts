import * as THREE from "three";
import type { PlayerObject } from "skinview3d";
import type { ArticulatedLimbHandles } from "./articulatedPlayer";

export type RoamState =
  | "idle"
  | "walking"
  | "waving"
  | "dragged"
  | "falling"
  | "unconscious"
  | "waking_up"
  | "rising";

export interface WorldPlatform {
  id: string;
  minX: number;
  maxX: number;
  topY: number; // Root position Y of player when standing on top of platform
  bottomY?: number; // World Y below which obstacle ends
  isSolid?: boolean; // Fully solid with side and bottom collisions
  isGroundReaching?: boolean; // Obstacle extends all the way to bottom screen floor
}

export const CHAR_HALF_WIDTH = 4.2;
export const CHAR_FEET_OFFSET = 23.2;
export const CHAR_HEAD_OFFSET = 8.8;

/**
 * Creates a soft radial gradient shadow texture for authentic, smooth contact shadows.
 */
function createSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.7)");
    gradient.addColorStop(0.35, "rgba(0, 0, 0, 0.45)");
    gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.15)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export class RoamingCharacterController {
  private player: PlayerObject;
  public limbs: ArticulatedLimbHandles;

  // World positioning
  public currentX: number = 0;
  public currentY: number = -12;
  public currentZ: number = 0;
  public targetX: number = 0;
  public targetZ: number = 0;
  public rotationY: number = 0;
  public targetRotationY: number = 0;
  public rotationZ: number = 0;

  // Physics velocities
  public velocityX: number = 0;
  public velocityY: number = 0;
  private readonly gravity: number = 78.0;

  // Boundaries & Platforms
  public minX: number = -68;
  public maxX: number = 68;
  public minZ: number = -10;
  public maxZ: number = 6;
  public floorY: number = -26; // Floor level (below buttons)
  public platforms: WorldPlatform[] = [];
  public currentPlatform: WorldPlatform | null = null;

  // State Machine
  public state: RoamState = "idle";
  private stateTimer: number = 2.0;
  private walkCycle: number = 0;
  private waveCycle: number = 0;
  private dragCycle: number = 0;
  private fallCycle: number = 0;
  public unconsciousTimer: number = 0;
  private wakeTimer: number = 0;
  private landingTimer: number = 0;

  // Hit & Damage state
  public isPunched: boolean = false;
  public hasHitWall: boolean = false;
  private flashTimer: number = 0;

  // Dragging state
  public isDragging: boolean = false;
  public targetDragX: number = 0;
  public targetDragY: number = 0;
  private dragVelX: number = 0;
  private dragVelY: number = 0;

  // Joint articulation smoothing
  private currentLeftElbow: number = 0.14;
  private currentRightElbow: number = 0.14;
  private currentLeftKnee: number = 0.04;
  private currentRightKnee: number = 0.04;

  // Landing physics
  private landingDuration: number = 0.35;
  private landingImpact: number = 0;

  // Rising animation state (smooth ascent to top of dock buttons)
  private risingStartX: number = 0;
  private risingStartY: number = 0;
  private risingTargetX: number = 0;
  private risingTargetY: number = 0;
  private risingTimer: number = 0;
  private risingDuration: number = 0.55;
  private risingPlatform: WorldPlatform | null = null;

  // Visual effects: Dizzy stars above head
  private dizzyStars: THREE.Group | null = null;

  // Hardware-accelerated contact shadow beneath character
  private shadowMesh: THREE.Mesh | null = null;
  private shadowMat: THREE.MeshBasicMaterial | null = null;
  private sceneRef: THREE.Scene | null = null;

  // Cached surface support for idle performance
  private cachedSurfaceY: number = -26;
  private cachedPlatform: WorldPlatform | null = null;
  private isSurfaceDirty: boolean = true;

  // Frame-skipping fixed timestep accumulator (eliminates slow motion on low FPS)
  private accumulator: number = 0;
  private static readonly FIXED_STEP: number = 1 / 60; // 60 Hz physics reference

  constructor(player: PlayerObject, limbs: ArticulatedLimbHandles, scene?: THREE.Scene) {
    this.player = player;
    this.limbs = limbs;
    this.initDizzyStars();
    this.initContactShadow(scene);
    this.currentY = this.floorY;
    this.player.position.set(this.currentX, this.currentY, this.currentZ);
    this.player.rotation.set(0, this.rotationY, this.rotationZ);
  }

  /**
   * Initializes hardware-accelerated Minecraft disc contact shadow beneath feet.
   */
  private initContactShadow(scene?: THREE.Scene): void {
    const targetScene = scene || (this.player.parent as THREE.Scene | null);
    if (!targetScene) return;
    this.sceneRef = targetScene;

    const geo = new THREE.PlaneGeometry(12.0, 6.5);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: createSoftShadowTexture(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = "characterContactShadow";
    mesh.position.set(this.currentX, this.floorY - CHAR_FEET_OFFSET + 0.08, this.currentZ);
    targetScene.add(mesh);

    this.shadowMesh = mesh;
    this.shadowMat = mat;
  }

  /**
   * Initializes 3 small gold rotating pixel stars attached above character head for unconscious state.
   */
  private initDizzyStars(): void {
    const skin = this.player.skin as any;
    if (!skin || !skin.head) return;

    const group = new THREE.Group();
    group.name = "dizzyStarsGroup";

    const starGeo = new THREE.BoxGeometry(0.75, 0.75, 0.75);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffea31 });

    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(starGeo, starMat);
      const angle = (i * 2 * Math.PI) / 3;
      star.position.set(Math.cos(angle) * 4.0, 5.2, Math.sin(angle) * 4.0);
      group.add(star);
    }

    group.visible = false;
    skin.head.add(group);
    this.dizzyStars = group;
  }

  /**
   * Sets current interactive UI platforms (e.g. dock container and buttons) and screen bounds.
   */
  public setPlatforms(
    platforms: WorldPlatform[],
    floorY: number,
    minX: number = -68,
    maxX: number = 68
  ): void {
    this.platforms = platforms;
    this.floorY = floorY;
    this.minX = minX;
    this.maxX = maxX;

    // DO NOT interrupt user dragging or rising animation!
    if (this.state === "dragged" || this.state === "rising") {
      return;
    }

    // Check if character is currently inside or spawned inside a ground-reaching obstacle (e.g. dock buttons)
    const groundObstacle = platforms.find((p) => p.isGroundReaching || p.id.includes("dock"));
    if (groundObstacle) {
      const leftBound = groundObstacle.minX - CHAR_HALF_WIDTH;
      const rightBound = groundObstacle.maxX + CHAR_HALF_WIDTH;

      // If character is inside or spawned inside the dock container
      if (
        this.currentX >= leftBound &&
        this.currentX <= rightBound &&
        this.currentY < groundObstacle.topY - 0.5
      ) {
        // Place character proudly standing ON TOP of the dock!
        this.currentX = (groundObstacle.minX + groundObstacle.maxX) / 2;
        this.currentY = groundObstacle.topY;
        this.currentPlatform = groundObstacle;
        this.state = "idle";
        this.player.position.set(this.currentX, this.currentY, this.currentZ);
        return;
      }
    }

    // If character is idle and standing, ensure he snaps to the surface beneath him
    if (this.state === "idle" || this.state === "walking") {
      const { surfaceY, platform } = this.findPlatformUnder(this.currentX, this.currentY);
      this.currentPlatform = platform;
      // If grounded surface changed (e.g. on resize), smoothly adapt
      if (Math.abs(this.currentY - surfaceY) < 3.0) {
        this.currentY = surfaceY;
      } else if (this.currentY > surfaceY + 2.0 && this.state !== "walking") {
        // In mid-air: fall down!
        this.state = "falling";
      }
    }

    this.resolveObstacleCollisions();
  }

  /**
   * Ensures the character is never inside any solid obstacle.
   * If penetrating, pushes character out to top surface or solid side.
   */
  public resolveObstacleCollisions(): void {
    if (this.state === "dragged" || this.state === "rising") return;
    for (const p of this.platforms) {
      if (p.isSolid === false) continue;

      const leftBound = p.minX - CHAR_HALF_WIDTH;
      const rightBound = p.maxX + CHAR_HALF_WIDTH;

      if (this.currentX > leftBound && this.currentX < rightBound) {
        const isVerticallyInObstacle = p.isGroundReaching
          ? this.currentY < p.topY - 0.5
          : this.currentY < p.topY - 0.5 && this.currentY + CHAR_HEAD_OFFSET > (p.bottomY ?? -999);

        if (isVerticallyInObstacle) {
          // If close to top, snap up to top surface
          if (this.currentY >= p.topY - 7.0) {
            this.currentY = p.topY;
            this.currentPlatform = p;
            this.velocityY = 0;
          } else {
            // Push horizontally to closest solid side
            const midX = (p.minX + p.maxX) / 2;
            if (this.currentX < midX) {
              this.currentX = leftBound;
            } else {
              this.currentX = rightBound;
            }
            this.velocityX = 0;
          }
        }
      }
    }
  }

  /**
   * Finds the highest solid platform or floor level beneath a given (x, y) point.
   */
  public findPlatformUnder(x: number, y: number): { surfaceY: number; platform: WorldPlatform | null } {
    let bestPlatform: WorldPlatform | null = null;
    let highestY = this.floorY;

    for (const p of this.platforms) {
      if (x >= p.minX - 1.2 && x <= p.maxX + 1.2) {
        // If the platform reaches the ground (like dock), there is no lower floor at this X!
        // The highest solid ground at this X is at least p.topY!
        if (p.isGroundReaching) {
          if (p.topY >= highestY) {
            highestY = p.topY;
            bestPlatform = p;
          }
        } else {
          // Platform is directly beneath character if character is above or near the platform top
          if (y >= p.topY - 2.5 && p.topY >= highestY) {
            highestY = p.topY;
            bestPlatform = p;
          }
        }
      }
    }

    return { surfaceY: highestY, platform: bestPlatform };
  }

  /**
   * Commands the character to begin dragging by mouse cursor.
   */
  public startDrag(worldX: number, worldY: number): void {
    this.isDragging = true;
    this.state = "dragged";
    this.isSurfaceDirty = true;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isPunched = false;
    this.hasHitWall = false;
    this.targetDragX = worldX;
    this.targetDragY = worldY;
    this.dragVelX = 0;
    this.dragVelY = 0;
    this.dragCycle = 0;
    this.currentPlatform = null;
    if (this.dizzyStars) this.dizzyStars.visible = false;
  }

  /**
   * Updates character target position following cursor during drag.
   */
  public updateDrag(worldX: number, worldY: number, _dt?: number): void {
    if (!this.isDragging) return;
    this.targetDragX = Math.max(this.minX - 6, Math.min(this.maxX + 6, worldX));
    this.targetDragY = Math.max(this.floorY - 24, Math.min(38, worldY));
  }

  /**
   * Releases character from dragging with physical momentum.
   */
  public endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    // If dragged underneath or into the bottom dock buttons, smoothly rise to the top of the button!
    const dock = this.platforms.find((p) => p.isGroundReaching || p.id.includes("dock"));
    if (dock) {
      if (this.currentY < dock.topY - 0.5) {
        this.startRising(dock);
        return;
      }
    }

    if (this.state === "dragged") {
      this.velocityX = THREE.MathUtils.clamp(this.dragVelX * 0.75, -45, 45);
      this.velocityY = THREE.MathUtils.clamp(this.dragVelY * 0.75, -40, 40);
      this.state = "falling";
      this.fallCycle = 0;
    }
  }

  /**
   * Starts a smooth elevation animation to the top surface of the dock buttons.
   */
  public startRising(platform: WorldPlatform): void {
    this.state = "rising";
    this.risingPlatform = platform;
    this.risingStartX = this.currentX;
    this.risingStartY = this.currentY;
    this.risingTargetX = THREE.MathUtils.clamp(
      this.currentX,
      platform.minX + 3.0,
      platform.maxX - 3.0
    );
    this.risingTargetY = platform.topY;
    this.risingTimer = 0;
    this.risingDuration = 0.55;
    this.velocityX = 0;
    this.velocityY = 0;
    this.currentPlatform = platform;
  }

  /**
   * Smoothly elevates character up to the top surface of the bottom buttons.
   */
  private updateRising(dt: number): void {
    this.risingTimer += dt;
    const progress = Math.min(1.0, this.risingTimer / this.risingDuration);

    // Smooth sinusoidal ease-in-out curve
    const ease = 0.5 * (1.0 - Math.cos(progress * Math.PI));
    this.currentX = THREE.MathUtils.lerp(this.risingStartX, this.risingTargetX, ease);
    this.currentY = THREE.MathUtils.lerp(this.risingStartY, this.risingTargetY, ease);

    // Face towards camera smoothly
    let diff = 0 - this.rotationY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.rotationY += diff * Math.min(1.0, dt * 6.0);
    this.rotationZ = THREE.MathUtils.lerp(this.rotationZ, 0, Math.min(1.0, dt * 8.0));

    const skin = this.player.skin as any;
    if (skin) {
      const blend = Math.min(1.0, dt * 10.0);
      const floatFactor = Math.sin(progress * Math.PI);
      const targetKnees = 0.04 + floatFactor * 0.16;
      const targetElbows = 0.14 + floatFactor * 0.18;

      skin.leftLeg.rotation.x = THREE.MathUtils.lerp(skin.leftLeg.rotation.x, 0.02 - floatFactor * 0.18, blend);
      skin.leftLeg.rotation.y = THREE.MathUtils.lerp(skin.leftLeg.rotation.y, 0.02, blend);
      skin.leftLeg.rotation.z = THREE.MathUtils.lerp(skin.leftLeg.rotation.z, 0.018, blend);

      skin.rightLeg.rotation.x = THREE.MathUtils.lerp(skin.rightLeg.rotation.x, -0.02 - floatFactor * 0.18, blend);
      skin.rightLeg.rotation.y = THREE.MathUtils.lerp(skin.rightLeg.rotation.y, -0.02, blend);
      skin.rightLeg.rotation.z = THREE.MathUtils.lerp(skin.rightLeg.rotation.z, -0.018, blend);
      this.limbs.setKnees(targetKnees, targetKnees);

      skin.leftArm.rotation.x = THREE.MathUtils.lerp(skin.leftArm.rotation.x, 0.08 + floatFactor * 0.18, blend);
      skin.leftArm.rotation.z = THREE.MathUtils.lerp(skin.leftArm.rotation.z, 0.12 + floatFactor * 0.12, blend);
      skin.rightArm.rotation.x = THREE.MathUtils.lerp(skin.rightArm.rotation.x, 0.08 + floatFactor * 0.18, blend);
      skin.rightArm.rotation.z = THREE.MathUtils.lerp(skin.rightArm.rotation.z, -0.12 - floatFactor * 0.12, blend);
      this.limbs.setElbows(targetElbows, targetElbows);

      skin.body.rotation.set(0, 0, 0);
      skin.head.rotation.x = THREE.MathUtils.lerp(skin.head.rotation.x, -0.06 * (1.0 - progress), blend);
      skin.head.rotation.y = THREE.MathUtils.lerp(skin.head.rotation.y, 0, blend);
      skin.head.rotation.z = THREE.MathUtils.lerp(skin.head.rotation.z, 0, blend);
    }

    if (progress >= 1.0) {
      this.currentX = this.risingTargetX;
      this.currentY = this.risingTargetY;
      this.currentPlatform = this.risingPlatform;
      this.state = "idle";
      this.stateTimer = 2.0 + Math.random() * 2.0;
      this.landingTimer = 0.25;
      this.landingDuration = 0.25;
      this.landingImpact = 0.35;
      this.limbs.resetBends();
    }
  }

  /**
   * Triggers a punch/hit reaction from a user click on the character.
   * Knocks the character back with high impulse.
   */
  public punch(fromWorldX: number, _fromWorldY: number): void {
    this.triggerDamageFlash();
    this.isSurfaceDirty = true;

    // Determine knockback direction based on where character was clicked
    const diffX = this.currentX - fromWorldX;
    let dirX = 0;
    if (Math.abs(diffX) > 0.4) {
      dirX = Math.sign(diffX);
    } else {
      dirX = Math.random() > 0.5 ? 1 : -1;
    }

    // Apply high knockback impulse
    this.velocityX = dirX * (38.0 + Math.random() * 12.0);
    this.velocityY = 24.0 + Math.random() * 8.0;
    this.targetRotationY = dirX > 0 ? -1.1 : 1.1;

    this.isPunched = true;
    this.hasHitWall = false;
    this.state = "falling";
    this.fallCycle = 0;
  }

  /**
   * Classic Minecraft damage tick: flashes the character mesh red for 0.2s.
   */
  public triggerDamageFlash(): void {
    this.flashTimer = 0.22;
    const skin = this.player.skin as any;
    if (skin) {
      if (skin.layer1Material) skin.layer1Material.color.setRGB(1.0, 0.32, 0.32);
      if (skin.layer1MaterialBiased) skin.layer1MaterialBiased.color.setRGB(1.0, 0.32, 0.32);
      if (skin.layer2Material) skin.layer2Material.color.setRGB(1.0, 0.32, 0.32);
      if (skin.layer2MaterialBiased) skin.layer2MaterialBiased.color.setRGB(1.0, 0.32, 0.32);
    }
  }

  /**
   * Command character to walk towards target X coordinate.
   */
  public walkTo(x: number): void {
    if (this.state === "dragged" || this.state === "unconscious" || this.state === "waking_up") {
      return;
    }
    this.targetX = Math.max(this.minX, Math.min(this.maxX, x));
    this.state = "walking";
    this.isSurfaceDirty = true;
    this.updateTargetRotation();
  }

  private updateTargetRotation(): void {
    const dx = this.targetX - this.currentX;
    this.targetRotationY = dx >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  private pickRandomTarget(): void {
    if (this.currentPlatform) {
      // Walk along the solid platform (e.g. top of buttons/dock)
      const p = this.currentPlatform;
      const margin = 2.0;
      const left = p.minX + margin;
      const right = p.maxX - margin;

      // 15% chance to step off platform and jump down to lower floor!
      if (Math.random() < 0.15) {
        const stepOffRight = Math.random() > 0.5;
        this.targetX = stepOffRight ? p.maxX + 4.0 : p.minX - 4.0;
      } else if (right > left) {
        this.targetX = left + Math.random() * (right - left);
      } else {
        this.targetX = (p.minX + p.maxX) / 2;
      }
    } else {
      // Roam across accessible floor area (respecting solid ground-reaching obstacles like dock)
      const groundObstacle = this.platforms.find((p) => p.isGroundReaching);
      if (groundObstacle) {
        const leftBound = groundObstacle.minX - CHAR_HALF_WIDTH - 1.0;
        const rightBound = groundObstacle.maxX + CHAR_HALF_WIDTH + 1.0;

        if (this.currentX <= leftBound) {
          // Roam on the floor to the left of the dock
          this.targetX = this.minX + Math.random() * Math.max(1, leftBound - this.minX);
        } else if (this.currentX >= rightBound) {
          // Roam on the floor to the right of the dock
          this.targetX = rightBound + Math.random() * Math.max(1, this.maxX - rightBound);
        } else {
          // If between bounds, move out to whichever side is closer
          const midX = (groundObstacle.minX + groundObstacle.maxX) / 2;
          this.targetX = this.currentX < midX ? this.minX : this.maxX;
        }
      } else {
        this.targetX = this.minX + Math.random() * (this.maxX - this.minX);
      }
    }
    this.state = "walking";
    this.isSurfaceDirty = true;
    this.updateTargetRotation();
  }

  /**
   * Main per-frame update loop called from the Three.js render loop.
   * Employs fixed timestep substepping with frame-skipping:
   * When FPS drops below 60, physics catches up in discrete steps instead of slowing down.
   */
  public update(delta: number): void {
    // Clamp delta to prevent huge spiral-of-death jumps when tab was unfocused or system had a massive hitch (max 0.25s)
    const clampedDelta = Math.min(Math.max(0, delta), 0.25);
    this.accumulator += clampedDelta;

    // Run fixed-step sub-ticks to catch up to real wall-clock time
    let steps = 0;
    while (this.accumulator >= RoamingCharacterController.FIXED_STEP && steps < 5) {
      this.stepSimulation(RoamingCharacterController.FIXED_STEP);
      this.accumulator -= RoamingCharacterController.FIXED_STEP;
      steps++;
    }

    // If accumulated time is still left over after 5 steps (severe lag spike),
    // drop the remaining time (frame skip) to prevent spiral of death
    if (this.accumulator > RoamingCharacterController.FIXED_STEP) {
      this.accumulator = 0;
    }

    // Apply root position, orientation and contact shadow once per rendered frame
    this.applyTransformations();
  }

  /**
   * Executes a single discrete physics simulation step.
   */
  private stepSimulation(dt: number): void {
    // Update damage flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        const skin = this.player.skin as any;
        if (skin) {
          if (skin.layer1Material) skin.layer1Material.color.setRGB(1.0, 1.0, 1.0);
          if (skin.layer1MaterialBiased) skin.layer1MaterialBiased.color.setRGB(1.0, 1.0, 1.0);
          if (skin.layer2Material) skin.layer2Material.color.setRGB(1.0, 1.0, 1.0);
          if (skin.layer2MaterialBiased) skin.layer2MaterialBiased.color.setRGB(1.0, 1.0, 1.0);
        }
      }
    }

    switch (this.state) {
      case "idle":
        this.updateIdle(dt);
        break;
      case "walking":
        this.updateWalking(dt);
        break;
      case "waving":
        this.updateWaving(dt);
        break;
      case "dragged":
        this.updateDragged(dt);
        break;
      case "falling":
        this.updateFalling(dt);
        break;
      case "unconscious":
        this.updateUnconscious(dt);
        break;
      case "waking_up":
        this.updateWakingUp(dt);
        break;
      case "rising":
        this.updateRising(dt);
        break;
    }
  }

  /**
   * Applies root transformation and hardware-accelerated contact shadow once per rendered frame.
   */
  private applyTransformations(): void {
    // Apply global root position and orientation
    this.player.position.x = this.currentX;
    this.player.position.y = this.currentY;
    this.player.position.z = this.currentZ;
    this.player.rotation.x = 0;
    this.player.rotation.y = this.rotationY;
    this.player.rotation.z = this.rotationZ;

    // Update hardware-accelerated contact shadow beneath character feet
    if (this.shadowMesh && this.shadowMat) {
      const surfaceY = this.isSurfaceDirty
        ? this.findPlatformUnder(this.currentX, this.currentY).surfaceY
        : this.cachedSurfaceY;
      const groundY = surfaceY - CHAR_FEET_OFFSET;
      const heightAboveGround = Math.max(0, this.currentY - surfaceY);
      this.shadowMesh.position.set(this.currentX, groundY + 0.08, this.currentZ);
      const scale = Math.max(0.35, 1.0 - heightAboveGround * 0.02);
      this.shadowMesh.scale.set(scale, 1, scale);
      this.shadowMat.opacity = Math.max(0, 0.55 - heightAboveGround * 0.018);
    }
  }

  private updateIdle(dt: number): void {
    this.stateTimer -= dt;
    this.walkCycle += dt * 2.0;

    // Verify support under feet using cached surface for 60fps performance
    if (this.isSurfaceDirty) {
      const res = this.findPlatformUnder(this.currentX, this.currentY);
      this.cachedSurfaceY = res.surfaceY;
      this.cachedPlatform = res.platform;
      this.isSurfaceDirty = false;
    }
    const surfaceY = this.cachedSurfaceY;
    this.currentPlatform = this.cachedPlatform;

    if (this.currentY > surfaceY + 1.5 && this.landingTimer <= 0) {
      this.state = "falling";
      this.isSurfaceDirty = true;
      return;
    }

    // Landing squash & cushion recovery
    let squashOffset = 0;
    let targetKnees = 0.04;
    let targetElbows = 0.14;
    let targetBodyX = 0;

    if (this.landingTimer > 0) {
      this.landingTimer -= dt;
      const progress = 1.0 - Math.max(0, this.landingTimer / this.landingDuration);
      // Smooth parabolic compression curve
      const squash = Math.sin(progress * Math.PI) * (0.35 * this.landingImpact);
      targetKnees = 0.04 + squash;
      squashOffset = -squash * 1.4;
      targetBodyX = squash * 0.22;
    }

    // Face towards camera naturally during idle
    let diff = 0 - this.rotationY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.rotationY += diff * Math.min(1.0, dt * 4.0);
    this.rotationZ = THREE.MathUtils.lerp(this.rotationZ, 0, Math.min(1.0, dt * 8.0));

    // Natural subtle breathing bob
    const breath = Math.sin(this.walkCycle) * 0.035;
    this.currentY = surfaceY + squashOffset + Math.sin(this.walkCycle) * 0.12;

    const skin = this.player.skin as any;
    if (skin) {
      const blend = Math.min(1.0, dt * 10.0);

      // Arms resting at sides with subtle breathing
      skin.leftArm.rotation.x = THREE.MathUtils.lerp(skin.leftArm.rotation.x, breath, blend);
      skin.leftArm.rotation.y = THREE.MathUtils.lerp(skin.leftArm.rotation.y, 0, blend);
      skin.leftArm.rotation.z = THREE.MathUtils.lerp(skin.leftArm.rotation.z, 0.08 + breath * 0.3, blend);

      skin.rightArm.rotation.x = THREE.MathUtils.lerp(skin.rightArm.rotation.x, -breath, blend);
      skin.rightArm.rotation.y = THREE.MathUtils.lerp(skin.rightArm.rotation.y, 0, blend);
      skin.rightArm.rotation.z = THREE.MathUtils.lerp(skin.rightArm.rotation.z, -0.08 - breath * 0.3, blend);

      this.currentLeftElbow = THREE.MathUtils.lerp(this.currentLeftElbow, targetElbows, blend);
      this.currentRightElbow = THREE.MathUtils.lerp(this.currentRightElbow, targetElbows, blend);
      this.limbs.setElbows(this.currentRightElbow, this.currentLeftElbow);

      // Legs standing in a subtle, natural stance (clean thin line between legs, no large gap)
      const legSway = Math.sin(this.walkCycle * 0.7) * 0.008;
      skin.leftLeg.rotation.x = THREE.MathUtils.lerp(skin.leftLeg.rotation.x, 0.02 + legSway, blend);
      skin.leftLeg.rotation.y = THREE.MathUtils.lerp(skin.leftLeg.rotation.y, 0.015, blend);
      skin.leftLeg.rotation.z = THREE.MathUtils.lerp(skin.leftLeg.rotation.z, 0.018, blend);

      skin.rightLeg.rotation.x = THREE.MathUtils.lerp(skin.rightLeg.rotation.x, -0.02 - legSway, blend);
      skin.rightLeg.rotation.y = THREE.MathUtils.lerp(skin.rightLeg.rotation.y, -0.015, blend);
      skin.rightLeg.rotation.z = THREE.MathUtils.lerp(skin.rightLeg.rotation.z, -0.018, blend);

      this.currentLeftKnee = THREE.MathUtils.lerp(this.currentLeftKnee, targetKnees, blend);
      this.currentRightKnee = THREE.MathUtils.lerp(this.currentRightKnee, targetKnees, blend);
      this.limbs.setKnees(this.currentRightKnee, this.currentLeftKnee);

      skin.body.rotation.set(0, 0, 0);

      skin.head.rotation.x = THREE.MathUtils.lerp(skin.head.rotation.x, 0, blend);
      skin.head.rotation.y = THREE.MathUtils.lerp(skin.head.rotation.y, 0, blend);
      skin.head.rotation.z = THREE.MathUtils.lerp(skin.head.rotation.z, 0, blend);

      if (this.player.cape) {
        const targetCapeX = Math.PI * 0.06 + Math.sin(this.walkCycle) * 0.03;
        this.player.cape.rotation.x = THREE.MathUtils.lerp(this.player.cape.rotation.x, targetCapeX, blend);
      }
    }

    if (this.stateTimer <= 0) {
      // If character is on the floor beside the dock, 28% chance to jump back onto the dock platform!
      const groundObstacle = this.platforms.find((p) => p.isGroundReaching);
      if (!this.currentPlatform && groundObstacle) {
        const distToLeft = Math.abs(this.currentX - (groundObstacle.minX - CHAR_HALF_WIDTH));
        const distToRight = Math.abs(this.currentX - (groundObstacle.maxX + CHAR_HALF_WIDTH));
        if ((distToLeft < 14.0 || distToRight < 14.0) && Math.random() < 0.28) {
          const isLeft = this.currentX < (groundObstacle.minX + groundObstacle.maxX) / 2;
          this.state = "falling";
          this.velocityY = 46.0;
          this.velocityX = (isLeft ? 1 : -1) * 16.0;
          this.rotationY = isLeft ? Math.PI / 2 : -Math.PI / 2;
          return;
        }
      }

      const roll = Math.random();
      if (roll < 0.18) {
        this.state = "waving";
        this.waveCycle = 0;
        this.stateTimer = 2.2;
      } else {
        this.pickRandomTarget();
        this.stateTimer = 3.0 + Math.random() * 4.0;
      }
    }
  }

  private updateWalking(dt: number): void {
    // Check if character walked off a platform edge
    if (this.currentPlatform) {
      if (this.currentX < this.currentPlatform.minX - 0.5 || this.currentX > this.currentPlatform.maxX + 0.5) {
        // Stepped off the button platform into empty air: FALL!
        this.currentPlatform = null;
        this.state = "falling";
        this.velocityY = -2.0;
        this.velocityX = (this.rotationY > 0 ? 1 : -1) * 6.0;
        return;
      }
    }

    const { surfaceY, platform } = this.findPlatformUnder(this.currentX, this.currentY);
    this.currentPlatform = platform;
    if (this.currentY > surfaceY + 1.5) {
      this.state = "falling";
      return;
    }

    const dx = this.targetX - this.currentX;
    if (Math.abs(dx) < 0.8) {
      this.state = "idle";
      this.stateTimer = 2.0 + Math.random() * 3.5;
      this.limbs.resetBends();
      return;
    }

    // Face movement direction
    this.updateTargetRotation();
    let diffRot = this.targetRotationY - this.rotationY;
    while (diffRot < -Math.PI) diffRot += Math.PI * 2;
    while (diffRot > Math.PI) diffRot -= Math.PI * 2;
    this.rotationY += diffRot * Math.min(1.0, dt * 8.0);

    // Step forward
    const speed = 14.0;
    const step = (dx > 0 ? 1 : -1) * speed * dt;
    let nextX = this.currentX + step;
    let hitObstacle = false;

    // Solid obstacle side collisions: buttons are solid on both sides!
    for (const p of this.platforms) {
      if (p.isSolid === false) continue;

      const isVerticallyInObstacle = p.isGroundReaching
        ? this.currentY < p.topY - 0.5
        : this.currentY < p.topY - 0.5 && this.currentY + CHAR_HEAD_OFFSET > (p.bottomY ?? -999);

      if (isVerticallyInObstacle) {
        const leftBound = p.minX - CHAR_HALF_WIDTH;
        const rightBound = p.maxX + CHAR_HALF_WIDTH;

        // Walking right into left side of button
        if (step > 0 && this.currentX <= leftBound + 0.1 && nextX > leftBound) {
          nextX = leftBound;
          hitObstacle = true;
        }
        // Walking left into right side of button
        else if (step < 0 && this.currentX >= rightBound - 0.1 && nextX < rightBound) {
          nextX = rightBound;
          hitObstacle = true;
        }
      }
    }

    this.currentX = THREE.MathUtils.clamp(nextX, this.minX, this.maxX);

    if (hitObstacle) {
      this.state = "idle";
      this.stateTimer = 1.5 + Math.random() * 2.0;
      this.limbs.resetBends();
      return;
    }

    // Gait animation
    this.walkCycle += dt * 8.0;
    const legSwing = Math.sin(this.walkCycle) * 0.62;
    const armSwing = -legSwing * 0.75;

    const skin = this.player.skin as any;
    if (skin) {
      skin.leftLeg.rotation.x = legSwing;
      skin.rightLeg.rotation.x = -legSwing;

      const leftKneeBend = legSwing < 0 ? Math.abs(legSwing) * 1.05 : 0.03;
      const rightKneeBend = legSwing > 0 ? Math.abs(legSwing) * 1.05 : 0.03;
      this.limbs.setKnees(rightKneeBend, leftKneeBend);

      skin.leftArm.rotation.x = armSwing;
      skin.leftArm.rotation.z = 0.08;
      skin.rightArm.rotation.x = -armSwing;
      skin.rightArm.rotation.z = -0.08;

      const leftElbowBend = armSwing > 0 ? armSwing * 0.75 + 0.15 : 0.12;
      const rightElbowBend = -armSwing > 0 ? -armSwing * 0.75 + 0.15 : 0.12;
      this.limbs.setElbows(rightElbowBend, leftElbowBend);

      this.currentY = surfaceY + Math.abs(Math.sin(this.walkCycle)) * 0.4;
      this.rotationZ = THREE.MathUtils.lerp(this.rotationZ, 0, Math.min(1.0, dt * 10.0));
      skin.body.rotation.set(0, 0, 0);
      skin.head.rotation.x = 0.04;
      skin.head.rotation.y = 0;
      skin.head.rotation.z = 0;

      if (this.player.cape) {
        this.player.cape.rotation.x = Math.PI * 0.14 + Math.sin(this.walkCycle * 2) * 0.05;
      }
    }
  }

  private updateWaving(dt: number): void {
    const { surfaceY } = this.findPlatformUnder(this.currentX, this.currentY);
    this.currentY = surfaceY;
    this.waveCycle += dt * 6.5;
    this.stateTimer -= dt;
    this.rotationZ = THREE.MathUtils.lerp(this.rotationZ, 0, Math.min(1.0, dt * 10.0));

    const skin = this.player.skin as any;
    if (skin) {
      skin.body.rotation.set(0, 0, 0);
      skin.rightArm.rotation.x += (-1.9 - skin.rightArm.rotation.x) * 0.15;
      skin.rightArm.rotation.z += (-0.35 - skin.rightArm.rotation.z) * 0.15;
      skin.rightArm.rotation.y += (0 - skin.rightArm.rotation.y) * 0.15;

      this.limbs.rightElbowBone.rotation.x = -0.55;
      this.limbs.rightElbowBone.rotation.z = Math.sin(this.waveCycle) * 0.38;

      skin.leftArm.rotation.x += (0.05 - skin.leftArm.rotation.x) * 0.15;
      skin.leftArm.rotation.z += (0.08 - skin.leftArm.rotation.z) * 0.15;
      this.limbs.leftElbowBone.rotation.set(-0.12, 0, 0);

      skin.leftLeg.rotation.x += (0.02 - skin.leftLeg.rotation.x) * 0.18;
      skin.leftLeg.rotation.y += (0.015 - skin.leftLeg.rotation.y) * 0.18;
      skin.leftLeg.rotation.z += (0.018 - skin.leftLeg.rotation.z) * 0.18;

      skin.rightLeg.rotation.x += (-0.02 - skin.rightLeg.rotation.x) * 0.18;
      skin.rightLeg.rotation.y += (-0.015 - skin.rightLeg.rotation.y) * 0.18;
      skin.rightLeg.rotation.z += (-0.018 - skin.rightLeg.rotation.z) * 0.18;
      this.limbs.setKnees(0.02, 0.02);

      skin.head.rotation.x += (-0.05 - skin.head.rotation.x) * 0.12;
      skin.head.rotation.y += (0.12 - skin.head.rotation.y) * 0.12;

      if (this.player.cape) {
        this.player.cape.rotation.x = Math.PI * 0.06;
      }
    }

    if (this.stateTimer <= 0) {
      this.state = "idle";
      this.stateTimer = 2.5 + Math.random() * 3.0;
      this.limbs.resetBends();
    }
  }

  /**
   * Drag animation: dangling & dynamic inertia while held by cursor.
   */
  private updateDragged(dt: number): void {
    this.dragCycle += dt * 4.5;

    // Smoothly follow the mouse target with exponential dampening (no mouse polling jitter!)
    const followFactor = Math.min(1.0, dt * 22.0);
    const newX = this.currentX + (this.targetDragX - this.currentX) * followFactor;
    const newY = this.currentY + (this.targetDragY - this.currentY) * followFactor;

    // Stable velocity calculation from actual movement
    const instantVx = (newX - this.currentX) / Math.max(dt, 0.001);
    const instantVy = (newY - this.currentY) / Math.max(dt, 0.001);
    this.currentX = newX;
    this.currentY = newY;

    // Smooth drag velocity with exponential decay
    const velFilter = Math.min(1.0, dt * 10.0);
    this.dragVelX = THREE.MathUtils.lerp(this.dragVelX, instantVx, velFilter);
    this.dragVelY = THREE.MathUtils.lerp(this.dragVelY, instantVy, velFilter);

    const clampedVx = THREE.MathUtils.clamp(this.dragVelX, -30, 30);
    const clampedVy = THREE.MathUtils.clamp(this.dragVelY, -30, 30);

    // Tilt the entire character rig smoothly into horizontal motion (rigid cohesive body)
    const blend = Math.min(1.0, dt * 14.0);
    const targetTiltZ = THREE.MathUtils.clamp(-clampedVx * 0.008, -0.22, 0.22);
    this.rotationZ = THREE.MathUtils.lerp(this.rotationZ, targetTiltZ, blend);

    const skin = this.player.skin as any;
    if (skin) {
      // Natural organic sway while held
      const armSway = Math.sin(this.dragCycle) * 0.1;
      const legSway = Math.cos(this.dragCycle * 0.8) * 0.08;

      // Target poses: arms dangle with outward splay
      const targetLeftArmX = -clampedVy * 0.012 + armSway;
      const targetRightArmX = -clampedVy * 0.012 - armSway;
      const targetLeftArmZ = 0.22 + Math.abs(clampedVx) * 0.005;
      const targetRightArmZ = -0.22 - Math.abs(clampedVx) * 0.005;

      // Legs dangle down naturally
      const targetLeftLegX = -clampedVy * 0.01 + legSway;
      const targetRightLegX = -clampedVy * 0.01 - legSway;
      const targetLeftLegZ = 0.05;
      const targetRightLegZ = -0.05;

      const targetElbows = 0.2 + Math.abs(clampedVy) * 0.004;
      const targetKnees = 0.16 + Math.abs(clampedVy) * 0.004;

      const targetHeadX = THREE.MathUtils.clamp(-0.1 - clampedVy * 0.006, -0.25, 0.2);

      skin.leftArm.rotation.x = THREE.MathUtils.lerp(skin.leftArm.rotation.x, targetLeftArmX, blend);
      skin.leftArm.rotation.y = THREE.MathUtils.lerp(skin.leftArm.rotation.y, 0, blend);
      skin.leftArm.rotation.z = THREE.MathUtils.lerp(skin.leftArm.rotation.z, targetLeftArmZ, blend);

      skin.rightArm.rotation.x = THREE.MathUtils.lerp(skin.rightArm.rotation.x, targetRightArmX, blend);
      skin.rightArm.rotation.y = THREE.MathUtils.lerp(skin.rightArm.rotation.y, 0, blend);
      skin.rightArm.rotation.z = THREE.MathUtils.lerp(skin.rightArm.rotation.z, targetRightArmZ, blend);

      skin.leftLeg.rotation.x = THREE.MathUtils.lerp(skin.leftLeg.rotation.x, targetLeftLegX, blend);
      skin.leftLeg.rotation.y = THREE.MathUtils.lerp(skin.leftLeg.rotation.y, 0, blend);
      skin.leftLeg.rotation.z = THREE.MathUtils.lerp(skin.leftLeg.rotation.z, targetLeftLegZ, blend);

      skin.rightLeg.rotation.x = THREE.MathUtils.lerp(skin.rightLeg.rotation.x, targetRightLegX, blend);
      skin.rightLeg.rotation.y = THREE.MathUtils.lerp(skin.rightLeg.rotation.y, 0, blend);
      skin.rightLeg.rotation.z = THREE.MathUtils.lerp(skin.rightLeg.rotation.z, targetRightLegZ, blend);

      this.currentLeftElbow = THREE.MathUtils.lerp(this.currentLeftElbow, targetElbows, blend);
      this.currentRightElbow = THREE.MathUtils.lerp(this.currentRightElbow, targetElbows, blend);
      this.limbs.setElbows(this.currentRightElbow, this.currentLeftElbow);

      this.currentLeftKnee = THREE.MathUtils.lerp(this.currentLeftKnee, targetKnees, blend);
      this.currentRightKnee = THREE.MathUtils.lerp(this.currentRightKnee, targetKnees, blend);
      this.limbs.setKnees(this.currentRightKnee, this.currentLeftKnee);

      // Torso MUST stay firmly anchored at (0, 0, 0) relative to skin so it NEVER shears or breaks away from head, arms, and legs!
      skin.body.rotation.set(0, 0, 0);

      // Head stays aligned with torso on Y and Z, reacts slightly on X
      skin.head.rotation.x = THREE.MathUtils.lerp(skin.head.rotation.x, targetHeadX, blend);
      skin.head.rotation.y = THREE.MathUtils.lerp(skin.head.rotation.y, 0, blend);
      skin.head.rotation.z = THREE.MathUtils.lerp(skin.head.rotation.z, 0, blend);

      // Face towards camera smoothly
      let diffRot = 0 - this.rotationY;
      while (diffRot < -Math.PI) diffRot += Math.PI * 2;
      while (diffRot > Math.PI) diffRot -= Math.PI * 2;
      this.rotationY += diffRot * Math.min(1.0, dt * 10.0);

      if (this.player.cape) {
        const targetCapeX = Math.PI * 0.14 - clampedVy * 0.015;
        this.player.cape.rotation.x = THREE.MathUtils.lerp(this.player.cape.rotation.x, targetCapeX, blend);
      }
    }
  }

  /**
   * Falling animation & physical flight loop with wall impacts.
   */
  private updateFalling(dt: number): void {
    this.fallCycle += dt * 3.5;

    // Apply gravity
    this.velocityY -= this.gravity * dt;
    this.currentY += this.velocityY * dt;

    const prevX = this.currentX;
    this.currentX += this.velocityX * dt;

    // Air drag on horizontal velocity
    this.velocityX *= Math.pow(0.94, dt * 60);

    // Side wall collisions
    if (this.currentX <= this.minX) {
      this.currentX = this.minX;
      if (this.isPunched || Math.abs(this.velocityX) > 13.0) {
        // Slammed into left wall!
        this.triggerDamageFlash();
        this.hasHitWall = true;
        this.velocityX = 7.0; // rebound slightly
      } else {
        this.velocityX = 0;
      }
    } else if (this.currentX >= this.maxX) {
      this.currentX = this.maxX;
      if (this.isPunched || Math.abs(this.velocityX) > 13.0) {
        // Slammed into right wall!
        this.triggerDamageFlash();
        this.hasHitWall = true;
        this.velocityX = -7.0; // rebound slightly
      } else {
        this.velocityX = 0;
      }
    }

    // Solid obstacle side collisions while in the air (bouncing off button sides)
    for (const p of this.platforms) {
      if (p.isSolid === false) continue;
      const isVerticallyInObstacle = p.isGroundReaching
        ? this.currentY < p.topY - 0.5
        : this.currentY < p.topY - 0.5 && this.currentY + CHAR_HEAD_OFFSET > (p.bottomY ?? -999);

      if (isVerticallyInObstacle) {
        const leftBound = p.minX - CHAR_HALF_WIDTH;
        const rightBound = p.maxX + CHAR_HALF_WIDTH;

        if (prevX <= leftBound + 0.2 && this.currentX > leftBound) {
          this.currentX = leftBound;
          if (Math.abs(this.velocityX) > 10.0) {
            this.triggerDamageFlash();
            this.hasHitWall = true;
          }
          this.velocityX = -Math.abs(this.velocityX) * 0.35;
        } else if (prevX >= rightBound - 0.2 && this.currentX < rightBound) {
          this.currentX = rightBound;
          if (Math.abs(this.velocityX) > 10.0) {
            this.triggerDamageFlash();
            this.hasHitWall = true;
          }
          this.velocityX = Math.abs(this.velocityX) * 0.35;
        }
      }
    }

    // Ceiling boundary
    if (this.currentY > 38) {
      this.currentY = 38;
      this.velocityY = -Math.abs(this.velocityY) * 0.4;
    }

    // Platform & Floor Landing check
    const { surfaceY, platform } = this.findPlatformUnder(this.currentX, this.currentY);
    if (this.currentY <= surfaceY) {
      // Touchdown!
      const impactSpeed = Math.abs(this.velocityY);
      this.currentY = surfaceY;
      this.velocityY = 0;
      this.velocityX = 0;
      this.currentPlatform = platform;
      const hitWall = this.hasHitWall;
      this.hasHitWall = false;
      this.isPunched = false;

      if (hitWall) {
        // SLAMMED INTO WALL -> SITS DOWN, LOSES CONSCIOUSNESS FOR 3 SECONDS!
        this.state = "unconscious";
        this.unconsciousTimer = 3.0;
        this.limbs.resetBends();
      } else {
        // Normal cushioned landing
        this.state = "idle";
        this.landingTimer = 0.35;
        this.landingDuration = 0.35;
        this.landingImpact = THREE.MathUtils.clamp(impactSpeed / 35.0, 0.25, 1.0);
        this.stateTimer = 1.8 + Math.random() * 2.0;
      }
      return;
    }

    // Aerodynamic falling pose (fluid, cohesive, continuous)
    const skin = this.player.skin as any;
    if (skin) {
      const downwardSpeed = Math.max(0, -this.velocityY);
      const speedNorm = THREE.MathUtils.clamp(downwardSpeed / 45.0, 0, 1.0);

      // Subtle organic air currents
      const windSway = Math.sin(this.fallCycle) * 0.1;
      const legFlutter = Math.sin(this.fallCycle * 1.1) * 0.12 * (0.4 + speedNorm * 0.6);

      // Arms raise smoothly with falling wind resistance
      const targetLeftArmX = -0.6 - speedNorm * 1.3 + windSway;
      const targetRightArmX = -0.6 - speedNorm * 1.3 - windSway;
      const targetLeftArmZ = 0.3 + speedNorm * 0.22;
      const targetRightArmZ = -0.3 - speedNorm * 0.22;

      // Forearms bend naturally in air stream
      const targetElbows = 0.2 + speedNorm * 0.32;

      // Legs trail behind in the slipstream
      const targetLeftLegX = speedNorm * 0.2 + legFlutter;
      const targetRightLegX = speedNorm * 0.2 - legFlutter;
      const targetLeftLegZ = 0.08;
      const targetRightLegZ = -0.08;
      const targetKnees = 0.16 + speedNorm * 0.22;

      // Rig tilts smoothly into motion vector as a unified entity
      const blend = Math.min(1.0, dt * 10.0);
      const targetTiltZ = THREE.MathUtils.clamp(-this.velocityX * 0.006, -0.2, 0.2);
      this.rotationZ = THREE.MathUtils.lerp(this.rotationZ, targetTiltZ, blend);

      // Head looks downward towards landing surface
      const targetHeadX = THREE.MathUtils.clamp(0.12 + speedNorm * 0.25, 0.05, 0.35);

      skin.leftArm.rotation.x = THREE.MathUtils.lerp(skin.leftArm.rotation.x, targetLeftArmX, blend);
      skin.leftArm.rotation.y = THREE.MathUtils.lerp(skin.leftArm.rotation.y, 0, blend);
      skin.leftArm.rotation.z = THREE.MathUtils.lerp(skin.leftArm.rotation.z, targetLeftArmZ, blend);

      skin.rightArm.rotation.x = THREE.MathUtils.lerp(skin.rightArm.rotation.x, targetRightArmX, blend);
      skin.rightArm.rotation.y = THREE.MathUtils.lerp(skin.rightArm.rotation.y, 0, blend);
      skin.rightArm.rotation.z = THREE.MathUtils.lerp(skin.rightArm.rotation.z, targetRightArmZ, blend);

      skin.leftLeg.rotation.x = THREE.MathUtils.lerp(skin.leftLeg.rotation.x, targetLeftLegX, blend);
      skin.leftLeg.rotation.y = THREE.MathUtils.lerp(skin.leftLeg.rotation.y, 0, blend);
      skin.leftLeg.rotation.z = THREE.MathUtils.lerp(skin.leftLeg.rotation.z, targetLeftLegZ, blend);

      skin.rightLeg.rotation.x = THREE.MathUtils.lerp(skin.rightLeg.rotation.x, targetRightLegX, blend);
      skin.rightLeg.rotation.y = THREE.MathUtils.lerp(skin.rightLeg.rotation.y, 0, blend);
      skin.rightLeg.rotation.z = THREE.MathUtils.lerp(skin.rightLeg.rotation.z, targetRightLegZ, blend);

      this.currentLeftElbow = THREE.MathUtils.lerp(this.currentLeftElbow, targetElbows, blend);
      this.currentRightElbow = THREE.MathUtils.lerp(this.currentRightElbow, targetElbows, blend);
      this.limbs.setElbows(this.currentRightElbow, this.currentLeftElbow);

      this.currentLeftKnee = THREE.MathUtils.lerp(this.currentLeftKnee, targetKnees, blend);
      this.currentRightKnee = THREE.MathUtils.lerp(this.currentRightKnee, targetKnees, blend);
      this.limbs.setKnees(this.currentRightKnee, this.currentLeftKnee);

      // Torso stays firmly anchored with rig so it never separates
      skin.body.rotation.set(0, 0, 0);

      skin.head.rotation.x = THREE.MathUtils.lerp(skin.head.rotation.x, targetHeadX, blend);
      skin.head.rotation.y = THREE.MathUtils.lerp(skin.head.rotation.y, 0, blend);
      skin.head.rotation.z = THREE.MathUtils.lerp(skin.head.rotation.z, 0, blend);

      if (this.player.cape) {
        const targetCapeX = THREE.MathUtils.clamp(-Math.PI * 0.35 - speedNorm * 0.3, -Math.PI * 0.55, -0.2);
        this.player.cape.rotation.x = THREE.MathUtils.lerp(this.player.cape.rotation.x, targetCapeX, blend);
      }
    }
  }

  /**
   * Unconscious state: character sits down on the ground/platform with legs forward,
   * head slumped down, and dizzy stars spinning above for 3 seconds.
   */
  private updateUnconscious(dt: number): void {
    this.unconsciousTimer -= dt;
    this.rotationZ = 0;

    // Keep ground height adjusted for sitting posture (-10.5 units lower)
    const checkY = this.currentPlatform ? this.currentPlatform.topY : this.currentY + 11;
    const { surfaceY, platform } = this.findPlatformUnder(this.currentX, checkY);
    this.currentPlatform = platform;
    this.currentY = surfaceY - 10.5;

    // Rotate dizzy stars above head
    if (this.dizzyStars) {
      this.dizzyStars.visible = true;
      this.dizzyStars.rotation.y += dt * 4.5;
    }

    const skin = this.player.skin as any;
    if (skin) {
      // Turn to face user/camera so sitting knockout posture is clearly visible
      let diffRot = 0 - this.rotationY;
      while (diffRot < -Math.PI) diffRot += Math.PI * 2;
      while (diffRot > Math.PI) diffRot -= Math.PI * 2;
      this.rotationY += diffRot * Math.min(1.0, dt * 6.0);

      // Sitting legs: bent 90 degrees forward from hips
      skin.leftLeg.rotation.x = -Math.PI / 2;
      skin.rightLeg.rotation.x = -Math.PI / 2;
      skin.leftLeg.rotation.z = 0.08;
      skin.rightLeg.rotation.z = -0.08;
      this.limbs.setKnees(0.2, 0.2);

      // Torso slumped forward
      skin.body.rotation.x = 0.25;
      skin.body.rotation.y = 0;
      skin.body.rotation.z = 0;

      // Head hanging forward unconscious on chest
      skin.head.rotation.x = 0.65;
      skin.head.rotation.y = 0.05;
      skin.head.rotation.z = 0.12;

      // Arms resting limp beside thighs
      skin.leftArm.rotation.x = -0.35;
      skin.rightArm.rotation.x = -0.35;
      skin.leftArm.rotation.z = 0.18;
      skin.rightArm.rotation.z = -0.18;
      this.limbs.setElbows(0.3, 0.3);

      if (this.player.cape) {
        this.player.cape.rotation.x = Math.PI * 0.05;
      }
    }

    if (this.unconsciousTimer <= 0) {
      // Wake up after 3 seconds!
      this.state = "waking_up";
      this.wakeTimer = 0.8;
      if (this.dizzyStars) this.dizzyStars.visible = false;
    }
  }

  /**
   * Waking up transition: smoothly stands up from sitting and resumes idle.
   */
  private updateWakingUp(dt: number): void {
    this.wakeTimer -= dt;
    this.rotationZ = 0;
    const progress = Math.max(0, Math.min(1, 1.0 - this.wakeTimer / 0.8));

    const checkY = this.currentPlatform ? this.currentPlatform.topY : this.currentY + 11;
    const { surfaceY, platform } = this.findPlatformUnder(this.currentX, checkY);
    this.currentPlatform = platform;
    // Smoothly rise from sitting (-10.5) to standing (0)
    this.currentY = surfaceY - 10.5 * (1.0 - progress);

    const skin = this.player.skin as any;
    if (skin) {
      // Legs straighten up
      const sittingAngle = -Math.PI / 2;
      skin.leftLeg.rotation.x = sittingAngle * (1.0 - progress);
      skin.rightLeg.rotation.x = sittingAngle * (1.0 - progress);
      skin.leftLeg.rotation.z = 0.08 * (1.0 - progress);
      skin.rightLeg.rotation.z = -0.08 * (1.0 - progress);
      this.limbs.setKnees(0.2 * (1.0 - progress), 0.2 * (1.0 - progress));

      // Torso straightens
      skin.body.rotation.x = 0.25 * (1.0 - progress);

      // Head lifts up and shakes off daze
      const dazeShake = Math.sin(progress * Math.PI * 4) * 0.15 * (1.0 - progress);
      skin.head.rotation.x = 0.65 * (1.0 - progress);
      skin.head.rotation.y = dazeShake;
      skin.head.rotation.z = 0.12 * (1.0 - progress);

      // Hand rubs head briefly
      if (progress < 0.6) {
        skin.rightArm.rotation.x = -1.5;
        this.limbs.rightElbowBone.rotation.x = -0.8;
      } else {
        skin.rightArm.rotation.x = -1.5 * (1.0 - (progress - 0.6) / 0.4);
        this.limbs.rightElbowBone.rotation.x = -0.8 * (1.0 - (progress - 0.6) / 0.4);
      }

      skin.leftArm.rotation.x = -0.35 * (1.0 - progress);
    }

    if (this.wakeTimer <= 0) {
      this.currentY = surfaceY;
      this.state = "idle";
      this.stateTimer = 2.0;
      this.limbs.resetBends();
    }
  }

  /**
   * Cleans up Three.js objects and materials created by the controller.
   */
  public dispose(): void {
    if (this.shadowMesh && this.sceneRef) {
      this.sceneRef.remove(this.shadowMesh);
      this.shadowMesh.geometry.dispose();
      if (this.shadowMat) {
        if (this.shadowMat.map) this.shadowMat.map.dispose();
        this.shadowMat.dispose();
      }
      this.shadowMesh = null;
      this.shadowMat = null;
    }
    if (this.dizzyStars) {
      this.dizzyStars.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.dizzyStars.parent?.remove(this.dizzyStars);
      this.dizzyStars = null;
    }
  }
}
