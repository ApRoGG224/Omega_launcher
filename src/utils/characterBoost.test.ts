import { describe, it, expect } from "vitest";
import { playBoostSound } from "./soundEffects";

describe("characterBoost sound and mechanics", () => {
  it("exports playBoostSound and handles muted parameter safely", () => {
    expect(typeof playBoostSound).toBe("function");
    // Should not throw even when audio context is unavailable in node/vitest environment
    expect(() => playBoostSound(true)).not.toThrow();
    expect(() => playBoostSound(false)).not.toThrow();
  });
});
