import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dropdown } from "./Dropdown";

const options = [
  { value: "fabric", label: "Fabric" },
  { value: "forge", label: "Forge" },
  { value: "quilt", label: "Quilt" },
];

describe("Dropdown", () => {
  it("отображает выбранное значение и пустой лейбл", () => {
    render(<Dropdown value="" options={options} onSelect={vi.fn()} emptyLabel="Выберите загрузчик" />);
    expect(screen.getByText("Выберите загрузчик")).toBeInTheDocument();
  });

  it("открывает меню по клику и показывает опции", () => {
    render(<Dropdown value="" options={options} onSelect={vi.fn()} emptyLabel="Выберите загрузчик" />);
    fireEvent.click(screen.getByText("Выберите загрузчик"));
    expect(screen.getByText("Fabric")).toBeInTheDocument();
    expect(screen.getByText("Forge")).toBeInTheDocument();
    expect(screen.getByText("Quilt")).toBeInTheDocument();
  });

  it("вызывает onSelect и закрывает меню при выборе", () => {
    const onSelect = vi.fn();
    render(<Dropdown value="" options={options} onSelect={onSelect} emptyLabel="Выберите загрузчик" />);
    fireEvent.click(screen.getByText("Выберите загрузчик"));
    fireEvent.click(screen.getByText("Forge"));
    expect(onSelect).toHaveBeenCalledWith("forge");
    expect(screen.queryByText("Fabric")).not.toBeInTheDocument();
  });

  it("в searchable режиме фильтрует опции", () => {
    render(<Dropdown value="" options={options} onSelect={vi.fn()} searchable emptyLabel="Выберите загрузчик" />);
    fireEvent.click(screen.getByText("Выберите загрузчик"));
    const input = screen.getByPlaceholderText("Поиск...");
    fireEvent.change(input, { target: { value: "fa" } });
    expect(screen.getByText("Fabric")).toBeInTheDocument();
    expect(screen.queryByText("Forge")).not.toBeInTheDocument();
    expect(screen.queryByText("Quilt")).not.toBeInTheDocument();
  });
});