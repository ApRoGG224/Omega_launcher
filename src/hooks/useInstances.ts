import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { ModpackInstance, ToastType } from "../types";
import { loadInstances, persistInstances } from "../services/storage";
import { ipc } from "../services/ipc";
import type { ImportResult } from "../services/ipc";

export type ImportKind = "prism" | "curseforge" | "mrpack";

export interface InstancesApi {
  instances: ModpackInstance[];
  instancesLoaded: boolean;
  selectedInstanceId: string | null;
  selectedInstance: ModpackInstance | null;
  visibleInstances: ModpackInstance[];
  modCount: number;
  editModalOpen: string | null;
  editNameInput: string;
  setEditNameInput: (v: string) => void;
  editVersionInput: string;
  setEditVersionInput: (v: string) => void;
  editLoaderInput: string;
  setEditLoaderInput: (v: string) => void;
  setEditModalOpen: (v: string | null) => void;
  openEditModal: (instanceId: string) => void;
  saveEdit: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  exportPath: string;
  setExportPath: (v: string) => void;
  importModalOpen: boolean;
  setImportModalOpen: (v: boolean) => void;
  importStep: "menu" | "prism" | "curseforge" | "mrpack";
  setImportStep: (v: "menu" | "prism" | "curseforge" | "mrpack") => void;
  setSelectedInstanceId: (id: string | null) => void;
  addInstance: (inst: ModpackInstance) => void;
  deleteInstance: (instanceId: string) => void;
  updateInstance: (id: string, patch: Partial<ModpackInstance>) => void;
  moveInstanceToTop: (id: string) => void;
  handleIconChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importFromArchive: (kind: ImportKind, zipPath: string) => Promise<void>;
  createFromCatalog: (name: string, mcVer: string, loader: string, iconUrl?: string, projectId?: string) => Promise<void>;
  installModByDrag: (instanceId: string, payload: { projectId: string; projectType: string }) => Promise<void>;
  installProgress: { step: string; current: number; total: number } | null;
  importing: boolean;
  recordPlaySession: (id: string, durationMs: number) => void;
}

export function useInstances(
  onLog: (line: string) => void,
  onToast: (message: string, type?: ToastType) => void,
  t: any,
): InstancesApi {
  const [instances, setInstances] = useState<ModpackInstance[]>(() => loadInstances());
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [modCount, setModCount] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editVersionInput, setEditVersionInput] = useState("");
  const [editLoaderInput, setEditLoaderInput] = useState("");
  const [installProgress, setInstallProgress] = useState<InstancesApi["installProgress"]>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [exportPath, setExportPath] = useState(() => localStorage.getItem("exportPath") || "~/Downloads");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<"menu" | "prism" | "curseforge" | "mrpack">("menu");

  const selectedInstance = useMemo(
    () => instances.find((i) => i.id === selectedInstanceId) || instances[0] || null,
    [instances, selectedInstanceId],
  );

  const visibleInstances = useMemo(() => [...instances].reverse(), [instances]);

  useEffect(() => {
    persistInstances(instances);
    void ipc.dbSaveInstances(instances).catch(() => {});
  }, [instances]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await ipc.dbLoadInstances();
        if (cancelled) return;
        if (rows.length > 0) {
          setInstances(
            rows.map((row) => ({
              id: row.id,
              name: row.name,
              mcVersion: row.mcVersion,
              loader: row.loader,
              x: row.x,
              y: row.y,
              icon: row.icon,
              group: row.groupName,
              playTimeMs: row.playTimeMs || 0,
              lastPlayedAt: row.lastPlayedAt || undefined,
            })),
          );
        } else {
          const local = loadInstances();
          if (local.length > 0) {
            void ipc.dbSaveInstances(local).catch(() => {});
          }
        }
      } catch {
        // Tauri backend unavailable (browser dev) - localStorage cache is used.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    listen("install-progress", (event) => {
      if (cancelled) return;
      const raw = event.payload;
      if (raw && typeof raw === "object") {
        const p = raw as { step?: string; current?: number; total?: number };
        if (p.step === "done") setInstallProgress(null);
        else setInstallProgress({ step: p.step || "", current: p.current || 0, total: p.total || 0 });
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadModCount = async () => {
      if (!selectedInstanceId) {
        if (!cancelled) setModCount(0);
        return;
      }
      try {
        const count = await ipc.countInstalledMods(selectedInstanceId);
        if (!cancelled) setModCount(typeof count === "number" ? count : Number(count) || 0);
      } catch (error) {
        console.error("Failed to load mod count", error);
        if (!cancelled) setModCount(0);
      }
    };
    loadModCount();
    return () => {
      cancelled = true;
    };
  }, [selectedInstanceId, instances]);

  const addInstance = useCallback((inst: ModpackInstance) => {
    setInstances((prev) => [...prev, inst]);
  }, []);

  const deleteInstance = useCallback((instanceId: string) => {
    setInstances((prev) => prev.filter((i) => i.id !== instanceId));
    setSelectedInstanceId((current) => {
      if (current !== instanceId) return current;
      return instances.filter((i) => i.id !== instanceId)[0]?.id || null;
    });
    void ipc.dbDeleteInstance(instanceId).catch(() => {});
    void ipc.killMinecraft(instanceId).catch(() => {});
  }, [instances]);

  const updateInstance = useCallback((id: string, patch: Partial<ModpackInstance>) => {
    setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const moveInstanceToTop = useCallback((id: string) => {
    setInstances((prev) => {
      const inst = prev.find((i) => i.id === id);
      if (!inst) return prev;
      return [...prev.filter((i) => i.id !== id), inst];
    });
  }, []);

  const recordPlaySession = useCallback((id: string, durationMs: number) => {
    if (durationMs <= 0) return;
    setInstances((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              playTimeMs: (i.playTimeMs || 0) + Math.round(durationMs),
              lastPlayedAt: new Date().toISOString(),
            }
          : i,
      ),
    );
  }, []);

  const openEditModal = useCallback((instanceId: string) => {
    const inst = instances.find((i) => i.id === instanceId);
    if (!inst) return;
    setEditModalOpen(instanceId);
    setEditNameInput(inst.name);
    setEditVersionInput(inst.mcVersion);
    setEditLoaderInput(inst.loader);
  }, [instances]);

  const saveEdit = useCallback(() => {
    if (!editModalOpen) return;
    const inst = instances.find((i) => i.id === editModalOpen);
    if (!inst) return;
    updateInstance(editModalOpen, {
      name: editNameInput.trim() || inst.name,
      mcVersion: editVersionInput.trim() || inst.mcVersion,
      loader: editLoaderInput.trim() || inst.loader,
    });
    setEditModalOpen(null);
  }, [editModalOpen, editNameInput, editVersionInput, editLoaderInput, instances, updateInstance]);

  const handleIconChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedInstanceId) {
      if (e.target) e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 128;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/png");
        void ipc
          .dbSaveIcon(selectedInstanceId, dataUrl)
          .then((path) => updateInstance(selectedInstanceId, { icon: path }))
          .catch(() => {
            // Fallback: keep the icon inline when the backend is unavailable.
            updateInstance(selectedInstanceId, { icon: dataUrl });
          });
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  }, [selectedInstanceId, updateInstance]);

  const importFromArchive = useCallback(async (kind: ImportKind, zipPath: string) => {
    setImportModalOpen(false);
    setImporting(true);
    const tempId = Date.now().toString();
    const kindLabel = kind === "prism" ? "Prism" : kind === "curseforge" ? "CurseForge" : "Modrinth/Omega";
    onLog(`[IMPORT] ${t.importingArchive}`);
    try {
      const result = await ipc.importModpack(kind, tempId, zipPath);
      const data: ImportResult = JSON.parse(result);
      const newInst: ModpackInstance = {
        id: tempId,
        name: data.name || "Imported Instance",
        mcVersion: data.mcVersion || "1.20.1",
        loader: data.loader || "Vanilla",
        icon: undefined,
        x: 24 + Math.random() * 160,
        y: 24 + Math.random() * 160,
      };
      addInstance(newInst);
      setSelectedInstanceId(newInst.id);
      onToast(t.importFinished, "success");
      onLog(`[IMPORT] ${t.importedOk} "${newInst.name}" (${newInst.mcVersion} ${newInst.loader}) (${kindLabel})`);
    } catch (e) {
      onToast(t.importFailed + e, "error");
      onLog(`[IMPORT ERROR]: ${e}`);
    } finally {
      setImporting(false);
      setInstallProgress(null);
    }
  }, [addInstance, onLog, onToast, setImportModalOpen, t]);

  const createFromCatalog = useCallback(async (name: string, mcVer: string, loader: string, iconUrl?: string, projectId?: string) => {
    const newInst: ModpackInstance = {
      id: Date.now().toString(),
      name,
      mcVersion: mcVer,
      loader,
      icon: iconUrl,
      x: 24 + Math.random() * 160,
      y: 24 + Math.random() * 160,
    };
    addInstance(newInst);
    setSelectedInstanceId(newInst.id);
    onLog(`[Modpack] ${t.installingModsLog} "${name}"...`);
    if (!projectId) return;
    try {
      await ipc.installModpack({ modId: projectId, mcVersion: mcVer, loader, instanceId: newInst.id });
      onLog(`[Modpack] ${t.packInstalledLog} "${name}"`);
    } catch (e: any) {
      onLog(`[ERROR] ${t.errorInstallingPack} ${e}`);
    }
  }, [addInstance, onLog, t]);

  const installModByDrag = useCallback(async (instanceId: string, payload: { projectId: string; projectType: string }) => {
    const inst = instances.find((i) => i.id === instanceId);
    if (!inst) return;
    onLog(`[Drag&Drop] ${t.dragInstallingLog} "${payload.projectId}" → "${inst.name}"...`);
    try {
      await ipc.downloadMod({
        modId: payload.projectId,
        mcVersion: inst.mcVersion,
        loader: inst.loader === "Vanilla" ? "fabric" : inst.loader,
        instanceId,
        projectType: (payload.projectType || "mod") as "mod" | "resourcepack",
        worldName: null,
      });
      onToast(payload.projectType === "mod" ? t.modInstalledDrag : t.respackInstalledDrag, "success");
    } catch (e: any) {
      onToast(t.installFailedDrag + e, "error");
    }
  }, [instances, onLog, onToast, t]);

  return {
    instances,
    instancesLoaded: true,
    selectedInstanceId,
    selectedInstance,
    visibleInstances,
    modCount,
    editModalOpen,
    editNameInput,
    setEditNameInput,
    editVersionInput,
    setEditVersionInput,
    editLoaderInput,
    setEditLoaderInput,
    setEditModalOpen,
    openEditModal,
    saveEdit,
    fileInputRef,
    exportPath,
    setExportPath,
    importModalOpen,
    setImportModalOpen,
    importStep,
    setImportStep,
    setSelectedInstanceId,
    addInstance,
    deleteInstance,
    updateInstance,
    moveInstanceToTop,
    handleIconChange,
    importFromArchive,
    createFromCatalog,
    installModByDrag,
    installProgress,
    importing,
    recordPlaySession,
  };
}