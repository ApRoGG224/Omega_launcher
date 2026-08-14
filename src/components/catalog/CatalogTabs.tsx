import { AnimatedIcon } from "./AnimatedIcon";
import { IconBox } from "../../ui/icons";
import { MOD_ICONS, RESOURCEPACK_ICONS, SHADER_ICONS, DATAPACK_ICONS } from "./catalogAssets";

export function CatalogTabs({ t, activeTab, setActiveTab }: { t: any; activeTab: string; setActiveTab: (tab: string) => void }) {
  return (
    <div className="store-sub-tabs">
      <button className={`sub-tab-btn ${activeTab === "mods" ? "active" : ""}`} onClick={() => setActiveTab("mods")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><AnimatedIcon images={MOD_ICONS} interval={2500} /> {t.tabMods}</div></button>
      <button className={`sub-tab-btn ${activeTab === "resourcepacks" ? "active" : ""}`} onClick={() => setActiveTab("resourcepacks")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><AnimatedIcon images={RESOURCEPACK_ICONS} interval={2800} /> {t.tabTextures}</div></button>
      <button className={`sub-tab-btn ${activeTab === "shaders" ? "active" : ""}`} onClick={() => setActiveTab("shaders")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><AnimatedIcon images={SHADER_ICONS} interval={2900} /> {t.tabShaders}</div></button>
      <button className={`sub-tab-btn ${activeTab === "datapacks" ? "active" : ""}`} onClick={() => setActiveTab("datapacks")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><AnimatedIcon images={DATAPACK_ICONS} interval={2600} /> {t.tabDatapacks}</div></button>
      <button className={`sub-tab-btn ${activeTab === "catalog" ? "active" : ""}`} onClick={() => setActiveTab("catalog")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><IconBox /> {t.tabCatalog}</div></button>
    </div>
  );
}
