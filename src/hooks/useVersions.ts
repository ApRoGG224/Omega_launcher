import { useCallback, useEffect, useMemo, useState } from "react";
import type { VersionFilterState } from "../types";
import { loadVersionFilters } from "../services/storage";
import { fetchFullVersionManifest, type MojangVersionItem } from "../services/api";

export interface UiVersionItem {
  version: string;
  tag: string;
  type: "release" | "snapshot" | "old_beta" | "old_alpha";
  isSnapshot: boolean;
  releaseTime?: string;
}

export function getVersionTag(
  id: string,
  type: string,
  latestRelease?: string,
  latestSnapshot?: string
): string {
  if (latestRelease && id === latestRelease) return "ПОСЛЕДНИЙ РЕЛИЗ";
  if (latestSnapshot && id === latestSnapshot) return "НОВЫЙ СНАПШОТ";
  if (id === "1.21.4") return "СВЕЖИЙ РЕЛИЗ";
  if (id === "1.20.1") return "СТАБИЛЬНАЯ";
  if (id === "1.19.4") return "РЕЛИЗ";
  if (id === "1.18.2") return "CAVES & CLIFFS";
  if (id === "1.16.5") return "NETHER КЛАССИКА";
  if (id === "1.12.2") return "FORGE LEGACY";
  if (id === "1.8.9") return "PVP КЛАССИКА";
  if (id === "1.8") return "PVP РЕЛИЗ";
  if (id === "1.7.10") return "КЛАССИКА МОДОВ";
  if (id === "1.5.2") return "GOLDEN AGE";
  if (id === "1.2.5") return "РЕТРО 1.2";
  if (id === "1.0") return "RELEASE 1.0";
  if (type === "release") return "РЕЛИЗ";
  if (type === "snapshot") return "СНАПШОТ";
  if (type === "old_beta") return "BETA";
  if (type === "old_alpha") return "ALPHA";
  return "ВЕРСИЯ";
}

export const POPULAR_VERSION_IDS = [
  "26.3",
  "1.21.4",
  "1.20.1",
  "1.19.4",
  "1.18.2",
  "1.16.5",
  "1.12.2",
  "1.8.9",
  "1.8",
  "1.7.10",
  "1.5.2",
  "26.4-snapshot-8",
];

export const FALLBACK_RELEASES = [
  "26.3", "26.2", "26.1.2", "26.1.1", "26.1",
  "1.21.11", "1.21.10", "1.21.9", "1.21.8", "1.21.7", "1.21.6", "1.21.5", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21",
  "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20",
  "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19",
  "1.18.2", "1.18.1", "1.18",
  "1.17.1", "1.17",
  "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16",
  "1.15.2", "1.15.1", "1.15",
  "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14",
  "1.13.2", "1.13.1", "1.13",
  "1.12.2", "1.12.1", "1.12",
  "1.11.2", "1.11.1", "1.11",
  "1.10.2", "1.10.1", "1.10",
  "1.9.4", "1.9.3", "1.9.2", "1.9.1", "1.9",
  "1.8.9", "1.8.8", "1.8.7", "1.8.6", "1.8.5", "1.8.4", "1.8.3", "1.8.2", "1.8.1", "1.8",
  "1.7.10", "1.7.9", "1.7.8", "1.7.7", "1.7.6", "1.7.5", "1.7.4", "1.7.3", "1.7.2",
  "1.6.4", "1.6.2", "1.6.1",
  "1.5.2", "1.5.1",
  "1.4.7", "1.4.6", "1.4.5", "1.4.4", "1.4.2",
  "1.3.2", "1.3.1",
  "1.2.5", "1.2.4", "1.2.3", "1.2.2", "1.2.1",
  "1.1", "1.0"
];

export const FALLBACK_SNAPSHOTS = [
  "26.4-snapshot-8", "26.4-snapshot-7", "26.4-snapshot-6", "26.4-snapshot-5",
  "26.4-snapshot-4", "26.4-snapshot-3", "26.4-snapshot-2", "26.4-snapshot-1",
  "26.3-rc-3", "26.3-rc-2", "26.3-rc-1", "26.3-pre-3", "26.3-pre-2", "26.3-pre-1",
  "26.3-snapshot-10", "26.3-snapshot-9", "26.3-snapshot-8", "26.3-snapshot-7",
  "25w06a", "24w45a"
];

export const FALLBACK_UI_VERSIONS: UiVersionItem[] = [
  ...FALLBACK_RELEASES.map((id) => ({
    version: id,
    tag: getVersionTag(id, "release", "26.3", "26.4-snapshot-8"),
    type: "release" as const,
    isSnapshot: false,
  })),
  ...FALLBACK_SNAPSHOTS.map((id) => ({
    version: id,
    tag: getVersionTag(id, "snapshot", "26.3", "26.4-snapshot-8"),
    type: "snapshot" as const,
    isSnapshot: true,
  })),
];

export interface VersionsApi {
  allVersions: UiVersionItem[];
  popularVersions: UiVersionItem[];
  latestRelease: string;
  latestSnapshot: string;
  isLoading: boolean;
  manifestError: boolean;
  totalCount: number;
  releasesCount: number;
  snapshotsCount: number;
  betaAlphaCount: number;
  reload: () => Promise<void>;
  currentVersionsList: string[];
  versionFilters: VersionFilterState;
  toggleVersionFilter: (key: keyof VersionFilterState, checked: boolean) => void;
}

export function useVersions(): VersionsApi {
  const [allVersionsRaw, setAllVersionsRaw] = useState<MojangVersionItem[]>([]);
  const [latestRelease, setLatestRelease] = useState<string>("26.3");
  const [latestSnapshot, setLatestSnapshot] = useState<string>("26.4-snapshot-8");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [manifestError, setManifestError] = useState(false);
  const [versionFilters, setVersionFilters] = useState<VersionFilterState>(() => loadVersionFilters());

  const loadManifest = useCallback(async () => {
    setIsLoading(true);
    setManifestError(false);
    try {
      const data = await fetchFullVersionManifest();
      if (data && Array.isArray(data.versions) && data.versions.length > 0) {
        setAllVersionsRaw(data.versions);
        if (data.latest) {
          if (data.latest.release) setLatestRelease(data.latest.release);
          if (data.latest.snapshot) setLatestSnapshot(data.latest.snapshot);
        }
      }
    } catch (error) {
      console.warn("Failed to load official Minecraft version manifest:", error);
      setManifestError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadManifest();
  }, [loadManifest]);

  const allVersions = useMemo<UiVersionItem[]>(() => {
    if (allVersionsRaw.length === 0) {
      return FALLBACK_UI_VERSIONS;
    }
    return allVersionsRaw.map((v) => ({
      version: v.id,
      tag: getVersionTag(v.id, v.type, latestRelease, latestSnapshot),
      type: v.type,
      isSnapshot: v.type === "snapshot",
      releaseTime: v.releaseTime,
    }));
  }, [allVersionsRaw, latestRelease, latestSnapshot]);

  const releasesCount = useMemo(() => {
    return allVersions.filter((v) => !v.isSnapshot && v.type === "release").length;
  }, [allVersions]);

  const snapshotsCount = useMemo(() => {
    return allVersions.filter((v) => v.isSnapshot || v.type === "snapshot").length;
  }, [allVersions]);

  const betaAlphaCount = useMemo(() => {
    return allVersions.filter((v) => v.type === "old_beta" || v.type === "old_alpha").length;
  }, [allVersions]);

  const popularVersions = useMemo(() => {
    const map = new Map<string, UiVersionItem>();
    for (const v of allVersions) {
      map.set(v.version, v);
    }
    const result: UiVersionItem[] = [];
    for (const id of POPULAR_VERSION_IDS) {
      const found = map.get(id);
      if (found) {
        result.push(found);
      } else {
        result.push({
          version: id,
          tag: getVersionTag(id, id.includes("snapshot") ? "snapshot" : "release", latestRelease, latestSnapshot),
          type: id.includes("snapshot") ? "snapshot" : "release",
          isSnapshot: id.includes("snapshot"),
        });
      }
    }
    return result;
  }, [allVersions, latestRelease, latestSnapshot]);

  const currentVersionsList = useMemo(() => {
    if (allVersionsRaw.length === 0) return FALLBACK_RELEASES;
    return allVersionsRaw
      .filter((v) => versionFilters[v.type as keyof VersionFilterState])
      .map((v) => v.id);
  }, [allVersionsRaw, versionFilters]);

  const toggleVersionFilter = useCallback((key: keyof VersionFilterState, checked: boolean) => {
    setVersionFilters((prev: VersionFilterState) => {
      const next = { ...prev, [key]: checked };
      try {
        localStorage.setItem("vf_" + String(key), checked ? "true" : "false");
      } catch {
      }
      return next;
    });
  }, []);

  return {
    allVersions,
    popularVersions,
    latestRelease,
    latestSnapshot,
    isLoading,
    manifestError,
    totalCount: allVersions.length,
    releasesCount,
    snapshotsCount,
    betaAlphaCount,
    reload: loadManifest,
    currentVersionsList,
    versionFilters,
    toggleVersionFilter,
  };
}
