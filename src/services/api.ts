import type { ModrinthHit, ProjectType } from "../types";

const MODRINTH_API = "https://api.modrinth.com/v2";
const VERSION_MANIFEST_URL =
  "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const MANIFEST_CACHE_KEY = "omega:version_manifest_v2";
const MANIFEST_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ModrinthSearchParams {
  query: string;
  projectType: ProjectType;
  mcVersion?: string;
  loader?: string;
  sortBy: string;
  limit: number;
  offset: number;
}

export async function searchModrinth({
  query,
  projectType,
  mcVersion,
  loader,
  sortBy,
  limit,
  offset,
}: ModrinthSearchParams): Promise<ModrinthHit[]> {
  const facets: string[][] = [[`project_type:${projectType}`]];
  if (mcVersion) facets.push([`versions:${mcVersion}`]);
  if (loader) facets.push([`categories:${loader.toLowerCase()}`]);
  let indexSort = sortBy;
  if (sortBy === "optimization") {
    facets.push(["categories:optimization"]);
    indexSort = "downloads";
  }
  const facetsStr = JSON.stringify(facets);
  const url =
    `${MODRINTH_API}/search?query=${encodeURIComponent(query)}` +
    `&facets=${encodeURIComponent(facetsStr)}&index=${indexSort}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch mods from Modrinth API");
  const data = await res.json();
  return (data.hits as ModrinthHit[]) || [];
}

export async function fetchProjectVersions(projectId: string): Promise<any[]> {
  const res = await fetch(`${MODRINTH_API}/project/${projectId}/version`);
  if (!res.ok) throw new Error(`Failed to fetch versions for ${projectId}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface CachedManifest {
  fetchedAt: number;
  versions: any[];
}

function readCachedManifest(): any[] | null {
  const cached = localStorage.getItem(MANIFEST_CACHE_KEY);
  if (!cached) return null;
  try {
    const parsed: CachedManifest = JSON.parse(cached);
    if (Date.now() - parsed.fetchedAt > MANIFEST_TTL_MS) return null;
    if (!Array.isArray(parsed.versions) || parsed.versions.length === 0) return null;
    return parsed.versions;
  } catch {
    return null;
  }
}

function cacheManifest(versions: any[]) {
  try {
    const payload: CachedManifest = { fetchedAt: Date.now(), versions };
    localStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Cache is best-effort; ignore quota issues.
  }
}

export async function fetchVersionManifest(retries = 2): Promise<any[]> {
  const cached = readCachedManifest();
  if (cached) return cached;

  // Prefer the native 24h file cache inside app_cache_dir.
  try {
    const { ipc } = await import("./ipc");
    const data = (await ipc.getCachedVersionManifest()) as { versions?: any[] };
    if (data && Array.isArray(data.versions) && data.versions.length > 0) {
      cacheManifest(data.versions);
      return data.versions;
    }
  } catch {
    // Native cache unavailable (browser dev) - fall through to network fetch.
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(VERSION_MANIFEST_URL);
      if (!res.ok) throw new Error(`Version manifest request failed (${res.status})`);
      const data = await res.json();
      if (data && Array.isArray(data.versions)) {
        cacheManifest(data.versions);
        return data.versions;
      }
      throw new Error("Version manifest has no versions array");
    } catch (e) {
      lastError = e;
      if (attempt < retries) await sleep(500 * (attempt + 1));
    }
  }
  throw lastError;
}