import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { ModpackInstance } from "../types";
import { ipc } from "../services/ipc";

export interface GameApi {
  ram: number;
  setRam: (v: number) => void;
  javaPath: string;
  setJavaPath: (v: string) => void;
  gamePath: string;
  setGamePath: (v: string) => void;
  serverIp: string;
  setServerIp: (v: string) => void;
  logs: string[];
  pushLog: (line: string) => void;
  clearLogs: () => void;
  isRunning: boolean;
  runningInstanceId: string | null;
  isInstanceRunning: (id: string) => boolean;
  consoleOpen: boolean;
  setConsoleOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sliderStyle: React.CSSProperties;
  playInstance: (instance: ModpackInstance, username: string, t: any) => Promise<void>;
  stopGame: () => Promise<void>;
}

export function useGameSession(): GameApi {
  const [ram, setRam] = useState(4);
  const [javaPath, setJavaPath] = useState("/usr/lib/jvm/java-21");
  const [gamePath, setGamePath] = useState("~/.omega-launcher/minecraft");
  const [serverIp, setServerIp] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [runningInstanceId, setRunningInstanceId] = useState<string | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const suppressGameplayLogsRef = useRef(false);

  const isRunning = runningInstanceId !== null;

  const pushLog = useCallback((line: string) => {
    setLogs((prev) => [...prev, line].slice(-100));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    listen("download-progress", (event) => {
      const line = event.payload as string;
      const isRuntimeStatusLine =
        line.includes("[main/INFO]: Killing Minecraft process") ||
        line.includes("[main/INFO]: Minecraft process killed") ||
        line.includes("[main/INFO]: No running Minecraft process found") ||
        line.includes("[launcher/INFO]: Minecraft process exited") ||
        line.includes("[launcher/INFO] Minecraft process exited");

      const isSpawnLine = line.includes("[launcher/INFO] Minecraft process spawned with PID:");
      const isExitedLine = line.includes("Minecraft process exited");
      const shouldAppend =
        !suppressGameplayLogsRef.current ||
        isRuntimeStatusLine ||
        isSpawnLine ||
        line.startsWith("[ERROR]");

      if (isSpawnLine) {
        suppressGameplayLogsRef.current = true;
      }

      if (!shouldAppend) {
        if (isExitedLine) {
          setRunningInstanceId(null);
          suppressGameplayLogsRef.current = false;
        }
        return;
      }

      pushLog(line);
      if (isExitedLine) {
        suppressGameplayLogsRef.current = false;
        setRunningInstanceId(null);
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    }).catch((error) => {
      console.error("Failed to subscribe to download-progress", error);
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [pushLog]);

  const playInstance = useCallback(async (instance: ModpackInstance, username: string, t: any) => {
    if (isRunning) return;
    setRunningInstanceId(instance.id);
    suppressGameplayLogsRef.current = false;
    pushLog(t.logStartingMc);
    try {
      const safeMcVersion = instance.mcVersion === "Prism" ? "1.20.1" : instance.mcVersion;
      const safeLoader = instance.loader === "Import" ? "Vanilla" : instance.loader;
      const fullVersionName =
        safeLoader === "Vanilla" ? safeMcVersion : `${safeMcVersion}-${safeLoader.toLowerCase()}`;
      await ipc.launchMinecraft({
        version: fullVersionName,
        server: serverIp,
        username,
        ram,
        instanceId: instance.id,
      });
    } catch (e) {
      setRunningInstanceId(null);
      pushLog(`[ERROR]: ${e}`);
    }
  }, [isRunning, ram, serverIp, pushLog]);

  const stopGame = useCallback(async () => {
    if (!runningInstanceId) return;
    try {
      await ipc.killMinecraft(runningInstanceId);
    } catch (e) {
      pushLog(`[ERROR]: ${e}`);
    } finally {
      setRunningInstanceId(null);
    }
  }, [runningInstanceId, pushLog]);

  const isInstanceRunning = useCallback(
    (id: string) => runningInstanceId === id,
    [runningInstanceId],
  );

  const sliderStyle = useMemo(
    () => ({
      background: `linear-gradient(to right, var(--accent-color) ${((ram - 1) / 15) * 100}%, rgba(255,255,255,0.1) ${((ram - 1) / 15) * 100}%)`,
    }),
    [ram],
  );

  return {
    ram,
    setRam,
    javaPath,
    setJavaPath,
    gamePath,
    setGamePath,
    serverIp,
    setServerIp,
    logs,
    pushLog,
    clearLogs,
    isRunning,
    runningInstanceId,
    isInstanceRunning,
    consoleOpen,
    setConsoleOpen,
    sliderStyle,
    playInstance,
    stopGame,
  };
}