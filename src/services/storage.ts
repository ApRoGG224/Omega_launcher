import type { Account, ModpackInstance, Point, WindowSize, VersionFilterState } from "../types";

const INSTANCES_KEY = "omega_instances";
const ACCOUNTS_KEY = "omega_accounts";
const LEGACY_INSTANCES_KEY = "desktopInstances";
const LEGACY_ACCOUNTS_KEY = "savedNicknames";
const LANGUAGE_KEY = "launcherLang";
export const EXPORT_PATH_KEY = "exportPath";
const THEME_KEY = "omegaTheme";

export function loadInstances(): ModpackInstance[] {
  let saved = localStorage.getItem(INSTANCES_KEY);
  if (!saved) {
    saved = localStorage.getItem(LEGACY_INSTANCES_KEY);
  }
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as ModpackInstance[]) : [];
  } catch {
    return [];
  }
}

export function persistInstances(instances: ModpackInstance[]) {
  try {
    const serialized = JSON.stringify(instances);
    localStorage.setItem(INSTANCES_KEY, serialized);
    localStorage.setItem(LEGACY_INSTANCES_KEY, serialized);
  } catch (e) {
    console.error("Failed to persist omega_instances", e);
  }
}

export function loadAccounts(): Account[] {
  let saved = localStorage.getItem(ACCOUNTS_KEY);
  if (!saved) {
    saved = localStorage.getItem(LEGACY_ACCOUNTS_KEY);
  }
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const accounts: Account[] = parsed
      .map((item): Account | null => {
        if (typeof item === "string") return { name: item, type: "offline" };
        if (item && typeof item.name === "string") return item as Account;
        return null;
      })
      .filter((a): a is Account => a !== null);
    return accounts;
  } catch (e) {
    console.error("Failed to parse omega_accounts, data might be corrupted", e);
    return [];
  }
}

export function persistAccounts(accounts: Account[]) {
  try {
    const serialized = JSON.stringify(accounts);
    localStorage.setItem(ACCOUNTS_KEY, serialized);
    localStorage.setItem(LEGACY_ACCOUNTS_KEY, serialized);
  } catch (e) {
    console.error("Failed to persist omega_accounts", e);
  }
}

export function loadVersionFilters(): VersionFilterState {
  return {
    release: localStorage.getItem("vf_release") !== "false",
    snapshot: localStorage.getItem("vf_snapshot") === "true",
    old_beta: localStorage.getItem("vf_old_beta") === "true",
    old_alpha: localStorage.getItem("vf_old_alpha") === "true",
  };
}

export function getInitialWindowPosition(key: string, fallback: Point): Point {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        return parsed as Point;
      }
    } catch {
    }
  }
  return fallback;
}

export function getInitialWindowSize(key: string, fallback?: WindowSize): WindowSize | undefined {
  if (!fallback) return fallback;
  const stored = localStorage.getItem(`${key}:size`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (typeof parsed?.width === "number" && typeof parsed?.height === "number") {
        return parsed as WindowSize;
      }
    } catch {
    }
  }
  return fallback;
}

export const getStoredLanguage = () => (localStorage.getItem(LANGUAGE_KEY) as "uk" | "ru" | "en") || "uk";
export const setStoredLanguage = (lang: string) => localStorage.setItem(LANGUAGE_KEY, lang);

export const getStoredTheme = () => localStorage.getItem(THEME_KEY) || "#663af3";
export const setStoredTheme = (hex: string) => localStorage.setItem(THEME_KEY, hex);

export const getStoredExportPath = () => localStorage.getItem(EXPORT_PATH_KEY) || "~/Downloads";
export const setStoredExportPath = (path: string) => localStorage.setItem(EXPORT_PATH_KEY, path);

export const CLOSE_ON_LAUNCH_KEY = "closeLauncherOnLaunch";
export const getStoredCloseOnLaunch = () => localStorage.getItem(CLOSE_ON_LAUNCH_KEY) === "true";
export const setStoredCloseOnLaunch = (value: boolean) => localStorage.setItem(CLOSE_ON_LAUNCH_KEY, String(value));

export const FULLSCREEN_ON_START_KEY = "fullscreenOnStart";
export const getStoredFullscreenOnStart = () => localStorage.getItem(FULLSCREEN_ON_START_KEY) === "true";
export const setStoredFullscreenOnStart = (value: boolean) => localStorage.setItem(FULLSCREEN_ON_START_KEY, String(value));
