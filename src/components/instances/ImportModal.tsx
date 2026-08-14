import React, { useCallback, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconBox, IconX } from "../../ui/icons";
import { useToast } from "../../ui/ToastProvider";
import type { ImportKind } from "../../hooks/useInstances";

export type ImportStep = "menu" | "prism" | "curseforge" | "mrpack";

export const ImportModal = React.memo(({
  t,
  step,
  onSelectStep,
  onImport,
  onClose,
}: {
  t: any;
  step: ImportStep;
  onSelectStep: (step: ImportStep) => void;
  onImport: (kind: ImportKind, path: string) => void;
  onClose: () => void;
}) => {
  const { showToast } = useToast();
  const [dragActive, setDragActive] = React.useState(false);
  const lastDropRef = useRef<{ path: string; at: number } | null>(null);

  const resolveKind = useCallback((path: string): ImportKind => {
    if (step === "curseforge") return "curseforge";
    if (step === "mrpack") return "mrpack";
    if (step === "prism") return "prism";
    return path.toLowerCase().endsWith(".mrpack") ? "mrpack" : "prism";
  }, [step]);

  const handleFile = useCallback((path: string | null) => {
    if (!path) {
      showToast(t.importBadPath, "error");
      return;
    }
    const now = Date.now();
    if (lastDropRef.current && lastDropRef.current.path === path && now - lastDropRef.current.at < 1500) return;
    lastDropRef.current = { path, at: now };
    onImport(resolveKind(path), path);
  }, [resolveKind, onImport, showToast, t]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setDragActive(true);
        } else if (event.payload.type === "leave") {
          setDragActive(false);
        } else if (event.payload.type === "drop") {
          setDragActive(false);
          handleFile(event.payload.paths?.[0] ?? null);
        }
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((error) => {
        console.error("Failed to subscribe to drag-drop", error);
      });
    return () => {
      unlisten?.();
    };
  }, [handleFile]);

  const pickFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Archives", extensions: step === "mrpack" ? ["mrpack", "zip"] : ["zip"] }],
      });
      if (selected) handleFile(selected);
    } catch (e) {
      showToast(t.importFilePickFailed, "error");
    }
  }, [step, handleFile, showToast, t]);

  const kindLabel = step === "prism" ? "Prism Launcher" : step === "curseforge" ? "CurseForge" : "Omega/Modrinth";

  return (
    <div className="account-modal-overlay" onClick={() => {
      if (step !== "menu") onSelectStep("menu");
      else onClose();
    }}>
      {dragActive && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2600,
            pointerEvents: "none",
            border: "2px dashed var(--accent-color)",
            background: "rgba(171, 61, 245, 0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ background: "rgba(20,16,32,0.95)", padding: "18px 26px", borderRadius: 14, border: "1px solid var(--accent-color)", fontWeight: 600, fontSize: "1rem" }}>
            {t.dropImportHint}
          </div>
        </div>
      )}
      <DraggableWindow storageKey="omega:import-window" className="account-modal draggable-window" defaultPosition={{ x: 200, y: 110 }}>
        <div className="account-modal-header draggable-window-handle">
          <div className="account-modal-header-info">
            <h3 style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              {step === "menu" ? t.importTitle : step === "prism" ? t.importFromPrism : step === "curseforge" ? t.importFromCurseforge : t.importFromMrpack}
            </h3>
            <p>{step === "menu" ? t.importChooseLauncher : t.importPickArchive}</p>
          </div>
          <button className="account-modal-close" onClick={() => {
            if (step !== "menu") onSelectStep("menu");
            else onClose();
          }}>
            <IconX />
          </button>
        </div>

        <div className="account-modal-body" style={{ marginTop: "10px" }}>
          {step === "menu" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="account-method-card" onClick={() => onSelectStep("mrpack")}>
                <div className="account-method-icon" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}>
                  <IconBox />
                </div>
                <div className="account-method-info">
                  <h4>{t.importOmega}</h4>
                  <p>{t.importOmegaFormat}</p>
                </div>
              </div>

              <div className="account-method-card" onClick={() => onSelectStep("prism")}>
                <div className="account-method-icon" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /><polyline points="12 22 12 12" /><polyline points="22 8.5 12 12" /><polyline points="2 8.5 12 12" /></svg>
                </div>
                <div className="account-method-info">
                  <h4>{t.importPrism}</h4>
                  <p>{t.importPrismFormat}</p>
                </div>
              </div>

              <div className="account-method-card" onClick={() => onSelectStep("mrpack")}>
                <div className="account-method-icon" style={{ background: "rgba(0,175,92,0.1)", color: "#00AF5C" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M8 12l4-4 4 4"/></svg>
                </div>
                <div className="account-method-info">
                  <h4>{t.importModrinth}</h4>
                  <p>{t.importOmegaFormat}</p>
                </div>
              </div>

              <div className="account-method-card" onClick={() => onSelectStep("curseforge")}>
                <div className="account-method-icon" style={{ background: "rgba(241,100,54,0.1)", color: "#F16436" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c0 0-5 4-5 10a5 5 0 0 0 10 0c0-6-5-10-5-10Z"/></svg>
                </div>
                <div className="account-method-info">
                  <h4>{t.importCurseForge}</h4>
                  <p>{t.importCurseFormat}</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", border: "2px dashed rgba(255,255,255,0.15)", borderRadius: "15px", background: "rgba(0,0,0,0.2)" }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                const path = file ? (file as any).path : null;
                if (!path) return;
                handleFile(path);
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "15px" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p style={{ color: "#8b8b9c", textAlign: "center", marginBottom: "20px" }}>
                {t.importDropHint} {kindLabel}<br/>{t.importOrClick}
              </p>

              <button className="play-btn" onClick={() => void pickFile()} style={{ width: "100%", justifyContent: "center" }}>
                {t.importPickFile}
              </button>
            </div>
          )}
        </div>
      </DraggableWindow>
    </div>
  );
});