import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { OmegaStorePanel } from "./OmegaStorePanel";
import { ipc } from "../../services/ipc";
import type { Account } from "../../types";

vi.mock("../../services/ipc", () => ({
  ipc: {
    fetchMinecraftInsideSkins: vi.fn(),
    fetchSkinAsDataUrl: vi.fn(),
    uploadMicrosoftSkin: vi.fn(),
    openElyLogin: vi.fn(),
  },
}));

// Mock Skin3DViewer to avoid Three.js canvas in jsdom
vi.mock("../settings/Skin3DViewer", () => ({
  Skin3DViewer: () => <div data-testid="skin-3d-viewer" />,
}));

describe("OmegaStorePanel", () => {
  const mockSkinApi: any = {
    skinSource: "ely",
    skinModel: "classic",
    activeSkinUrl: "https://minotar.net/skin/TestUser",
    customSkinUrl: null,
    activeCapeUrl: null,
    capeEnabled: true,
    skinLoading: false,
    setPresetSkin: vi.fn(),
    setSkinModel: vi.fn(),
    setSkinSource: vi.fn(),
    uploadSkin: vi.fn(),
    uploadCape: vi.fn(),
    resetSkin: vi.fn(),
    resetCape: vi.fn(),
    setCapeEnabled: vi.fn(),
  };

  const mockAccount: Account = {
    name: "OriginalNick",
    type: "offline",
  };

  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (ipc.fetchMinecraftInsideSkins as any).mockResolvedValue({
      skins: [
        {
          nickname: "zefaa",
          skinUrl: "https://minecraft-inside.ru/uploads/nick/zefaa.png",
          renderUrl: "https://minecraft-inside.ru/uploads/nick/3d/zefaa.png",
        },
        {
          nickname: "kristallik240",
          skinUrl: "https://minecraft-inside.ru/uploads/nick/kristallik240.png",
          renderUrl: "https://minecraft-inside.ru/uploads/nick/3d/kristallik240.png",
        },
      ],
      currentPage: 1,
      totalPages: 10,
      hasPrev: false,
      hasNext: true,
    });
    (ipc.fetchSkinAsDataUrl as any).mockResolvedValue("data:image/png;base64,mockSkinData");
  });

  it("renders search input and fetches catalog on mount without third-party branding", async () => {
    render(
      <OmegaStorePanel
        t={{}}
        skinApi={mockSkinApi}
        account={mockAccount}
        showToast={mockShowToast}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Какой скин ты ищешь/i);
    expect(searchInput).toBeTruthy();

    await waitFor(() => {
      expect(ipc.fetchMinecraftInsideSkins).toHaveBeenCalledWith(1, "");
    });

    // "Minecraft Inside" should not be rendered in the UI
    expect(screen.queryByText("Minecraft Inside")).toBeNull();

    // "Популярные скины" should not be rendered
    expect(screen.queryByText("Популярные скины")).toBeNull();

    // "Сохранить в Microsoft" should not be rendered
    expect(screen.queryByText("Сохранить в Microsoft")).toBeNull();

    // Skins should be rendered
    expect(await screen.findByText("zefaa")).toBeTruthy();
    expect(await screen.findByText("kristallik240")).toBeTruthy();
  });

  it("equips skin, preserves account nickname, and records to recent skins", async () => {
    render(
      <OmegaStorePanel
        t={{}}
        skinApi={mockSkinApi}
        account={mockAccount}
        showToast={mockShowToast}
      />
    );

    const zefaaText = await screen.findByText("zefaa");
    expect(zefaaText).toBeTruthy();

    const equipButtons = screen.getAllByRole("button", { name: "Надеть" });
    fireEvent.click(equipButtons[0]);

    await waitFor(() => {
      expect(ipc.fetchSkinAsDataUrl).toHaveBeenCalledWith(
        "https://minecraft-inside.ru/uploads/nick/zefaa.png"
      );
      expect(mockSkinApi.setPresetSkin).toHaveBeenCalledWith(
        "data:image/png;base64,mockSkinData",
        "classic"
      );
    });

    // Verify account name remains unchanged and skin saved for Ely.by
    expect(mockAccount.name).toBe("OriginalNick");
    expect(mockSkinApi.setSkinSource).toHaveBeenCalledWith("ely");
    expect(localStorage.getItem("omega:ely_skin:OriginalNick")).toBe(
      "data:image/png;base64,mockSkinData"
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      "Скин применён и сохранён для Ely.by!",
      "success"
    );

    // Switch to "Недавние скины" tab
    const recentTabBtn = screen.getByRole("button", { name: /Недавние скины/i });
    fireEvent.click(recentTabBtn);

    // Should find zefaa in recent skins
    await waitFor(() => {
      expect(screen.getByText("zefaa")).toBeTruthy();
    });
  });

  it("renders Ely.by login button and calls openElyLogin on click", async () => {
    (ipc.openElyLogin as any).mockResolvedValue(undefined);

    render(
      <OmegaStorePanel
        t={{}}
        skinApi={mockSkinApi}
        account={mockAccount}
        showToast={mockShowToast}
      />
    );

    const elyBtn = screen.getByRole("button", { name: /Войти в Ely.by/i });
    expect(elyBtn).toBeTruthy();

    fireEvent.click(elyBtn);

    await waitFor(() => {
      expect(ipc.openElyLogin).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        "Открываем окно входа в Ely.by...",
        "success"
      );
    });
  });

  it("submits search and queries catalog with search term", async () => {
    render(
      <OmegaStorePanel
        t={{}}
        skinApi={mockSkinApi}
        account={mockAccount}
        showToast={mockShowToast}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Какой скин ты ищешь/i);

    fireEvent.change(searchInput, { target: { value: "creeper" } });
    const searchForm = searchInput.closest("form")!;
    fireEvent.submit(searchForm);

    await waitFor(() => {
      expect(ipc.fetchMinecraftInsideSkins).toHaveBeenCalledWith(1, "creeper");
    });
  });
});
