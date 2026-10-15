import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { StartupScreen } from "./StartupScreen";

describe("StartupScreen", () => {
  const mockTranslations = {
    startupStepConfig: "Загрузка конфигурации лаунчера...",
    startupStepProfile: "Инициализация профиля и скина...",
    startupStepInstances: "Проверка игровых сборок и модов...",
    startupStepCatalog: "Синхронизация каталога...",
    startupStepReady: "Готово! Приятной игры!",
    startupTip1: "Совет: В Магазине Omega можно выбрать официальные скины и плащи",
    startupSkip: "Нажмите Пробел или кликните, чтобы войти",
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders branding, 3D block, and progress bar", () => {
    render(<StartupScreen t={mockTranslations} onComplete={vi.fn()} />);

    expect(screen.getByText("OMEGA")).toBeInTheDocument();
    expect(screen.getByText("LAUNCHER")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText(/Загрузка конфигурации/i)).toBeInTheDocument();
  });

  it("progresses and calls onComplete automatically", () => {
    const onComplete = vi.fn();
    render(<StartupScreen t={mockTranslations} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("allows skipping via Space keydown", () => {
    const onComplete = vi.fn();
    render(<StartupScreen t={mockTranslations} onComplete={onComplete} />);

    act(() => {
      fireEvent.keyDown(window, { key: " " });
      vi.advanceTimersByTime(500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("allows skipping via click on skip button", () => {
    const onComplete = vi.fn();
    render(<StartupScreen t={mockTranslations} onComplete={onComplete} />);

    const skipBtn = screen.getByTitle(/Нажмите Пробел или кликните/i);
    act(() => {
      fireEvent.click(skipBtn);
      vi.advanceTimersByTime(500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
