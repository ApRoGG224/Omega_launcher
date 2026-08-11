import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import DraggableWindow from "./DraggableWindow";

describe("DraggableWindow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderWindow = () =>
    render(
      <DraggableWindow
        storageKey="test-window"
        className="draggable-window test-window"
        defaultPosition={{ x: 100, y: 100 }}
        defaultSize={{ width: 400, height: 300 }}
      >
        <div className="draggable-window-handle">Заголовок</div>
        <span>Содержимое</span>
      </DraggableWindow>,
    );

  it("рендерит детей в позиции по умолчанию", () => {
    const { container } = renderWindow();
    const win = container.querySelector(".test-window") as HTMLElement;
    expect(win).toBeInTheDocument();
    expect(win.style.left).toBe("100px");
    expect(win.style.top).toBe("100px");
    expect(win.style.width).toBe("400px");
    expect(win.style.height).toBe("300px");
    expect(win.textContent).toContain("Содержимое");
  });

  it("персистит позицию в localStorage", () => {
    renderWindow();
    expect(JSON.parse(localStorage.getItem("test-window") || "null")).toEqual({ x: 100, y: 100 });
    expect(JSON.parse(localStorage.getItem("test-window:size") || "null")).toEqual({ width: 400, height: 300 });
  });

  it("восстанавливает позицию из localStorage", () => {
    localStorage.setItem("test-window", JSON.stringify({ x: 555, y: 333 }));
    const { container } = renderWindow();
    const win = container.querySelector(".test-window") as HTMLElement;
    expect(win.style.left).toBe("555px");
    expect(win.style.top).toBe("333px");
  });

  it("перетаскивает окно за handle", () => {
    const { container } = renderWindow();
    const win = container.querySelector(".test-window") as HTMLElement;
    const handle = win.querySelector(".draggable-window-handle") as HTMLElement;
    const rect = { left: 100, top: 100, width: 400, height: 300, right: 500, bottom: 400, x: 100, y: 100, toJSON: () => ({}) } as DOMRect;
    win.getBoundingClientRect = () => rect;

    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 150, clientY: 120 });
    fireEvent.pointerMove(win, { pointerId: 1, clientX: 250, clientY: 170 });
    fireEvent.pointerUp(win, { pointerId: 1 });

    const left = Number.parseInt(win.style.left, 10);
    const top = Number.parseInt(win.style.top, 10);
    expect(left).toBe(200);
    expect(top).toBe(150);
  });

  it("не перетаскивает при нажатии на кнопку", () => {
    const { container } = renderWindow();
    const win = container.querySelector(".test-window") as HTMLElement;
    const button = document.createElement("button");
    button.textContent = "Не таскать";
    win.appendChild(button);

    fireEvent.pointerDown(button, { pointerId: 2, button: 0, clientX: 150, clientY: 120 });
    fireEvent.pointerMove(win, { pointerId: 2, clientX: 999, clientY: 999 });
    fireEvent.pointerUp(win, { pointerId: 2 });

    expect(win.style.left).toBe("100px");
    expect(win.style.top).toBe("100px");
  });

  it("создаёт 8 resize-хендлов", () => {
    const { container } = renderWindow();
    expect(container.querySelectorAll(".window-resize-handle")).toHaveLength(8);
  });
});