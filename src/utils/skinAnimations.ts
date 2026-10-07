import { PlayerAnimation, type PlayerObject, IdleAnimation } from "skinview3d";

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

export function rigEmotecraftSkeleton(_player: PlayerObject): void {
  // Pure native PlayerObject skeleton - no duplicate Three.js meshes
}

export function resetEmoteJoints(player: PlayerObject): void {
  if (!player?.skin) return;
  player.skin.resetJoints();
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);

  const skin = player.skin as any;
  if (skin.body) {
    skin.body.position.set(0, 0, 0);
    skin.body.rotation.set(0, 0, 0);
  }

  // Remove any leftover meshes from prior experimental rigging
  ["rightArm", "leftArm", "rightLeg", "leftLeg"].forEach((part) => {
    if (skin[part]?.userData?.elbow) {
      try {
        skin[part].children?.[0]?.remove(skin[part].userData.elbow);
      } catch {}
      delete skin[part].userData.elbow;
    }
    if (skin[part]?.userData?.knee) {
      try {
        skin[part].children?.[0]?.remove(skin[part].userData.knee);
      } catch {}
      delete skin[part].userData.knee;
    }
  });

  if (player.cape) {
    player.cape.rotation.set(Math.PI * 0.06, 0, 0);
  }
}

// 1. WAVE (Emotecraft friendly hand wave)
export class EmoteWaveAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 6;
    const skin = player.skin as any;

    // Right arm raised, oscillating wave
    skin.rightArm.rotation.x = -Math.PI * 0.65;
    skin.rightArm.rotation.y = -0.25 + Math.cos(t) * 0.15;
    skin.rightArm.rotation.z = -0.3 + Math.sin(t) * 0.38;

    // Left arm rests gently at hip
    skin.leftArm.rotation.x = 0.15;
    skin.leftArm.rotation.z = 0.18;

    // Friendly tilted head
    skin.head.rotation.y = Math.sin(t * 0.5) * 0.15;
    skin.head.rotation.z = -0.15;

    // Gentle torso sway
    skin.body.rotation.z = Math.sin(t * 0.5) * 0.04;
    player.position.y = Math.abs(Math.sin(t * 0.5)) * 0.25;
  }
}

// 2. CLAP (Emotecraft rhythmic clapping)
export class EmoteClapAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 12;
    const skin = player.skin as any;
    const clapCycle = Math.sin(t);

    // Both arms brought together in front of the chest
    skin.rightArm.rotation.x = -Math.PI * 0.45;
    skin.rightArm.rotation.y = -0.42 - clapCycle * 0.28;
    skin.rightArm.rotation.z = -0.18;

    skin.leftArm.rotation.x = -Math.PI * 0.45;
    skin.leftArm.rotation.y = 0.42 + clapCycle * 0.28;
    skin.leftArm.rotation.z = 0.18;

    // Springy body bounce
    player.position.y = Math.abs(clapCycle) * 0.45;
    skin.head.rotation.x = Math.abs(clapCycle) * 0.12;
    skin.body.rotation.x = Math.abs(clapCycle) * 0.06;
  }
}

// 3. POINT (Emotecraft pointing gesture)
export class EmotePointAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 4;
    const skin = player.skin as any;

    // Right arm firmly extended forward
    skin.rightArm.rotation.x = -Math.PI * 0.52;
    skin.rightArm.rotation.y = -0.18 + Math.sin(t) * 0.06;
    skin.rightArm.rotation.z = -0.05;

    // Left arm on waist
    skin.leftArm.rotation.x = 0.25;
    skin.leftArm.rotation.z = 0.42;

    // Body slightly angled toward target
    skin.body.rotation.y = -0.22;
    skin.head.rotation.y = -0.28;
    skin.head.rotation.x = 0.06;

    // Confident stance
    skin.rightLeg.rotation.x = -0.15;
    skin.leftLeg.rotation.x = 0.15;
  }
}

// 4. BOW (Emotecraft respectful bow)
export class EmoteBowAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 2.5;
    const skin = player.skin as any;
    const bowFactor = Math.sin(t) * 0.5 + 0.5;

    // Torso folds forward
    skin.body.rotation.x = 0.72 * bowFactor;
    skin.head.rotation.x = 0.5 * bowFactor;

    // Arms pinned neatly to hips
    skin.rightArm.rotation.x = 0.35 * bowFactor;
    skin.rightArm.rotation.z = -0.18 * bowFactor;
    skin.leftArm.rotation.x = 0.35 * bowFactor;
    skin.leftArm.rotation.z = 0.18 * bowFactor;

    // Stable stance
    skin.rightLeg.rotation.x = -0.12 * bowFactor;
    skin.leftLeg.rotation.x = -0.12 * bowFactor;

    player.position.y = -0.5 * bowFactor;
    player.position.z = -0.35 * bowFactor;
  }
}

// 5. SHRUG (Emotecraft confused shrug)
export class EmoteShrugAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 3.5;
    const skin = player.skin as any;
    const shrugCycle = Math.sin(t) * 0.5 + 0.5;

    // Both hands out with palms up
    skin.rightArm.rotation.x = -0.4 * shrugCycle;
    skin.rightArm.rotation.y = -0.35 * shrugCycle;
    skin.rightArm.rotation.z = -0.75 * shrugCycle;

    skin.leftArm.rotation.x = -0.4 * shrugCycle;
    skin.leftArm.rotation.y = 0.35 * shrugCycle;
    skin.leftArm.rotation.z = 0.75 * shrugCycle;

    // Head tilted with quizzical look
    skin.head.rotation.z = 0.22 * shrugCycle;
    skin.head.rotation.y = 0.15 * shrugCycle;
    skin.head.rotation.x = -0.08 * shrugCycle;

    // Shoulder raise bounce
    player.position.y = 0.35 * shrugCycle;
  }
}

// 6. FACEPALM (Emotecraft exasperated facepalm)
export class EmoteFacepalmAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 2;
    const skin = player.skin as any;
    const fpFactor = Math.sin(t) * 0.35 + 0.65;

    // Right arm brings hand up to cover forehead
    skin.rightArm.rotation.x = -Math.PI * 0.76 * fpFactor;
    skin.rightArm.rotation.y = -0.48 * fpFactor;
    skin.rightArm.rotation.z = -0.32 * fpFactor;

    // Left arm hanging limply
    skin.leftArm.rotation.x = 0.08;
    skin.leftArm.rotation.z = 0.14;

    // Head hung in disappointment
    skin.head.rotation.x = 0.48 * fpFactor;
    skin.head.rotation.y = -0.16 * fpFactor;
    skin.body.rotation.x = 0.14 * fpFactor;
  }
}

// 7. DISCO (Emotecraft retro Saturday night disco dance)
export class EmoteDiscoAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 7;
    const skin = player.skin as any;
    const beat = Math.sin(t);

    // Right arm points diagonally up and down
    skin.rightArm.rotation.x = -beat * 1.3 - 0.4;
    skin.rightArm.rotation.z = -0.65 - beat * 0.6;

    // Left arm on hip
    skin.leftArm.rotation.x = 0.22;
    skin.leftArm.rotation.z = 0.45;

    // Torso grooves with hip twist
    skin.body.rotation.y = Math.sin(t) * 0.38;
    skin.body.rotation.z = Math.sin(t) * 0.18;
    skin.head.rotation.y = Math.sin(t) * 0.28;

    // Legs step to the rhythm
    skin.leftLeg.rotation.x = -Math.sin(t) * 0.45;
    skin.rightLeg.rotation.x = Math.sin(t) * 0.45;

    // Vertical bounce
    player.position.y = Math.abs(beat) * 1.2;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.08 + Math.abs(beat) * 0.2;
    }
  }
}

// 8. TWERK (Emotecraft iconic rhythmic twerk)
export class EmoteTwerkAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 12;
    const skin = player.skin as any;
    const bounce = Math.sin(t);

    // Natural deep sneak/crouch posture
    skin.body.rotation.x = 0.46 + bounce * 0.12;
    skin.head.rotation.x = -0.28;

    // Rhythmic squat bends on both knees
    skin.leftLeg.rotation.x = -0.52 - bounce * 0.22;
    skin.rightLeg.rotation.x = -0.52 - bounce * 0.22;
    skin.leftLeg.rotation.z = -0.16;
    skin.rightLeg.rotation.z = 0.16;

    // Hands positioned comfortably on hips/knees
    skin.leftArm.rotation.x = -0.42;
    skin.leftArm.rotation.z = 0.35;
    skin.rightArm.rotation.x = -0.42;
    skin.rightArm.rotation.z = -0.35;

    // Hip shake and lively vertical squat bounce
    skin.body.rotation.y = Math.cos(t) * 0.2;
    skin.body.rotation.z = Math.sin(t) * 0.1;
    player.position.y = -2.2 + Math.abs(bounce) * 1.5;

    if (player.cape) {
      player.cape.rotation.x = 0.65 + Math.abs(bounce) * 0.45;
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
