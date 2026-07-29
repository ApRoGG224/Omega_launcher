import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { HexColorPicker } from "react-colorful";
import { open } from "@tauri-apps/plugin-dialog";
import { translations, Language } from './i18n';
import "./App.css";

// ---------------------------------
// ИКОНКИ (Мемоизированные)
// ---------------------------------

const IconHome = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>);
const IconBox = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>);
const IconUsers = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>);
const IconSettings = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>);
const IconPlay = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>);
const IconCpu = React.memo(() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>);
const IconFolder = React.memo(() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>);

const IconCheck = React.memo(() => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>);
const IconChevronDown = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>);
const IconPlus = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>);
const IconUser = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);
const IconMicrosoft = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" fill="#f35325"/><rect x="13" y="3" width="8" height="8" fill="#81bc06"/><rect x="3" y="13" width="8" height="8" fill="#05a6f0"/><rect x="13" y="13" width="8" height="8" fill="#ffba08"/></svg>);
const IconSearch = React.memo(() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);
const IconDownload = React.memo(() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>);
const IconX = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);
const IconTrash = React.memo(() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>);
const IconArrowLeft = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>);

type AccountType = "microsoft" | "offline";
interface Account {
  name: string;
  type: AccountType;
}

interface ModpackInstance {
  id: string;
  name: string;
  mcVersion: string;
  loader: string;
  x: number;
  y: number;
  icon?: string;
}

const VERSIONS_LIST = ["1.21.4", "1.21.1", "1.20.4", "1.19.4", "1.18.2", "1.16.5", "1.12.2", "1.8", "1.7.10"];
const LOADERS_LIST = ["Vanilla", "Fabric", "Forge", "NeoForge", "Quilt"];

const FRIENDS_LIST = [
  { id: "1", name: "пронуб_228", status: "В игре (1.20.1)", online: true, activity: "Играет на Hypixel" },
  { id: "2", name: "Alex_Crafter", status: "В сети", online: true, activity: "В главном меню" },
  { id: "3", name: "Steve_Pro", status: "Офлайн", online: false, activity: "Был 15 мин назад" }
];

const RECENT_SERVERS = [
  { id: "1", name: "Hypixel Network", ip: "mc.hypixel.net", version: "1.20.1", players: "42 150 онлайн", icon: "🎮" },
  { id: "2", name: "Omega SMP", ip: "smp.omega-launcher.org", version: "1.20.1", players: "18 онлайн", icon: "⚡" }
];


// ---------------------------------
// КОМПОНЕНТЫ
// ---------------------------------

const MOD_ICONS = [
  "https://cdn.modrinth.com/data/AANobbMI/295862f4724dc3f78df3447ad6072b2dcd3ef0c9_96.webp", // Sodium
  "https://cdn.modrinth.com/data/YL57xq9U/18d0e7f076d3d6ed5bedd472b853909aac5da202_96.webp", // Iris
  "https://cdn.modrinth.com/data/P7dR8mSH/icon.png", // Fabric API
];

const RESOURCEPACK_ICONS = [
  "https://cdn.modrinth.com/data/50dA9Sha/3132c10e9e3c73fde9799720fd3da5561071708c_96.webp", 
  "https://cdn.modrinth.com/data/yfDziwn1/907581019df45903df237952ce8d10ac37134cb5_96.webp",
  "https://cdn.modrinth.com/data/uvpymuxq/fe1a61998ae57dc6ad1a4bb028334c3c3925d22f_96.webp",
];

const MODPACK_ICONS = [
  "https://cdn.modrinth.com/data/1KVo5zza/d8152911f8fd5d7e9a8c499fe89045af81fe816e_96.webp", // Fabulously Optimized
  "https://cdn.modrinth.com/data/l9m9tuPN/fefe3f67c37744344d100638452c7bf059d586a1_96.webp", 
  "https://cdn.modrinth.com/data/5FFgwNNP/e7f9ee2e9d361623847853fe2ddce42f519ee64f.png", 
];

const SHADER_ICONS = [
  "https://cdn.modrinth.com/data/HVnmMxH1/79cb7c8123bbc54945305b2ebad6b8881efdf5f8_96.webp",
  "https://cdn.modrinth.com/data/R6NEzAwj/c85ce4049aac76360d2cd24fd9a7003de01ef312_96.webp",
  "https://cdn.modrinth.com/data/Q1vvjJYV/2a611a3cb434fb52fb81fa5dace13c5d8b67e55d_96.webp",
];

const DATAPACK_ICONS = [
  "https://cdn.modrinth.com/data/OhduvhIc/5ea1f538e66ee4d4e5e571ad952cba0e06e0bd5c.png",
  "https://cdn.modrinth.com/data/8oi3bsk5/1959d924a1088944bbf07a06ba523726112d7e7a_96.webp",
  "https://cdn.modrinth.com/data/tpehi7ww/429ba22d212868940cdd82465df949ac51c9791e_96.webp",
];


const AnimatedIcon = React.memo(({ images, interval = 3000 }: { images: string[], interval?: number }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, interval]);

  return (
    <div style={{ position: 'relative', width: '22px', height: '22px', margin: '0 auto' }}>
      {images.map((img, idx) => (
        <img 
          key={img}
          src={img}
          alt="icon"
          draggable={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '6px',
            opacity: currentIndex === idx ? 1 : 0,
            transition: 'opacity 0.6s ease-in-out',
            objectFit: 'cover'
          }}
        />
      ))}
    </div>
  );
});




const ModsPanel = React.memo(({ instances, t, language, projectType = "mod", onCreateModpack, versionsList = VERSIONS_LIST }: { instances: ModpackInstance[], t: any, language: string, projectType?: "mod" | "resourcepack" | "modpack" | "shader" | "datapack", onCreateModpack?: (name: string, mcVer: string, loader: string, iconUrl?: string, projectId?: string) => void, versionsList?: string[] }) => {
  const [query, setQuery] = useState("");
  const [mods, setMods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const LIMIT = 24;

  const [mcVersion, setMcVersion] = useState("1.21.4");
  const [modLoader, setModLoader] = useState(["resourcepack", "datapack", "shader"].includes(projectType) ? "" : "fabric");
  
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [loaderMenuOpen, setLoaderMenuOpen] = useState(false);
  const [verSearch, setVerSearch] = useState("");
  
  const [sortBy, setSortBy] = useState("downloads");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [installModalOpen, setInstallModalOpen] = useState<string | null>(null);
  const [worldSelectState, setWorldSelectState] = useState<{
    modId: string;
    instanceId: string;
    worlds: string[];
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<string>("");
  const [shaderInstallState, setShaderInstallState] = useState<{
    modId: string;
    instanceId: string;
    loader: "fabric" | "forge" | "";
  } | null>(null);

  const searchMods = useCallback(async (q: string, ver: string, loader: string, sortOpt: string, isLoadMore = false) => {
    setLoading(true);
    try {
       const facets: any[] = [[`project_type:${projectType}`]];
       if (ver && ver !== "") {
         facets.push([`versions:${ver}`]);
       }
       if (loader && loader !== "") {
         facets.push([`categories:${loader.toLowerCase()}`]);
       }
       
       let indexSort = sortOpt;
       if (sortOpt === "optimization") {
         facets.push(["categories:optimization"]);
         indexSort = "downloads"; // when looking for optimization, sort by popularity
       }
       
       const currentOffset = isLoadMore ? offset + LIMIT : 0;
       const facetsStr = JSON.stringify(facets);
       const res = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(q)}&facets=${encodeURIComponent(facetsStr)}&index=${indexSort}&limit=${LIMIT}&offset=${currentOffset}`);
       if (!res.ok) throw new Error("Failed to fetch mods from Modrinth API");
       const data = await res.json();
       
       let finalHits = data.hits || [];
       
       setFetchError(null);
       
       if (data.hits) {
         if (isLoadMore) {
           setMods(prev => [...prev, ...finalHits]);
           setOffset(currentOffset);
         } else {
           setMods(finalHits);
           setOffset(0);
         }
         
         // Translate descriptions in the background if language is 'ru'
         if (finalHits.length > 0 && language === "ru") {
           finalHits.forEach((hit: any) => {
             invoke("translate_text", { text: hit.description, targetLang: "ru" })
               .then((translatedDesc) => {
                 if (translatedDesc && typeof translatedDesc === 'string' && translatedDesc !== hit.description) {
                   setMods(prev => prev.map(m => m.project_id === hit.project_id ? { ...m, description: translatedDesc } : m));
                 }
               })
               .catch(() => {});
           });
         }
       }
    } catch(e) {
       console.error("Failed to fetch mods", e);
       setFetchError(t.downloadError || "Failed to load mods");
    }
    setLoading(false);
  }, [offset, t]);

  useEffect(() => {
    searchMods(query, mcVersion, modLoader, sortBy, false);
    // eslint-disable-next-line
  }, [mcVersion, modLoader, sortBy, language, projectType]);

  useEffect(() => {
    const handleClick = () => {
      setVersionMenuOpen(false);
      setLoaderMenuOpen(false);
      setSortMenuOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleInstallClick = (projectId: string) => {
    if (projectType === "modpack") {
      const mod = mods.find(m => m.project_id === projectId);
      if (mod && onCreateModpack) {
        const loader = mod.categories?.includes("forge") ? "forge" : mod.categories?.includes("neoforge") ? "neoforge" : mod.categories?.includes("quilt") ? "quilt" : "fabric";
        onCreateModpack(mod.title, mcVersion, loader, mod.icon_url, mod.project_id);
      }
      return;
    }
    setInstallModalOpen(projectId);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 50;
    if (bottom && !loading && mods.length >= LIMIT) {
      searchMods(query, mcVersion, modLoader, sortBy, true);
    }
  };

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const confirmInstall = async (instanceId: string) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;
    
    const modIdToDownload = installModalOpen;
    if (!modIdToDownload) return;
    const isShader = projectType === "shader";

    if (projectType === "datapack") {
      setLoading(true);
      try {
        const worlds = await invoke<string[]>("list_worlds", { instanceId });
        setInstallModalOpen(null);
        setWorldSelectState({ modId: modIdToDownload, instanceId, worlds: worlds || [], loading: false, error: null });
        setSelectedWorld(worlds?.[0] || "");
      } catch (e: any) {
        setInstallModalOpen(null);
        setWorldSelectState({ modId: modIdToDownload, instanceId, worlds: [], loading: false, error: "Не удалось загрузить список миров" });
      }
      setLoading(false);
      return;
    }

    if (isShader) {
      setInstallModalOpen(null);
      setShaderInstallState({ modId: modIdToDownload, instanceId, loader: "" });
      return;
    }

    setInstallModalOpen(null);
    setLoading(true);
    try {
        await invoke("download_mod", { 
            modId: modIdToDownload, 
            mcVersion: inst.mcVersion, 
            loader: inst.loader === "Vanilla" ? "fabric" : inst.loader,
            instanceId: instanceId,
            projectType: projectType,
            worldName: null
        });
        showNotification(projectType === "mod" ? "Мод успешно скачан и установлен в сборку!" : "Ресурспак успешно скачан и установлен в сборку!", 'success');
    } catch (e: any) {
        if (typeof e === 'string' && e.includes("ALREADY_EXISTS")) {
            showNotification(projectType === 'mod' ? t.modAlreadyInstalled : "Ресурспак уже установлен в эту сборку", 'error');
        } else {
            showNotification((projectType === 'mod' ? t.modInstallError : "Ошибка при установке ресурспака: ") + e, 'error');
        }
    }
    setLoading(false);
  };

  const confirmWorldInstall = async () => {
    if (!worldSelectState) return;
    const inst = instances.find(i => i.id === worldSelectState.instanceId);
    if (!inst || !selectedWorld) return;
    const modIdToDownload = worldSelectState.modId;
    setWorldSelectState(null);
    setLoading(true);
    try {
      await invoke("download_mod", {
        modId: modIdToDownload,
        mcVersion: inst.mcVersion,
        loader: inst.loader === "Vanilla" ? "fabric" : inst.loader,
        instanceId: inst.id,
        projectType: "datapack",
        worldName: selectedWorld
      });
      showNotification("Датапак успешно скачан в выбранный мир!", "success");
    } catch (e: any) {
      if (typeof e === 'string' && e.includes("ALREADY_EXISTS")) {
        showNotification("Датапак уже установлен в этот мир", 'error');
      } else {
        showNotification("Ошибка при установке датапака: " + e, 'error');
      }
    }
    setLoading(false);
  };

  const confirmShaderInstall = async (loader: "fabric" | "forge") => {
    if (!shaderInstallState) return;
    const inst = instances.find(i => i.id === shaderInstallState.instanceId);
    if (!inst) return;
    setShaderInstallState(null);
    setLoading(true);
    try {
      await invoke("download_mod", {
        modId: shaderInstallState.modId,
        mcVersion: inst.mcVersion,
        loader,
        instanceId: inst.id,
        projectType: "shader",
        worldName: null
      });
      showNotification(loader === "fabric" ? "Шейдер успешно скачан для Fabric (Iris установлен автоматически)!" : "Шейдер успешно скачан для Forge!", "success");
    } catch (e: any) {
      if (typeof e === 'string' && e.includes("ALREADY_EXISTS")) {
        showNotification("Шейдер уже установлен в эту сборку", 'error');
      } else {
        showNotification("Ошибка при установке шейдера: " + e, 'error');
      }
    }
    setLoading(false);
  };

  return (
      <div className="settings-panel" style={{ marginTop: 0, height: "100%", display: "flex", flexDirection: "column", position: "relative", padding: "10px 0 0 0", background: "transparent", border: "none", boxShadow: "none" }}>
         <div className="mods-search-bar" style={{ flexShrink: 0 }}>
           <div className="custom-dropdown-container" onClick={(e) => { e.stopPropagation(); setVersionMenuOpen(prev => !prev); setLoaderMenuOpen(false); setSortMenuOpen(false); }} style={{ minWidth: "100px" }}>
             <div className="custom-dropdown-btn" style={{ height: "46px" }}>
               {mcVersion === "" ? t.anyVersion : mcVersion} <IconChevronDown />
             </div>
             {versionMenuOpen && (
               <div className="custom-dropdown-menu">
                 <input type="text" placeholder="Поиск..." value={verSearch} onChange={e => setVerSearch(e.target.value)} onClick={e => e.stopPropagation()} style={{ margin: '5px', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', outline: 'none' }} />
                 {["", ...versionsList].filter(v => v.includes(verSearch.toLowerCase())).map(v => (
                   <div key={v} className="custom-dropdown-item" onClick={() => setMcVersion(v)}>{v === "" ? t.anyVersion : v}</div>
                 ))}
               </div>
             )}
           </div>

           {projectType !== "resourcepack" && (
             <div className="custom-dropdown-container" onClick={(e) => { e.stopPropagation(); setLoaderMenuOpen(prev => !prev); setVersionMenuOpen(false); setSortMenuOpen(false); }} style={{ minWidth: "110px" }}>
               <div className="custom-dropdown-btn" style={{ height: "46px" }}>
                 {modLoader === "" ? t.anyLoader : modLoader} <IconChevronDown />
               </div>
               {loaderMenuOpen && (
                 <div className="custom-dropdown-menu">
                   {["", "fabric", "forge", "quilt", "neoforge"].map(l => (
                     <div key={l} className="custom-dropdown-item" onClick={() => setModLoader(l)}>{l === "" ? t.anyLoader : l}</div>
                   ))}
                 </div>
               )}
             </div>
           )}

           {projectType !== "resourcepack" && (
             <div className="custom-dropdown-container" onClick={(e) => { e.stopPropagation(); setSortMenuOpen(prev => !prev); setVersionMenuOpen(false); setLoaderMenuOpen(false); }} style={{ minWidth: "160px" }}>
               <div className="custom-dropdown-btn" style={{ height: "46px" }}>
                 {sortBy === "downloads" ? t.sortDownloads : sortBy === "follows" ? (projectType === 'modpack' ? "Лучшие сборки" : projectType === 'shader' ? "Лучшие шейдеры" : t.sortFollows) : sortBy === "optimization" ? t.sortOptimization : sortBy === "newest" ? t.sortNewest : t.sortUpdated} <IconChevronDown />
               </div>
               {sortMenuOpen && (
                 <div className="custom-dropdown-menu">
                   <div className="custom-dropdown-item" onClick={() => setSortBy("downloads")}>{t.sortDownloads}</div>
                   {projectType !== "datapack" && (
                     <div className="custom-dropdown-item" onClick={() => setSortBy("follows")}>{projectType === 'modpack' ? "Лучшие сборки" : projectType === 'shader' ? "Лучшие шейдеры" : t.sortFollows}</div>
                   )}
                   {projectType !== "datapack" && projectType !== "shader" && (
                     <div className="custom-dropdown-item" onClick={() => setSortBy("optimization")}>{t.sortOptimization}</div>
                   )}
                   <div className="custom-dropdown-item" onClick={() => setSortBy("newest")}>{t.sortNewest}</div>
                   <div className="custom-dropdown-item" onClick={() => setSortBy("updated")}>{t.sortUpdated}</div>
                 </div>
               )}
             </div>
           )}

           <input 
             type="text" 
             placeholder={`${projectType === 'mod' ? t.searchModPlaceholder : projectType === 'modpack' ? "Поиск готовых сборок для" : projectType === 'shader' ? "Поиск шейдеров для" : projectType === 'datapack' ? "Поиск датапаков для" : "Поиск ресурспаков для"} ${mcVersion === "" ? t.anyVersion : mcVersion}...`} 
             value={query} 
             onChange={(e) => setQuery(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && searchMods(query, mcVersion, modLoader, sortBy, false)}
           />
           <button onClick={() => searchMods(query, mcVersion, modLoader, sortBy, false)} disabled={loading}>
             {loading ? "..." : <IconSearch />}
           </button>
         </div>

         {fetchError && (
           <div style={{ color: "#ef4444", textAlign: "center", padding: "20px" }}>
             {fetchError}
           </div>
         )}
         {!fetchError && (
           <div className="mods-grid" style={{ flex: 1, overflowY: "auto" }} onScroll={handleScroll}>
             {mods.map((mod, idx) => (
             <div key={`${mod.project_id}-${idx}`} className="mod-card">
               <div className="mod-header">
                 <img src={mod.icon_url || "https://cdn.modrinth.com/favicon.ico"} alt={mod.title} className="mod-icon" draggable={false} />
                 <div className="mod-info">
                   <div className="mod-title">{mod.title}</div>
                   <div className="mod-author">{t.byAuthor} {mod.author}</div>
                 </div>
               </div>
               <div className="mod-desc">{mod.description}</div>
               <div className="mod-footer">
                 <div className="mod-downloads">
                   <IconDownload /> {mod.downloads >= 1000000 ? (mod.downloads / 1000000).toFixed(1) + 'M' : mod.downloads >= 1000 ? (mod.downloads / 1000).toFixed(1) + 'K' : mod.downloads}
                 </div>
                 <button className="mod-install-btn" onClick={() => handleInstallClick(mod.project_id)}>{t.downloadBtn}</button>
               </div>
             </div>
           ))}
           
           {loading && (
             <div style={{ width: "100%", gridColumn: "1 / -1", textAlign: "center", padding: "20px" }}>
               <div className="spinner" />
             </div>
             )}
           </div>
         )}

          {installModalOpen && (
            <>
              <div className="global-modal-content">
                <div className="global-modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'rgba(var(--accent-color-rgb), 0.2)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                       <IconDownload />
                    </div>
                    <h3 className="global-modal-title">
                      {projectType === 'mod' ? t.installTo : projectType === 'shader' ? "Установить шейдер в сборку" : projectType === 'datapack' ? "Установить датапак в сборку" : "Установить ресурспак в сборку"}
                    </h3>
                  </div>
                  <button onClick={() => setInstallModalOpen(null)} className="global-modal-close">
                     <IconX />
                  </button>
                </div>

                <div className="global-modal-body">
                  {instances.length === 0 ? (
                    <div className="modal-empty-state">
                      {t.noInstances}
                    </div>
                  ) : instances.map((inst, idx) => (
                    <button key={inst.id} onClick={() => confirmInstall(inst.id)} className="modal-item-btn" style={{ animationDelay: `${idx * 0.05}s` }}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", display: "flex", color: "var(--accent-color)" }}>
                          <IconBox />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: "1.05rem", fontWeight: "600", letterSpacing: "0.3px" }}>{inst.name}</span>
                          <span style={{ color: "#8b8b9c", fontSize: "0.85rem" }}>{t.version}: {inst.mcVersion}</span>
                        </div>
                      </div>

                      <div className="modal-item-tag">
                        {inst.loader}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {worldSelectState && (
            <>
              <div className="global-modal-content">
                <div className="global-modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'rgba(var(--accent-color-rgb), 0.2)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                       <IconBox />
                    </div>
                    <h3 className="global-modal-title">Выберите мир для датапака</h3>
                  </div>
                  <button onClick={() => setWorldSelectState(null)} className="global-modal-close">
                     <IconX />
                  </button>
                </div>

                <div className="global-modal-body">
                  {worldSelectState.error ? (
                    <div className="modal-empty-state">{worldSelectState.error}</div>
                  ) : worldSelectState.worlds.length === 0 ? (
                    <div className="modal-empty-state">В папке saves не найдено миров</div>
                  ) : worldSelectState.worlds.map((world, idx) => (
                    <button
                      key={world}
                      onClick={() => setSelectedWorld(world)}
                      className="modal-item-btn"
                      style={{
                        animationDelay: `${idx * 0.05}s`,
                        border: selectedWorld === world ? "1px solid rgba(var(--accent-color-rgb), 0.6)" : undefined,
                        background: selectedWorld === world ? "rgba(var(--accent-color-rgb), 0.15)" : undefined
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", display: "flex", color: "var(--accent-color)" }}>
                          <IconFolder />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                          <span style={{ fontSize: "1.05rem", fontWeight: "600", letterSpacing: "0.3px" }}>{world}</span>
                          <span style={{ color: "#8b8b9c", fontSize: "0.85rem" }}>saves/{world}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button className="play-btn" style={{ flex: 1, whiteSpace: "normal", textAlign: "center", lineHeight: 1.2 }} onClick={confirmWorldInstall} disabled={!selectedWorld || worldSelectState.worlds.length === 0}>
                      Установить в мир
                    </button>
                    <button className="play-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }} onClick={() => setWorldSelectState(null)}>
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {shaderInstallState && (
            <>
              <div className="global-modal-content">
                <div className="global-modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'rgba(var(--accent-color-rgb), 0.2)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                       <IconBox />
                    </div>
                    <h3 className="global-modal-title">Куда установить шейдер?</h3>
                  </div>
                  <button onClick={() => setShaderInstallState(null)} className="global-modal-close">
                     <IconX />
                  </button>
                </div>

                <div className="global-modal-body">
                  <button className="modal-item-btn" onClick={() => confirmShaderInstall("fabric")}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", display: "flex", color: "var(--accent-color)" }}>
                        <IconBox />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                        <span style={{ fontSize: "1.05rem", fontWeight: "600" }}>Fabric</span>
                        <span style={{ color: "#8b8b9c", fontSize: "0.85rem" }}>Установит Iris автоматически</span>
                      </div>
                    </div>
                  </button>
                  <button className="modal-item-btn" onClick={() => confirmShaderInstall("forge")}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", display: "flex", color: "var(--accent-color)" }}>
                        <IconBox />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                        <span style={{ fontSize: "1.05rem", fontWeight: "600" }}>Forge</span>
                        <span style={{ color: "#8b8b9c", fontSize: "0.85rem" }}>Без дополнительных модов</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {notification && (
            <div className={`toast-notification ${notification.type === 'success' ? 'toast-success' : 'toast-error'}`}>
              {notification.type === 'success' ? <IconCheck /> : <IconX />}
              {notification.message}
            </div>
          )}

      </div>
  );
});

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("launcherLang") as Language) || 'ru';
  });
  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("launcherLang", lang);
  };
  const t = translations[language];

  const [allVersionsRaw, setAllVersionsRaw] = useState<any[]>([]);
  const [versionFilters, setVersionFilters] = useState({
    release: localStorage.getItem("vf_release") !== "false",
    snapshot: localStorage.getItem("vf_snapshot") === "true",
    old_beta: localStorage.getItem("vf_old_beta") === "true",
    old_alpha: localStorage.getItem("vf_old_alpha") === "true"
  });

  useEffect(() => {
    fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
      .then(res => res.json())
      .then(data => {
        if (data && data.versions) setAllVersionsRaw(data.versions);
      })
      .catch(console.error);
  }, []);

  const currentVersionsList = React.useMemo(() => {
    if (allVersionsRaw.length === 0) return VERSIONS_LIST;
    return allVersionsRaw.filter(v => versionFilters[v.type as keyof typeof versionFilters]).map(v => v.id);
  }, [allVersionsRaw, versionFilters]);

  const [activeTab, setActiveTab] = useState("home");
  
  // Accounts
  const [account, setAccount] = useState<Account>({ name: "NightWolf", type: "offline" });
  const [savedAccounts, setSavedAccounts] = useState<Account[]>([{ name: "NightWolf", type: "offline" }]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState("");
  const [accountModalView, setAccountModalView] = useState<"list" | "method" | "offline">("list");

  // Settings
  const [ram, setRam] = useState(4);
  const [javaPath, setJavaPath] = useState("/usr/lib/jvm/java-21");
  const [gamePath, setGamePath] = useState("~/.omega-launcher/minecraft");
  const [serverIp, setServerIp] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  
  const [themeHex, setThemeHex] = useState(() => {
    return localStorage.getItem("omegaTheme") || "#a855f7";
  });
  const [customThemeInput, setCustomThemeInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const applyTheme = (hex: string) => {
    setThemeHex(hex);
    localStorage.setItem("omegaTheme", hex);
    document.documentElement.style.setProperty('--accent-color', hex);
    
    // Convert hex to rgb
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    document.documentElement.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`);
  };

  useEffect(() => {
    applyTheme(themeHex);
  }, []);

  // Desktop Instances State
  const [instances, setInstances] = useState<ModpackInstance[]>([]);
  const [instancesLoaded, setInstancesLoaded] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const selectedInstance = React.useMemo(() => {
    return instances.find(i => i.id === selectedInstanceId) || instances[0] || null;
  }, [instances, selectedInstanceId]);
  const [modCount, setModCount] = useState(0);
  const suppressGameplayLogsRef = useRef(false);

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; instanceId: string } | null>(null);
  const [desktopContextMenu, setDesktopContextMenu] = useState<{ visible: boolean; x: number; y: number } | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportPath, setExportPath] = useState(() => localStorage.getItem("exportPath") || "~/Downloads");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<"menu" | "prism" | "curseforge" | "mrpack">("menu");

  const [appNotification, setAppNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setAppNotification({ message, type });
    setTimeout(() => setAppNotification(null), 3000);
  };

  const handlePrismImport = async (zipPath: string) => {
    setImportModalOpen(false);
    const tempId = Date.now().toString();
    setLogs(prev => [...prev, `[IMPORT] Запуск импорта из архива...`]);
    try {
      const result = await invoke("import_prism", { instanceId: tempId, zipPath: zipPath });
      const data = JSON.parse(result as string);
      const newInst: ModpackInstance = {
        id: tempId,
        name: data.name || "Prism Import",
        mcVersion: data.mcVersion || "1.20.1",
        loader: data.loader || "Vanilla",
        icon: undefined,
        x: window.innerWidth / 2 - 80,
        y: window.innerHeight / 2 - 80
      };
      setInstances(prev => {
        const next = [...prev, newInst];
        localStorage.setItem("desktopInstances", JSON.stringify(next));
        return next;
      });
      showNotification("Импорт завершён успешно!", "success");
      setLogs(prev => [...prev, `[IMPORT] Сборка "${newInst.name}" (${newInst.mcVersion} ${newInst.loader}) импортирована!`]);
    } catch(e) {
      showNotification("Ошибка импорта: " + e, "error");
      setLogs(prev => [...prev, `[IMPORT ERROR]: ${e}`]);
    }
  };

  const handleCurseForgeImport = async (zipPath: string) => {
    setImportModalOpen(false);
    const tempId = Date.now().toString();
    setLogs(prev => [...prev, `[IMPORT] Запуск импорта CurseForge из архива...`]);
    try {
      const result = await invoke("import_curseforge", { instanceId: tempId, zipPath: zipPath });
      const data = JSON.parse(result as string);
      const newInst: ModpackInstance = {
        id: tempId,
        name: data.name || "CurseForge Import",
        mcVersion: data.mcVersion || "1.20.1",
        loader: data.loader || "Vanilla",
        icon: undefined,
        x: window.innerWidth / 2 - 80,
        y: window.innerHeight / 2 - 80
      };
      setInstances(prev => {
        const next = [...prev, newInst];
        localStorage.setItem("desktopInstances", JSON.stringify(next));
        return next;
      });
      showNotification("Импорт завершён!", "success");
      setLogs(prev => [...prev, `[IMPORT] Сборка "${newInst.name}" (${newInst.mcVersion} ${newInst.loader}) импортирована (без авто-загрузки .jar модов)!`]);
    } catch(e) {
      showNotification("Ошибка импорта: " + e, "error");
      setLogs(prev => [...prev, `[IMPORT ERROR]: ${e}`]);
    }
  };

  const handleMrPackImport = async (mrpackPath: string) => {
    setImportModalOpen(false);
    const tempId = Date.now().toString();
    setLogs(prev => [...prev, `[IMPORT] Запуск импорта .mrpack (Modrinth/Omega) из архива...`]);
    try {
      const result = await invoke("import_mrpack", { instanceId: tempId, zipPath: mrpackPath });
      const data = JSON.parse(result as string);
      const newInst: ModpackInstance = {
        id: tempId,
        name: data.name || "Modrinth Import",
        mcVersion: data.mcVersion || "1.20.1",
        loader: data.loader || "Vanilla",
        icon: undefined,
        x: window.innerWidth / 2 - 80,
        y: window.innerHeight / 2 - 80
      };
      setInstances(prev => {
        const next = [...prev, newInst];
        localStorage.setItem("desktopInstances", JSON.stringify(next));
        return next;
      });
      showNotification("Импорт завершён!", "success");
      setLogs(prev => [...prev, `[IMPORT] Сборка "${newInst.name}" (${newInst.mcVersion} ${newInst.loader}) импортирована!`]);
    } catch(e) {
      showNotification("Ошибка импорта: " + e, "error");
      setLogs(prev => [...prev, `[IMPORT ERROR]: ${e}`]);
    }
  };

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) setContextMenu(null);
      if (desktopContextMenu) setDesktopContextMenu(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu, desktopContextMenu]);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedInstanceId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 128;
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/png');

          setInstances(prev => {
            const next = prev.map(i => i.id === selectedInstanceId ? { ...i, icon: resizedBase64 } : i);
            try {
              localStorage.setItem("desktopInstances", JSON.stringify(next));
            } catch(e) {
              console.error("Storage full:", e);
            }
            return next;
          });
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    }
    // reset input so the same file can be selected again
    if (e.target) e.target.value = '';
  };

  // Creation Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVer, setNewVer] = useState("1.21.4");
  const [newVerSearch, setNewVerSearch] = useState("");
  const [newLoader, setNewLoader] = useState("Fabric");
  const [verMenuOpen, setVerMenuOpen] = useState(false);
  const [loaderMenuOpen, setLoaderMenuOpen] = useState(false);

  useEffect(() => {
    const savedNicks = localStorage.getItem("savedNicknames");
    if (savedNicks) {
      try {
        const parsed = JSON.parse(savedNicks);
        if (Array.isArray(parsed)) {
          const accounts: Account[] = parsed.map(item => {
            if (typeof item === 'string') return { name: item, type: 'offline' };
            if (item && typeof item.name === 'string') return item as Account;
            return null;
          }).filter(a => a !== null) as Account[];
          if (accounts.length > 0) {
            setSavedAccounts(accounts);
            setAccount(accounts[0]);
          }
        }
      } catch (e) {
        console.error("Failed to parse savedNicknames, data might be corrupted", e);
      }
    }

    const savedInst = localStorage.getItem("desktopInstances");
    if (savedInst) {
      try {
        const parsed = JSON.parse(savedInst);
        if (Array.isArray(parsed)) {
           setInstances(parsed);
           if (parsed.length > 0) setSelectedInstanceId(parsed[0].id);
        }
      } catch(e) {}
    }
    setInstancesLoaded(true);
  }, []);

  useEffect(() => {
    if (!instancesLoaded) return;
    try {
      localStorage.setItem("desktopInstances", JSON.stringify(instances));
    } catch (e) {
      console.error("Failed to persist desktopInstances", e);
    }
  }, [instances, instancesLoaded]);

  useEffect(() => {
    const unlisten = listen("download-progress", (event) => {
      const line = event.payload as string;
      const isRuntimeStatusLine =
        line.includes("[main/INFO]: Killing Minecraft process") ||
        line.includes("[main/INFO]: Minecraft process killed") ||
        line.includes("[main/INFO]: No running Minecraft process found") ||
        line.includes("[launcher/INFO]: Minecraft process exited") ||
        line.includes("[launcher/INFO] Minecraft process exited");

      const isSpawnLine = line.includes("[launcher/INFO] Minecraft process spawned with PID:");
      const shouldAppend =
        !suppressGameplayLogsRef.current ||
        isRuntimeStatusLine ||
        isSpawnLine ||
        line.startsWith("[ERROR]");

      if (isSpawnLine) {
        suppressGameplayLogsRef.current = true;
      }

      if (!shouldAppend) {
        if (line.includes("[launcher/INFO] Minecraft process exited")) {
          setIsRunning(false);
          suppressGameplayLogsRef.current = false;
        }
        return;
      }

      setLogs((prev) => {
        const newLogs = [...prev, line];
        return newLogs.slice(-100);
      });
      if (line.includes("[launcher/INFO] Minecraft process exited")) {
          suppressGameplayLogsRef.current = false;
          setIsRunning(false);
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadModCount = async () => {
      if (!selectedInstanceId) {
        setModCount(0);
        return;
      }

      try {
        const count = await invoke("count_installed_mods", { instanceId: selectedInstanceId });
        if (!cancelled) {
          setModCount(typeof count === "number" ? count : Number(count) || 0);
        }
      } catch (error) {
        console.error("Failed to load mod count", error);
        if (!cancelled) {
          setModCount(0);
        }
      }
    };

    loadModCount();

    return () => {
      cancelled = true;
    };
  }, [selectedInstanceId, instances]);

  useEffect(() => {
    const handleClick = () => {
      setVerMenuOpen(false);
      setLoaderMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAddOffline = useCallback(() => {
    const trimmed = newUsernameInput.trim();
    if (trimmed !== "" && /^[a-zA-Z0-9_]{3,16}$/.test(trimmed)) {
      const newAcc: Account = { name: trimmed, type: "offline" };
      setSavedAccounts(prev => {
        const updated = [newAcc, ...prev.filter(a => a.name !== trimmed)];
        localStorage.setItem("savedNicknames", JSON.stringify(updated));
        return updated;
      });
      setAccount(newAcc);
      setNewUsernameInput("");
      setAccountModalView("list");
    }
  }, [newUsernameInput]);

  const handleSelectAccount = useCallback((acc: Account) => {
    setAccount(acc);
    setProfileMenuOpen(false);
    setSavedAccounts(prev => {
      const updated = [acc, ...prev.filter(a => a.name !== acc.name)];
      localStorage.setItem("savedNicknames", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleAddMicrosoft = useCallback(async () => {
    try {
      setProfileMenuOpen(false);
      setLogs(prev => [...prev, t.logWaitingBrowser]);
      const output = (await invoke("login_microsoft")) as string;
      const match = (output || "").toString().match(/SUCCESS:(.+)/);
      if (match && match[1]) {
        const msName = match[1].trim();
        const newAcc: Account = { name: msName, type: "microsoft" };
        setSavedAccounts(prev => {
           const updated = [newAcc, ...prev.filter(a => a.name !== msName)];
           localStorage.setItem("savedNicknames", JSON.stringify(updated));
           return updated;
        });
        setAccount(newAcc);
        setLogs(prev => [...prev, t.logSuccessLogin + msName]);
      } else {
        const errMatch = (output || "").toString().match(/ERROR:(.+)/);
        setLogs(prev => [...prev, t.logLoginError + (errMatch ? errMatch[1].trim() : t.logUnknownError)]);
      }
    } catch(e: any) {
      setLogs(prev => [...prev, "[MS_AUTH_ERR]: " + e]);
    }
  }, []);

  const handleDeleteAccount = useCallback((accName: string) => {
    setSavedAccounts(prev => {
      const updated = prev.filter(a => a.name !== accName);
      localStorage.setItem("savedNicknames", JSON.stringify(updated));
      if (account.name === accName && updated.length > 0) {
        setAccount(updated[0]);
      }
      return updated;
    });
  }, [account.name]);

  const handlePlay = useCallback(async () => {
    if (!selectedInstanceId) return alert(t.alertNoInstance);
    const inst = instances.find(i => i.id === selectedInstanceId);
    if (!inst) return;
    if (isRunning) return;

    if (account) {
      setIsRunning(true);
      suppressGameplayLogsRef.current = false;
      setLogs([t.logStartingMc]);
      try {
        const safeMcVersion = inst.mcVersion === "Prism" ? "1.20.1" : inst.mcVersion;
        const safeLoader = inst.loader === "Import" ? "Vanilla" : inst.loader;
        const fullVersionName = safeLoader === "Vanilla" ? safeMcVersion : `${safeMcVersion}-${safeLoader.toLowerCase()}`;
        await invoke("launch_minecraft", { 
          version: fullVersionName, 
          server: serverIp, 
          username: account.name, 
          ram,
          instanceId: inst.id 
        });
      } catch(e) {
        setIsRunning(false);
        setLogs(prev => [...prev, `[ERROR]: ${e}`]);
      }
    }
  }, [account, ram, serverIp, instances, selectedInstanceId, isRunning]);

  const handleStop = useCallback(async () => {
      try {
        await invoke("kill_minecraft");
      } catch (e) {
        setLogs(prev => [...prev, `[ERROR]: ${e}`]);
      } finally {
        setIsRunning(false);
      }
  }, []);

  const sliderStyle = useMemo(() => ({
    background: `linear-gradient(to right, var(--accent-color) ${(ram - 1) / 15 * 100}%, rgba(255,255,255,0.1) ${(ram - 1) / 15 * 100}%)`
  }), [ram]);

  const handleCreateInstance = () => {
    if (!newName) return;
    
    // Open Debug Window
    new WebviewWindow('debug_window', {
      title: 'Создание сборки - Дебаг',
      width: 600,
      height: 400,
    });
    
    setTimeout(() => {
      emit('debug-log', `[CREATE] Начинаю создание сборки...`);
      emit('debug-log', `[CREATE] Название: ${newName}`);
      emit('debug-log', `[CREATE] Версия Minecraft: ${newVer}`);
      emit('debug-log', `[CREATE] Тип лоадера: ${newLoader}`);
    }, 500); // Give the window a moment to open and attach listeners
    
    const newInst: ModpackInstance = {
      id: Date.now().toString(),
      name: newName,
      mcVersion: newVer,
      loader: newLoader,
      x: 50 + Math.random() * 50,
      y: 50 + Math.random() * 50
    };
    const updated = [...instances, newInst];
    setInstances(updated);
    setSelectedInstanceId(newInst.id);
    localStorage.setItem("desktopInstances", JSON.stringify(updated));
    setIsCreating(false);
    setNewName("");
    
    setTimeout(() => {
       emit('debug-log', `[CREATE] Сборка ${newInst.id} успешно сохранена в localStorage!`);
    }, 600);
  };



  const handleCreateModpack = useCallback(async (name: string, mcVer: string, loader: string, iconUrl?: string, projectId?: string) => {
    setActiveTab("home");
    setLogs(prev => [...prev, `[Modpack] Инициализация скачивания сборки "${name}"...`]);

    const newInst: ModpackInstance = {
      id: Date.now().toString(),
      name: name,
      mcVersion: mcVer,
      loader: loader,
      icon: iconUrl,
      x: window.innerWidth / 2 - 100,
      y: window.innerHeight / 2 - 100
    };
    setInstances(prev => {
      const updated = [...prev, newInst];
      localStorage.setItem("desktopInstances", JSON.stringify(updated));
      return updated;
    });
    setSelectedInstanceId(newInst.id);

    try {
        await invoke("install_modpack", {
            modId: projectId,
            mcVersion: mcVer,
            loader: loader,
            instanceId: newInst.id
        });
        setLogs(prev => [...prev, `[Modpack] Сборка "${name}" успешно установлена и готова к запуску!`]);
    } catch (e: any) {
        setLogs(prev => [...prev, `[ERROR] Ошибка установки сборки: ${e}`]);
    }
  }, []);

  return (
    <div
      className="app-container"
      onCopy={(e) => {
        if (!(e.target as HTMLElement).closest(".copyable-console")) {
          e.preventDefault();
        }
      }}
      onCut={(e) => {
        if (!(e.target as HTMLElement).closest(".copyable-console")) {
          e.preventDefault();
        }
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <main className="main-content">
        <header className="top-bar">
          <div className="title-area" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sidebar-icon brand" style={{ width: 36, height: 36, marginBottom: 0, borderRadius: 10 }}>
              <IconBox />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.5px' }}>Omega Launcher</h1>
          </div>
          
          <div className="user-profile" onClick={() => { setProfileMenuOpen(true); setAccountModalView("list"); }}>
            <div className="avatar">
                {account.type === "microsoft" ? <IconMicrosoft /> : (account.name ? account.name.substring(0, 2).toUpperCase() : "??")}
            </div>
            <div className="user-info">
              <span className="user-name">{account.name}</span>
              <span className="user-status"><span className="status-dot" /> Онлайн</span>
            </div>
          </div>
        </header>

        {activeTab === "home" && (
          <div className="home-sketch-dashboard">
            {/* КОЛОНКА 1 (ЛЕВАЯ): Сборки & Сервера (До самого низа) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
              <div className="sketch-card" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                <div className="sketch-card-header">
                  <span className="sketch-card-title"><IconBox /> Последние сборки</span>
                  <button className="play-btn" style={{ height: '28px', fontSize: '0.75rem', padding: '0 10px' }} onClick={() => setIsCreating(true)}>
                    <IconPlus /> Создать
                  </button>
                </div>
                <div className="recent-instances-list" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                  {instances.length === 0 ? (
                    <div style={{ color: '#8b8b9c', textAlign: 'center', padding: '15px', fontSize: '0.85rem' }}>
                      Нет сборок. Нажмите "+ Создать"!
                    </div>
                  ) : (
                    instances.slice(0, 5).map(inst => (
                      <div 
                        key={inst.id} 
                        className={`recent-instance-item ${selectedInstanceId === inst.id ? 'selected' : ''}`}
                        onClick={() => setSelectedInstanceId(inst.id)}
                      >
                        <div className="recent-inst-info">
                          <div className="recent-inst-icon">
                            {inst.icon ? <img src={inst.icon} alt="icon" style={{ width: 24, height: 24, borderRadius: 6 }} /> : <IconBox />}
                          </div>
                          <div>
                            <div className="recent-inst-name" style={{ fontSize: '0.88rem' }}>{inst.name}</div>
                            <div className="recent-inst-ver" style={{ fontSize: '0.72rem' }}>{inst.mcVersion} • {inst.loader}</div>
                          </div>
                        </div>
                        <button 
                          className="play-btn" 
                          style={{ height: '28px', fontSize: '0.75rem', padding: '0 10px', flexShrink: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInstanceId(inst.id);
                            handlePlay();
                          }}
                        >
                          <IconPlay />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="sketch-card" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                <div className="sketch-card-header">
                  <span className="sketch-card-title">🌐 Сервера</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                  {RECENT_SERVERS.map(server => (
                    <div key={server.id} className="server-item" style={{ padding: '8px 12px', flexShrink: 0 }}>
                      <div className="server-info-left" style={{ gap: '10px' }}>
                        <div className="server-icon-badge" style={{ width: 34, height: 34, fontSize: '1rem' }}>{server.icon}</div>
                        <div>
                          <div className="server-name" style={{ fontSize: '0.85rem' }}>{server.name}</div>
                          <div className="server-ip" style={{ fontSize: '0.72rem' }}>{server.ip}</div>
                        </div>
                      </div>
                      <span className="server-players-tag" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{server.players}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* КОЛОНКА 2 (ЦЕНТРАЛЬНАЯ): Консоль логов (сворачиваемая) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignSelf: 'end', justifyContent: 'flex-end', height: '100%', minHeight: 0, width: '100%' }}>
              <div
                className="sketch-card"
                style={{
                  overflow: 'hidden', padding: 0, position: 'relative',
                  height: consoleOpen ? '260px' : 'auto',
                  transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
                  flexShrink: 0
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(180deg, rgba(150,13,242,0.07) 0%, rgba(5,4,8,0.97) 100%)',
                  pointerEvents: 'none', zIndex: 0
                }} />
                <div style={{ position: 'relative', zIndex: 1, padding: '12px 14px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Header + toggle */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setConsoleOpen(p => !p)}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#AB3DF5', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: isRunning ? '#10b981' : '#6b7280',
                        display: 'inline-block',
                        boxShadow: isRunning ? '0 0 6px #10b981' : 'none'
                      }} />
                      {isRunning ? 'Игра запущена' : 'Консоль'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.68rem', color: '#4a4a5a', fontFamily: 'monospace' }}>
                        {selectedInstance ? `${selectedInstance.mcVersion} • ${selectedInstance.loader}` : ''}
                      </span>
                      <span style={{
                        fontSize: '0.7rem', color: '#6b7280',
                        transform: consoleOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                        transition: 'transform 0.3s', display: 'inline-block', lineHeight: 1
                      }}>▲</span>
                    </div>
                  </div>

                  {/* Log body */}
                  {consoleOpen && (
                    <div style={{
                      flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px',
                      marginTop: 10,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      scrollbarWidth: 'thin', scrollbarColor: 'rgba(171,61,245,0.2) transparent'
                    }}>
                      {logs.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                          <span style={{ fontSize: '1.3rem' }}>📟</span>
                          <div style={{ color: '#4a4a5a', fontSize: '0.72rem', textAlign: 'center' }}>Запустите сборку, чтобы увидеть логи</div>
                        </div>
                      ) : (
                        logs.slice(-40).map((line, i) => {
                          const isError = /error|exception|failed/i.test(line);
                          const isWarn = /warn/i.test(line);
                          const isInfo = /\[info\]/i.test(line);
                          return (
                            <div key={i} style={{
                              fontSize: '0.65rem', lineHeight: 1.45, padding: '1px 4px', borderRadius: 3,
                              color: isError ? '#f87171' : isWarn ? '#fbbf24' : isInfo ? '#60a5fa' : '#6b6b7a',
                              background: isError ? 'rgba(248,113,113,0.05)' : 'transparent',
                              wordBreak: 'break-all'
                            }}>
                              {line}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* КОЛОНКА 3 (ПРАВАЯ): Друзья и активность */}
            <div className="sketch-card" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
              <div className="sketch-card-header">
                <span className="sketch-card-title"><IconUsers /> Друзья</span>
                <span className="user-status" style={{ fontSize: '0.78rem', color: '#10b981' }}>
                  <span className="status-dot" /> 2 онлайн
                </span>
              </div>
              <div className="friends-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {FRIENDS_LIST.map(friend => (
                  <div key={friend.id} className="friend-item" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="friend-avatar" style={{ width: 34, height: 34, fontSize: '0.8rem', background: friend.online ? 'linear-gradient(135deg, #960DF2, #AB3DF5)' : '#2a2a35' }}>
                        {friend.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="friend-name" style={{ fontSize: '0.85rem' }}>{friend.name}</div>
                        <div className="friend-activity" style={{ fontSize: '0.72rem' }}>{friend.activity}</div>
                      </div>
                    </div>
                    <div className="friend-status" style={{ fontSize: '0.72rem', color: friend.online ? '#10b981' : '#8b8b9c' }}>
                      <span className="status-dot" style={{ width: 6, height: 6, background: friend.online ? '#10b981' : '#6b7280' }} />
                      {friend.status}
                    </div>
                  </div>
                ))}
              </div>
              <button
                style={{
                  marginTop: 'auto', flexShrink: 0, width: '100%', padding: '10px',
                  background: 'rgba(150,13,242,0.12)', border: '1px dashed rgba(171,61,245,0.35)',
                  borderRadius: '10px', color: '#AB3DF5', fontSize: '0.8rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(150,13,242,0.22)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(150,13,242,0.12)')}
              >
                <IconPlus /> Добавить друга
              </button>
            </div>

            {/* Модальное окно создания сборки */}
            {isCreating && (
              <div className="account-modal-overlay" onClick={() => setIsCreating(false)}>
                <div className="create-modal" onClick={e => e.stopPropagation()}>
                  <h3>{t.newInstTitle}</h3>
                  <input type="text" placeholder={t.newInstNamePlaceholder} value={newName} onChange={e => setNewName(e.target.value)} />
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <div className="custom-dropdown-container" onMouseDown={(e) => e.stopPropagation()} onClick={() => { setVerMenuOpen(!verMenuOpen); setLoaderMenuOpen(false); }} style={{ flex: 1 }}>
                      <div className="custom-dropdown-btn" style={{ height: "40px", fontSize: "0.9rem" }}>{newVer} <IconChevronDown /></div>
                      {verMenuOpen && (
                        <div className="custom-dropdown-menu upwards">
                          <input type="text" placeholder="Поиск..." value={newVerSearch} onChange={e => setNewVerSearch(e.target.value)} onClick={e => e.stopPropagation()} style={{ margin: '5px', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', outline: 'none' }} />
                          {currentVersionsList.filter(v => v.includes(newVerSearch.toLowerCase())).map(v => <div key={v} className="custom-dropdown-item" onClick={(e) => { e.stopPropagation(); setNewVer(v); setVerMenuOpen(false); }}>{v}</div>)}
                        </div>
                      )}
                    </div>
                    <div className="custom-dropdown-container" onMouseDown={(e) => e.stopPropagation()} onClick={() => { setLoaderMenuOpen(!loaderMenuOpen); setVerMenuOpen(false); }} style={{ flex: 1 }}>
                      <div className="custom-dropdown-btn" style={{ height: "40px", fontSize: "0.9rem" }}>{newLoader} <IconChevronDown /></div>
                      {loaderMenuOpen && (
                        <div className="custom-dropdown-menu upwards">
                          {LOADERS_LIST.map(l => <div key={l} className="custom-dropdown-item" onClick={(e) => { e.stopPropagation(); setNewLoader(l); setLoaderMenuOpen(false); }}>{l}</div>)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button className="play-btn" style={{ flex: 1, height: "40px", fontSize: "0.9rem", padding: 0, justifyContent: "center" }} onClick={handleCreateInstance}>{t.createBtn}</button>
                    <button className="play-btn" style={{ flex: 1, height: "40px", fontSize: "0.9rem", padding: 0, justifyContent: "center", background: "rgba(255,255,255,0.1)", boxShadow: "none" }} onClick={() => setIsCreating(false)}>{t.cancel}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ЭКРАН СБОРОК (Снимок 2) */}
        {activeTab === "modpacks" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0, height: 'calc(100vh - 130px)', paddingBottom: '75px', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Ваши сборки</h2>
              <button className="play-btn" style={{ height: '36px', fontSize: '0.85rem' }} onClick={() => setIsCreating(true)}>
                <IconPlus /> Создать сборку
              </button>
            </div>

            {/* Горизонтальный скролл сборок */}
            <div className="assemblies-horizontal-list">
              {instances.map(inst => (
                <div 
                  key={inst.id}
                  className={`assembly-scroll-card ${selectedInstanceId === inst.id ? 'active' : ''}`}
                  onClick={() => setSelectedInstanceId(inst.id)}
                >
                  <div className="recent-inst-icon" style={{ width: 54, height: 54, borderRadius: 14 }}>
                    {inst.icon ? <img src={inst.icon} alt="icon" style={{ width: 36, height: 36, borderRadius: 8 }} /> : <IconBox />}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                    {inst.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8b8b9c' }}>
                    {inst.mcVersion} ({inst.loader})
                  </div>
                </div>
              ))}
            </div>

            {/* Info Card выбранной сборки (Снимок 2) */}
            {selectedInstance && (
              <div className="assembly-info-card-detail">
                <input type="file" ref={fileInputRef} onChange={handleIconChange} style={{ display: 'none' }} accept="image/*" />
                <div 
                  className="recent-inst-icon" 
                  style={{ width: 64, height: 64, borderRadius: 16, cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Нажмите, чтобы сменить иконку"
                >
                  {selectedInstance.icon ? <img src={selectedInstance.icon} alt="icon" style={{ width: 44, height: 44, borderRadius: 10 }} /> : <IconBox />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>{selectedInstance.name}</h3>
                    <button 
                      className="play-btn" 
                      style={{ height: '26px', fontSize: '0.75rem', padding: '0 8px', background: 'rgba(255,255,255,0.06)', boxShadow: 'none' }}
                      onClick={() => { setRenameModalOpen(selectedInstance.id); setRenameInput(selectedInstance.name); }}
                    >
                      Переименовать
                    </button>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#8b8b9c', marginBottom: '8px' }}>
                    Версия: <span style={{ color: '#AB3DF5', fontWeight: 600 }}>{selectedInstance.mcVersion}</span> • Загрузчик: <span style={{ color: '#fff' }}>{selectedInstance.loader}</span>
                  </div>
                  <div className="mod-chips-container">
                    <span className="mod-chip"><span className="mod-chip-dot" /> Установлено модов: {modCount}</span>
                    <span className="mod-chip"><span className="mod-chip-dot" /> Fabric API</span>
                    <span className="mod-chip"><span className="mod-chip-dot" /> Sodium (Оптимизация)</span>
                    <span className="mod-chip"><span className="mod-chip-dot" /> Iris Shaders</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button className="play-btn" onClick={handlePlay}>
                    <IconPlay /> Играть
                  </button>
                  <button 
                    className="play-btn" 
                    style={{ background: 'rgba(255,255,255,0.08)', boxShadow: 'none', fontSize: '0.82rem' }}
                    onClick={() => invoke("open_folder", { instanceId: selectedInstance.id })}
                  >
                    <IconFolder /> Папка сборки
                  </button>
                </div>
              </div>
            )}

            {/* Каталог готовых сборок из Modrinth */}
            <div style={{ marginTop: '20px' }}>
              <h3>Каталог готовых сборок</h3>
              <ModsPanel instances={instances} t={t} language={language} projectType="modpack" onCreateModpack={handleCreateModpack} versionsList={currentVersionsList} />
            </div>

            {renameModalOpen && (
              <div className="account-modal-overlay" onClick={() => setRenameModalOpen(null)}>
                <div className="create-modal" onClick={e => e.stopPropagation()}>
                  <h3>{t.renameInstTitle}</h3>
                  <input type="text" value={renameInput} onChange={e => setRenameInput(e.target.value)} placeholder={t.renameInstPlaceholder} />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button className="play-btn" style={{ flex: 1 }} onClick={() => {
                      setInstances(prev => {
                        const next = prev.map(i => i.id === renameModalOpen ? { ...i, name: renameInput } : i);
                        localStorage.setItem("desktopInstances", JSON.stringify(next));
                        return next;
                      });
                      setRenameModalOpen(null);
                    }}>{t.saveBtn}</button>
                    <button className="play-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }} onClick={() => setRenameModalOpen(null)}>{t.cancel}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ЭКРАН КАТАЛОГА / МОДОВ (Снимок 3) */}
        {["mods", "resourcepacks", "shaders", "datapacks"].includes(activeTab) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, height: 'calc(100vh - 130px)', paddingBottom: '75px', boxSizing: 'border-box' }}>
            <div className="store-sub-tabs">
              <button 
                className={`sub-tab-btn ${activeTab === 'mods' ? 'active' : ''}`}
                onClick={() => setActiveTab("mods")}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AnimatedIcon images={MOD_ICONS} interval={2500} /> Моды
                </div>
              </button>
              <button 
                className={`sub-tab-btn ${activeTab === 'resourcepacks' ? 'active' : ''}`}
                onClick={() => setActiveTab("resourcepacks")}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AnimatedIcon images={RESOURCEPACK_ICONS} interval={2800} /> Текстуры
                </div>
              </button>
              <button 
                className={`sub-tab-btn ${activeTab === 'shaders' ? 'active' : ''}`}
                onClick={() => setActiveTab("shaders")}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AnimatedIcon images={SHADER_ICONS} interval={2900} /> Шейдеры
                </div>
              </button>
              <button 
                className={`sub-tab-btn ${activeTab === 'datapacks' ? 'active' : ''}`}
                onClick={() => setActiveTab("datapacks")}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AnimatedIcon images={DATAPACK_ICONS} interval={2600} /> Датапаки
                </div>
              </button>
            </div>

            {activeTab === "mods" && <ModsPanel instances={instances} t={t} language={language} projectType="mod" versionsList={currentVersionsList} />}
            {activeTab === "resourcepacks" && <ModsPanel instances={instances} t={t} language={language} projectType="resourcepack" versionsList={currentVersionsList} />}
            {activeTab === "shaders" && <ModsPanel instances={instances} t={t} language={language} projectType="shader" versionsList={currentVersionsList} />}
            {activeTab === "datapacks" && <ModsPanel instances={instances} t={t} language={language} projectType="datapack" versionsList={currentVersionsList} />}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="settings-panel">
            <h2>{t.sidebarSettings}</h2>


            
            <div className="settings-section">
              <h3>Пути и сохранение</h3>
              <div className="setting-item">
                <label>Папка для экспорта сборок</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={exportPath} 
                    onChange={e => {
                      setExportPath(e.target.value);
                      localStorage.setItem("exportPath", e.target.value);
                    }} 
                    style={{ flex: 1 }}
                  />
                  <button className="play-btn" style={{ padding: '0 15px', height: '40px' }} onClick={() => invoke('open_path', { path: exportPath })}>
                    <IconFolder />
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Отображаемые версии Minecraft</h3>
              <p style={{ color: '#8b8b9c', fontSize: '0.85rem' }}>Выберите, какие типы версий показывать в списках. Можно комбинировать.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                {([
                  { key: 'release', label: '📦 Релизы', desc: 'Стабильные версии (1.21.4, 1.20.1...)' },
                  { key: 'snapshot', label: '🧪 Снапшоты', desc: 'Тестовые версии (25w04a...)' },
                  { key: 'old_beta', label: '🏗️ Беты', desc: 'Старые бета-версии (b1.8.1...)' },
                  { key: 'old_alpha', label: '🏚️ Альфы', desc: 'Самые старые версии (a1.2.6...)' },
                ] as const).map(item => (
                  <label key={item.key} style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                    padding: '12px 14px', borderRadius: '10px',
                    background: versionFilters[item.key] ? 'rgba(var(--accent-color-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
                    border: versionFilters[item.key] ? '1px solid rgba(var(--accent-color-rgb), 0.4)' : '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={versionFilters[item.key]} 
                      onChange={(e) => {
                        const next = { ...versionFilters, [item.key]: e.target.checked };
                        setVersionFilters(next);
                        localStorage.setItem("vf_" + item.key, e.target.checked ? "true" : "false");
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-color)', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ fontSize: '0.75rem', color: '#8b8b9c' }}>{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#6b6b7c' }}>
                Показано версий: {currentVersionsList.length}
              </div>
            </div>

            <div className="settings-section">
              <h3>{t.ramSettingsTitle}</h3>
              <p>{t.settingsSubtitle}</p>
            </div>

            <div className="settings-section">
              <div className="section-title">
                <div className="section-icon" style={{color: 'var(--accent-color)'}}><IconUsers /></div>
                {t.autoConnect}
              </div>

              <div className="input-group">
                <label>{t.serverIpLabel}</label>
                <div className="input-wrapper">
                  <input type="text" placeholder="mc.hypixel.net" value={serverIp} onChange={(e) => setServerIp(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-top">
                <div className="section-title">
                  <div className="section-icon"><IconCpu /></div>
                  <div>
                    <div>{t.ramSettingsTitle}</div>
                    <div style={{fontSize: "0.8rem", color: "#8b8b9c", fontWeight: "normal"}}>{t.ramSettingsDesc}</div>
                  </div>
                </div>
                <div className="section-value">{ram} <span>GB</span></div>
              </div>
              
              <div className="slider-container">
                <input 
                  type="range" 
                  min="1" 
                  max="16" 
                  value={ram} 
                  onChange={(e) => setRam(parseInt(e.target.value))}
                  className="slider"
                  style={sliderStyle}
                />
                <div className="slider-marks">
                  <span>1G</span>
                  <span>2G</span>
                  <span style={ram === 4 ? {color: 'var(--accent-color)'} : {}}>4G</span>
                  <span>6G</span>
                  <span>8G</span>
                  <span>10G</span>
                  <span>12G</span>
                  <span>16G</span>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-title">
                <div className="section-icon" style={{color: '#3b82f6'}}><IconFolder /></div>
                {t.filePathsTitle}
              </div>

              <div className="input-group">
                <label>{t.javaLabel}</label>
                <div className="input-wrapper">
                  <input type="text" value={javaPath} onChange={(e) => setJavaPath(e.target.value)} />
                  <button className="folder-btn" onClick={() => invoke("open_path", { path: javaPath })}><IconFolder /></button>
                </div>
              </div>

              <div className="input-group">
                <label>{t.gameFolder}</label>
                <div className="input-wrapper">
                  <input type="text" value={gamePath} onChange={(e) => setGamePath(e.target.value)} />
                  <button className="folder-btn" onClick={() => invoke("open_path", { path: gamePath })}><IconFolder /></button>
                </div>
              </div>
            </div>
            <div className="settings-section">
              <div className="section-title">
                <div className="section-icon" style={{color: '#10b981'}}><IconSettings /></div>
                {t.languageTitle}
              </div>
              <div className="input-group" style={{ flexDirection: "row", gap: "10px", marginTop: "10px" }}>
                <button 
                  onClick={() => changeLanguage('ru')}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", border: language === 'ru' ? "1px solid rgba(var(--accent-color-rgb), 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
                    background: language === 'ru' ? "rgba(var(--accent-color-rgb), 0.2)" : "rgba(255, 255, 255, 0.05)", 
                    color: language === 'ru' ? "white" : "#8b8b9c", cursor: "pointer", fontSize: "1rem", fontWeight: language === 'ru' ? "bold" : "normal"
                  }}>
                  🇷🇺 Русский
                </button>
                <button 
                  onClick={() => changeLanguage('en')}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", border: language === 'en' ? "1px solid rgba(var(--accent-color-rgb), 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
                    background: language === 'en' ? "rgba(var(--accent-color-rgb), 0.2)" : "rgba(255, 255, 255, 0.05)", 
                    color: language === 'en' ? "white" : "#8b8b9c", cursor: "pointer", fontSize: "1rem", fontWeight: language === 'en' ? "bold" : "normal"
                  }}>
                  🇬🇧 English
                </button>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-title">
                <div className="section-icon" style={{color: 'var(--accent-color)'}}><IconBox /></div>
                {t.themeTitle || "Тема лаунчера"}
              </div>
              <div className="input-group" style={{ flexDirection: "row", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                {[
                  { name: "Omega Purple", hex: "#a855f7" },
                  { name: "Neon Green", hex: "#10b981" },
                  { name: "Cyber Blue", hex: "#3b82f6" },
                  { name: "Crimson Red", hex: "#ef4444" },
                  { name: "Sunset Orange", hex: "#f97316" },
                  { name: "Hot Pink", hex: "#ec4899" }
                ].map(theme => (
                  <button 
                    key={theme.name}
                    onClick={() => applyTheme(theme.hex)}
                    style={{
                      flex: "1 1 30%", padding: "10px", borderRadius: "10px", 
                      border: themeHex === theme.hex ? `1px solid ${theme.hex}` : "1px solid rgba(255, 255, 255, 0.1)",
                      background: themeHex === theme.hex ? `${theme.hex}20` : "rgba(255, 255, 255, 0.05)", 
                      color: "white", cursor: "pointer", fontSize: "0.9rem",
                      display: "flex", alignItems: "center", gap: "8px", justifyContent: "center"
                    }}>
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: theme.hex, boxShadow: `0 0 10px ${theme.hex}` }}></div>
                    {theme.name}
                  </button>
                ))}
              </div>
              
              <div className="input-group" style={{ marginTop: "15px" }}>
                <label>{t.customThemeTitle || "Свой цвет (Hex)"}</label>
                <div className="input-wrapper" style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }}>
                  <div 
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    style={{ 
                      width: "40px", 
                      height: "40px", 
                      borderRadius: "10px", 
                      cursor: "pointer",
                      background: customThemeInput || themeHex,
                      border: "2px solid rgba(255,255,255,0.2)"
                    }} 
                  />
                  <span style={{ color: "#8b8b9c", fontSize: "1rem" }}>{customThemeInput || themeHex}</span>
                  
                  {showColorPicker && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: '10px' }}>
                      <div style={{ position: 'fixed', inset: 0 }} onClick={() => setShowColorPicker(false)} />
                      <div style={{ position: 'relative' }}>
                        <HexColorPicker 
                          color={customThemeInput || themeHex} 
                          onChange={(newColor) => {
                            setCustomThemeInput(newColor);
                            applyTheme(newColor);
                          }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
        {profileMenuOpen && (
        <div className="account-modal-overlay" onClick={() => setProfileMenuOpen(false)}>
          <div className="account-modal" onClick={(e) => e.stopPropagation()}>
            <div className="account-modal-header">
              <div className="account-modal-header-info">
                <h3>
                  {accountModalView === "list" && t.accountsSection}
                  {accountModalView === "method" && (t as any).addAccountTitle}
                  {accountModalView === "offline" && (t as any).addOfflineTitle}
                </h3>
                <p>
                  {accountModalView === "list" && t.accountsSubtitle}
                  {accountModalView === "method" && (t as any).addAccountSubtitle}
                  {accountModalView === "offline" && (t as any).addOfflineSubtitle}
                </p>
              </div>
              <button className="account-modal-close" onClick={() => setProfileMenuOpen(false)}>
                <IconX />
              </button>
            </div>

            <div className="account-modal-body">
              {accountModalView === "list" && (
                <>
                  {savedAccounts.length > 0 && (
                    <div className="account-list-section">
                      <span className="account-list-label">{t.accountsSection}</span>
                      {savedAccounts.map(acc => (
                        <div
                          key={acc.name}
                          className={`account-item ${acc.name === account.name ? 'active' : ''}`}
                          onClick={() => handleSelectAccount(acc)}
                        >
                          <div className={`account-item-avatar ${acc.type}`}>
                            {acc.type === "microsoft" ? <IconMicrosoft /> : acc.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="account-item-info">
                            <div className="account-item-name">{acc.name}</div>
                            <div className="account-item-type">
                              {acc.type === "microsoft" ? "Microsoft" : (t as any).offlineAccountTitle}
                              {acc.name === account.name && (
                                <span className="account-item-active-badge">{(t as any).activeLabel}</span>
                              )}
                            </div>
                          </div>
                          {savedAccounts.length > 1 && (
                            <button
                              className="account-item-delete"
                              onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.name); }}
                              title={(t as any).deleteAccountBtn}
                            >
                              <IconTrash />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="account-modal-divider" />

                  <div
                    className="account-method-card"
                    onClick={() => setAccountModalView("method")}
                  >
                    <div className="account-method-icon" style={{ background: 'rgba(var(--accent-color-rgb), 0.15)', color: 'var(--accent-color)' }}>
                      <IconPlus />
                    </div>
                    <div className="account-method-info">
                      <h4>{(t as any).addAccountTitle}</h4>
                      <p>{(t as any).addAccountSubtitle}</p>
                    </div>
                  </div>
                </>
              )}

              {accountModalView === "method" && (
                <>
                  <button className="account-back-btn" onClick={() => setAccountModalView("list")}>
                    <IconArrowLeft /> {(t as any).backBtn}
                  </button>

                  <div className="account-method-card" onClick={() => { handleAddMicrosoft(); }}>
                    <div className="account-method-icon microsoft">
                      <IconMicrosoft />
                    </div>
                    <div className="account-method-info">
                      <h4>Microsoft</h4>
                      <p>{(t as any).microsoftAccountDesc}</p>
                    </div>
                  </div>

                  <div className="account-method-card" onClick={() => setAccountModalView("offline")}>
                    <div className="account-method-icon offline">
                      <IconUser />
                    </div>
                    <div className="account-method-info">
                      <h4>{(t as any).offlineAccountTitle}</h4>
                      <p>{(t as any).offlineAccountDesc}</p>
                    </div>
                  </div>
                </>
              )}

              {accountModalView === "offline" && (
                <div className="account-offline-form">
                  <button className="account-back-btn" onClick={() => setAccountModalView("method")}>
                    <IconArrowLeft /> {(t as any).backBtn}
                  </button>

                  <div className="account-input-group">
                    <input
                      type="text"
                      placeholder={t.nicknamePlaceholder}
                      value={newUsernameInput}
                      onChange={(e) => setNewUsernameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOffline()}
                      className={newUsernameInput.length > 0 && !/^[a-zA-Z0-9_]{3,16}$/.test(newUsernameInput) ? 'invalid' : ''}
                      autoFocus
                    />
                    <span className="account-input-hint">{(t as any).nicknameRules}</span>
                  </div>

                  <button
                    className="account-add-btn"
                    onClick={handleAddOffline}
                    disabled={!newUsernameInput.trim() || !/^[a-zA-Z0-9_]{3,16}$/.test(newUsernameInput.trim())}
                  >
                    <IconPlus /> {(t as any).addBtn}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="account-modal-overlay" onClick={() => setImportModalOpen(false)}>
          <div className="account-modal" onClick={e => e.stopPropagation()} style={{ width: '480px', padding: 0, background: 'rgba(20, 20, 30, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div className="account-modal-header">
              <div className="account-modal-header-info">
                <h3 style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {importStep === "menu" ? "Импорт сборки" : importStep === "prism" ? "Импорт из Prism Launcher" : importStep === "curseforge" ? "Импорт из CurseForge" : "Импорт .mrpack"}
                </h3>
                <p>{importStep === "menu" ? "Выберите лаунчер, из которого нужно перенести сборку" : `Выберите или перетащите архив сборки`}</p>
              </div>
              <button className="account-modal-close" onClick={() => {
                if (importStep !== "menu") setImportStep("menu");
                else setImportModalOpen(false);
              }}>
                <IconX />
              </button>
            </div>
            
            
            <div className="account-modal-body" style={{ marginTop: '10px' }}>
              {importStep === "menu" ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="account-method-card" onClick={() => setImportStep("mrpack")}>
                    <div className="account-method-icon" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                      <IconBox />
                    </div>
                    <div className="account-method-info">
                      <h4>Omega Launcher</h4>
                      <p>Формат .mrpack</p>
                    </div>
                  </div>
                  
                  <div className="account-method-card" onClick={() => setImportStep("prism")}>
                    <div className="account-method-icon" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /><polyline points="12 22 12 12" /><polyline points="22 8.5 12 12" /><polyline points="2 8.5 12 12" /></svg>
                    </div>
                    <div className="account-method-info">
                      <h4>Prism Launcher</h4>
                      <p>Формат .zip</p>
                    </div>
                  </div>

                  <div className="account-method-card" onClick={() => setImportStep("mrpack")}>
                    <div className="account-method-icon" style={{ background: 'rgba(0,175,92,0.1)', color: '#00AF5C' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M8 12l4-4 4 4"/></svg>
                    </div>
                    <div className="account-method-info">
                      <h4>Modrinth App</h4>
                      <p>Формат .mrpack</p>
                    </div>
                  </div>

                  <div className="account-method-card" onClick={() => setImportStep("curseforge")}>
                    <div className="account-method-icon" style={{ background: 'rgba(241,100,54,0.1)', color: '#F16436' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c0 0-5 4-5 10a5 5 0 0 0 10 0c0-6-5-10-5-10Z"/></svg>
                    </div>
                    <div className="account-method-info">
                      <h4>CurseForge</h4>
                      <p>Формат .zip</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '15px', background: 'rgba(0,0,0,0.2)' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    const path = file ? (file as any).path : null;
                    if (path) {
                      if (importStep === "prism") handlePrismImport(path);
                      else if (importStep === "curseforge") handleCurseForgeImport(path);
                      else if (importStep === "mrpack") handleMrPackImport(path);
                    } else {
                      showNotification("Не удалось получить путь файла. Используйте кнопку 'Выбрать файл'.", "error");
                    }
                  }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '15px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p style={{ color: '#8b8b9c', textAlign: 'center', marginBottom: '20px' }}>Перетащите сюда архив от {importStep === "prism" ? "Prism Launcher" : importStep === "curseforge" ? "CurseForge" : "Omega/Modrinth"}<br/>или нажмите кнопку ниже</p>
                  
                  <button className="play-btn" onClick={async () => {
                    try {
                      const selected = await open({
                        multiple: false,
                        filters: [{ name: 'Archives', extensions: importStep === "mrpack" ? ['mrpack', 'zip'] : ['zip'] }]
                      });
                      const resolvedPath = selected;
                      
                      if (resolvedPath) {
                        if (importStep === "prism") handlePrismImport(resolvedPath);
                        else if (importStep === "curseforge") handleCurseForgeImport(resolvedPath);
                        else if (importStep === "mrpack") handleMrPackImport(resolvedPath);
                      }
                    } catch (e) {
                      showNotification("Ошибка выбора файла", "error");
                    }
                  }} style={{ width: '100%', justifyContent: 'center' }}>
                    Выбрать файл
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>

      {/* Floating Bottom Dock Navigation */}
      <div className="dock-wrapper">
        <div className="floating-dock">
          {/* Button 1: Каталог */}
          <button 
            className={`dock-btn ${["mods", "resourcepacks", "shaders", "datapacks"].includes(activeTab) ? 'active' : ''}`}
            onClick={() => setActiveTab("mods")}
            title="Каталог & Моды"
          >
            <div className="dock-icon-circle">
              <AnimatedIcon images={MOD_ICONS} interval={2500} />
            </div>
            <span className="dock-label">Каталог</span>
          </button>

          {/* Button 2: Сборки */}
          <button 
            className={`dock-btn ${activeTab === 'modpacks' ? 'active' : ''}`}
            onClick={() => setActiveTab("modpacks")}
            title="Сборки"
          >
            <div className="dock-icon-circle">
              <AnimatedIcon images={MODPACK_ICONS} interval={3100} />
            </div>
            <span className="dock-label">Сборки</span>
          </button>

          {/* CENTER: Rhombus — Play/Stop on home, Home button on other tabs */}
          <div className="dock-play-container">
            {activeTab === 'home' && (
              <div className="dock-version-badge">
                {selectedInstance ? selectedInstance.mcVersion : "1.20.1"}
              </div>
            )}
            <button 
              className="rhombus-play-btn"
              onClick={activeTab === 'home' ? (isRunning ? handleStop : handlePlay) : () => setActiveTab('home')}
              title={activeTab === 'home' ? (isRunning ? t.stopBtn : t.playBtn) : 'Главная'}
            >
              <div className="play-icon-inner">
                {activeTab === 'home'
                  ? (isRunning ? <IconX /> : <IconPlay />)
                  : <IconHome />}
              </div>
            </button>
          </div>

          {/* Button 3: Настройки */}
          <button 
            className={`dock-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab("settings")}
            title="Настройки"
          >
            <div className="dock-icon-circle">
              <IconSettings />
            </div>
            <span className="dock-label">Настройки</span>
          </button>
        </div>
      </div>

      {appNotification && (
        <div className={`toast-notification ${appNotification.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {appNotification.type === 'success' ? <IconCheck /> : <IconX />}
          {appNotification.message}
        </div>
      )}

    </div>
  );
}

export default App;
