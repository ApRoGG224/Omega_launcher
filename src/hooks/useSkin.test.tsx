import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSkin } from "./useSkin";

describe("useSkin", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with default settings", () => {
    const { result } = renderHook(() => useSkin("TestPlayer"));
    expect(result.current.skinSource).toBe("ely");
    expect(result.current.skinModel).toBe("auto");
    expect(result.current.customSkinUrl).toBeNull();
  });

  it("updates skinSource and stores it in localStorage", () => {
    const { result } = renderHook(() => useSkin("TestPlayer"));

    act(() => {
      result.current.setSkinSource("microsoft");
    });

    expect(result.current.skinSource).toBe("microsoft");
    expect(localStorage.getItem("omega:skinSource")).toBe("microsoft");
  });

  it("updates skinModel and stores it in localStorage", () => {
    const { result } = renderHook(() => useSkin("TestPlayer"));

    act(() => {
      result.current.setSkinModel("slim");
    });

    expect(result.current.skinModel).toBe("slim");
    expect(localStorage.getItem("omega:skinModel")).toBe("slim");
  });

  it("handles skin upload and reset", async () => {
    const { result } = renderHook(() => useSkin("TestPlayer"));

    const fakeFile = new File(["dummy-content"], "skin.png", { type: "image/png" });

    await act(async () => {
      await result.current.uploadSkin(fakeFile);
    });

    expect(result.current.skinSource).toBe("custom");
    expect(result.current.customSkinUrl).toBeTruthy();

    act(() => {
      result.current.resetSkin();
    });

    expect(result.current.skinSource).toBe("ely");
    expect(result.current.customSkinUrl).toBeNull();
  });

  it("applies preset skin and cape correctly", () => {
    const { result } = renderHook(() => useSkin("TestPlayer"));

    act(() => {
      result.current.setPresetSkin("https://example.com/skin.png", "classic");
    });

    expect(result.current.skinSource).toBe("custom");
    expect(result.current.customSkinUrl).toBe("https://example.com/skin.png");
    expect(result.current.skinModel).toBe("classic");

    act(() => {
      result.current.setPresetCape("https://example.com/cape.png");
    });

    expect(result.current.customCapeUrl).toBe("https://example.com/cape.png");
    expect(result.current.capeEnabled).toBe(true);
  });
});
