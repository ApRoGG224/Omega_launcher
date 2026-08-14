import { describe, it, expect } from "vitest";
import { generateFriendCode } from "./omega";

describe("generateFriendCode", () => {
  it("имеет формат OMG-XXXXXX", () => {
    const code = generateFriendCode();
    expect(code).toMatch(/^OMG-[A-Z2-9]{6}$/);
  });

  it("не содержит похожих символов (0, O, 1, I)", () => {
    const code = generateFriendCode();
    expect(code.slice(4)).not.toMatch(/[0O1I]/);
  });

  it("генерирует разные коды", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateFriendCode()));
    expect(codes.size).toBe(50);
  });
});
