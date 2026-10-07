import { describe, it, expect } from "vitest";
import {
  ANIMATION_CATALOG,
  createCustomAnimation,
  EmoteWaveAnimation,
  EmoteClapAnimation,
  EmotePointAnimation,
  EmoteBowAnimation,
  EmoteShrugAnimation,
  EmoteFacepalmAnimation,
  EmoteDiscoAnimation,
  EmoteTwerkAnimation,
} from "./skinAnimations";

describe("skinAnimations", () => {
  it("contains all 8 Emotecraft animations in the catalog", () => {
    const ids = ANIMATION_CATALOG.map((a) => a.id);
    expect(ids).toEqual([
      "wave",
      "clap",
      "point",
      "bow",
      "shrug",
      "facepalm",
      "disco",
      "twerk",
    ]);
  });

  it("creates Emotecraft animation instances correctly", () => {
    const wave = createCustomAnimation("wave");
    expect(wave).toBeInstanceOf(EmoteWaveAnimation);

    const clap = createCustomAnimation("clap");
    expect(clap).toBeInstanceOf(EmoteClapAnimation);

    const point = createCustomAnimation("point");
    expect(point).toBeInstanceOf(EmotePointAnimation);

    const bow = createCustomAnimation("bow");
    expect(bow).toBeInstanceOf(EmoteBowAnimation);

    const shrug = createCustomAnimation("shrug");
    expect(shrug).toBeInstanceOf(EmoteShrugAnimation);

    const facepalm = createCustomAnimation("facepalm");
    expect(facepalm).toBeInstanceOf(EmoteFacepalmAnimation);

    const disco = createCustomAnimation("disco");
    expect(disco).toBeInstanceOf(EmoteDiscoAnimation);

    const twerk = createCustomAnimation("twerk");
    expect(twerk).toBeInstanceOf(EmoteTwerkAnimation);

    const idle = createCustomAnimation("idle");
    expect(idle).toBeDefined();

    const unknown = createCustomAnimation("unknown_id");
    expect(unknown).toBeNull();
  });
});
