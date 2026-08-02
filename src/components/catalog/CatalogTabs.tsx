import { AnimatedIcon } from "./AnimatedIcon";
import { IconBox } from "../../ui/icons";
import { MOD_ICONS, RESOURCEPACK_ICONS, SHADER_ICONS, DATAPACK_ICONS } from "./catalogAssets";

export function CatalogTabs({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  return (
    <div className="store-sub-tabs">
      <button className={`sub-tab-btn ${activeTab === "mods" ? "active" : ""}`} onClick={() => setActiveTab("mods")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><AnimatedIcon images={MOD_ICONS} interval={2500} /> Моды</div></button>
      <button className={`sub-tab-btn ${activeTab === "resourcepacks" ? "active" : ""}`} onClick={() => setActiveTab("resourcepacks")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><AnimatedIcon images={RESOURCEPACK_ICONS} interval={2800} /> Текстуры</div></button>
      <button className={`sub-tab-btn ${activeTab === "shaders" ? "active" : ""}`} onClick={() => setActiveTab("shaders")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><AnimatedIcon images={SHADER_ICONS} interval={2900} /> Шейдеры</div></button>
      <button className={`sub-tab-btn ${activeTab === "datapacks" ? "active" : ""}`} onClick={() => setActiveTab("datapacks")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><AnimatedIcon images={DATAPACK_ICONS} interval={2600} /> Датапаки</div></button>
      <button className={`sub-tab-btn ${activeTab === "catalog" ? "active" : ""}`} onClick={() => setActiveTab("catalog")}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><IconBox /> Каталог</div></button>
    </div>
  );
}
