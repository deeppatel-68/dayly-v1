import { describe, expect, it } from "vitest";
import {
  createEnvironmentProfile,
  rgbToHex,
} from "../environmentProfile";

const at = (hour: number, minute = 0) => new Date(2026, 6, 12, hour, minute);

describe("study room environment", () => {
  it("uses the authored local-time color anchors", () => {
    expect(rgbToHex(createEnvironmentProfile(at(3), "idle").sky)).toBe(
      "#1F3150"
    );
    expect(rgbToHex(createEnvironmentProfile(at(6, 15), "idle").sky)).toBe(
      "#8A667A"
    );
    expect(rgbToHex(createEnvironmentProfile(at(12), "idle").sky)).toBe(
      "#6F9DC4"
    );
    expect(rgbToHex(createEnvironmentProfile(at(18, 45), "idle").sky)).toBe(
      "#805A70"
    );
  });

  it("interpolates continuously between keyframes", () => {
    const before = createEnvironmentProfile(at(5, 30), "idle");
    const after = createEnvironmentProfile(at(5, 31), "idle");
    expect(rgbToHex(before.sky)).not.toBe(rgbToHex(after.sky));
    expect(after.starOpacity).toBeLessThan(before.starOpacity);
  });

  it("gives focus an exact practical-light override", () => {
    const profile = createEnvironmentProfile(at(12), "focus");
    expect(profile.lampIntensity).toBe(2.15);
    expect(profile.screenIntensity).toBeGreaterThanOrEqual(0.82);
    expect(profile.decorationMotion).toBe(0.35);
  });

  it("blends reward and level-up toward a warm dawn", () => {
    const base = createEnvironmentProfile(at(3), "idle");
    const reward = createEnvironmentProfile(at(3), "reward", 1);
    const levelUp = createEnvironmentProfile(at(3), "levelUp", 1);
    expect(reward.companionWarmth).toBeGreaterThan(base.companionWarmth);
    expect(reward.keyIntensity).toBeGreaterThan(base.keyIntensity);
    expect(levelUp.keyIntensity).toBeGreaterThan(reward.keyIntensity);
  });
});
