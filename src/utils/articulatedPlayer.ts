import * as THREE from "three";
import type { PlayerObject } from "skinview3d";

export interface ArticulatedLimbHandles {
  rightElbowBone: THREE.Bone;
  leftElbowBone: THREE.Bone;
  rightKneeBone: THREE.Bone;
  leftKneeBone: THREE.Bone;
  setElbows(rightBendRad: number, leftBendRad: number): void;
  setKnees(rightBendRad: number, leftBendRad: number): void;
  resetBends(): void;
}

/**
 * Sets proper Minecraft 64x64 skin UV coordinates onto a 2-segment height BoxGeometry (32 vertices).
 * This ensures the skin texture flows seamlessly across the elbow/knee joint without seams or gaps.
 */
function setSkinnedLimbUVs(
  geo: THREE.BoxGeometry,
  u: number,
  v: number,
  w: number,
  h: number,
  d: number,
  tw: number = 64,
  th: number = 64
): void {
  const halfH = h / 2;

  const topU1 = u + d, topV1 = v, topU2 = u + w + d, topV2 = v + d;
  const botU1 = u + w + d, botV1 = v, botU2 = u + w * 2 + d, botV2 = v + d;

  const rightU1 = u + w + d, rightU2 = u + w + d * 2;
  const leftU1 = u, leftU2 = u + d;
  const frontU1 = u + d, frontU2 = u + w + d;
  const backU1 = u + w + d * 2, backU2 = u + w * 2 + d * 2;

  const sideVTop = v + d;
  const sideVMid = v + d + halfH;
  const sideVBot = v + d + h;

  const toUV = (ux: number, vy: number): [number, number] => [ux / tw, 1.0 - vy / th];

  const uvArray = new Float32Array(32 * 2);

  function setV(idx: number, ux: number, vy: number) {
    const [uVal, vVal] = toUV(ux, vy);
    uvArray[idx * 2] = uVal;
    uvArray[idx * 2 + 1] = vVal;
  }

  // Face 0: Right (+X): vertices 0..5
  setV(0, rightU1, sideVTop);
  setV(1, rightU2, sideVTop);
  setV(2, rightU1, sideVMid);
  setV(3, rightU2, sideVMid);
  setV(4, rightU1, sideVBot);
  setV(5, rightU2, sideVBot);

  // Face 1: Left (-X): vertices 6..11
  setV(6, leftU1, sideVTop);
  setV(7, leftU2, sideVTop);
  setV(8, leftU1, sideVMid);
  setV(9, leftU2, sideVMid);
  setV(10, leftU1, sideVBot);
  setV(11, leftU2, sideVBot);

  // Face 2: Top (+Y): vertices 12..15
  setV(12, topU1, topV1);
  setV(13, topU2, topV1);
  setV(14, topU1, topV2);
  setV(15, topU2, topV2);

  // Face 3: Bottom (-Y): vertices 16..19
  setV(16, botU1, botV2);
  setV(17, botU2, botV2);
  setV(18, botU1, botV1);
  setV(19, botU2, botV1);

  // Face 4: Front (+Z): vertices 20..25
  setV(20, frontU1, sideVTop);
  setV(21, frontU2, sideVTop);
  setV(22, frontU1, sideVMid);
  setV(23, frontU2, sideVMid);
  setV(24, frontU1, sideVBot);
  setV(25, frontU2, sideVBot);

  // Face 5: Back (-Z): vertices 26..31
  setV(26, backU1, sideVTop);
  setV(27, backU2, sideVTop);
  setV(28, backU1, sideVMid);
  setV(29, backU2, sideVMid);
  setV(30, backU1, sideVBot);
  setV(31, backU2, sideVBot);

  geo.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
}

/**
 * Creates a seamless (слитная) continuous SkinnedMesh limb.
 * When the joint bends, the limb bends as ONE unified continuous mesh without opening holes or separating into disconnected boxes.
 */
function createSkinnedLimb(
  w: number,
  h: number,
  d: number,
  wOverlay: number,
  hOverlay: number,
  dOverlay: number,
  jointY: number,
  u: number,
  v: number,
  u2: number,
  v2: number,
  mat1: THREE.Material,
  mat2: THREE.Material,
  namePrefix: string,
  isArm: boolean
): { group: THREE.Group; rootBone: THREE.Bone; jointBone: THREE.Bone } {
  // Center translation so shoulder/hip pivot is at local (0, 0, 0)
  const yOffset = isArm ? -4 : -6;

  // 1. Base Mesh (Layer 1)
  const geo1 = new THREE.BoxGeometry(w, h, d, 1, 2, 1);
  geo1.translate(0, yOffset, 0);
  setSkinnedLimbUVs(geo1, u, v, w, h, d);

  // 2. Overlay Mesh (Layer 2)
  const geo2 = new THREE.BoxGeometry(wOverlay, hOverlay, dOverlay, 1, 2, 1);
  geo2.translate(0, yOffset, 0);
  setSkinnedLimbUVs(geo2, u2, v2, w, h, d);

  // 3. Assign bone skinning weights (upper half -> bone 0, lower half -> bone 1, joint -> 50/50 blend)
  const setupWeights = (geo: THREE.BoxGeometry) => {
    const pos = geo.attributes.position;
    const indices: number[] = [];
    const weights: number[] = [];

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > yOffset + 0.5) {
        // Upper arm / thigh
        indices.push(0, 0, 0, 0);
        weights.push(1, 0, 0, 0);
      } else if (y < yOffset - 0.5) {
        // Lower forearm / calf
        indices.push(1, 0, 0, 0);
        weights.push(1, 0, 0, 0);
      } else {
        // Smooth seamless elbow/knee joint
        indices.push(0, 1, 0, 0);
        weights.push(0.5, 0.5, 0, 0);
      }
    }

    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(indices, 4));
    geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
  };

  setupWeights(geo1);
  setupWeights(geo2);

  // 4. Create bone hierarchy
  const rootBone = new THREE.Bone();
  rootBone.name = `${namePrefix}_rootBone`;
  rootBone.position.set(0, 0, 0);

  const jointBone = new THREE.Bone();
  jointBone.name = `${namePrefix}_jointBone`;
  jointBone.position.set(0, yOffset, 0);
  rootBone.add(jointBone);

  const skeleton1 = new THREE.Skeleton([rootBone, jointBone]);
  const skeleton2 = new THREE.Skeleton([rootBone, jointBone]);

  const mesh1 = new THREE.SkinnedMesh(geo1, mat1);
  mesh1.name = `${namePrefix}_mesh1`;
  mesh1.add(rootBone);
  mesh1.bind(skeleton1);

  const mesh2 = new THREE.SkinnedMesh(geo2, mat2);
  mesh2.name = `${namePrefix}_mesh2`;
  mesh2.bind(skeleton2);

  const group = new THREE.Group();
  group.name = `${namePrefix}_group`;
  group.add(mesh1, mesh2);

  return { group, rootBone, jointBone };
}

/**
 * Replaces the rigid single-block limbs in a skinview3d PlayerObject with
 * continuous, seamless (слитные) SkinnedMesh limbs featuring functional elbow and knee joints.
 * When the limbs bend, they deform seamlessly as a single continuous surface without any gaps or cuts.
 */
export function buildArticulatedLimbs(player: PlayerObject, isSlim: boolean = false): ArticulatedLimbHandles {
  const skin = player.skin as any;

  const mat1 = skin.layer1MaterialBiased;
  const mat2 = skin.layer2MaterialBiased;

  const armW = isSlim ? 3 : 4;
  const armWOverlay = isSlim ? 3.5 : 4.5;

  // 1. Permanently deactivate and hide original rigid meshes to prevent duplicate ghost limbs
  const limbParts = [skin.rightArm, skin.leftArm, skin.rightLeg, skin.leftLeg];
  for (const part of limbParts) {
    if (part.innerLayer) {
      part.innerLayer.visible = false;
      Object.defineProperty(part.innerLayer, "visible", { get: () => false, set: () => {}, configurable: true });
    }
    if (part.outerLayer) {
      part.outerLayer.visible = false;
      Object.defineProperty(part.outerLayer, "visible", { get: () => false, set: () => {}, configurable: true });
    }
    if (part.children[0]) {
      part.children[0].visible = false;
    }
  }

  // 2. Remove previous articulated limbs if rebuilding (e.g. on skin change) and dispose GPU geometries
  const disposeAndRemove = (parent: THREE.Object3D, name: string) => {
    const prev = parent.getObjectByName(name);
    if (prev) {
      prev.traverse((child: any) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
      });
      parent.remove(prev);
    }
  };

  disposeAndRemove(skin.rightArm, "skinnedRightArm_group");
  disposeAndRemove(skin.leftArm, "skinnedLeftArm_group");
  disposeAndRemove(skin.rightLeg, "skinnedRightLeg_group");
  disposeAndRemove(skin.leftLeg, "skinnedLeftLeg_group");

  // ==========================================
  // RIGHT ARM (Seamless SkinnedMesh)
  // ==========================================
  const rightArmData = createSkinnedLimb(
    armW, 12, 4,
    armWOverlay, 12.25, 4.5,
    -4,
    40, 16,
    40, 32,
    mat1, mat2,
    "skinnedRightArm",
    true
  );
  rightArmData.group.position.set(isSlim ? -0.5 : -1, 0, 0);
  skin.rightArm.add(rightArmData.group);

  // ==========================================
  // LEFT ARM (Seamless SkinnedMesh)
  // ==========================================
  const leftArmData = createSkinnedLimb(
    armW, 12, 4,
    armWOverlay, 12.25, 4.5,
    -4,
    32, 48,
    48, 48,
    mat1, mat2,
    "skinnedLeftArm",
    true
  );
  leftArmData.group.position.set(isSlim ? 0.5 : 1, 0, 0);
  skin.leftArm.add(leftArmData.group);

  // ==========================================
  // RIGHT LEG (Seamless SkinnedMesh)
  // ==========================================
  const rightLegData = createSkinnedLimb(
    4, 12, 4,
    4.5, 12.25, 4.5,
    -6,
    0, 16,
    0, 32,
    mat1, mat2,
    "skinnedRightLeg",
    false
  );
  rightLegData.group.position.set(-0.05, 0, 0);
  skin.rightLeg.add(rightLegData.group);

  // ==========================================
  // LEFT LEG (Seamless SkinnedMesh)
  // ==========================================
  const leftLegData = createSkinnedLimb(
    4, 12, 4,
    4.5, 12.25, 4.5,
    -6,
    16, 48,
    0, 48,
    mat1, mat2,
    "skinnedLeftLeg",
    false
  );
  leftLegData.group.position.set(0.05, 0, 0);
  skin.leftLeg.add(leftLegData.group);

  return {
    rightElbowBone: rightArmData.jointBone,
    leftElbowBone: leftArmData.jointBone,
    rightKneeBone: rightLegData.jointBone,
    leftKneeBone: leftLegData.jointBone,
    setElbows(rAngle: number, lAngle: number) {
      // In Three.js, bending forearm forward requires negative X rotation
      const targetR = -Math.abs(rAngle);
      const targetL = -Math.abs(lAngle);
      if (Math.abs(rightArmData.jointBone.rotation.x - targetR) > 0.0005) {
        rightArmData.jointBone.rotation.x = targetR;
      }
      if (Math.abs(leftArmData.jointBone.rotation.x - targetL) > 0.0005) {
        leftArmData.jointBone.rotation.x = targetL;
      }
    },
    setKnees(rAngle: number, lAngle: number) {
      // In Three.js, bending calf backward requires positive X rotation
      const targetR = Math.abs(rAngle);
      const targetL = Math.abs(lAngle);
      if (Math.abs(rightLegData.jointBone.rotation.x - targetR) > 0.0005) {
        rightLegData.jointBone.rotation.x = targetR;
      }
      if (Math.abs(leftLegData.jointBone.rotation.x - targetL) > 0.0005) {
        leftLegData.jointBone.rotation.x = targetL;
      }
    },
    resetBends() {
      rightArmData.jointBone.rotation.set(0, 0, 0);
      leftArmData.jointBone.rotation.set(0, 0, 0);
      rightLegData.jointBone.rotation.set(0, 0, 0);
      leftLegData.jointBone.rotation.set(0, 0, 0);
    },
  };
}
