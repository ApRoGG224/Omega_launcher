import { AnimatedIcon } from "../catalog/AnimatedIcon";
import { MOD_ICONS, MODPACK_ICONS } from "../catalog/catalogAssets";
import { IconHome, IconUsers, IconSettings, IconPlay, IconX } from "../../ui/icons";

type Props = {
  activeTab: string;
  isHome: boolean;
  isRunning: boolean;
  selectedVersionLabel: string;
  onHome: () => void;
  onCatalog: () => void;
  onModpacks: () => void;
  onSettings: () => void;
  onFriends: () => void;
  onPlay: () => void;
  onStop: () => void;
  t: any;
};

export function FloatingDock(props: Props) {
  const { activeTab, isHome, isRunning, selectedVersionLabel, onHome, onCatalog, onModpacks, onSettings, onFriends, onPlay, onStop, t } = props;
  const shouldAutoHideDock = activeTab !== "home";

  return (
    <div className={`dock-wrapper ${isHome ? "dock-home" : "dock-overlay"} ${shouldAutoHideDock ? "dock-auto-hidden" : ""}`}>
      <div className="floating-dock">
        <button className={`dock-btn ${["mods", "resourcepacks", "shaders", "datapacks"].includes(activeTab) ? "active" : ""}`} onClick={(event) => { onCatalog(); event.currentTarget.blur(); }} title={t.dockCatalog}>
          <div className="dock-icon-circle"><AnimatedIcon images={MOD_ICONS} interval={2500} /></div>
          <span className="dock-label">{t.dockCatalog}</span>
        </button>
        <button className={`dock-btn ${activeTab === "modpacks" ? "active" : ""}`} onClick={(event) => { onModpacks(); event.currentTarget.blur(); }} title={t.dockPacks}>
          <div className="dock-icon-circle"><AnimatedIcon images={MODPACK_ICONS} interval={3100} /></div>
          <span className="dock-label">{t.dockPacks}</span>
        </button>
        <div className="dock-play-container">
          <div className="dock-version-slot">
            <div className={`dock-version-badge${isHome ? "" : " dock-version-badge-hidden"}`}>{selectedVersionLabel}</div>
          </div>
          <button className="rhombus-play-btn" onClick={isHome ? (isRunning ? onStop : onPlay) : onHome} title={isHome ? (isRunning ? t.stopBtn : t.playBtn) : t.homeTitle}>
            <div className="play-icon-inner">{isHome ? (isRunning ? <IconX /> : <IconPlay />) : <IconHome />}</div>
          </button>
        </div>
        <button className={`dock-btn ${activeTab === "settings" ? "active" : ""}`} onClick={(event) => { onSettings(); event.currentTarget.blur(); }} title={t.dockSettings}>
          <div className="dock-icon-circle"><IconSettings /></div>
          <span className="dock-label">{t.dockSettings}</span>
        </button>
        <button className={`dock-btn ${activeTab === "friends" ? "active" : ""}`} onClick={(event) => { onFriends(); event.currentTarget.blur(); }} title={t.dockFriends}>
          <div className="dock-icon-circle"><IconUsers /></div>
          <span className="dock-label">{t.dockFriends}</span>
        </button>
      </div>
    </div>
  );
}
