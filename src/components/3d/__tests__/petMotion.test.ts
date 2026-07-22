import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  createPetMotionController,
  EYE_DART_MICRO,
  PetRig,
  SETTLE_MICRO,
} from "../petMotion";

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

  it("maps moods and contextual reactions onto brows, pupils, and motion", () => {
    const leftBrow = new THREE.Group();
    const rightBrow = new THREE.Group();
    const leftPupil = new THREE.Mesh();
    const rightPupil = new THREE.Mesh();
    leftBrow.userData.baseY = 1;
    rightBrow.userData.baseY = 1;
    leftPupil.userData.basePosition = new THREE.Vector3(-0.1, 0.8, 0.5);
    rightPupil.userData.basePosition = new THREE.Vector3(0.1, 0.8, 0.5);
    const rig: PetRig = {
      petGroup: new THREE.Group(),
      leftBrow,
      rightBrow,
      leftPupil,
      rightPupil,
    };
    const motion = createPetMotionController({ levelTier: 1, streakTier: 1 });

    motion.apply(rig, "idle", 1, "curious");
    expect(leftBrow.rotation.z).toBeGreaterThan(rightBrow.rotation.z);
    expect(leftPupil.position.x).not.toBeCloseTo(-0.1);

    motion.react("nod");
    motion.apply(rig, "idle", 1.3, "encouraging");
    expect(rig.petGroup.rotation.x).not.toBeCloseTo(0);
  });

  it("keeps reduced motion restrained", () => {
    const rig: PetRig = { petGroup: new THREE.Group() };
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0, "calm", { reducedMotion: true });
    motion.react("bounce");
    motion.apply(rig, "levelUp", 0.6, "celebrating", {
      reducedMotion: true,
    });

    expect(Math.abs(rig.petGroup.rotation.y)).toBeLessThan(0.1);
    expect(rig.petGroup.position.y).toBeLessThan(0.07);
  });

  it("turns the mouth from a focus line into a proud smile", () => {
    const mouth = new THREE.Mesh();
    mouth.userData.baseScale = new THREE.Vector3(1, 0.24, 1);
    const rig: PetRig = { petGroup: new THREE.Group(), mouth };
    const motion = createPetMotionController({ levelTier: 1, streakTier: 1 });

    motion.apply(rig, "focus", 1, "focused");
    const focusHeight = mouth.scale.y;
    motion.apply(rig, "reward", 1.2, "proud");

    expect(focusHeight).toBeLessThan(0.1);
    expect(mouth.scale.y).toBeGreaterThan(0.2);
  });

  it("settles with a rare idle squash that focus never shows", () => {
    // Mid-window of the settle cycle: period 16.3s, last 0.9s is the settle.
    const settleTime = SETTLE_MICRO.period - SETTLE_MICRO.duration / 2;

    const idleRig: PetRig = { petGroup: new THREE.Group() };
    createPetMotionController({ levelTier: 0, streakTier: 0 }).apply(
      idleRig,
      "idle",
      settleTime
    );
    expect(idleRig.petGroup.scale.y).toBeLessThan(1);
    expect(idleRig.petGroup.scale.x).toBeGreaterThan(1);

    const focusRig: PetRig = { petGroup: new THREE.Group() };
    createPetMotionController({ levelTier: 0, streakTier: 0 }).apply(
      focusRig,
      "focus",
      settleTime
    );
    expect(focusRig.petGroup.scale.x).toBeLessThanOrEqual(1);
  });

  it("darts the pupils during the idle micro-dart window only", () => {
    const dartTime = EYE_DART_MICRO.period * 2 + EYE_DART_MICRO.duration / 2;
    const base = new THREE.Vector3(0.1, 0.8, 0.5);
    const makeRig = (): PetRig => {
      const leftPupil = new THREE.Mesh();
      const rightPupil = new THREE.Mesh();
      leftPupil.userData.basePosition = base.clone();
      rightPupil.userData.basePosition = base.clone();
      return { petGroup: new THREE.Group(), leftPupil, rightPupil };
    };

    // The slow glance is identical across states at equal time, so the idle
    // vs focus difference isolates the dart exactly.
    const idleRig = makeRig();
    createPetMotionController({ levelTier: 0, streakTier: 0 }).apply(
      idleRig,
      "idle",
      dartTime
    );
    const focusRig = makeRig();
    createPetMotionController({ levelTier: 0, streakTier: 0 }).apply(
      focusRig,
      "focus",
      dartTime
    );

    const dart =
      idleRig.leftPupil!.position.x - focusRig.leftPupil!.position.x;
    expect(Math.abs(dart)).toBeCloseTo(EYE_DART_MICRO.offset, 3);
  });

  it("trails the halo behind the body sway", () => {
    const halo = new THREE.Mesh();
    const rig: PetRig = { petGroup: new THREE.Group(), halo };
    const motion = createPetMotionController({ levelTier: 0, streakTier: 0 });

    // While sway is increasing (t=1), the delayed halo sits behind: below its
    // 0.12 rest yaw. In focus, sway is locked to zero, so no lag offset.
    motion.apply(rig, "idle", 1);
    expect(halo.rotation.y).toBeLessThan(0.12);

    const focusRig: PetRig = { petGroup: new THREE.Group(), halo: new THREE.Mesh() };
    const focusMotion = createPetMotionController({ levelTier: 0, streakTier: 0 });
    focusMotion.apply(focusRig, "focus", 1);
    expect(focusRig.halo!.rotation.y).toBeCloseTo(0.12);
  });
});
