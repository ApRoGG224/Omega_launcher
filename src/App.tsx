import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { translations, Language } from './i18n';
import "./App.css";

// ---------------------------------
// ИКОНКИ (Мемоизированные)
// ---------------------------------
const IconOmega = React.memo(() => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h4.5a.5.5 0 0 0 .5-.5v-2.828a2 2 0 0 1 .586-1.414l1.5-1.5a2 2 0 0 0 0-2.828l-1.172-1.172a4 4 0 0 1 0-5.656l2.172-2.172a4 4 0 0 1 5.656 0l2.172 2.172a4 4 0 0 1 0 5.656l-1.172 1.172a2 2 0 0 0 0 2.828l1.5 1.5a2 2 0 0 1 .586 1.414V19.5a.5.5 0 0 0 .5.5H21"/></svg>);
const IconHome = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>);
const IconBox = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>);
const IconUsers = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>);
const IconSettings = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>);
const IconPlay = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>);
const IconCpu = React.memo(() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>);
const IconFolder = React.memo(() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>);
const IconShield = React.memo(() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>);
const IconRefresh = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>);
const IconChevronDown = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>);
const IconPlus = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>);
const IconUser = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);
const IconMicrosoft = React.memo(() => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" fill="#f35325"/><rect x="13" y="3" width="8" height="8" fill="#81bc06"/><rect x="3" y="13" width="8" height="8" fill="#05a6f0"/><rect x="13" y="13" width="8" height="8" fill="#ffba08"/></svg>);
const IconSearch = React.memo(() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);
const IconDownload = React.memo(() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>);
const IconX = React.memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);

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

// ---------------------------------
// КОМПОНЕНТЫ
// ---------------------------------

const ConsolePanel = React.memo(({ logs }: { logs: string[] }) => {
  const consoleRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="console-panel">
      <div className="console-header">
        <div className="mac-dots">
          <div className="mac-dot red" />
          <div className="mac-dot yellow" />
          <div className="mac-dot green" />
        </div>
        <span className="console-title">GAME OUTPUT</span>
      </div>
      <div className="console-content" ref={consoleRef}>
        {logs.length === 0 ? (
          <span style={{ opacity: 0.5 }}>Waiting for game to launch...</span>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>
    </div>
  );
});

const ModsPanel = React.memo(({ instances, t, language }: { instances: ModpackInstance[], t: any, language: Language }) => {
  const [query, setQuery] = useState("");
  const [mods, setMods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 24;

  const [mcVersion, setMcVersion] = useState("1.21.4");
  const [modLoader, setModLoader] = useState("fabric");
  
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [loaderMenuOpen, setLoaderMenuOpen] = useState(false);
  
  const [sortBy, setSortBy] = useState("downloads");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [installModalOpen, setInstallModalOpen] = useState<string | null>(null);

  const searchMods = useCallback(async (q: string, ver: string, loader: string, sortOpt: string, isLoadMore = false) => {
    setLoading(true);
    try {
       const facets: any[] = [["project_type:mod"]];
       if (ver && ver !== "Любая") {
         facets.push([`versions:${ver}`]);
       }
       if (loader && loader !== "Любой") {
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
       const data = await res.json();
       
       let finalHits = data.hits || [];
       if (finalHits.length > 0 && language === 'ru') {
         try {
           const combinedDesc = finalHits.map((h: any) => h.description || " ").join(" \n\n###\n\n ");
           const trRes = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t", {
             method: "POST",
             headers: { "Content-Type": "application/x-www-form-urlencoded" },
             body: "q=" + encodeURIComponent(combinedDesc)
           });
           const trData = await trRes.json();
           let fullTranslation = "";
           if (trData && trData[0]) {
             trData[0].forEach((item: any) => { if (item[0]) fullTranslation += item[0]; });
           }
           const splitTranslations = fullTranslation.split("###").map(s => s.trim());
           finalHits = finalHits.map((h: any, idx: number) => ({
             ...h,
             description: splitTranslations[idx] || h.description
           }));
         } catch(e) {
           console.error("Translation failed", e);
         }
       }
       
       if (data.hits) {
         if (isLoadMore) {
           setMods(prev => [...prev, ...finalHits]);
           setOffset(currentOffset);
         } else {
           setMods(finalHits);
           setOffset(0);
         }
       }
    } catch(e) {
       console.error("Failed to fetch mods", e);
    }
    setLoading(false);
  }, [offset]);

  useEffect(() => {
    searchMods(query, mcVersion, modLoader, sortBy, false);
    // eslint-disable-next-line
  }, [mcVersion, modLoader, sortBy]);

  useEffect(() => {
    const handleClick = () => {
      setVersionMenuOpen(false);
      setLoaderMenuOpen(false);
      setSortMenuOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleInstallClick = (modId: string) => {
    setInstallModalOpen(modId);
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

    setInstallModalOpen(null);
    setLoading(true);
    try {
        await invoke("download_mod", { 
            modId: modIdToDownload, 
            mcVersion: inst.mcVersion, 
            loader: inst.loader === "Vanilla" ? "fabric" : inst.loader,
            instanceId: instanceId 
        });
        showNotification("Мод успешно скачан и установлен в сборку!", 'success');
    } catch (e: any) {
        if (typeof e === 'string' && e.includes("ALREADY_EXISTS")) {
            showNotification(t.modAlreadyInstalled, 'error');
        } else {
            showNotification(t.modInstallError + e, 'error');
        }
    }
    setLoading(false);
  };

  return (
      <div className="settings-panel" style={{ marginTop: 0, height: "100%", display: "flex", flexDirection: "column", position: "relative", padding: "10px 0 0 0", background: "transparent", border: "none", boxShadow: "none" }}>
         <div className="mods-search-bar" style={{ flexShrink: 0 }}>
           <div className="custom-dropdown-container" onClick={(e) => { e.stopPropagation(); setVersionMenuOpen(prev => !prev); setLoaderMenuOpen(false); }} style={{ minWidth: "120px" }}>
             <div className="custom-dropdown-btn" style={{ height: "46px" }}>
               {mcVersion} <IconChevronDown />
             </div>
             {versionMenuOpen && (
               <div className="custom-dropdown-menu">
                 {["Любая", ...VERSIONS_LIST].map(v => (
                   <div key={v} className="custom-dropdown-item" onClick={() => setMcVersion(v)}>{v}</div>
                 ))}
               </div>
             )}
           </div>

           <div className="custom-dropdown-container" onClick={(e) => { e.stopPropagation(); setLoaderMenuOpen(prev => !prev); setVersionMenuOpen(false); setSortMenuOpen(false); }} style={{ minWidth: "110px" }}>
             <div className="custom-dropdown-btn" style={{ height: "46px" }}>
               {modLoader} <IconChevronDown />
             </div>
             {loaderMenuOpen && (
               <div className="custom-dropdown-menu">
                 {["Любой", "fabric", "forge", "quilt", "neoforge"].map(l => (
                   <div key={l} className="custom-dropdown-item" onClick={() => setModLoader(l)}>{l}</div>
                 ))}
               </div>
             )}
           </div>

           <div className="custom-dropdown-container" onClick={(e) => { e.stopPropagation(); setSortMenuOpen(prev => !prev); setVersionMenuOpen(false); setLoaderMenuOpen(false); }} style={{ minWidth: "160px" }}>
             <div className="custom-dropdown-btn" style={{ height: "46px" }}>
               {sortBy === "downloads" ? "Популярные" : sortBy === "follows" ? "Лучшие моды" : sortBy === "optimization" ? "Для оптимизации" : sortBy === "newest" ? "Новые" : "Обновлённые"} <IconChevronDown />
             </div>
             {sortMenuOpen && (
               <div className="custom-dropdown-menu">
                 <div className="custom-dropdown-item" onClick={() => setSortBy("downloads")}>Популярные</div>
                 <div className="custom-dropdown-item" onClick={() => setSortBy("follows")}>Лучшие моды</div>
                 <div className="custom-dropdown-item" onClick={() => setSortBy("optimization")}>Для оптимизации</div>
                 <div className="custom-dropdown-item" onClick={() => setSortBy("newest")}>Новые</div>
                 <div className="custom-dropdown-item" onClick={() => setSortBy("updated")}>Обновлённые</div>
               </div>
             )}
           </div>

           <input 
             type="text" 
             placeholder={`Найти мод для ${mcVersion}...`} 
             value={query} 
             onChange={(e) => setQuery(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && searchMods(query, mcVersion, modLoader, sortBy, false)}
           />
           <button onClick={() => searchMods(query, mcVersion, modLoader, sortBy, false)} disabled={loading}>
             {loading ? "..." : <IconSearch />}
           </button>
         </div>

         <div className="mods-grid" style={{ flex: 1, overflowY: "auto" }} onScroll={handleScroll}>
           {mods.map((mod, idx) => (
             <div key={`${mod.project_id}-${idx}`} className="mod-card">
               <div className="mod-header">
                 <img src={mod.icon_url || "https://cdn.modrinth.com/favicon.ico"} alt={mod.title} className="mod-icon" />
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

         {installModalOpen && (
            <>
              <style>{`
                @keyframes slideDownModal {
                  0% { top: -100px; opacity: 0; transform: translateX(-50%) scale(0.9); }
                  60% { top: 30px; opacity: 1; transform: translateX(-50%) scale(1.02); }
                  100% { top: 20px; opacity: 1; transform: translateX(-50%) scale(1); }
                }
                @keyframes slideInItem {
                  from { opacity: 0; transform: translateX(-20px); }
                  to { opacity: 1; transform: translateX(0); }
                }
              `}</style>
              <div className="global-modal-content" style={{
                position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(145deg, rgba(30,30,45,0.95), rgba(15,15,20,0.98))',
                border: '1px solid rgba(255,255,255,0.05)',
                borderTop: '2px solid #a855f7',
                borderRadius: '20px', padding: '24px', width: '480px', maxWidth: '90%',
                display: 'flex', flexDirection: 'column', 
                boxShadow: '0 30px 60px -15px rgba(0,0,0,0.8), 0 0 40px rgba(168, 85, 247, 0.2) inset',
                backdropFilter: 'blur(20px)', zIndex: 9999,
                animation: 'slideDownModal 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                       <IconDownload />
                    </div>
                    <h3 style={{ 
                      fontSize: "1.2rem", margin: 0, fontWeight: "700",
                      background: 'linear-gradient(90deg, #fff, #c084fc)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                      {t.installTo}
                    </h3>
                  </div>
                  <button onClick={() => setInstallModalOpen(null)} style={{ 
                    background: 'rgba(255,255,255,0.05)', border: 'none', color: '#8b8b9c', 
                    cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex',
                    transition: 'all 0.3s ease'
                  }} onMouseEnter={e => { e.currentTarget.style.color="white"; e.currentTarget.style.background="rgba(239, 68, 68, 0.2)"; e.currentTarget.style.transform="rotate(90deg)"; }} 
                     onMouseLeave={e => { e.currentTarget.style.color="#8b8b9c"; e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.transform="rotate(0deg)"; }}>
                     <IconX />
                  </button>
                </div>

                <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "8px" }}>
                  {instances.length === 0 ? (
                    <div style={{ color: "#8b8b9c", fontSize: "0.95rem", textAlign: "center", padding: "30px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px" }}>
                      {t.noInstances}
                    </div>
                  ) : instances.map((inst, idx) => (
                    <button key={inst.id} onClick={() => confirmInstall(inst.id)} style={{
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "white",
                      padding: "16px", borderRadius: "14px", cursor: "pointer", textAlign: "left", transition: "all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      animation: `slideInItem 0.4s ease forwards`,
                      animationDelay: `${idx * 0.05}s`, opacity: 0
                    }} onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(90deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05))"; e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.5)"; e.currentTarget.style.transform = "translateX(5px)"; e.currentTarget.style.boxShadow = "0 10px 20px -10px rgba(168, 85, 247, 0.3)"; }}
                       onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "10px", display: "flex", color: "#a855f7" }}>
                          <IconBox />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: "1.05rem", fontWeight: "600", letterSpacing: "0.3px" }}>{inst.name}</span>
                          <span style={{ color: "#8b8b9c", fontSize: "0.85rem" }}>{t.version}: {inst.mcVersion}</span>
                        </div>
                      </div>

                      <div style={{ 
                        color: "#e9d5ff", fontSize: "0.8rem", fontWeight: "600",
                        background: "rgba(168, 85, 247, 0.2)", border: "1px solid rgba(168, 85, 247, 0.3)", 
                        padding: "6px 12px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.5px" 
                      }}>
                        {inst.loader}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Toast Notification */}
          {notification && (
            <div style={{
              position: 'fixed', bottom: '30px', right: '30px', zIndex: 10000,
              background: notification.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${notification.type === 'success' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
              backdropFilter: 'blur(12px)',
              color: notification.type === 'success' ? '#4ade80' : '#f87171',
              padding: '16px 24px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: `0 10px 30px -10px ${notification.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              animation: 'toastSlideIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
            }}>
              <style>{`
                @keyframes toastSlideIn {
                  from { transform: translateX(100%) scale(0.9); opacity: 0; }
                  to { transform: translateX(0) scale(1); opacity: 1; }
                }
              `}</style>
              <div style={{
                background: notification.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                padding: '6px', borderRadius: '50%', display: 'flex'
              }}>
                {notification.type === 'success' ? <IconBox /> : <IconX />}
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: '500' }}>{notification.message}</span>
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

  const [activeTab, setActiveTab] = useState("home");
  
  // Accounts
  const [account, setAccount] = useState<Account>({ name: "NightWolf", type: "offline" });
  const [savedAccounts, setSavedAccounts] = useState<Account[]>([{ name: "NightWolf", type: "offline" }]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState("");

  // Settings
  const [ram, setRam] = useState(4);
  const [javaPath, setJavaPath] = useState("/usr/lib/jvm/java-21");
  const [gamePath, setGamePath] = useState("~/.omega-launcher/minecraft");
  const [serverIp, setServerIp] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Desktop Instances State
  const [instances, setInstances] = useState<ModpackInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; instanceId: string } | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) setContextMenu(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu]);

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
  const [newLoader, setNewLoader] = useState("Vanilla");
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
      } catch(e) {}
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
  }, []);

  useEffect(() => {
    const unlisten = listen("download-progress", (event) => {
      const line = event.payload as string;
      setLogs((prev) => {
        const newLogs = [...prev, line];
        return newLogs.slice(-100);
      });
      if (line.includes("[launcher/INFO] Minecraft process exited")) {
          setIsRunning(false);
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
      setVerMenuOpen(false);
      setLoaderMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAddUsername = useCallback(() => {
    const newName = newUsernameInput.trim();
    if (newName !== "") {
      const newAcc: Account = { name: newName, type: "offline" };
      setSavedAccounts(prev => {
        const updated = [newAcc, ...prev.filter(a => a.name !== newName)];
        localStorage.setItem("savedNicknames", JSON.stringify(updated));
        return updated;
      });
      setAccount(newAcc);
      setNewUsernameInput("");
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
      setLogs(prev => [...prev, "[MS_AUTH]: Ожидание входа в браузере..."]);
      const output = await invoke("login_microsoft");
      const match = output.toString().match(/SUCCESS:(.+)/);
      if (match && match[1]) {
        const msName = match[1].trim();
        const newAcc: Account = { name: msName, type: "microsoft" };
        setSavedAccounts(prev => {
           const updated = [newAcc, ...prev.filter(a => a.name !== msName)];
           localStorage.setItem("savedNicknames", JSON.stringify(updated));
           return updated;
        });
        setAccount(newAcc);
        setLogs(prev => [...prev, "[MS_AUTH]: Успешный вход как " + msName]);
        setProfileMenuOpen(false);
      } else {
        const errMatch = output.toString().match(/ERROR:(.+)/);
        setLogs(prev => [...prev, "[MS_AUTH]: Ошибка входа: " + (errMatch ? errMatch[1].trim() : "Неизвестная ошибка")]);
      }
    } catch(e: any) {
      setLogs(prev => [...prev, "[MS_AUTH_ERR]: " + e]);
    }
  }, []);

  const handlePlay = useCallback(async () => {
    if (!selectedInstanceId) return alert("Сначала выберите или создайте сборку на рабочем столе!");
    const inst = instances.find(i => i.id === selectedInstanceId);
    if (!inst) return;

    setIsRunning(true);
    const fullVersionName = inst.loader === "Vanilla" ? inst.mcVersion : `${inst.mcVersion}-${inst.loader}`;
    setLogs([
      "[00:00:01] [main/INFO]: Omega Launcher initialized", 
      `[00:00:01] [main/INFO]: Authenticating using ${account.name}...`,
      `[00:00:01] [main/INFO]: Profile: ${inst.name} (${fullVersionName})`, 
      `[00:00:01] [main/INFO]: Using RAM: ${ram}GB`, 
      serverIp ? `[00:00:01] [main/INFO]: Auto-connect set to ${serverIp}` : "[00:00:01] [main/INFO]: Launching in singleplayer mode",
      "[00:00:02] [main/INFO]: Loading version manifest from Mojang..."
    ]);
    try {
        await invoke("launch_minecraft", { 
          version: fullVersionName, 
          server: serverIp, 
          username: account.name, 
          ram,
          instanceId: inst.id 
        });
    } catch(e) {
        setIsRunning(false);
    }
  }, [account.name, ram, serverIp, instances, selectedInstanceId]);

  const handleStop = useCallback(async () => {
      await invoke("kill_minecraft");
      setIsRunning(false);
      setLogs(prev => [...prev, "[main/INFO]: Убиваем процесс Minecraft..."]);
  }, []);

  const sliderStyle = useMemo(() => ({
    background: `linear-gradient(to right, #a855f7 ${(ram - 1) / 15 * 100}%, rgba(255,255,255,0.1) ${(ram - 1) / 15 * 100}%)`
  }), [ram]);

  const handleCreateInstance = () => {
    if (!newName) return;
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
  };

  const handleDesktopMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const desktopRect = e.currentTarget.getBoundingClientRect();
      let newX = e.clientX - desktopRect.left - dragOffset.x;
      let newY = e.clientY - desktopRect.top - dragOffset.y;
      
      const updated = instances.map(inst => inst.id === isDragging ? { ...inst, x: newX, y: newY } : inst);
      setInstances(updated);
    }
  };

  const handleDesktopMouseUp = () => {
    if (isDragging) {
      setIsDragging(null);
      localStorage.setItem("desktopInstances", JSON.stringify(instances));
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-icon brand"><IconBox /></div>
        <div className={`sidebar-icon ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab("home")} title={t.sidebarHome}><IconHome /></div>
        <div className={`sidebar-icon ${activeTab === 'mods' ? 'active' : ''}`} onClick={() => setActiveTab("mods")} title={t.sidebarMods}><IconBox /></div>
        <div className={`sidebar-icon ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab("settings")} title={t.sidebarSettings}><IconSettings /></div>
      </aside>

      <main className="main-content">
        <header className="top-bar" style={activeTab === 'mods' ? { justifyContent: 'flex-end', paddingBottom: '10px' } : {}}>
          {activeTab !== 'mods' && (
            <div className="title-area">
              <h1>Omega Launcher</h1>
            </div>
          )}
          
          <div className="user-profile" ref={profileMenuRef} onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(prev => !prev); }}>
            <div className="avatar">
                {account.type === "microsoft" ? <IconMicrosoft /> : (account.name ? account.name.substring(0, 2).toUpperCase() : "??")}
            </div>
            <div className="user-info">
              <span className="user-name">{account.name}</span>
              <span className="user-status"><span className="status-dot" /> Онлайн</span>
            </div>
            
            {profileMenuOpen && (
              <div className="profile-menu">
                <span style={{ fontSize: "0.8rem", color: "#8b8b9c", marginBottom: "5px" }}>АККАУНТЫ</span>
                <div className="saved-nicks-list">
                  {savedAccounts.map(acc => (
                    <div key={acc.name} className="saved-nick-item" onClick={() => handleSelectAccount(acc)}>
                      {acc.type === "microsoft" ? <IconMicrosoft /> : <IconUser />}
                      <span style={{ fontWeight: acc.name === account.name ? "bold" : "normal" }}>
                          {acc.name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="profile-input-wrapper" style={{ marginTop: "10px", marginBottom: "5px" }}>
                   <button style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "10px" }} onClick={handleAddMicrosoft}>
                      <IconMicrosoft /> Войти через Microsoft
                   </button>
                </div>
                <div className="profile-input-wrapper">
                  <input 
                    type="text" 
                    placeholder="Оффлайн никнейм..." 
                    value={newUsernameInput}
                    onChange={(e) => setNewUsernameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUsername()}
                  />
                  <button onClick={handleAddUsername}><IconPlus /></button>
                </div>
              </div>
            )}
          </div>
        </header>

        {activeTab === "home" && (
          <>
            {/* РАБОЧИЙ СТОЛ */}
            <div 
              className="desktop-area" 
              onMouseMove={handleDesktopMouseMove}
              onMouseUp={handleDesktopMouseUp}
              onMouseLeave={handleDesktopMouseUp}
            >
              <input type="file" ref={fileInputRef} onChange={handleIconChange} style={{ display: 'none' }} accept="image/*" />
              {instances.map(inst => (
                 <div 
                   key={inst.id}
                   className={`desktop-icon ${selectedInstanceId === inst.id ? 'selected' : ''}`}
                   style={{ left: inst.x, top: inst.y }}
                   onContextMenu={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     setSelectedInstanceId(inst.id);
                     setContextMenu({ visible: true, x: e.clientX, y: e.clientY, instanceId: inst.id });
                   }}
                   onMouseDown={(e) => {
                     setSelectedInstanceId(inst.id);
                     setIsDragging(inst.id);
                     const rect = e.currentTarget.getBoundingClientRect();
                     setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                   }}
                 >
                   {inst.icon ? (
                     <img src={inst.icon} alt="icon" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', marginBottom: 8 }} />
                   ) : (
                     <div className="desktop-icon-img"><IconBox /></div>
                   )}
                   <div className="desktop-icon-name">{inst.name}</div>
                   <div className="desktop-icon-version">{inst.mcVersion} {inst.loader !== "Vanilla" ? inst.loader : ""}</div>
                 </div>
              ))}
              {contextMenu && (
                <div className="context-menu" style={{ 
                  position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000,
                  background: 'rgba(20, 20, 30, 0.95)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px',
                  padding: '5px', display: 'flex', flexDirection: 'column', gap: '2px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: '180px'
                }}>
                  <button className="ctx-item" onClick={(e) => { e.stopPropagation(); setContextMenu(null); handlePlay(); }}>Запустить</button>
                  <button className="ctx-item" onClick={(e) => { e.stopPropagation(); setRenameModalOpen(contextMenu.instanceId); setRenameInput(instances.find(i=>i.id===contextMenu.instanceId)?.name || ""); setContextMenu(null); }}>Переименовать</button>
                  <button className="ctx-item" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); setContextMenu(null); }}>Выбрать свой значок</button>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                  <button className="ctx-item" style={{color: '#ef4444'}} onClick={(e) => {
                    e.stopPropagation();
                    setInstances(prev => {
                      const next = prev.filter(i => i.id !== contextMenu.instanceId);
                      localStorage.setItem("desktopInstances", JSON.stringify(next));
                      return next;
                    });
                    if (selectedInstanceId === contextMenu.instanceId) setSelectedInstanceId(null);
                    setContextMenu(null);
                  }}>Удалить</button>
                </div>
              )}
              
              {renameModalOpen && (
                <div className="modal-overlay" onClick={() => setRenameModalOpen(null)}>
                  <div className="create-modal" onClick={e => e.stopPropagation()}>
                    <h3>Переименовать сборку</h3>
                    <input type="text" value={renameInput} onChange={e => setRenameInput(e.target.value)} placeholder="Новое название" />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button className="play-btn" style={{ flex: 1 }} onClick={() => {
                        setInstances(prev => {
                          const next = prev.map(i => i.id === renameModalOpen ? { ...i, name: renameInput } : i);
                          localStorage.setItem("desktopInstances", JSON.stringify(next));
                          return next;
                        });
                        setRenameModalOpen(null);
                      }}>Сохранить</button>
                      <button className="play-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }} onClick={() => setRenameModalOpen(null)}>Отмена</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bottom-area">
              <ConsolePanel logs={logs} />

              <div className="controls-panel">
                <div className="primary-controls">
                  <div className="selected-instance-display">
                    {selectedInstanceId 
                      ? instances.find(i => i.id === selectedInstanceId)?.name || t.unknown
                      : t.noInstanceSelected}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    {isCreating && (
                      <div className="create-modal" onClick={e => e.stopPropagation()}>
                        <h3>Новая сборка</h3>
                        <input type="text" placeholder="Название (напр. My Modpack)" value={newName} onChange={e => setNewName(e.target.value)} />
                        
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <div className="custom-dropdown-container" onClick={() => { setVerMenuOpen(!verMenuOpen); setLoaderMenuOpen(false); }} style={{ flex: 1 }}>
                            <div className="custom-dropdown-btn" style={{ height: "40px", fontSize: "0.9rem" }}>{newVer} <IconChevronDown /></div>
                            {verMenuOpen && (
                              <div className="custom-dropdown-menu upwards">
                                {VERSIONS_LIST.map(v => <div key={v} className="custom-dropdown-item" onClick={() => setNewVer(v)}>{v}</div>)}
                              </div>
                            )}
                          </div>
                          <div className="custom-dropdown-container" onClick={() => { setLoaderMenuOpen(!loaderMenuOpen); setVerMenuOpen(false); }} style={{ flex: 1 }}>
                            <div className="custom-dropdown-btn" style={{ height: "40px", fontSize: "0.9rem" }}>{newLoader} <IconChevronDown /></div>
                            {loaderMenuOpen && (
                              <div className="custom-dropdown-menu upwards">
                                {LOADERS_LIST.map(l => <div key={l} className="custom-dropdown-item" onClick={() => setNewLoader(l)}>{l}</div>)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                          <button className="play-btn" style={{ flex: 1, height: "40px", fontSize: "0.9rem", padding: 0, justifyContent: "center" }} onClick={handleCreateInstance}>{t.createBtn}</button>
                          <button className="play-btn" style={{ flex: 1, height: "40px", fontSize: "0.9rem", padding: 0, justifyContent: "center", background: "rgba(255,255,255,0.1)", boxShadow: "none" }} onClick={() => setIsCreating(false)}>{t.cancel}</button>
                        </div>
                      </div>
                    )}
                    <button className="play-btn" style={{ background: "rgba(168, 85, 247, 0.2)", border: "1px solid rgba(168, 85, 247, 0.4)", color: "#fff", height: "40px", fontSize: "0.9rem" }} onClick={() => setIsCreating(true)}>
                      <IconPlus /> {t.createInstance}
                    </button>
                    {isRunning ? (
                        <button className="play-btn" style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#ef4444" }} onClick={handleStop}><IconX /> {t.stopBtn}</button>
                    ) : (
                        <button className="play-btn" onClick={handlePlay}><IconPlay /> {t.playBtn}</button>
                    )}
                  </div>
                </div>

                <div className="stats-row">
                  <div className="stat-card">
                    <span className="stat-val">
                      {selectedInstanceId && instances.find(i => i.id === selectedInstanceId)?.loader !== "Vanilla" ? "12" : "0"}
                    </span>
                    <span className="stat-lbl">{t.modsCount}</span>
                  </div>
                  <div 
                    className="stat-card" 
                    onClick={() => selectedInstanceId && invoke("open_folder", { instanceId: selectedInstanceId })}
                    style={{ cursor: "pointer", transition: "0.2s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(168, 85, 247, 0.2)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                    title={t.folderBtn}
                  >
                    <span className="stat-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconFolder /></span>
                    <span className="stat-lbl">{t.folderBtn}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-val">{ram} GB</span>
                    <span className="stat-lbl">RAM</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "mods" && <ModsPanel instances={instances} t={t} language={language} />}

        {activeTab === "settings" && (
          <div className="settings-panel">
            <div className="settings-header">
              <h2>Настройки</h2>
              <p>Конфигурация лаунчера</p>
            </div>

            <div className="settings-section">
              <div className="section-title">
                <div className="section-icon" style={{color: '#a855f7'}}><IconUsers /></div>
                Автоподключение
              </div>

              <div className="input-group">
                <label>IP СЕРВЕРА (Оставьте пустым для обычного запуска)</label>
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
                    <div>Оперативная память</div>
                    <div style={{fontSize: "0.8rem", color: "#8b8b9c", fontWeight: "normal"}}>Выделено для Java heap</div>
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
                  <span style={ram === 4 ? {color: '#a855f7'} : {}}>4G</span>
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
                Пути к файлам
              </div>

              <div className="input-group">
                <label>JAVA (JDK)</label>
                <div className="input-wrapper">
                  <input type="text" value={javaPath} onChange={(e) => setJavaPath(e.target.value)} />
                  <button className="folder-btn"><IconFolder /></button>
                </div>
              </div>

              <div className="input-group">
                <label>ПАПКА ИГРЫ (.MINECRAFT)</label>
                <div className="input-wrapper">
                  <input type="text" value={gamePath} onChange={(e) => setGamePath(e.target.value)} />
                  <button className="folder-btn"><IconFolder /></button>
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
                    flex: 1, padding: "12px", borderRadius: "10px", border: language === 'ru' ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
                    background: language === 'ru' ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.05)", 
                    color: language === 'ru' ? "white" : "#8b8b9c", cursor: "pointer", fontSize: "1rem", fontWeight: language === 'ru' ? "bold" : "normal"
                  }}>
                  🇷🇺 Русский
                </button>
                <button 
                  onClick={() => changeLanguage('en')}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", border: language === 'en' ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
                    background: language === 'en' ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.05)", 
                    color: language === 'en' ? "white" : "#8b8b9c", cursor: "pointer", fontSize: "1rem", fontWeight: language === 'en' ? "bold" : "normal"
                  }}>
                  🇬🇧 English
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
