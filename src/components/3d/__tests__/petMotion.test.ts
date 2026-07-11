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

  it("makes focus and reward expressions readable through the rig", () => {
    const leftEye = new THREE.Mesh();
    const rightEye = new THREE.Mesh();
    const leftFlipper = new THREE.Group();
    const rightFlipper = new THREE.Group();
    const orbitGroup = new THREE.Group();
    const aura = new THREE.Group();
    const auraMat = new THREE.MeshBasicMaterial({ transparent: true });
    const rig: PetRig = {
      petGroup: new THREE.Group(),
      leftEye,
      rightEye,
      leftFlipper,
      rightFlipper,
      orbitGroup,
      aura,
      auraMat,
    };
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });

    motion.apply(rig, "focus", 1);
    expect(leftEye.scale.y).toBeCloseTo(0.7);
    expect(orbitGroup.rotation.z).toBeCloseTo(0.22);

    motion.apply(rig, "reward", 1.1);
    expect(leftFlipper.rotation.z).not.toBeCloseTo(0);
    expect(auraMat.opacity).toBeGreaterThan(0.1);

    motion.apply(rig, "levelUp", 1.2);
    expect(leftEye.scale.y).toBeCloseTo(1.14);
    expect(aura.scale.x).toBeGreaterThan(1);
  });
});
