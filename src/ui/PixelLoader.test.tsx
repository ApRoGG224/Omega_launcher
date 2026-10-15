import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { PixelLoader } from "./PixelLoader";

describe("PixelLoader", () => {
  it("renders with default props and accessibility role", () => {
    render(<PixelLoader />);
    const loader = screen.getByRole("status");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("pixel-loader-container");
    expect(loader).toHaveClass("pixel-loader-md");
    expect(loader).toHaveClass("pixel-loader-emerald");
  });

  it("renders custom text label when provided", () => {
    render(<PixelLoader text="Загрузка скина..." variant="cyan" size="lg" />);
    expect(screen.getByText("Загрузка скина...")).toBeInTheDocument();
    const loader = screen.getByRole("status");
    expect(loader).toHaveClass("pixel-loader-lg");
    expect(loader).toHaveClass("pixel-loader-cyan");
  });

  it("renders ring loader when showCube is false", () => {
    const { container } = render(<PixelLoader showCube={false} />);
    expect(container.querySelector(".pixel-ring-loader")).toBeInTheDocument();
  });
});
