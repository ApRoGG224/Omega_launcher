export type CatalogSource = "Modrinth" | "CurseForge";
export type CatalogTab = "modpacks" | "mods" | "shaders" | "tex";
export type CatalogLoader = "" | "Fabric" | "Forge" | "NeoForge" | "Quilt";
export type CatalogSort = "p" | "n" | "new";

export interface CatalogItem {
  id: string;
  title: string;
  author: string;
  desc: string;
  downloads: number;
  downloadsFormatted: string;
  loaders: string[];
  iconUrl?: string;
  iconFallback: "cube" | "layers" | "sun" | "compass" | "bolt";
  source: CatalogSource;
  projectType: CatalogTab;
  slug?: string;
}

export interface CatalogSearchParams {
  source: CatalogSource;
  tab: CatalogTab;
  query: string;
  loader: CatalogLoader;
  sort: CatalogSort;
  limit?: number;
  offset?: number;
}

const MODRINTH_API = "https://api.modrinth.com/v2";
const CURSEFORGE_API = "https://api.curseforge.com/v1";
const CURSEFORGE_KEY = "$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm";
const MINECRAFT_GAME_ID = 432;

export function formatDownloads(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return String(num);
}

function getIconFallback(tab: CatalogTab): CatalogItem["iconFallback"] {
  switch (tab) {
    case "modpacks":
      return "cube";
    case "mods":
      return "layers";
    case "shaders":
      return "sun";
    case "tex":
      return "compass";
    default:
      return "layers";
  }
}

async function searchModrinth(
  params: CatalogSearchParams,
  signal?: AbortSignal
): Promise<CatalogItem[]> {
  const { tab, query, loader, sort, limit = 15, offset = 0 } = params;

  const projectTypeMap: Record<CatalogTab, string> = {
    modpacks: "modpack",
    mods: "mod",
    shaders: "shader",
    tex: "resourcepack",
  };

  const facets: string[][] = [[`project_type:${projectTypeMap[tab]}`]];

  if (loader && (tab === "modpacks" || tab === "mods")) {
    facets.push([`categories:${loader.toLowerCase()}`]);
  }

  let index = "downloads";
  if (sort === "n") {
    index = query ? "relevance" : "downloads";
  } else if (sort === "new") {
    index = "updated";
  }

  const facetsStr = JSON.stringify(facets);
  const url = `${MODRINTH_API}/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(
    facetsStr
  )}&index=${index}&limit=${limit}&offset=${offset}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Modrinth API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const hits: any[] = data.hits || [];

  return hits.map((hit) => {
    const categories: string[] = hit.categories || [];
    const loaders = categories
      .filter((c) => ["fabric", "forge", "neoforge", "quilt"].includes(c.toLowerCase()))
      .map((c) => {
        if (c.toLowerCase() === "neoforge") return "NeoForge";
        return c.charAt(0).toUpperCase() + c.slice(1);
      });

    if (loaders.length === 0 && (tab === "shaders" || tab === "tex")) {
      loaders.push(tab === "shaders" ? "Iris" : "Vanilla");
    }

    return {
      id: hit.project_id || hit.slug,
      title: hit.title || hit.slug,
      author: hit.author || "Unknown",
      desc: hit.description || "",
      downloads: hit.downloads || 0,
      downloadsFormatted: `${formatDownloads(hit.downloads || 0)} скачиваний`,
      loaders: loaders.length > 0 ? loaders : ["Java"],
      iconUrl: hit.icon_url || undefined,
      iconFallback: getIconFallback(tab),
      source: "Modrinth",
      projectType: tab,
      slug: hit.slug,
    };
  });
}

async function searchCurseForge(
  params: CatalogSearchParams,
  signal?: AbortSignal
): Promise<CatalogItem[]> {
  const { tab, query, loader, sort, limit = 15, offset = 0 } = params;

  const classIdMap: Record<CatalogTab, number> = {
    modpacks: 4471,
    mods: 6,
    shaders: 6552,
    tex: 12,
  };

  const url = new URL(`${CURSEFORGE_API}/mods/search`);
  url.searchParams.set("gameId", String(MINECRAFT_GAME_ID));
  url.searchParams.set("classId", String(classIdMap[tab]));
  url.searchParams.set("pageSize", String(limit));
  url.searchParams.set("index", String(offset));

  if (query.trim()) {
    url.searchParams.set("searchFilter", query.trim());
  }

  if (loader && (tab === "modpacks" || tab === "mods")) {
    const loaderTypeMap: Record<string, number> = {
      Forge: 1,
      Fabric: 4,
      Quilt: 5,
      NeoForge: 6,
    };
    if (loaderTypeMap[loader]) {
      url.searchParams.set("modLoaderType", String(loaderTypeMap[loader]));
    }
  }

  if (sort === "p") {
    url.searchParams.set("sortField", "2");
    url.searchParams.set("sortOrder", "desc");
  } else if (sort === "n") {
    url.searchParams.set("sortField", query.trim() ? "1" : "4");
    url.searchParams.set("sortOrder", "asc");
  } else if (sort === "new") {
    url.searchParams.set("sortField", "3");
    url.searchParams.set("sortOrder", "desc");
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "x-api-key": CURSEFORGE_KEY,
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`CurseForge API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const data: any[] = json.data || [];

  const LOADER_NAME_MAP: Record<number, string> = {
    1: "Forge",
    4: "Fabric",
    5: "Quilt",
    6: "NeoForge",
  };

  return data.map((mod) => {
    const loaderSet = new Set<string>();
    if (Array.isArray(mod.latestFilesIndexes)) {
      for (const item of mod.latestFilesIndexes) {
        if (item.modLoader && LOADER_NAME_MAP[item.modLoader]) {
          loaderSet.add(LOADER_NAME_MAP[item.modLoader]);
        }
      }
    }

    const loaders = Array.from(loaderSet);
    if (loaders.length === 0) {
      if (tab === "shaders") loaders.push("Iris", "OptiFine");
      else if (tab === "tex") loaders.push("Vanilla");
      else loaders.push("Java");
    }

    const author =
      Array.isArray(mod.authors) && mod.authors[0] && mod.authors[0].name
        ? mod.authors[0].name
        : "Unknown";

    const iconUrl =
      mod.logo?.thumbnailUrl || mod.logo?.url || undefined;

    return {
      id: String(mod.id),
      title: mod.name || "Untitled",
      author,
      desc: mod.summary || "",
      downloads: mod.downloadCount || 0,
      downloadsFormatted: `${formatDownloads(mod.downloadCount || 0)} скачиваний`,
      loaders,
      iconUrl,
      iconFallback: getIconFallback(tab),
      source: "CurseForge",
      projectType: tab,
      slug: mod.slug,
    };
  });
}

export async function searchCatalog(
  params: CatalogSearchParams,
  signal?: AbortSignal
): Promise<CatalogItem[]> {
  if (params.source === "CurseForge") {
    return searchCurseForge(params, signal);
  }
  return searchModrinth(params, signal);
}
