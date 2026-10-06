import { PlayerAnimation, type PlayerObject, IdleAnimation } from "skinview3d";

export type AnimationId =
  | "idle"
  | "take_the_l"
  | "get_griddy"
  | "twerk"
  | "floss"
  | "gangnam"
  | "dab"
  | "wave"
  | "disco"
  | "clap"
  | "zombie";

export interface EmoteDefinition {
  id: AnimationId;
  nameRu: string;
  nameEn: string;
  category: "dance" | "meme" | "gesture";
  icon: string;
  descriptionRu: string;
  createAnimation: () => PlayerAnimation;
}

export class TakeTheLAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 7;
    // Right arm forms the "L" near the forehead
    player.skin.rightArm.rotation.x = -Math.PI * 0.72 + Math.sin(t) * 0.08;
    player.skin.rightArm.rotation.y = -0.3;
    player.skin.rightArm.rotation.z = -0.4 + Math.sin(t) * 0.05;

    // Left arm rhythmic pump
    player.skin.leftArm.rotation.x = Math.sin(t) * 0.5 + 0.3;
    player.skin.leftArm.rotation.y = 0.1;
    player.skin.leftArm.rotation.z = Math.PI * 0.12;

    // Hopping kick with legs
    player.skin.rightLeg.rotation.x = Math.sin(t) * 0.7;
    player.skin.leftLeg.rotation.x = -Math.abs(Math.sin(t)) * 0.25;

    // Vertical bounce
    player.position.y = Math.abs(Math.sin(t)) * 2.0;

    // Mocking head shake
    player.skin.head.rotation.x = Math.sin(t) * 0.12;
    player.skin.head.rotation.y = Math.sin(t * 0.5) * 0.22;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.08 + Math.abs(Math.sin(t)) * 0.25;
    }
  }
}

export class GetGriddyAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 8;
    // Hands formed as goggles at eye level
    player.skin.rightArm.rotation.x = -Math.PI * 0.62 + Math.sin(t) * 0.12;
    player.skin.rightArm.rotation.y = -0.38 + Math.cos(t) * 0.05;
    player.skin.rightArm.rotation.z = -0.32;

    player.skin.leftArm.rotation.x = -Math.PI * 0.62 + Math.cos(t) * 0.12;
    player.skin.leftArm.rotation.y = 0.38 - Math.cos(t) * 0.05;
    player.skin.leftArm.rotation.z = 0.32;

    // Heel-to-toe skip
    player.skin.leftLeg.rotation.x = Math.sin(t * 0.6) * 0.45;
    player.skin.rightLeg.rotation.x = Math.sin(t * 0.6 + Math.PI) * 0.45;

    // Torso sway and groove
    player.skin.body.rotation.z = Math.sin(t * 0.3) * 0.14;
    player.skin.head.rotation.z = -Math.sin(t * 0.3) * 0.1;
    player.skin.head.rotation.y = Math.sin(t * 0.3) * 0.15;

    // Bounce
    player.position.y = Math.abs(Math.sin(t * 0.6)) * 1.4;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.06 + Math.abs(Math.sin(t * 0.6)) * 0.18;
    }
  }
}

export class TwerkAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 16;
    // Torso angled forward
    player.skin.body.rotation.x = 0.85;
    player.skin.head.rotation.x = -0.45;

    // Squatting leg stance
    player.skin.leftLeg.rotation.x = -0.52 + Math.sin(t) * 0.08;
    player.skin.rightLeg.rotation.x = -0.52 - Math.sin(t) * 0.08;
    player.skin.leftLeg.rotation.z = -0.18;
    player.skin.rightLeg.rotation.z = 0.18;

    // Hands braced on knees
    player.skin.leftArm.rotation.x = -0.6;
    player.skin.leftArm.rotation.z = 0.28;
    player.skin.rightArm.rotation.x = -0.6;
    player.skin.rightArm.rotation.z = -0.28;

    // Rapid hip oscillations
    player.skin.body.position.y = -6 + Math.sin(t) * 0.8;
    player.skin.body.position.z = Math.cos(t) * 1.1;
    player.position.y = -1.2 + Math.abs(Math.sin(t)) * 0.5;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.3 + Math.sin(t) * 0.25;
    }
  }
}

export class FlossAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 9;
    // Straight arms swinging past hips
    player.skin.leftArm.rotation.z = Math.sin(t) * 0.65;
    player.skin.rightArm.rotation.z = Math.sin(t) * 0.65;
    player.skin.leftArm.rotation.x = Math.cos(t) * 0.55;
    player.skin.rightArm.rotation.x = Math.cos(t) * 0.55;

    // Torso swinging opposite to arms
    player.skin.body.rotation.y = -Math.sin(t) * 0.38;
    player.skin.body.rotation.z = -Math.sin(t) * 0.18;
    player.skin.head.rotation.y = Math.sin(t) * 0.18;

    // Slight leg stance shift
    player.skin.leftLeg.rotation.z = -0.15 - Math.sin(t) * 0.08;
    player.skin.rightLeg.rotation.z = 0.15 - Math.sin(t) * 0.08;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.07 + Math.abs(Math.sin(t)) * 0.15;
    }
  }
}

export class GangnamAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 10;
    // Crossed wrists holding reins
    player.skin.leftArm.rotation.x = -1.15 + Math.sin(t) * 0.18;
    player.skin.leftArm.rotation.y = 0.48;
    player.skin.leftArm.rotation.z = 0.15;

    player.skin.rightArm.rotation.x = -1.15 + Math.sin(t) * 0.18;
    player.skin.rightArm.rotation.y = -0.48;
    player.skin.rightArm.rotation.z = -0.15;

    // Trotting feet
    player.skin.leftLeg.rotation.x = Math.sin(t) * 0.42;
    player.skin.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.42;

    // Bounce
    player.position.y = Math.abs(Math.sin(t)) * 1.6;
    player.skin.head.rotation.x = Math.sin(t) * 0.12;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.1 + Math.abs(Math.sin(t)) * 0.22;
    }
  }
}

export class DabAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 4;
    // Left arm across face
    player.skin.leftArm.rotation.x = -1.45 + Math.sin(t) * 0.04;
    player.skin.leftArm.rotation.y = 1.05;
    player.skin.leftArm.rotation.z = 0.52;

    // Right arm high diagonal
    player.skin.rightArm.rotation.x = -0.75 + Math.sin(t) * 0.04;
    player.skin.rightArm.rotation.y = -0.2;
    player.skin.rightArm.rotation.z = -1.85;

    // Head tucked down
    player.skin.head.rotation.x = 0.45;
    player.skin.head.rotation.y = 0.72;
    player.skin.head.rotation.z = 0.15;

    // Braced feet
    player.skin.leftLeg.rotation.z = 0.22;
    player.skin.rightLeg.rotation.z = -0.22;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.08;
    }
  }
}

export class CustomWaveAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 7;
    // Waving right arm
    player.skin.rightArm.rotation.x = -Math.PI * 0.85;
    player.skin.rightArm.rotation.z = -Math.PI * 0.15 + Math.sin(t) * 0.38;

    // Rest left arm
    player.skin.leftArm.rotation.z = Math.PI * 0.04;

    // Friendly head tilt
    player.skin.head.rotation.y = Math.sin(t * 0.3) * 0.15;
    player.skin.head.rotation.z = -0.08;
    player.skin.body.rotation.z = Math.sin(t * 0.3) * 0.05;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.06;
    }
  }
}

export class DiscoAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 5;
    // Right arm disco pointing up/down
    player.skin.rightArm.rotation.x = -Math.sin(t) * 1.3 - 0.4;
    player.skin.rightArm.rotation.z = -0.55 - Math.sin(t) * 0.55;

    // Left hand on hip
    player.skin.leftArm.rotation.x = 0.25;
    player.skin.leftArm.rotation.z = 0.42;

    // Torso and hip twist
    player.skin.body.rotation.y = Math.sin(t) * 0.32;
    player.skin.body.rotation.z = Math.sin(t) * 0.12;

    // Stepping
    player.skin.leftLeg.rotation.x = -Math.sin(t) * 0.35;
    player.skin.rightLeg.rotation.x = Math.sin(t) * 0.35;

    // Head bob
    player.skin.head.rotation.y = Math.sin(t) * 0.2;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.08 + Math.abs(Math.sin(t)) * 0.12;
    }
  }
}

export class ClapAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 11;
    const clapCycle = Math.sin(t);

    // Hands meeting
    player.skin.leftArm.rotation.x = -Math.PI * 0.48;
    player.skin.leftArm.rotation.y = 0.42 + clapCycle * 0.25;
    player.skin.leftArm.rotation.z = 0.1;

    player.skin.rightArm.rotation.x = -Math.PI * 0.48;
    player.skin.rightArm.rotation.y = -0.42 - clapCycle * 0.25;
    player.skin.rightArm.rotation.z = -0.1;

    // Micro bounce
    player.position.y = Math.abs(clapCycle) * 0.35;
    player.skin.head.rotation.x = Math.abs(clapCycle) * 0.08;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.06;
    }
  }
}

export class ZombieAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 4;
    // Straight forward arms
    player.skin.leftArm.rotation.x = -Math.PI * 0.52 + Math.sin(t) * 0.06;
    player.skin.leftArm.rotation.y = 0.08;
    player.skin.rightArm.rotation.x = -Math.PI * 0.52 - Math.sin(t) * 0.06;
    player.skin.rightArm.rotation.y = -0.08;

    // Head tilt
    player.skin.head.rotation.z = 0.18;
    player.skin.head.rotation.x = 0.1;
    player.skin.head.rotation.y = Math.sin(t * 0.5) * 0.15;

    // Shambling walk
    player.skin.leftLeg.rotation.x = Math.sin(t) * 0.4;
    player.skin.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.4;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.06;
    }
  }
}

export const ANIMATION_CATALOG: EmoteDefinition[] = [
  {
    id: "take_the_l",
    nameRu: "Take The L",
    nameEn: "Take The L",
    category: "meme",
    icon: "🕺",
    descriptionRu: "Легендарный танец с буквой L у лба и подскоками",
    createAnimation: () => new TakeTheLAnimation(),
  },
  {
    id: "get_griddy",
    nameRu: "Get Griddy",
    nameEn: "Get Griddy",
    category: "dance",
    icon: "🔥",
    descriptionRu: "Вирусный танец Гридди с очками-замками у глаз",
    createAnimation: () => new GetGriddyAnimation(),
  },
  {
    id: "twerk",
    nameRu: "Twerk",
    nameEn: "Twerk",
    category: "meme",
    icon: "🍑",
    descriptionRu: "Ритмичный наклон и интенсивные движения бедрами",
    createAnimation: () => new TwerkAnimation(),
  },
  {
    id: "floss",
    nameRu: "Floss",
    nameEn: "Floss",
    category: "dance",
    icon: "💃",
    descriptionRu: "Синхронные махи руками сквозь корпус",
    createAnimation: () => new FlossAnimation(),
  },
  {
    id: "gangnam",
    nameRu: "Gangnam Style",
    nameEn: "Gangnam Style",
    category: "dance",
    icon: "🐎",
    descriptionRu: "Скрещенные руки наездника и ритмичный бег",
    createAnimation: () => new GangnamAnimation(),
  },
  {
    id: "dab",
    nameRu: "Dab",
    nameEn: "Dab",
    category: "meme",
    icon: "⚡",
    descriptionRu: "Фирменный дэб с рукой у лица",
    createAnimation: () => new DabAnimation(),
  },
  {
    id: "wave",
    nameRu: "Приветствие",
    nameEn: "Wave",
    category: "gesture",
    icon: "👋",
    descriptionRu: "Дружелюбный взмах рукой и наклон головы",
    createAnimation: () => new CustomWaveAnimation(),
  },
  {
    id: "disco",
    nameRu: "Диско",
    nameEn: "Disco",
    category: "dance",
    icon: "🪩",
    descriptionRu: "Ретро-указатель вверх и в стороны в стиле лихорадки субботы",
    createAnimation: () => new DiscoAnimation(),
  },
  {
    id: "clap",
    nameRu: "Аплодисменты",
    nameEn: "Clap",
    category: "gesture",
    icon: "👏",
    descriptionRu: "Бурные аплодисменты обеими руками",
    createAnimation: () => new ClapAnimation(),
  },
  {
    id: "zombie",
    nameRu: "Зомби",
    nameEn: "Zombie",
    category: "gesture",
    icon: "🧟",
    descriptionRu: "Вытянутые вперед руки и угрожающая походка",
    createAnimation: () => new ZombieAnimation(),
  },
];

export function createCustomAnimation(id: string): PlayerAnimation | null {
  if (id === "idle") {
    return new IdleAnimation();
  }
  const match = ANIMATION_CATALOG.find((entry) => entry.id === id);
  return match ? match.createAnimation() : null;
}
