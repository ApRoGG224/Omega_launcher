import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAccounts } from "./useAccounts";
import { invoke } from "@tauri-apps/api/core";

const mockInvoke = vi.mocked(invoke);

describe("useAccounts", () => {
  beforeEach(() => {
    localStorage.clear();
    mockInvoke.mockClear();
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "db_load_accounts") return [];
      if (cmd === "login_microsoft") return "SUCCESS:Steve";
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("по умолчанию оффлайн-аккаунт NightWolf", () => {
    const { result } = renderHook(() => useAccounts({}, vi.fn()));
    expect(result.current.account.name).toBe("NightWolf");
    expect(result.current.account.type).toBe("offline");
  });

  it("handleAddOffline добавляет валидный ник и персистит его", () => {
    const { result } = renderHook(() => useAccounts({}, vi.fn()));

    act(() => {
      result.current.setNewUsernameInput("Alex_2000");
    });
    act(() => {
      result.current.handleAddOffline();
    });

    expect(result.current.account.name).toBe("Alex_2000");
    expect(result.current.savedAccounts.some((a) => a.name === "Alex_2000")).toBe(true);
    expect(JSON.parse(localStorage.getItem("savedNicknames") || "[]")).toEqual([{ name: "Alex_2000", type: "offline" }, { name: "NightWolf", type: "offline" }]);
    expect(mockInvoke).toHaveBeenCalledWith("db_save_accounts", expect.anything());
  });

  it("handleAddOffline игнорирует невалидный ник", () => {
    const { result } = renderHook(() => useAccounts({}, vi.fn()));

    act(() => {
      result.current.setNewUsernameInput("a");
    });
    act(() => {
      result.current.handleAddOffline();
    });
    act(() => {
      result.current.setNewUsernameInput("bad name!");
    });
    act(() => {
      result.current.handleAddOffline();
    });

    expect(result.current.account.name).toBe("NightWolf");
  });

  it("handleDeleteAccount удаляет аккаунт и переключается на следующий", () => {
    const { result } = renderHook(() => useAccounts({}, vi.fn()));

    act(() => {
      result.current.setNewUsernameInput("Player2");
    });
    act(() => {
      result.current.handleAddOffline();
    });
    const player2 = result.current.savedAccounts.find((a) => a.name === "Player2")!;
    act(() => {
      result.current.handleSelectAccount(player2);
    });
    expect(result.current.account.name).toBe("Player2");

    act(() => {
      result.current.handleDeleteAccount("Player2");
    });

    expect(result.current.account.name).toBe("NightWolf");
    expect(result.current.savedAccounts.some((a) => a.name === "Player2")).toBe(false);
  });

  it("загружает аккаунты из БД", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "db_load_accounts") return [{ name: "Steve", type: "microsoft" }];
      return null;
    });

    const { result } = renderHook(() => useAccounts({}, vi.fn()));

    await waitFor(() => {
      expect(result.current.savedAccounts.some((a) => a.name === "Steve")).toBe(true);
    });
    expect(result.current.account.name).toBe("Steve");
  });

  it("handleAddMicrosoft разбирает SUCCESS из ответа", async () => {
    const onLog = vi.fn();
    const { result } = renderHook(() => useAccounts({ logWaitingBrowser: "wait", logSuccessLogin: "ok: ", logLoginError: "err: " } as any, onLog));

    await act(async () => {
      await result.current.handleAddMicrosoft();
    });

    expect(result.current.account.name).toBe("Steve");
    expect(result.current.account.type).toBe("microsoft");
    expect(onLog).toHaveBeenCalledWith("ok: Steve");
  });
});