export type ThemeId =
  | "omega-slate"
  | "cyber-steel"
  | "emerald-tactical"
  | "crimson-tactical"
  | "amber-bronze";

export type ActiveModal =
  | null
  | "store"
  | "instances"
  | "accounts"
  | "settings"
  | "friends";

export interface SkinPreset {
  id: string;
  name: string;
  url: string;
  model: "default" | "slim";
  capeUrl?: string;
  author?: string;
}

export interface InstanceFolder {
  id: string;
  name: string;
  icon: string; // Emoji, texture variant, or image URL
  iconType?: "emoji" | "cube" | "image";
  cubeVariant?: "grass" | "stone" | "obsidian" | "tnt" | "diamond" | "rust";
  isSystem?: boolean;
}

export type InstanceAvatarVariant =
  | "diamond_sword"
  | "diamond_pickaxe"
  | "end_crystal"
  | "obsidian"
  | "totem_of_undying"
  | "golden_apple"
  | "ender_pearl"
  | "tnt"
  | "netherite_sword";

export interface InstanceData {
  id: string;
  name: string;
  mcVersion: string;
  loader: "Fabric" | "Forge" | "NeoForge" | "Quilt" | "Vanilla" | "Rust";
  playTimeMinutes: number;
  modCount: number;
  isReady: boolean;
  folderId?: string;
  icon?: InstanceAvatarVariant | string;
  description?: string;
  ramGb?: number;
}

export interface AccountData {
  id: string;
  name: string;
  type: "offline" | "microsoft" | "omega" | "elyby";
  avatarUrl?: string;
  isOnline: boolean;
  skinUrl?: string;
}

export interface OmegaAccountState {
  isLinked: boolean;
  omegaUsername?: string;
  email?: string;
}

export type {
  TopBarItemId,
  BottomBarItemId,
  BottomBarAlignment,
  ButtonShapePreset,
  TopBarItemMeta,
  BottomBarItemMeta,
} from "./constants/launcherLayout";

export * from "./types/index";
