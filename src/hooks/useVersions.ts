import { useCallback, useEffect, useMemo, useState } from "react";
import type { VersionFilterState } from "../types";
import { loadVersionFilters } from "../services/storage";
import { fetchVersionManifest } from "../services/api";

const FALLBACK_VERSIONS = ["1.21.4", "1.21.1", "1.20.4", "1.19.4", "1.18.2", "1.16.5", "1.12.2", "1.8", "1.7.10"];

export interface VersionsApi {
  currentVersionsList: string[];
  versionFilters: VersionFilterState;
  toggleVersionFilter: (key: keyof VersionFilterState, checked: boolean) => void;
  manifestError: boolean;
}

export function useVersions(): VersionsApi {
  const [allVersionsRaw, setAllVersionsRaw] = useState<any[]>([]);
  const [manifestFailed, setManifestFailed] = useState(false);
  const [versionFilters, setVersionFilters] = useState<VersionFilterState>(() => loadVersionFilters());

  useEffect(() => {
    let cancelled = false;
    fetchVersionManifest()
      .then((versions) => {
        if (!cancelled) setAllVersionsRaw(versions);
      })
      .catch((error) => {
        console.error("Failed to load version manifest", error);
        if (!cancelled) setManifestFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentVersionsList = useMemo(() => {
    if (allVersionsRaw.length === 0) return FALLBACK_VERSIONS;
    return allVersionsRaw
      .filter((v) => versionFilters[v.type as keyof VersionFilterState])
      .map((v) => v.id);
  }, [allVersionsRaw, versionFilters]);

  const toggleVersionFilter = useCallback((key: keyof VersionFilterState, checked: boolean) => {
    setVersionFilters((prev) => {
      const next = { ...prev, [key]: checked };
      localStorage.setItem("vf_" + key, checked ? "true" : "false");
      return next;
    });
  }, []);

  return {
    currentVersionsList,
    versionFilters,
    toggleVersionFilter,
    manifestError: manifestFailed,
  };
}