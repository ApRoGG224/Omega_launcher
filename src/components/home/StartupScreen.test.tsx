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
      vi.advanceTimersByTime(1100);
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
});
