import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  ServersScreen,
  cleanMinecraftText,
  cleanServerVersion,
  renderMinecraftFormattedText,
  sanitizeServerAddress,
  parseServerHostPort,
} from "./ServersScreen";
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

  it("renders search bar and filters servers by search query", () => {
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

    const searchInput = screen.getByPlaceholderText(/Пошук|Поиск/i);
    expect(searchInput).toBeDefined();

    act(() => {
      fireEvent.change(searchInput, { target: { value: "Hypixel" } });
    });

    expect((searchInput as HTMLInputElement).value).toBe("Hypixel");
  });

  it("opens and handles Direct Connect modal", () => {
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

    const directBtn = screen.getByText(/Пряме підключення|Прямое подключение/i);
    expect(directBtn).toBeDefined();

    act(() => {
      fireEvent.click(directBtn);
    });

    const modalInput = screen.getByPlaceholderText(/192.168.1.10:25565/i);
    expect(modalInput).toBeDefined();

    act(() => {
      fireEvent.change(modalInput, { target: { value: "mc.test.org" } });
    });

    const submitBtns = screen.getAllByText(/Підключитися|Подключиться/i);
    act(() => {
      fireEvent.click(submitBtns[submitBtns.length - 1]);
    });

    expect(handleDirectConnect).toHaveBeenCalledWith("mc.test.org", "mc.test.org", "inst_1");
  });

  it("opens and cancels Add Server modal", () => {
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

    const addBtn = screen.getByText(/Додати сервер|Добавить сервер/i);
    expect(addBtn).toBeDefined();

    act(() => {
      fireEvent.click(addBtn);
    });

    const nameInput = screen.getByPlaceholderText(/Hypixel Network/i);
    expect(nameInput).toBeDefined();

    const cancelBtn = screen.getByText(/Скасувати|Отмена/i);
    act(() => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByPlaceholderText(/Hypixel Network/i)).toBeNull();
  });

  describe("Minecraft Formatting & Version Parser Utilities", () => {
    it("cleanMinecraftText strips formatting codes and dangling symbols", () => {
      expect(
        cleanMinecraftText(
          "§2⚔§r §e§lSunny§b§lWorld§r §2⚔§r §d§l1§d§l.§d§l1§d§l2-§d§l1.§9§l2§9§l1§r"
        )
      ).toBe("⚔ SunnyWorld ⚔ 1.12-1.21");
      expect(cleanMinecraftText("§x§f§f§a§a§0§0CustomHex§r")).toBe("CustomHex");
      expect(cleanMinecraftText("")).toBe("");
      expect(cleanMinecraftText(null)).toBe("");
    });

    it("cleanServerVersion extracts clean version ranges from server marketing banners", () => {
      const sunnyWorldVersion =
        "    §2⚔§r §e§lSunny§b§lWorld§r §2⚔§r §d§l1§d§l.§d§l1§d§l2-§d§l1.§9§l2§9§l1§r §c§l♥§c§l♦§4§l♥§4§l♦§4§l♥§r §2⚔§r           §2§l+§r §b§lB§b§lЫ§b§lЖ§b§lИ§9§lB§9§lA§9§lH§9§lИ§5§lE§r §f|§r §e§lM§e§lИ§e§lH§c§lИ§c§l-§d§lИ§d§lГ§d§lP§5§lЫ§r §f|§r §6§lГ§4§lP§4§lИ§4§lФ§r §f|§r §a§lC§a§lK§a§lA§a§lЙ§a§lБ§a§lЛ§a§lO§a§lK";
      expect(cleanServerVersion(sunnyWorldVersion)).toBe("1.12-1.21");
      expect(cleanServerVersion("1.20.4")).toBe("1.20.4");
      expect(cleanServerVersion("Paper 1.20.1")).toBe("Paper 1.20.1");
      expect(cleanServerVersion("1.8.x - 1.21.x")).toBe("1.8.x - 1.21.x");
      expect(cleanServerVersion("")).toBe("");
    });

    it("renderMinecraftFormattedText converts color codes into styled elements", () => {
      const rendered = renderMinecraftFormattedText("§e§lYellowBold§rNormal");
      expect(React.isValidElement(rendered) || Array.isArray(rendered)).toBe(true);

      const multiline = renderMinecraftFormattedText("Line 1\nLine 2");
      expect(Array.isArray(multiline)).toBe(true);
    });

    it("sanitizeServerAddress strips schemes, paths and whitespace", () => {
      expect(
        sanitizeServerAddress("https://katherine-seekers.tun.ply.gg:47403/")
      ).toBe("katherine-seekers.tun.ply.gg:47403");
      expect(sanitizeServerAddress("http://mc.hypixel.net/path")).toBe(
        "mc.hypixel.net"
      );
      expect(sanitizeServerAddress("//play.example.com:25565")).toBe(
        "play.example.com:25565"
      );
      expect(sanitizeServerAddress("   127.0.0.1:25565   ")).toBe(
        "127.0.0.1:25565"
      );
      expect(sanitizeServerAddress("")).toBe("");
    });

    it("parseServerHostPort correctly extracts host and numeric port", () => {
      expect(
        parseServerHostPort("https://katherine-seekers.tun.ply.gg:47403/")
      ).toEqual({
        host: "katherine-seekers.tun.ply.gg",
        port: 47403,
      });
      expect(parseServerHostPort("play.hypixel.net")).toEqual({
        host: "play.hypixel.net",
        port: 25565,
      });
      expect(parseServerHostPort("[2001:db8::1]:25565")).toEqual({
        host: "2001:db8::1",
        port: 25565,
      });
      expect(parseServerHostPort("")).toEqual({
        host: "",
        port: 25565,
      });
    });
  });
});
