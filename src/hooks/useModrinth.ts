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
  const cancelTranslationsRef = useRef<(() => void) | null>(null);

  const searchMods = useCallback(async (isLoadMore = false) => {
    const seq = ++requestSeqRef.current;
    cancelTranslationsRef.current?.();
    cancelTranslationsRef.current = null;
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
        let cancelled = false;
        const cancelTranslations = () => {
          cancelled = true;
        };
        cancelTranslationsRef.current = cancelTranslations;
        void Promise.all(
          hits.map(async (hit) => {
            if (cancelled || seq !== requestSeqRef.current) return null;
            try {
              const translatedDesc = await ipc.translateText(hit.description, "ru");
              if (cancelled || seq !== requestSeqRef.current) return null;
              return translatedDesc && translatedDesc !== hit.description
                ? [hit.project_id, translatedDesc] as const
                : null;
            } catch {
              return null;
            }
          }),
        ).then((translations) => {
          if (cancelled || seq !== requestSeqRef.current) return;
          const translatedById = new Map(
            translations.filter((item): item is readonly [string, string] => item !== null),
          );
          if (translatedById.size === 0) return;
          setMods((prev) =>
            prev.map((mod) => {
              const description = translatedById.get(mod.project_id);
              return description ? { ...mod, description } : mod;
            }),
          );
          if (cancelTranslationsRef.current === cancelTranslations) {
            cancelTranslationsRef.current = null;
          }
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

  useEffect(() => () => {
    requestSeqRef.current += 1;
    cancelTranslationsRef.current?.();
    cancelTranslationsRef.current = null;
  }, []);

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
