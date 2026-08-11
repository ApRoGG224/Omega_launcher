import { useCallback, useEffect, useRef, useState } from "react";
import type { ModrinthHit, ProjectType } from "../types";
import { searchModrinth, fetchProjectVersions } from "../services/api";
import { ipc } from "../services/ipc";

const LIMIT = 24;

export interface ModrinthSearchApi {
  query: string;
  setQuery: (v: string) => void;
  mods: ModrinthHit[];
  loading: boolean;
  offset: number;
  fetchError: string | null;
  mcVersion: string;
  setMcVersion: (v: string) => void;
  modLoader: string;
  setModLoader: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  searchMods: (isLoadMore?: boolean) => Promise<void>;
}

export function useModrinthSearch(
  projectType: ProjectType,
  language: string,
  t: any,
): ModrinthSearchApi {
  const [query, setQuery] = useState("");
  const [mods, setMods] = useState<ModrinthHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [mcVersion, setMcVersion] = useState("1.21.4");
  const [modLoader, setModLoader] = useState(
    ["resourcepack", "datapack", "shader"].includes(projectType) ? "" : "fabric",
  );
  const [sortBy, setSortBy] = useState("downloads");

  // Guards against out-of-order responses when the language, filters, or query change quickly.
  const requestSeqRef = useRef(0);

  const searchMods = useCallback(async (isLoadMore = false) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      const currentOffset = isLoadMore ? offset + LIMIT : 0;
      const hits = await searchModrinth({
        query,
        projectType,
        mcVersion,
        loader: modLoader,
        sortBy,
        limit: LIMIT,
        offset: currentOffset,
      });

      if (seq !== requestSeqRef.current) return;
      setFetchError(null);

      if (isLoadMore) {
        setMods((prev) => [...prev, ...hits]);
        setOffset(currentOffset);
      } else {
        setMods(hits);
        setOffset(0);
      }

      // Translate descriptions in the background if language is 'ru'.
      if (hits.length > 0 && language === "ru") {
        hits.forEach((hit) => {
          ipc
            .translateText(hit.description, "ru")
            .then((translatedDesc) => {
              if (seq !== requestSeqRef.current) return;
              if (translatedDesc && typeof translatedDesc === "string" && translatedDesc !== hit.description) {
                setMods((prev) =>
                  prev.map((m) =>
                    m.project_id === hit.project_id ? { ...m, description: translatedDesc } : m,
                  ),
                );
              }
            })
            .catch(() => {});
        });
      }
    } catch (e) {
      console.error("Failed to fetch mods", e);
      if (seq === requestSeqRef.current) {
        setFetchError(t.downloadError || "Failed to load mods");
      }
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [query, projectType, mcVersion, modLoader, sortBy, language, offset, t]);

  useEffect(() => {
    searchMods(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcVersion, modLoader, sortBy, language, projectType]);

  return {
    query,
    setQuery,
    mods,
    loading,
    offset,
    fetchError,
    mcVersion,
    setMcVersion,
    modLoader,
    setModLoader,
    sortBy,
    setSortBy,
    searchMods,
  };
}

export function findCompatVersion(
  versions: any[],
  mcVersion: string,
  loader: string,
  projectType: string,
): any | null {
  return (
    versions.find((v) =>
      v.game_versions.includes(mcVersion) &&
      (projectType === "resourcepack" || projectType === "shader" || v.loaders.includes(loader)),
    ) || null
  );
}

export function pickPrimaryFile(version: any): { url: string; filename: string } | null {
  const file = (version.files || []).find((f: any) => f.primary) || (version.files || [])[0];
  return file ? { url: file.url, filename: file.filename } : null;
}

export { fetchProjectVersions };