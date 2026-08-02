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
  return (
    <div className={`dock-wrapper ${isHome ? "dock-home" : "dock-overlay"}`}>
      <div className="floating-dock">
        <button className={`dock-btn ${["mods", "resourcepacks", "shaders", "datapacks"].includes(activeTab) ? "active" : ""}`} onClick={onCatalog} title="Каталог & Моды">
          <div className="dock-icon-circle"><AnimatedIcon images={MOD_ICONS} interval={2500} /></div>
          <span className="dock-label">Каталог</span>
        </button>
        <button className={`dock-btn ${activeTab === "modpacks" ? "active" : ""}`} onClick={onModpacks} title="Сборки">
          <div className="dock-icon-circle"><AnimatedIcon images={MODPACK_ICONS} interval={3100} /></div>
          <span className="dock-label">Сборки</span>
        </button>
        <div className="dock-play-container">
          {isHome && <div className="dock-version-badge">{selectedVersionLabel}</div>}
          <button className="rhombus-play-btn" onClick={isHome ? (isRunning ? onStop : onPlay) : onHome} title={isHome ? (isRunning ? t.stopBtn : t.playBtn) : "Главная"}>
            <div className="play-icon-inner">{isHome ? (isRunning ? <IconX /> : <IconPlay />) : <IconHome />}</div>
          </button>
        </div>
        <button className={`dock-btn ${activeTab === "settings" ? "active" : ""}`} onClick={onSettings} title="Настройки">
          <div className="dock-icon-circle"><IconSettings /></div>
          <span className="dock-label">Настройки</span>
        </button>
        <button className={`dock-btn ${activeTab === "friends" ? "active" : ""}`} onClick={onFriends} title="Друзья">
          <div className="dock-icon-circle"><IconUsers /></div>
          <span className="dock-label">Друзья</span>
        </button>
      </div>
    </div>
  );
}
