import type { Account, ModpackInstance, Point, WindowSize, VersionFilterState } from "../types";

const INSTANCES_KEY = "desktopInstances";
const ACCOUNTS_KEY = "savedNicknames";
const LANGUAGE_KEY = "launcherLang";
export const EXPORT_PATH_KEY = "exportPath";
const THEME_KEY = "omegaTheme";

export function loadInstances(): ModpackInstance[] {
  const saved = localStorage.getItem(INSTANCES_KEY);
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
    localStorage.setItem(INSTANCES_KEY, JSON.stringify(instances));
  } catch (e) {
    console.error("Failed to persist desktopInstances", e);
  }
}

export function loadAccounts(): Account[] {
  const saved = localStorage.getItem(ACCOUNTS_KEY);
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
    console.error("Failed to parse savedNicknames, data might be corrupted", e);
    return [];
  }
}

export function persistAccounts(accounts: Account[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to persist savedNicknames", e);
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
      // Ignore malformed state and fall back to centered positioning.
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
      // Ignore malformed state and use the panel's default size.
    }
  }
  return fallback;
}

export const getStoredLanguage = () => (localStorage.getItem(LANGUAGE_KEY) as "ru" | "en") || "ru";
export const setStoredLanguage = (lang: string) => localStorage.setItem(LANGUAGE_KEY, lang);

export const getStoredTheme = () => localStorage.getItem(THEME_KEY) || "#a855f7";
export const setStoredTheme = (hex: string) => localStorage.setItem(THEME_KEY, hex);

export const getStoredExportPath = () => localStorage.getItem(EXPORT_PATH_KEY) || "~/Downloads";
export const setStoredExportPath = (path: string) => localStorage.setItem(EXPORT_PATH_KEY, path);

export const CLOSE_ON_LAUNCH_KEY = "closeLauncherOnLaunch";
export const getStoredCloseOnLaunch = () => localStorage.getItem(CLOSE_ON_LAUNCH_KEY) === "true";
export const setStoredCloseOnLaunch = (value: boolean) => localStorage.setItem(CLOSE_ON_LAUNCH_KEY, String(value));