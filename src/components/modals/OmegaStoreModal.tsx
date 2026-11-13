import React, { useState } from "react";
import { Search } from "lucide-react";
import { PRESET_SKINS, PRESET_CAPES } from "../../constants/skinPresets";
import { IconStoreBag } from "../icons/PixelIcons";

interface OmegaStoreModalProps {
  onClose: () => void;
  onEquipSkin: (skinUrl: string, model: "default" | "slim") => void;
  onEquipCape: (capeUrl: string) => void;
}

export const OmegaStoreModal: React.FC<OmegaStoreModalProps> = ({
  onClose,
  onEquipSkin,
  onEquipCape,
}) => {
  const [activeTab, setActiveTab] = useState<"skins" | "capes">("skins");
  const [searchQuery, setSearchQuery] = useState("");

  const skinsCatalog = [
    { id: "dream", name: "Dream", url: PRESET_SKINS.dream, model: "slim" as const, author: "Dream" },
    { id: "steve", name: "Classic Steve", url: PRESET_SKINS.steve, model: "default" as const, author: "Mojang" },
    { id: "alex", name: "Slim Alex", url: PRESET_SKINS.alex, model: "slim" as const, author: "Mojang" },
    { id: "technoblade", name: "Technoblade", url: PRESET_SKINS.technoblade, model: "default" as const, author: "Technoblade" },
    { id: "herobrine", name: "Herobrine", url: "https://minotar.net/skin/MHF_Herobrine", model: "default" as const, author: "Creepy" },
    { id: "notch", name: "Notch", url: "https://minotar.net/skin/Notch", model: "default" as const, author: "Mojang" },
  ];

  const capesCatalog = [
    { id: "anniversary", name: "15th Anniversary Cape", url: PRESET_CAPES.anniversary, desc: "Официальный плащ к 15-летию игры" },
    { id: "migrator", name: "Migrator Cape", url: PRESET_CAPES.migrator, desc: "Плащ за миграцию аккаунта Mojang" },
    { id: "vanilla", name: "Vanilla Cape", url: PRESET_CAPES.vanilla, desc: "Эксклюзивный плащ для владельцев Java & Bedrock" },
  ];

  const filteredSkins = skinsCatalog.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="modal-window" role="dialog" aria-modal="true">
      <div className="modal-header">
        <div className="modal-header-left">
          <div className="modal-icon-badge">
            <IconStoreBag size={20} />
          </div>
          <div>
            <h2 className="modal-title">Магазин Omega</h2>
            <p className="modal-subtitle">54 000+ скинов, официальные плащи и кастомизация персонажа</p>
          </div>
        </div>
        <button type="button" className="modal-close-btn" onClick={onClose} title="Закрыть">
          ✕
        </button>
      </div>

      <div className="modal-body">
        {/* Navigation Tabs */}
        <div className="store-tabs">
          <button
            type="button"
            className={`store-tab-btn ${activeTab === "skins" ? "active" : ""}`}
            onClick={() => setActiveTab("skins")}
          >
            Скины (54 000+)
          </button>
          <button
            type="button"
            className={`store-tab-btn ${activeTab === "capes" ? "active" : ""}`}
            onClick={() => setActiveTab("capes")}
          >
            Плащи
          </button>
        </div>

        {/* Tab 1: Skins */}
        {activeTab === "skins" && (
          <>
            <div className="store-search-bar">
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                className="store-search-input"
                placeholder="Какой скин ты ищешь? (например: Dream, Steve, Cyberpunk...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="store-grid">
              {filteredSkins.map((skin) => (
                <div key={skin.id} className="store-skin-card">
                  <div className="store-skin-preview-box">
                    <img
                      src={skin.url}
                      alt={skin.name}
                      style={{
                        width: "64px",
                        height: "64px",
                        imageRendering: "pixelated",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  <span className="store-skin-name">{skin.name}</span>
                  <button
                    type="button"
                    className="store-equip-btn"
                    onClick={() => {
                      onEquipSkin(skin.url, skin.model);
                      onClose();
                    }}
                  >
                    Примерить в 3D
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tab 2: Capes */}
        {activeTab === "capes" && (
          <div className="store-grid">
            {capesCatalog.map((cape) => (
              <div key={cape.id} className="store-skin-card">
                <div className="store-skin-preview-box">
                  <img
                    src={cape.url}
                    alt={cape.name}
                    style={{
                      width: "48px",
                      height: "72px",
                      imageRendering: "pixelated",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <span className="store-skin-name">{cape.name}</span>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
                  {cape.desc}
                </p>
                <button
                  type="button"
                  className="store-equip-btn"
                  onClick={() => {
                    onEquipCape(cape.url);
                    onClose();
                  }}
                >
                  Надеть плащ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
