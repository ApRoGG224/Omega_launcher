import React from "react";
import { IconDownload, IconX } from "../../ui/icons";

export const ImportProgressPopup = React.memo(({
  t,
  visible,
  progress,
  onClose,
}: {
  t: any;
  visible: boolean;
  progress: { step: string; current: number; total: number } | null;
  onClose: () => void;
}) => {
  if (!visible) return null;

  const downloading = !!progress && progress.step === "mods" && progress.total > 0;
  const pct = downloading ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;
  const label = downloading
    ? t.installingMods
    : progress?.step === "overrides"
      ? t.applyingConfig
      : t.installingBuild;

  return (
    <div className="import-popup" role="status" aria-live="polite">
      <button className="import-popup-close" onClick={onClose} aria-label={t.importProgressClose}>
        <IconX />
      </button>
      <div className="import-popup-icon">
        <span className="import-popup-ring" />
        <IconDownload />
      </div>
      <div className="import-popup-body">
        <div className="import-popup-title">{t.importProgressTitle}</div>
        <div className="import-popup-label">
          <span>{label}</span>
          {downloading && (
            <span>
              {progress.current} / {progress.total}
            </span>
          )}
        </div>
        <div className="import-popup-bar">
          <div
            className={downloading ? "import-popup-bar-fill" : "import-popup-bar-fill indeterminate"}
            style={downloading ? { width: `${pct}%` } : undefined}
          />
        </div>
      </div>
    </div>
  );
});