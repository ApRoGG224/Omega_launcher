import React, { useEffect, useRef, useState } from "react";
import { IconChevronDown } from "./icons";

export interface DropdownOption {
  value: string;
  label: string;
}

type DropdownProps = {
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  searchable?: boolean;
  emptyLabel?: string;
  style?: React.CSSProperties;
  menuUpward?: boolean;
  buttonHeight?: number | string;
};

export const Dropdown = React.memo(({
  value,
  options,
  onSelect,
  searchable = false,
  emptyLabel = "",
  style,
  menuUpward = false,
  buttonHeight = 46,
}: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => setOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const visible = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div
      ref={rootRef}
      className="custom-dropdown-container"
      onClick={(e) => {
        e.stopPropagation();
        setOpen((prev) => !prev);
        setSearch("");
      }}
      style={{ minWidth: "100px", ...style }}
    >
      <div className="custom-dropdown-btn" style={{ height: buttonHeight }}>
        {value === "" ? emptyLabel : value} <IconChevronDown />
      </div>
      {open && (
        <div className={`custom-dropdown-menu ${menuUpward ? "upwards" : ""}`}>
          {searchable && (
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                margin: "5px",
                padding: "8px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                borderRadius: "4px",
                outline: "none",
              }}
            />
          )}
          {visible.map((option) => (
            <div
              key={option.value}
              className="custom-dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});