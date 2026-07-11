import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createCompanionEvolution } from "../companionEvolution";

const create = (levelTier: number, streakTier = 0) =>
  createCompanionEvolution({
    accent: new THREE.Color("#D97757"),
    levelTier,
    streakTier,
  });

describe("companion evolution", () => {
  it("adds a distinct silhouette at each level tier", () => {
    const base = create(0);
    const emerging = create(1);
    const focused = create(2);
    const ascended = create(3);

    expect(base.leftFin).toBeUndefined();
    expect(emerging.leftFin?.name).toBe("LeftEvolutionFin");
    expect(focused.orbitGroup?.children).toHaveLength(3);
    expect(ascended.aura?.name).toBe("StreakAura");

    base.dispose();
    emerging.dispose();
    focused.dispose();
    ascended.dispose();
  });

  it("shows earned streak energy before the highest level tier", () => {
    const streakCompanion = create(0, 1);
    expect(streakCompanion.auraMat?.transparent).toBe(true);
    expect(streakCompanion.auraMat?.depthWrite).toBe(false);
    streakCompanion.dispose();
  });
});
