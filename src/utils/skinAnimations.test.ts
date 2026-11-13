import { describe, it, expect } from "vitest";
import { resetEmoteJoints } from "./skinAnimations";

describe("skinAnimations", () => {
  it("exports resetEmoteJoints function", () => {
    expect(typeof resetEmoteJoints).toBe("function");
  });
});
