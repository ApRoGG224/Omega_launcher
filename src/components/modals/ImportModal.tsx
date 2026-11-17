import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { InstanceData, ImportSummary } from "../../types";
import { InstanceAvatarIcon, type InstanceAvatarVariant } from "../icons/MinecraftIcons";
import { ipc } from "../../services/ipc";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/import-modal.css";

const LAUNCHER_RANDOM_ICONS: InstanceAvatarVariant[] = [
  "diamond_sword",
  "diamond_pickaxe",
  "obsidian",
  "end_crystal",
  "totem_of_undying",
  "golden_apple",
  "ender_pearl",
  "tnt",
  "netherite_sword",
];

interface SelectedArchiveInfo {
  name: string;
  size: number;
  path?: string;
  fileObj?: File;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (instance: InstanceData) => void;
  folderId?: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  folderId,
}) => {
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedArchiveInfo | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [assignedIcon, setAssignedIcon] = useState<string>("diamond_sword");
  const [isOver, setIsOver] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installState, setInstallState] = useState<"idle" | "installing" | "installed">("idle");
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetState = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSelectedFile(null);
    setSummary(null);
    setAssignedIcon("diamond_sword");
    setIsOver(false);
    setIsInspecting(false);
    setError(null);
    setInstallState("idle");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (installState === "installing") return;
    resetState();
    onClose();
  }, [installState, onClose, resetState]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && installState !== "installing") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, installState, handleClose]);

  const lastNativePathRef = useRef<string | null>(null);

  // Listen to native Tauri webview and window file drag-and-drop events
  useEffect(() => {
    if (!isOpen) return;
    let unlistenWebview: (() => void) | undefined;
    let unlistenWindow: (() => void) | undefined;

    const handleTauriDrop = (event: { payload: { type: string; paths?: string[] } }) => {
      if (event.payload.type === "over" || event.payload.type === "enter") {
        setIsOver(true);
      } else if (event.payload.type === "leave" || event.payload.type === "cancel") {
        setIsOver(false);
      } else if (event.payload.type === "drop") {
        setIsOver(false);
        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          lastNativePathRef.current = paths[0];
          handleSelectPath(paths[0]);
        }
      }
    };

    import("@tauri-apps/api/webview")
      .then(({ getCurrentWebview }) => {
        getCurrentWebview()
          .onDragDropEvent(handleTauriDrop)
          .then((fn) => {
            unlistenWebview = fn;
          })
          .catch(() => {});
      })
      .catch(() => {});

    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        getCurrentWindow()
          .onDragDropEvent(handleTauriDrop)
          .then((fn) => {
            unlistenWindow = fn;
          })
          .catch(() => {});
      })
      .catch(() => {});

    return () => {
      if (unlistenWebview) unlistenWebview();
      if (unlistenWindow) unlistenWindow();
    };
  }, [isOpen]);

  // Inspect archive metadata and pick/assign icon
  const inspectArchiveData = async (info: SelectedArchiveInfo) => {
    setIsInspecting(true);
    setError(null);

    // Pick a random authentic launcher icon in case archive does not contain one
    const randomIcon =
      LAUNCHER_RANDOM_ICONS[Math.floor(Math.random() * LAUNCHER_RANDOM_ICONS.length)];

    try {
      let resolvedPath = info.path;
      if (!resolvedPath) {
        try {
          const found = await ipc.findLocalArchive(info.name);
          if (found) {
            resolvedPath = found;
            setSelectedFile((prev) => (prev ? { ...prev, path: found } : prev));
          }
        } catch {}
      }

      let parsed: ImportSummary;
      if (resolvedPath) {
        parsed = await ipc.inspectArchive(resolvedPath);
      } else if (info.fileObj) {
        if (info.fileObj.size > 50 * 1024 * 1024) {
          throw new Error(
            lang === "uk"
              ? "Файл завеликий для читання через браузер. Будь ласка, оберіть файл через кнопку 'Вибрати файл'."
              : lang === "ru"
              ? "Файл слишком большой для чтения через браузер. Пожалуйста, выберите файл через кнопку 'Выбрать файл'."
              : "File is too large for browser memory. Please use 'Choose File' button below."
          );
        }
        const buffer = await info.fileObj.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        parsed = await ipc.inspectArchiveBytes(info.name, bytes);
      } else {
        throw new Error("No file or path provided");
      }

      setSummary(parsed);
      // If archive has its own icon use it; otherwise use random launcher icon
      if (parsed.icon && parsed.icon.trim().length > 0) {
        setAssignedIcon(parsed.icon);
      } else {
        setAssignedIcon(randomIcon);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSelectPath = (fullPath: string) => {
    setError(null);
    lastNativePathRef.current = fullPath;
    const fileName = fullPath.split(/[\\/]/).pop() || "archive.zip";
    const extMatch = fileName.match(/\.(zip|mrpack)$/i);
    if (!extMatch) {
      setError(
        lang === "uk"
          ? "Підходять лише файли .zip та .mrpack"
          : lang === "ru"
          ? "Подходят только файлы .zip и .mrpack"
          : "Only .zip and .mrpack files are supported"
      );
      return;
    }

    const info: SelectedArchiveInfo = {
      name: fileName,
      size: 0,
      path: fullPath,
    };
    setSelectedFile(info);
    inspectArchiveData(info);
  };

  const handleSelectFileObj = async (file: File) => {
    setError(null);
    const extMatch = file.name.match(/\.(zip|mrpack)$/i);
    if (!extMatch) {
      setError(
        lang === "uk"
          ? "Підходять лише файли .zip та .mrpack"
          : lang === "ru"
          ? "Подходят только файлы .zip и .mrpack"
          : "Only .zip and .mrpack files are supported"
      );
      return;
    }

    // Try resolving file system path first (from electron/webview2 or via local disk search)
    let path = (file as unknown as { path?: string }).path;
    if (!path && lastNativePathRef.current) {
      path = lastNativePathRef.current;
    }
    if (!path) {
      try {
        const found = await ipc.findLocalArchive(file.name);
        if (found) path = found;
      } catch {}
    }

    const info: SelectedArchiveInfo = {
      name: file.name,
      size: file.size,
      path: path && path.length > 0 ? path : undefined,
      fileObj: file,
    };
    setSelectedFile(info);
    inspectArchiveData(info);
  };

  const handleChooseButtonClick = async () => {
    if (installState === "installing") return;

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Minecraft Archive (.zip, .mrpack)",
            extensions: ["zip", "mrpack"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        handleSelectPath(selected);
        return;
      }
    } catch {
      // Fallback to standard input click
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectFileObj(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);

    // 1. If native drop listener captured the path recently, use it
    if (lastNativePathRef.current) {
      handleSelectPath(lastNativePathRef.current);
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // 2. Direct path if exposed (Electron or Windows WebView2)
    const directPath = (file as unknown as { path?: string }).path;
    if (directPath && directPath.length > 0) {
      handleSelectPath(directPath);
      return;
    }

    // 3. Resolve path on Linux WebKitGTK where browser event strips absolute file path
    try {
      const resolved = await ipc.findLocalArchive(file.name);
      if (resolved) {
        handleSelectPath(resolved);
        return;
      }
    } catch {}

    // 4. Fallback: check file size to avoid OOM
    if (file.size > 50 * 1024 * 1024) {
      setError(
        lang === "uk"
          ? "Файл завеликий для читання через браузер. Будь ласка, натисніть кнопку 'Вибрати файл' нижче."
          : lang === "ru"
          ? "Файл слишком большой для чтения через браузер. Пожалуйста, нажмите кнопку 'Выбрать файл' ниже."
          : "File is too large for browser memory. Please use the 'Choose File' button below."
      );
      return;
    }

    handleSelectFileObj(file);
  };

  const handleZoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleChooseButtonClick();
    }
  };

  const handleInstall = async () => {
    if (!selectedFile || installState === "installing") return;

    setInstallState("installing");
    setProgress(5);

    const instanceId = "inst_" + Date.now();
    let unlistenProgress: (() => void) | undefined;

    // Listen to real backend installation progress events
    try {
      const { listen } = await import("@tauri-apps/api/event");
      unlistenProgress = await listen<{ step: string; current: number; total: number }>(
        "install-progress",
        (event) => {
          if (event.payload) {
            const { step, current, total } = event.payload;
            if (step === "mods" && total > 0) {
              const pct = Math.min(92, Math.max(10, Math.round((current / total) * 88)));
              setProgress(pct);
            } else if (step === "overrides" || step === "extract") {
              setProgress(94);
            } else if (step === "done") {
              setProgress(100);
            }
          }
        }
      );
    } catch {
      // Fallback local animation timer
      let p = 10;
      timerRef.current = setInterval(() => {
        p += 8 + Math.random() * 10;
        if (p < 95) setProgress(Math.round(p));
      }, 150);
    }

    try {
      let finalSummary: ImportSummary;

      let pathToUse = selectedFile.path;
      if (!pathToUse) {
        try {
          const resolved = await ipc.findLocalArchive(selectedFile.name);
          if (resolved) pathToUse = resolved;
        } catch {}
      }

      if (pathToUse) {
        finalSummary = await ipc.importArchive(instanceId, pathToUse);
      } else if (selectedFile.fileObj) {
        if (selectedFile.fileObj.size > 50 * 1024 * 1024) {
          throw new Error(
            lang === "uk"
              ? "Файл завеликий для читання через браузер. Будь ласка, оберіть файл через кнопку 'Вибрати файл'."
              : lang === "ru"
              ? "Файл слишком большой для чтения через браузер. Пожалуйста, выберите файл через кнопку 'Выбрать файл'."
              : "File is too large for browser memory. Please use 'Choose file' button below."
          );
        }
        const buffer = await selectedFile.fileObj.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        finalSummary = await ipc.importArchiveBytes(instanceId, selectedFile.name, bytes);
      } else {
        throw new Error("No archive source available");
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setProgress(100);
      setInstallState("installed");

      // Use extracted icon or fallback to launcher icon
      const finalIcon =
        finalSummary.icon && finalSummary.icon.length > 0
          ? finalSummary.icon
          : assignedIcon;

      const nameWithoutExt = selectedFile.name.replace(/\.(zip|mrpack)$/i, "");
      const newInst: InstanceData = {
        id: instanceId,
        name: finalSummary.name || summary?.name || nameWithoutExt || "Imported Instance",
        mcVersion: finalSummary.mcVersion || summary?.mcVersion || "1.21.4",
        loader: (finalSummary.loader as InstanceData["loader"]) || summary?.loader || "Fabric",
        playTimeMinutes: 0,
        modCount: finalSummary.modCount ?? summary?.modCount ?? 0,
        isReady: true,
        folderId: folderId === "all" ? undefined : folderId,
        icon: finalIcon,
        description: finalSummary.description || summary?.description,
      };

      onImport(newInst);

      setTimeout(() => {
        handleClose();
      }, 700);
    } catch (err: unknown) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setInstallState("idle");
      setProgress(0);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || (lang === "uk" ? "Помилка розпакування архіву" : lang === "ru" ? "Ошибка распаковки архива" : "Archive extraction error"));
    } finally {
      if (unlistenProgress) {
        unlistenProgress();
      }
    }
  };

  const formatSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "";
    const mb = lang === "en" ? " MB" : " МБ";
    const kb = lang === "en" ? " KB" : " КБ";
    if (bytes > 1048576) {
      return (bytes / 1048576).toFixed(1) + mb;
    }
    return Math.max(1, Math.round(bytes / 1024)) + kb;
  };

  if (!isOpen) return null;

  const ext = selectedFile
    ? selectedFile.name.match(/\.(zip|mrpack)$/i)?.[1]?.toLowerCase() || "zip"
    : "zip";

  const isBusy = installState === "installing" || isInspecting;

  return createPortal(
    <div
      className="import-modal-overlay"
      onClick={handleClose}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <main className="dlg import-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="hd">
          <h1>{lang === "uk" ? "Імпорт" : lang === "ru" ? "Импорт" : "Import"}</h1>
          <button
            type="button"
            className="b sq"
            id="x"
            aria-label={lang === "uk" ? "Закрити" : lang === "ru" ? "Закрыть" : "Close"}
            onClick={handleClose}
            disabled={isBusy}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {!selectedFile ? (
          <div
            className={`zone ${isOver ? "over" : ""}`}
            id="zone"
            tabIndex={0}
            role="button"
            aria-label={
              lang === "uk"
                ? "Вибрати архів або перетягнути сюди"
                : lang === "ru"
                ? "Выбрать архив или перетащить сюда"
                : "Choose archive or drag here"
            }
            onClick={handleChooseButtonClick}
            onKeyDown={handleZoneKeyDown}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="ico">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e6e8ec"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12M7 10l5 5 5-5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            </div>
            <h2>
              {lang === "uk" ? (
                <>
                  Перетягніть архів версії
                  <br />
                  або збірки сюди
                </>
              ) : lang === "ru" ? (
                <>
                  Перетащите архив версии
                  <br />
                  или сборки сюда
                </>
              ) : (
                <>
                  Drop version archive
                  <br />
                  or modpack here
                </>
              )}
            </h2>
            <p>
              {lang === "uk"
                ? "Імпорт автоматично розпакує конфігурацію та встановить моди"
                : lang === "ru"
                ? "Импорт автоматически распакует конфигурацию и установит моды"
                : "Import will automatically unpack configuration and install mods"}
            </p>
            <div className="ext">
              <span className="tag">.zip</span>
              <span className="tag">.mrpack</span>
            </div>
          </div>
        ) : (
          <div className="file" id="file">
            <div className="ico" style={{ overflow: "hidden", display: "grid", placeItems: "center" }}>
              <InstanceAvatarIcon icon={assignedIcon} size={30} />
            </div>
            <div className="w">
              <b id="fn">{summary?.name || selectedFile.name}</b>
              <div className="meta-row">
                {selectedFile.size > 0 && <span>{formatSize(selectedFile.size)}</span>}
                {summary && (
                  <>
                    <span className="tag tag-accent">{summary.mcVersion}</span>
                    <span className="tag tag-accent">{summary.loader}</span>
                    {summary.modCount > 0 && (
                      <span className="tag">
                        {summary.modCount}{" "}
                        {lang === "uk"
                          ? "модів"
                          : lang === "ru"
                          ? "модов"
                          : "mods"}
                      </span>
                    )}
                  </>
                )}
              </div>
              {installState !== "idle" && (
                <div className="bar" id="bar">
                  <i id="bi" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
            <span className="tag" id="ft">
              .{ext}
            </span>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          id="pick"
          accept=".zip,.mrpack"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {error && (
          <div className="err" id="err" role="alert">
            {error}
          </div>
        )}

        <div className="ft">
          <button
            type="button"
            className="b"
            id="cancel"
            onClick={handleClose}
            disabled={isBusy}
          >
            {lang === "uk" ? "Закрити" : lang === "ru" ? "Закрыть" : "Close"}
          </button>
          <button
            type="button"
            className="b"
            id="choose"
            onClick={handleChooseButtonClick}
            disabled={isBusy}
          >
            {selectedFile
              ? lang === "uk"
                ? "Замінити"
                : lang === "ru"
                ? "Заменить"
                : "Replace"
              : lang === "uk"
              ? "Вибрати файл"
              : lang === "ru"
              ? "Выбрать файл"
              : "Choose file"}
          </button>
          {selectedFile && (
            <button
              type="button"
              className={`b go ${installState === "installed" ? "on" : ""}`}
              id="go"
              onClick={handleInstall}
              disabled={isBusy || installState === "installed"}
            >
              {installState === "installing"
                ? lang === "uk"
                  ? "Встановлення…"
                  : lang === "ru"
                  ? "Установка…"
                  : "Installing…"
                : installState === "installed"
                ? lang === "uk"
                  ? "Встановлено"
                  : lang === "ru"
                  ? "Установлено"
                  : "Installed"
                : lang === "uk"
                ? "Встановити"
                : lang === "ru"
                ? "Установить"
                : "Install"}
            </button>
          )}
        </div>
      </main>
    </div>,
    document.body
  );
};
