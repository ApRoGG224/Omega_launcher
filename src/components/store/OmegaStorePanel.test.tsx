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

  it("renders Minecraft Inside search input and fetches catalog on mount", async () => {
    render(
      <OmegaStorePanel
        t={{}}
        skinApi={mockSkinApi}
        account={mockAccount}
        showToast={mockShowToast}
      />
    );

    const searchInput = screen.getByPlaceholderText(
      "Какой скин ты ищешь? (например: zefaa, creeper, anime...)"
    );
    expect(searchInput).toBeTruthy();

    await waitFor(() => {
      expect(ipc.fetchMinecraftInsideSkins).toHaveBeenCalledWith(1, "");
    });

    // Both skins should be rendered
    expect(await screen.findByText("zefaa")).toBeTruthy();
    expect(await screen.findByText("kristallik240")).toBeTruthy();
  });

  it("equips skin on click and preserves account nickname without renaming", async () => {
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

    // Find the equip button for zefaa
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

    // Verify account name remains unchanged
    expect(mockAccount.name).toBe("OriginalNick");
    expect(mockShowToast).toHaveBeenCalledWith("Скин применён!", "success");
  });

  it("submits search and queries minecraft-inside with search term", async () => {
    render(
      <OmegaStorePanel
        t={{}}
        skinApi={mockSkinApi}
        account={mockAccount}
        showToast={mockShowToast}
      />
    );

    const searchInput = screen.getByPlaceholderText(
      "Какой скин ты ищешь? (например: zefaa, creeper, anime...)"
    );

    fireEvent.change(searchInput, { target: { value: "creeper" } });
    const searchForm = searchInput.closest("form")!;
    fireEvent.submit(searchForm);

    await waitFor(() => {
      expect(ipc.fetchMinecraftInsideSkins).toHaveBeenCalledWith(1, "creeper");
    });
  });
});
