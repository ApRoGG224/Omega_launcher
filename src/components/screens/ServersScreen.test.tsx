import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ServersScreen } from "./ServersScreen";
import { LanguageProvider } from "../../context/LanguageContext";
import type { InstanceData } from "../../types";

// Mock Tauri IPC
vi.mock("../../services/ipc", () => ({
  ipc: {
    listInstanceServers: vi.fn().mockResolvedValue([
      { name: "Assembly Server", ip: "assembly.mc.net:25565", icon: null },
    ]),
    dbLoadServers: vi.fn().mockResolvedValue([]),
    dbSaveServer: vi.fn().mockResolvedValue(undefined),
    dbDeleteServer: vi.fn().mockResolvedValue(undefined),
    addInstanceServer: vi.fn().mockResolvedValue(undefined),
    deleteInstanceServer: vi.fn().mockResolvedValue(undefined),
    pingServer: vi.fn().mockResolvedValue({
      online: true,
      latencyMs: 32,
      playersOnline: 15,
      playersMax: 100,
      motd: "A Minecraft Server",
      favicon: null,
      version: "1.21.4",
    }),
  },
}));

const mockInstance: InstanceData = {
  id: "inst_1",
  name: "Fabric 1.21.4",
  mcVersion: "1.21.4",
  loader: "Fabric",
  playTimeMinutes: 120,
  modCount: 15,
  isReady: true,
  icon: "diamond_sword",
};

describe("ServersScreen Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders ServersScreen without crashing and displays header", async () => {
    const handleDirectConnect = vi.fn();
    const handleBack = vi.fn();

    render(
      <LanguageProvider>
        <ServersScreen
          onBack={handleBack}
          onDirectConnect={handleDirectConnect}
          instances={[mockInstance]}
          selectedInstance={mockInstance}
        />
      </LanguageProvider>
    );

    expect(screen.getAllByText(/СЕРВЕР/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fabric 1.21.4").length).toBeGreaterThan(0);
  });

  it("handles filter switching between all, online, and offline", async () => {
    const handleDirectConnect = vi.fn();

    render(
      <LanguageProvider>
        <ServersScreen
          onDirectConnect={handleDirectConnect}
          instances={[mockInstance]}
          selectedInstance={mockInstance}
        />
      </LanguageProvider>
    );

    const tabs = screen.getAllByText(/В сети|В мережі/i);
    expect(tabs.length).toBeGreaterThan(0);

    act(() => {
      fireEvent.click(tabs[0]);
    });

    const offlineTabs = screen.getAllByText(/Офлайн/i);
    expect(offlineTabs.length).toBeGreaterThan(0);

    act(() => {
      fireEvent.click(offlineTabs[0]);
    });
  });

  it("calls onBack when back button is clicked", () => {
    const handleBack = vi.fn();
    const handleDirectConnect = vi.fn();

    render(
      <LanguageProvider>
        <ServersScreen
          onBack={handleBack}
          onDirectConnect={handleDirectConnect}
          instances={[mockInstance]}
          selectedInstance={mockInstance}
        />
      </LanguageProvider>
    );

    const backBtn = screen.getByText(/Назад|Back/i);
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
