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

  it("renders shutters without any loading text", () => {
    const { container } = render(<StartupScreen onComplete={vi.fn()} />);

    expect(container.querySelector(".startup-shutters-container")).toBeInTheDocument();
    expect(container.querySelector(".startup-shutter-left")).toBeInTheDocument();
    expect(container.querySelector(".startup-shutter-right")).toBeInTheDocument();

    // Must NOT contain any loading text
    expect(container.textContent).toBe("");
  });

  it("opens shutters and calls onComplete after animation duration", () => {
    const onComplete = vi.fn();
    const { container } = render(<StartupScreen onComplete={onComplete} />);

    // Fast-forward past initial pause and animation
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(container.querySelector(".startup-shutters-container")).toHaveClass("open");

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("allows opening immediately on click or keydown", () => {
    const onComplete = vi.fn();
    const { container } = render(<StartupScreen onComplete={onComplete} />);

    act(() => {
      fireEvent.click(container.querySelector(".startup-shutters-container")!);
    });

    expect(container.querySelector(".startup-shutters-container")).toHaveClass("open");

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
