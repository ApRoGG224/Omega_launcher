import {
  IconBox,
  IconCpu,
  IconFolder,
  IconPalette,
  IconSparkles,
} from "../../ui/icons";

export function CatalogTabs({
  t,
  activeTab,
  setActiveTab,
}: {
  t: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <div className="store-sub-tabs">
      <button
        className={`sub-tab-btn ${activeTab === "mods" ? "active" : ""}`}
        onClick={() => setActiveTab("mods")}
      >
        <span className="sub-tab-content">
          <IconCpu size={16} />
          <span>{t.tabMods}</span>
        </span>
      </button>
      <button
        className={`sub-tab-btn ${activeTab === "resourcepacks" ? "active" : ""}`}
        onClick={() => setActiveTab("resourcepacks")}
      >
        <span className="sub-tab-content">
          <IconPalette size={16} />
          <span>{t.tabTextures}</span>
        </span>
      </button>
      <button
        className={`sub-tab-btn ${activeTab === "shaders" ? "active" : ""}`}
        onClick={() => setActiveTab("shaders")}
      >
        <span className="sub-tab-content">
          <IconSparkles size={16} />
          <span>{t.tabShaders}</span>
        </span>
      </button>
      <button
        className={`sub-tab-btn ${activeTab === "datapacks" ? "active" : ""}`}
        onClick={() => setActiveTab("datapacks")}
      >
        <span className="sub-tab-content">
          <IconFolder size={16} />
          <span>{t.tabDatapacks}</span>
        </span>
      </button>
      <button
        className={`sub-tab-btn ${activeTab === "catalog" ? "active" : ""}`}
        onClick={() => setActiveTab("catalog")}
      >
        <span className="sub-tab-content">
          <IconBox size={16} />
          <span>{t.tabCatalog}</span>
        </span>
      </button>
    </div>
  );
}
