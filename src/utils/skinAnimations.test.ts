import { describe, it, expect } from "vitest";
import {
  ANIMATION_CATALOG,
  createCustomAnimation,
  TakeTheLAnimation,
  GetGriddyAnimation,
  TwerkAnimation,
} from "./skinAnimations";

describe("skinAnimations", () => {
  it("contains all required animations in the catalog", () => {
    const ids = ANIMATION_CATALOG.map((a) => a.id);
    expect(ids).toContain("take_the_l");
    expect(ids).toContain("get_griddy");
    expect(ids).toContain("twerk");
    expect(ids).toContain("floss");
    expect(ids).toContain("gangnam");
    expect(ids).toContain("dab");
    expect(ids).toContain("wave");
    expect(ids).toContain("disco");
    expect(ids).toContain("clap");
    expect(ids).toContain("zombie");
  });

  it("creates custom animation instances correctly", () => {
    const takeTheL = createCustomAnimation("take_the_l");
    expect(takeTheL).toBeInstanceOf(TakeTheLAnimation);

    const griddy = createCustomAnimation("get_griddy");
    expect(griddy).toBeInstanceOf(GetGriddyAnimation);

    const twerk = createCustomAnimation("twerk");
    expect(twerk).toBeInstanceOf(TwerkAnimation);

    const idle = createCustomAnimation("idle");
    expect(idle).toBeDefined();

    const unknown = createCustomAnimation("unknown_id");
    expect(unknown).toBeNull();
  });
});
