import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import React from "react";
import { StartupScreen } from "./StartupScreen";

describe("StartupScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders pixel mosaic canvas without any loading text", () => {
    const { container } = render(<StartupScreen onComplete={vi.fn()} />);

    expect(
      container.querySelector(".startup-pixel-mosaic-container"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".startup-pixel-mosaic-canvas"),
    ).toBeInTheDocument();

    // Strict rule: Must NOT contain any loading text
    expect(container.textContent).toBe("");
  });

  it("completes and calls onComplete after transition duration", () => {
    const onComplete = vi.fn();
    render(<StartupScreen onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("allows finishing immediately on click or keydown", () => {
    const onComplete = vi.fn();
    const { container } = render(<StartupScreen onComplete={onComplete} />);

    act(() => {
      fireEvent.click(
        container.querySelector(".startup-pixel-mosaic-container")!,
      );
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("waits while isReady is false and completes once isReady becomes true", () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <StartupScreen isReady={false} onComplete={onComplete} />,
    );

    // After 300ms, still waiting because isReady is false
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onComplete).not.toHaveBeenCalled();

    // Now launcher data finished loading
    rerender(<StartupScreen isReady={true} onComplete={onComplete} />);

    // Fast-forward past minimum display time and opening wave
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
