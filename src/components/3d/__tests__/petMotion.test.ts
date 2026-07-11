import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createPetMotionController, PetRig } from "../petMotion";

describe("pet motion", () => {
  it("plays one poke bounce and returns to the base animation", () => {
    const rig: PetRig = { petGroup: new THREE.Group() };
    const motion = createPetMotionController({ levelTier: 0, streakTier: 0 });

    motion.apply(rig, "idle", 0);
    motion.poke();
    motion.apply(rig, "idle", 0.6);
    const pokedY = rig.petGroup.position.y;

    expect(pokedY).toBeGreaterThan(0.12);
    expect(rig.petGroup.scale.x).toBeGreaterThan(1.05);

    motion.apply(rig, "idle", 1.21);
    expect(rig.petGroup.position.y).toBeLessThan(pokedY);
    expect(rig.petGroup.scale.x).toBeCloseTo(1);
    expect(rig.petGroup.rotation.z).toBe(0);
  });
});
