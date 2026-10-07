import { PlayerAnimation, type PlayerObject, IdleAnimation } from "skinview3d";
import { Group, BoxGeometry, Mesh } from "three";

export type AnimationId =
  | "idle"
  | "wave"
  | "clap"
  | "point"
  | "bow"
  | "shrug"
  | "facepalm"
  | "disco"
  | "twerk";

export interface EmoteDefinition {
  id: AnimationId;
  nameRu: string;
  nameEn: string;
  category: "gesture" | "dance" | "meme";
  icon: string;
  color: string;
  descriptionRu: string;
  createAnimation: () => PlayerAnimation;
}

export function rigEmotecraftSkeleton(player: PlayerObject): void {
  if (!player?.skin || (player as any).__emotecraftRigged) return;

  const setupLimbJoint = (
    limb: any,
    isLeg: boolean,
    isLeft: boolean,
  ) => {
    if (!limb || limb.userData.elbow || limb.userData.knee) return;

    const pivot = limb.children?.[0] as Group | undefined;
    if (!pivot) return;

    const jointGroup = new Group();
    jointGroup.name = isLeg ? (isLeft ? "leftKnee" : "rightKnee") : (isLeft ? "leftElbow" : "rightElbow");
    // Pivot of elbow/knee is halfway down the limb (y = -6 from shoulder/hip)
    jointGroup.position.set(0, -6, 0);

    const lowerBox = new BoxGeometry();
    const isSlim = (player.skin as any).slim;
    const limbWidth = !isLeg && isSlim ? 3 : 4;
    lowerBox.scale(limbWidth, 6, 4);
    lowerBox.translate(0, -3, 0);

    const layer1Mat = (player.skin as any).layer1MaterialBiased || (player.skin as any).layer1Material;
    const lowerMesh = new Mesh(lowerBox, layer1Mat);
    lowerMesh.castShadow = true;
    lowerMesh.receiveShadow = true;

    jointGroup.add(lowerMesh);
    pivot.add(jointGroup);

    if (isLeg) {
      limb.userData.knee = jointGroup;
    } else {
      limb.userData.elbow = jointGroup;
    }
  };

  setupLimbJoint(player.skin.rightArm, false, false);
  setupLimbJoint(player.skin.leftArm, false, true);
  setupLimbJoint(player.skin.rightLeg, true, false);
  setupLimbJoint(player.skin.leftLeg, true, true);

  (player as any).__emotecraftRigged = true;
}

export function resetEmoteJoints(player: PlayerObject): void {
  if (!player?.skin) return;
  player.skin.resetJoints();
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);

  const skin = player.skin as any;
  if (skin.rightArm?.userData?.elbow) skin.rightArm.userData.elbow.rotation.set(0, 0, 0);
  if (skin.leftArm?.userData?.elbow) skin.leftArm.userData.elbow.rotation.set(0, 0, 0);
  if (skin.rightLeg?.userData?.knee) skin.rightLeg.userData.knee.rotation.set(0, 0, 0);
  if (skin.leftLeg?.userData?.knee) skin.leftLeg.userData.knee.rotation.set(0, 0, 0);

  if (player.cape) {
    player.cape.rotation.set(Math.PI * 0.06, 0, 0);
  }
}

// 1. WAVE (Emotecraft friendly hand wave)
export class EmoteWaveAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 6;
    rigEmotecraftSkeleton(player);
    const skin = player.skin as any;

    // Right arm raised, bent elbow, oscillating wave
    skin.rightArm.rotation.x = -Math.PI * 0.65;
    skin.rightArm.rotation.y = -0.3;
    skin.rightArm.rotation.z = -0.35 + Math.sin(t) * 0.35;

    if (skin.rightArm.userData.elbow) {
      skin.rightArm.userData.elbow.rotation.x = -0.55 + Math.sin(t) * 0.2;
      skin.rightArm.userData.elbow.rotation.z = Math.sin(t) * 0.15;
    }

    // Left arm rests gently at hip
    skin.leftArm.rotation.x = 0.15;
    skin.leftArm.rotation.z = 0.18;
    if (skin.leftArm.userData.elbow) {
      skin.leftArm.userData.elbow.rotation.x = 0;
    }

    // Friendly tilted head
    skin.head.rotation.y = Math.sin(t * 0.5) * 0.15;
    skin.head.rotation.z = -0.12;

    // Gentle torso sway
    skin.body.rotation.z = Math.sin(t * 0.5) * 0.04;
    player.position.y = Math.abs(Math.sin(t * 0.5)) * 0.2;
  }
}

// 2. CLAP (Emotecraft rhythmic clapping)
export class EmoteClapAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 12;
    rigEmotecraftSkeleton(player);
    const skin = player.skin as any;
    const clapCycle = Math.sin(t);

    // Both arms brought together in front of the chest with bent elbows
    skin.rightArm.rotation.x = -Math.PI * 0.45;
    skin.rightArm.rotation.y = -0.45 - clapCycle * 0.22;
    skin.rightArm.rotation.z = -0.15;

    skin.leftArm.rotation.x = -Math.PI * 0.45;
    skin.leftArm.rotation.y = 0.45 + clapCycle * 0.22;
    skin.leftArm.rotation.z = 0.15;

    if (skin.rightArm.userData.elbow) {
      skin.rightArm.userData.elbow.rotation.x = -0.65 - Math.abs(clapCycle) * 0.15;
    }
    if (skin.leftArm.userData.elbow) {
      skin.leftArm.userData.elbow.rotation.x = -0.65 - Math.abs(clapCycle) * 0.15;
    }

    // Springy body bounce
    player.position.y = Math.abs(clapCycle) * 0.4;
    skin.head.rotation.x = Math.abs(clapCycle) * 0.08;
    skin.body.rotation.x = Math.abs(clapCycle) * 0.04;
  }
}

// 3. POINT (Emotecraft pointing gesture)
export class EmotePointAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 4;
    rigEmotecraftSkeleton(player);
    const skin = player.skin as any;

    // Right arm firmly extended forward
    skin.rightArm.rotation.x = -Math.PI * 0.52;
    skin.rightArm.rotation.y = -0.15 + Math.sin(t) * 0.05;
    skin.rightArm.rotation.z = -0.05;
    if (skin.rightArm.userData.elbow) {
      skin.rightArm.userData.elbow.rotation.x = -0.1;
    }

    // Left arm on waist
    skin.leftArm.rotation.x = 0.25;
    skin.leftArm.rotation.z = 0.4;
    if (skin.leftArm.userData.elbow) {
      skin.leftArm.userData.elbow.rotation.x = -0.4;
    }

    // Body slightly angled toward target
    skin.body.rotation.y = -0.18;
    skin.head.rotation.y = -0.22;
    skin.head.rotation.x = 0.05;

    // Confident stance
    skin.rightLeg.rotation.x = -0.15;
    skin.leftLeg.rotation.x = 0.15;
  }
}

// 4. BOW (Emotecraft respectful bow)
export class EmoteBowAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 2.5;
    rigEmotecraftSkeleton(player);
    const skin = player.skin as any;
    const bowFactor = Math.sin(t) * 0.5 + 0.5; // 0 to 1 smooth cycle

    // Torso folds forward
    skin.body.rotation.x = 0.65 * bowFactor;
    skin.head.rotation.x = 0.45 * bowFactor;

    // Arms pinned neatly to hips
    skin.rightArm.rotation.x = 0.3 * bowFactor;
    skin.rightArm.rotation.z = -0.15 * bowFactor;
    skin.leftArm.rotation.x = 0.3 * bowFactor;
    skin.leftArm.rotation.z = 0.15 * bowFactor;

    if (skin.rightArm.userData.elbow) skin.rightArm.userData.elbow.rotation.x = -0.15 * bowFactor;
    if (skin.leftArm.userData.elbow) skin.leftArm.userData.elbow.rotation.x = -0.15 * bowFactor;

    // Slightly bent knees
    if (skin.rightLeg.userData.knee) skin.rightLeg.userData.knee.rotation.x = 0.15 * bowFactor;
    if (skin.leftLeg.userData.knee) skin.leftLeg.userData.knee.rotation.x = 0.15 * bowFactor;

    player.position.y = -0.4 * bowFactor;
    player.position.z = -0.3 * bowFactor;
  }
}

// 5. SHRUG (Emotecraft confused shrug)
export class EmoteShrugAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 3.5;
    rigEmotecraftSkeleton(player);
    const skin = player.skin as any;
    const shrugCycle = Math.sin(t) * 0.5 + 0.5;

    // Both elbows bent 90°, hands out with palms up
    skin.rightArm.rotation.x = -0.45 * shrugCycle;
    skin.rightArm.rotation.y = -0.3 * shrugCycle;
    skin.rightArm.rotation.z = -0.65 * shrugCycle;

    skin.leftArm.rotation.x = -0.45 * shrugCycle;
    skin.leftArm.rotation.y = 0.3 * shrugCycle;
    skin.leftArm.rotation.z = 0.65 * shrugCycle;

    if (skin.rightArm.userData.elbow) skin.rightArm.userData.elbow.rotation.x = -0.75 * shrugCycle;
    if (skin.leftArm.userData.elbow) skin.leftArm.userData.elbow.rotation.x = -0.75 * shrugCycle;

    // Head tilted with quizzical look
    skin.head.rotation.z = 0.18 * shrugCycle;
    skin.head.rotation.y = 0.12 * shrugCycle;
    skin.head.rotation.x = -0.05 * shrugCycle;

    // Slight shoulder raise
    skin.body.position.y = -6 + 0.4 * shrugCycle;
  }
}

// 6. FACEPALM (Emotecraft exasperated facepalm)
export class EmoteFacepalmAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 2;
    rigEmotecraftSkeleton(player);
    const skin = player.skin as any;
    const fpFactor = Math.sin(t) * 0.4 + 0.6;

    // Right arm brings hand up to cover forehead
    skin.rightArm.rotation.x = -Math.PI * 0.72 * fpFactor;
    skin.rightArm.rotation.y = -0.45 * fpFactor;
    skin.rightArm.rotation.z = -0.3 * fpFactor;
    if (skin.rightArm.userData.elbow) {
      skin.rightArm.userData.elbow.rotation.x = -0.95 * fpFactor;
    }

    // Left arm hanging limply
    skin.leftArm.rotation.x = 0.05;
    skin.leftArm.rotation.z = 0.12;

    // Head hung in disappointment
    skin.head.rotation.x = 0.42 * fpFactor;
    skin.head.rotation.y = -0.15 * fpFactor;
    skin.body.rotation.x = 0.12 * fpFactor;
  }
}

// 7. DISCO (Emotecraft retro Saturday night disco dance)
export class EmoteDiscoAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 7;
    rigEmotecraftSkeleton(player);
    const skin = player.skin as any;
    const beat = Math.sin(t);

    // Right arm points diagonally up and down
    skin.rightArm.rotation.x = -Math.sin(t) * 1.2 - 0.4;
    skin.rightArm.rotation.z = -0.6 - Math.sin(t) * 0.6;
    if (skin.rightArm.userData.elbow) {
      skin.rightArm.userData.elbow.rotation.x = -0.35 + Math.abs(beat) * 0.25;
    }

    // Left arm on hip
    skin.leftArm.rotation.x = 0.2;
    skin.leftArm.rotation.z = 0.45;
    if (skin.leftArm.userData.elbow) {
      skin.leftArm.userData.elbow.rotation.x = -0.5;
    }

    // Torso grooves with hip twist
    skin.body.rotation.y = Math.sin(t) * 0.35;
    skin.body.rotation.z = Math.sin(t) * 0.15;
    skin.head.rotation.y = Math.sin(t) * 0.25;

    // Knees bend to the rhythm
    skin.leftLeg.rotation.x = -Math.sin(t) * 0.4;
    skin.rightLeg.rotation.x = Math.sin(t) * 0.4;
    if (skin.leftLeg.userData.knee) skin.leftLeg.userData.knee.rotation.x = Math.abs(Math.sin(t)) * 0.3;
    if (skin.rightLeg.userData.knee) skin.rightLeg.userData.knee.rotation.x = Math.abs(Math.sin(t)) * 0.3;

    // Vertical bounce
    player.position.y = Math.abs(beat) * 1.2;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.08 + Math.abs(beat) * 0.15;
    }
  }
}

// 8. TWERK (Emotecraft iconic rhythmic twerk)
export class EmoteTwerkAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 14;
    rigEmotecraftSkeleton(player);
    const skin = player.skin as any;

    // Leaning forward stance
    skin.body.rotation.x = 0.88;
    skin.head.rotation.x = -0.48;

    // Wide squatting legs with bent knees
    skin.leftLeg.rotation.x = -0.55 + Math.sin(t) * 0.06;
    skin.rightLeg.rotation.x = -0.55 - Math.sin(t) * 0.06;
    skin.leftLeg.rotation.z = -0.22;
    skin.rightLeg.rotation.z = 0.22;

    if (skin.leftLeg.userData.knee) skin.leftLeg.userData.knee.rotation.x = 0.65;
    if (skin.rightLeg.userData.knee) skin.rightLeg.userData.knee.rotation.x = 0.65;

    // Hands braced on knees
    skin.leftArm.rotation.x = -0.65;
    skin.leftArm.rotation.z = 0.32;
    skin.rightArm.rotation.x = -0.65;
    skin.rightArm.rotation.z = -0.32;
    if (skin.leftArm.userData.elbow) skin.leftArm.userData.elbow.rotation.x = -0.5;
    if (skin.rightArm.userData.elbow) skin.rightArm.userData.elbow.rotation.x = -0.5;

    // Pelvic oscillations
    skin.body.position.y = -6 + Math.sin(t) * 0.9;
    skin.body.position.z = Math.cos(t) * 1.2;
    player.position.y = -1.4 + Math.abs(Math.sin(t)) * 0.45;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.35 + Math.sin(t) * 0.25;
    }
  }
}

export const ANIMATION_CATALOG: EmoteDefinition[] = [
  {
    id: "wave",
    nameRu: "Приветствие",
    nameEn: "Wave",
    category: "gesture",
    icon: "👋",
    color: "#10b981",
    descriptionRu: "Дружелюбный взмах рукой со сгибом в локте",
    createAnimation: () => new EmoteWaveAnimation(),
  },
  {
    id: "clap",
    nameRu: "Аплодисменты",
    nameEn: "Clap",
    category: "gesture",
    icon: "👏",
    color: "#06b6d4",
    descriptionRu: "Бурные аплодисменты согнутыми руками перед собой",
    createAnimation: () => new EmoteClapAnimation(),
  },
  {
    id: "point",
    nameRu: "Указать",
    nameEn: "Point",
    category: "gesture",
    icon: "👉",
    color: "#3b82f6",
    descriptionRu: "Четкий указательный жест рукой вперед",
    createAnimation: () => new EmotePointAnimation(),
  },
  {
    id: "bow",
    nameRu: "Поклон",
    nameEn: "Bow",
    category: "gesture",
    icon: "🙇",
    color: "#8b5cf6",
    descriptionRu: "Уважительный церемониальный поклон корпусом",
    createAnimation: () => new EmoteBowAnimation(),
  },
  {
    id: "shrug",
    nameRu: "Пожать плечами",
    nameEn: "Shrug",
    category: "gesture",
    icon: "🤷",
    color: "#64748b",
    descriptionRu: "Разведение согнутых рук и вопросительный наклон головы",
    createAnimation: () => new EmoteShrugAnimation(),
  },
  {
    id: "facepalm",
    nameRu: "Рукалицо",
    nameEn: "Facepalm",
    category: "meme",
    icon: "🤦",
    color: "#ef4444",
    descriptionRu: "Прижатая ладонь ко лбу со сгибом в локте",
    createAnimation: () => new EmoteFacepalmAnimation(),
  },
  {
    id: "disco",
    nameRu: "Диско-танец",
    nameEn: "Disco",
    category: "dance",
    icon: "🪩",
    color: "#f59e0b",
    descriptionRu: "Ритмичный ретро-танец со сгибанием коленей",
    createAnimation: () => new EmoteDiscoAnimation(),
  },
  {
    id: "twerk",
    nameRu: "Тверк",
    nameEn: "Twerk",
    category: "dance",
    icon: "🍑",
    color: "#f97316",
    descriptionRu: "Приседание с согнутыми коленями и ритмичными движениями",
    createAnimation: () => new EmoteTwerkAnimation(),
  },
];

export function createCustomAnimation(id: string): PlayerAnimation | null {
  if (id === "idle") {
    return new IdleAnimation();
  }
  const match = ANIMATION_CATALOG.find((entry) => entry.id === id);
  return match ? match.createAnimation() : null;
}
