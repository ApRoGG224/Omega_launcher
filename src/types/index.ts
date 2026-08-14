export type Language = "ru" | "en";

export type AccountType = "microsoft" | "offline" | "omega";

export interface Account {
  name: string;
  type: AccountType;
}

export interface ModpackInstance {
  id: string;
  name: string;
  mcVersion: string;
  loader: string;
  x: number;
  y: number;
  icon?: string;
  group?: string;
  playTimeMs?: number;
  lastPlayedAt?: string;
}

export type ProjectType = "mod" | "resourcepack" | "modpack" | "shader" | "datapack";

export type Point = { x: number; y: number };
export type WindowSize = { width: number; height: number };
export type ResizeDirection = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";
export type AlignmentGuides = { vertical: number | null; horizontal: number | null };

export interface ModrinthHit {
  project_id: string;
  title: string;
  author: string;
  description: string;
  icon_url?: string;
  downloads: number;
  categories?: string[];
  project_type?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface VersionFilterState {
  release: boolean;
  snapshot: boolean;
  old_beta: boolean;
  old_alpha: boolean;
}

export type ToastType = "success" | "error";

export interface ToastData {
  message: string;
  type: ToastType;
}