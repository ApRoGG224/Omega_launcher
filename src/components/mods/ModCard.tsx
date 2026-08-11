import React from "react";
import type { ModrinthHit } from "../../types";
import { IconDownload } from "../../ui/icons";
import { CachedImage } from "./CachedImage";

export const ModCard = React.memo(({
  mod,
  t,
  onInstall,
  onDragStart,
}: {
  mod: ModrinthHit;
  t: any;
  onInstall: (projectId: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
}) => {
  const downloads =
    mod.downloads >= 1000000
      ? (mod.downloads / 1000000).toFixed(1) + "M"
      : mod.downloads >= 1000
        ? (mod.downloads / 1000).toFixed(1) + "K"
        : mod.downloads;

  return (
    <div className="mod-card" draggable={!!onDragStart} onDragStart={onDragStart}>
      <div className="mod-header">
        <CachedImage
          src={mod.icon_url || "https://cdn.modrinth.com/favicon.ico"}
          alt={mod.title}
          className="mod-icon"
          fallbackSrc="https://cdn.modrinth.com/favicon.ico"
        />
        <div className="mod-info">
          <div className="mod-title">{mod.title}</div>
          <div className="mod-author">
            {t.byAuthor} {mod.author}
          </div>
        </div>
      </div>
      <div className="mod-desc">{mod.description}</div>
      <div className="mod-footer">
        <div className="mod-downloads">
          <IconDownload /> {downloads}
        </div>
        <button className="mod-install-btn" onClick={() => onInstall(mod.project_id)}>
          {t.downloadBtn}
        </button>
      </div>
    </div>
  );
});