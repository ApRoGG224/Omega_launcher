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

export interface MojangVersionItem {
  id: string;
  type: "release" | "snapshot" | "old_beta" | "old_alpha";
  url: string;
  time: string;
  releaseTime: string;
  sha1?: string;
  complianceLevel?: number;
}

export interface MojangVersionManifestData {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MojangVersionItem[];
}

interface CachedManifest {
  fetchedAt: number;
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MojangVersionItem[];
}

function readCachedManifest(): MojangVersionManifestData | null {
  const cached = localStorage.getItem(MANIFEST_CACHE_KEY);
  if (!cached) return null;
  try {
    const parsed: CachedManifest = JSON.parse(cached);
    if (Date.now() - parsed.fetchedAt > MANIFEST_TTL_MS) return null;
    if (!Array.isArray(parsed.versions) || parsed.versions.length === 0) return null;
    return {
      latest: parsed.latest || { release: "26.3", snapshot: "26.4-snapshot-8" },
      versions: parsed.versions,
    };
  } catch {
    return null;
  }
}

function cacheManifest(data: MojangVersionManifestData) {
  try {
    const payload: CachedManifest = {
      fetchedAt: Date.now(),
      latest: data.latest,
      versions: data.versions,
    };
    localStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Cache is best-effort; ignore quota issues.
  }
}

export async function fetchFullVersionManifest(retries = 2): Promise<MojangVersionManifestData> {
  const cached = readCachedManifest();
  if (cached) return cached;

  // Prefer the native 24h file cache inside app_cache_dir.
  try {
    const { ipc } = await import("./ipc");
    const data = (await ipc.getCachedVersionManifest()) as {
      latest?: { release: string; snapshot: string };
      versions?: MojangVersionItem[];
    };
    if (data && Array.isArray(data.versions) && data.versions.length > 0) {
      const result: MojangVersionManifestData = {
        latest: data.latest || { release: "26.3", snapshot: "26.4-snapshot-8" },
        versions: data.versions,
      };
      cacheManifest(result);
      return result;
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
        const result: MojangVersionManifestData = {
          latest: data.latest || { release: "26.3", snapshot: "26.4-snapshot-8" },
          versions: data.versions,
        };
        cacheManifest(result);
        return result;
      }
      throw new Error("Version manifest has no versions array");
    } catch (e) {
      lastError = e;
      if (attempt < retries) await sleep(500 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function fetchVersionManifest(retries = 2): Promise<MojangVersionItem[]> {
  const full = await fetchFullVersionManifest(retries);
  return full.versions;
}