import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInstances } from "./useInstances";
import { translations } from "../i18n";
import { ipc } from "../services/ipc";
import { invoke } from "@tauri-apps/api/core";
import type { ModpackInstance } from "../types";

const makeInstance = (id: string, name = "Сборка " + id): ModpackInstance => ({
  id,
  name,
  mcVersion: "1.21.1",
  loader: "Fabric",
  x: 100,
  y: 100,
});

const mockInvoke = vi.mocked(invoke);

describe("useInstances", () => {
  beforeEach(() => {
    localStorage.clear();
    mockInvoke.mockClear();
    mockInvoke.mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case "db_load_instances":
        case "db_load_accounts":
        case "db_list_installed_mods":
        case "db_load_servers":
          return [];
        case "count_installed_mods":
          return 0;
        default:
          return null;
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("добавляет инстанс и синхронизирует с localStorage", () => {
    const { result } = renderHook(() => useInstances(vi.fn(), vi.fn(), translations.ru));
    expect(result.current.instances).toHaveLength(0);

    act(() => {
      result.current.addInstance(makeInstance("a1", "Тест"));
    });

    expect(result.current.instances).toHaveLength(1);
    expect(result.current.instances[0].name).toBe("Тест");
    expect(JSON.parse(localStorage.getItem("desktopInstances") || "[]")).toHaveLength(1);
  });

  it("удаляет инстанс и вызывает db_delete_instance + kill_minecraft", () => {
    const { result } = renderHook(() => useInstances(vi.fn(), vi.fn(), translations.ru));
    act(() => {
      result.current.addInstance(makeInstance("a1"));
    });

    act(() => {
      result.current.deleteInstance("a1");
    });

    expect(result.current.instances).toHaveLength(0);
    expect(mockInvoke).toHaveBeenCalledWith("db_delete_instance", { id: "a1" });
    expect(mockInvoke).toHaveBeenCalledWith("kill_minecraft", { instanceId: "a1" });
  });

  it("updateInstance обновляет поля", () => {
    const { result } = renderHook(() => useInstances(vi.fn(), vi.fn(), translations.ru));
    act(() => {
      result.current.addInstance(makeInstance("a1", "Старое имя"));
    });
    act(() => {
      result.current.updateInstance("a1", { loader: "Forge", name: "Новое имя" });
    });

    expect(result.current.instances[0].loader).toBe("Forge");
    expect(result.current.instances[0].name).toBe("Новое имя");
  });

  it("moveInstanceToTop поднимает инстанс наверх списка последних", () => {
    const { result } = renderHook(() => useInstances(vi.fn(), vi.fn(), translations.ru));
    act(() => {
      result.current.addInstance(makeInstance("a1"));
      result.current.addInstance(makeInstance("a2"));
      result.current.addInstance(makeInstance("a3"));
    });

    expect(result.current.visibleInstances.map((i) => i.id)).toEqual(["a3", "a2", "a1"]);

    act(() => {
      result.current.moveInstanceToTop("a1");
    });

    expect(result.current.visibleInstances.map((i) => i.id)).toEqual(["a1", "a3", "a2"]);
    expect(result.current.visibleInstances.slice(0, 3)[0].id).toBe("a1");
  });

  it("recordPlaySession накапливает время и сохраняет последний запуск", () => {
    const { result } = renderHook(() => useInstances(vi.fn(), vi.fn(), translations.ru));
    act(() => {
      result.current.addInstance(makeInstance("a1"));
    });

    act(() => {
      result.current.recordPlaySession("a1", 10 * 60 * 1000);
      result.current.recordPlaySession("a1", 5 * 60 * 1000);
    });

    expect(result.current.instances[0].playTimeMs).toBe(15 * 60 * 1000);
    expect(result.current.instances[0].lastPlayedAt).toBeDefined();
  });

  it("createFromCatalog создаёт инстанс и вызывает install_modpack", async () => {
    const { result } = renderHook(() => useInstances(vi.fn(), vi.fn(), translations.ru));
    mockInvoke.mockResolvedValueOnce("ok");

    await act(async () => {
      await result.current.createFromCatalog("Железный", "1.20.1", "Fabric", undefined, "modpack-1");
    });

    expect(result.current.instances).toHaveLength(1);
    expect(result.current.instances[0].name).toBe("Железный");
    expect(mockInvoke).toHaveBeenCalledWith("install_modpack", expect.objectContaining({ modId: "modpack-1", instanceId: result.current.instances[0].id }));
  });

  it("загружает инстансы из БД если они есть", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "db_load_instances") {
        return [{ id: "db1", name: "Из БД", mcVersion: "1.21", loader: "Vanilla", x: 5, y: 5, icon: "", groupName: null }];
      }
      if (cmd === "count_installed_mods") return 0;
      return null;
    });

    const { result } = renderHook(() => useInstances(vi.fn(), vi.fn(), translations.ru));

    await waitFor(() => {
      expect(result.current.instances).toHaveLength(1);
    });
    expect(result.current.instances[0].id).toBe("db1");
    expect(result.current.instances[0].name).toBe("Из БД");
    expect(result.current.selectedInstanceId).toBe("db1");
  });

  it("installModByDrag устанавливает мод через download_mod", async () => {
    const { result } = renderHook(() => useInstances(vi.fn(), vi.fn(), translations.ru));
    act(() => {
      result.current.addInstance(makeInstance("a1"));
    });
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "download_mod") return "ok";
      if (cmd === "count_installed_mods") return 0;
      return null;
    });

    await act(async () => {
      await result.current.installModByDrag("a1", { projectId: "sodium", projectType: "mod" });
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      "download_mod",
      expect.objectContaining({ modId: "sodium", instanceId: "a1", projectType: "mod", mcVersion: "1.21.1" }),
    );
  });

  it("dbSaveInstances вызывается при изменении (sync эффект)", async () => {
    const { result } = renderHook(() => useInstances(vi.fn(), vi.fn(), translations.ru));
    act(() => {
      result.current.addInstance(makeInstance("a1"));
    });
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "db_save_instances",
        expect.objectContaining({ instances: expect.arrayContaining([expect.objectContaining({ id: "a1" })]) }),
      );
    });
  });
});