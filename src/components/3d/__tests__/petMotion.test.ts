import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  createPetMotionController,
  EYE_DART_MICRO,
  PetRig,
  SETTLE_MICRO,
} from "../petMotion";

describe("pet motion", () => {
  const makeTimelineRig = (): PetRig => {
    const leftEye = new THREE.Mesh();
    const rightEye = new THREE.Mesh();
    const mouth = new THREE.Mesh();
    const leftFlipper = new THREE.Group();
    const rightFlipper = new THREE.Group();
    const leftFin = new THREE.Mesh();
    const rightFin = new THREE.Mesh();
    for (const node of [leftEye, rightEye, mouth]) {
      node.userData.baseScale = node.scale.clone();
    }
    for (const node of [leftFlipper, rightFlipper]) {
      node.userData.baseRotationZ = node.rotation.z;
    }
    return {
      petGroup: new THREE.Group(),
      leftEye,
      rightEye,
      mouth,
      leftFlipper,
      rightFlipper,
      leftFin,
      rightFin,
      halo: new THREE.Mesh(),
      orbitGroup: new THREE.Group(),
      aura: new THREE.Group(),
      auraMat: new THREE.MeshBasicMaterial({ transparent: true }),
      coreMat: new THREE.MeshBasicMaterial({ color: 0x808080 }),
      accentMat: new THREE.MeshBasicMaterial({ color: 0x606060 }),
      eyeMat: new THREE.MeshBasicMaterial({ color: 0xa0a0a0 }),
      mouthMat: new THREE.MeshBasicMaterial({ color: 0x707070 }),
      evolutionMat: new THREE.MeshBasicMaterial({ color: 0x505050 }),
    };
  };

  it.each(["reward", "levelUp"] as const)(
    "makes %s transforms depend on clip age, not absolute time",
    (state) => {
      const sample = (enteredAt: number) => {
        const rig = makeTimelineRig();
        const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
        motion.apply(rig, "idle", enteredAt - 0.5);
        motion.apply(rig, state, enteredAt);
        motion.apply(rig, state, enteredAt + 0.35);
        return {
          y: rig.petGroup.position.y,
          scale: rig.petGroup.scale.toArray(),
          rotation: rig.petGroup.rotation.toArray(),
        };
      };

      const early = sample(1);
      const late = sample(101);
      expect(late).toEqual(early);
    },
  );

  it("plays the authored reward once and holds a proud rest", () => {
    const rig = makeTimelineRig();
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    motion.apply(rig, "reward", 1);

    motion.apply(rig, "reward", 1.08);
    expect(rig.petGroup.position.y).toBeLessThan(0.04);
    expect(rig.petGroup.scale.y).toBeLessThan(rig.petGroup.scale.x);

    motion.apply(rig, "reward", 1.35);
    expect(rig.petGroup.position.y).toBeCloseTo(0.19, 3);
    expect(rig.petGroup.scale.x ** 2 * rig.petGroup.scale.y).toBeCloseTo(1, 1);

    motion.apply(rig, "reward", 1.58);
    expect(rig.petGroup.position.y).toBeCloseTo(0.04, 3);
    expect(rig.petGroup.scale.y).toBeLessThan(rig.petGroup.scale.x);

    motion.apply(rig, "reward", 2.1);
    const restingY = rig.petGroup.position.y;
    motion.apply(rig, "reward", 3.6);
    expect(rig.petGroup.position.y).toBeCloseTo(restingY, 6);
    expect(rig.petGroup.scale.toArray()).toEqual([1, 1, 1]);
  });

  it("performs exactly one authored level-up turn and stays front-facing", () => {
    const rig = makeTimelineRig();
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    motion.apply(rig, "levelUp", 1);

    motion.apply(rig, "levelUp", 1.18);
    expect(rig.petGroup.rotation.y).toBeCloseTo(0, 6);
    motion.apply(rig, "levelUp", 1.63);
    expect(rig.petGroup.rotation.y).toBeGreaterThan(0);
    expect(rig.petGroup.rotation.y).toBeLessThan(Math.PI * 2);
    motion.apply(rig, "levelUp", 2.08);
    expect(rig.petGroup.rotation.y).toBeCloseTo(Math.PI * 2, 6);
    motion.apply(rig, "levelUp", 2.8);
    const completedTurn = rig.petGroup.rotation.y;
    motion.apply(rig, "levelUp", 6);
    expect(rig.petGroup.rotation.y).toBeCloseTo(completedTurn, 6);
    expect(completedTurn).toBeCloseTo(Math.PI * 2, 6);
  });

  it("trails the level-up landing with fins and settles them by 1.80s", () => {
    const rig = makeTimelineRig();
    rig.leftFin!.rotation.z = -0.9;
    rig.rightFin!.rotation.z = 0.9;
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    motion.apply(rig, "levelUp", 1);

    motion.apply(rig, "levelUp", 1.71);
    expect(rig.leftFin!.rotation.z).toBeCloseTo(-1.28, 3);
    expect(rig.rightFin!.rotation.z).toBeCloseTo(1.28, 3);

    motion.apply(rig, "levelUp", 2.8);
    expect(rig.leftFin!.rotation.z).toBeCloseTo(-0.9, 6);
    expect(rig.rightFin!.rotation.z).toBeCloseTo(0.9, 6);
  });

  it("keeps state transitions continuous and integrates halo/orbit speeds", () => {
    const rig = makeTimelineRig();
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    motion.apply(rig, "idle", 1);
    const before = {
      y: rig.petGroup.position.y,
      scale: rig.petGroup.scale.toArray(),
      rotation: rig.petGroup.rotation.toArray(),
    };
    motion.apply(rig, "focus", 1);
    expect(rig.petGroup.position.y).toBeCloseTo(before.y, 8);
    expect(rig.petGroup.scale.toArray()).toEqual(before.scale);
    expect(rig.petGroup.rotation.toArray()).toEqual(before.rotation);

    motion.apply(rig, "focus", 1.4);
    expect(rig.leftEye!.scale.y).toBeCloseTo(0.7);
    expect(Math.abs(rig.petGroup.rotation.y)).toBeLessThan(0.001);

    let previousHalo = rig.halo!.rotation.z;
    let previousOrbit = rig.orbitGroup!.rotation.z;
    for (let frame = 1; frame <= 12; frame += 1) {
      const state = frame < 4 ? "focus" : frame < 8 ? "reward" : "idle";
      motion.apply(rig, state, 1.4 + frame / 30);
      expect(Math.abs(rig.halo!.rotation.z - previousHalo)).toBeLessThan(0.06);
      expect(Math.abs(rig.orbitGroup!.rotation.z - previousOrbit)).toBeLessThan(
        0.06,
      );
      previousHalo = rig.halo!.rotation.z;
      previousOrbit = rig.orbitGroup!.rotation.z;
    }
  });

  it("normalizes a completed level turn before entering focus", () => {
    const rig = makeTimelineRig();
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    motion.apply(rig, "levelUp", 1);
    motion.apply(rig, "levelUp", 2.8);
    const completedY = rig.petGroup.position.y;
    const completedScale = rig.petGroup.scale.toArray();
    expect(rig.petGroup.rotation.y).toBeCloseTo(Math.PI * 2, 6);

    motion.apply(rig, "focus", 2.8);
    expect(rig.petGroup.position.y).toBeCloseTo(completedY, 8);
    expect(rig.petGroup.scale.toArray()).toEqual(completedScale);
    expect(rig.petGroup.rotation.y).toBeCloseTo(0, 8);
    motion.apply(rig, "focus", 3);
    expect(Math.abs(rig.petGroup.rotation.y)).toBeLessThan(0.01);
  });

  it("preserves root and appendage poses across authored state entries", () => {
    const rig = makeTimelineRig();
    rig.leftFin!.rotation.z = -0.9;
    rig.rightFin!.rotation.z = 0.9;
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    motion.apply(rig, "focus", 1);
    motion.apply(rig, "focus", 1.4);
    const focusedPose = {
      y: rig.petGroup.position.y,
      scale: rig.petGroup.scale.toArray(),
      flippers: [rig.leftFlipper!.rotation.z, rig.rightFlipper!.rotation.z],
      fins: [rig.leftFin!.rotation.z, rig.rightFin!.rotation.z],
    };

    motion.apply(rig, "reward", 1.4);
    expect(rig.petGroup.position.y).toBeCloseTo(focusedPose.y, 8);
    expect(rig.petGroup.scale.toArray()).toEqual(focusedPose.scale);
    expect([
      rig.leftFlipper!.rotation.z,
      rig.rightFlipper!.rotation.z,
    ]).toEqual(focusedPose.flippers);
    expect([rig.leftFin!.rotation.z, rig.rightFin!.rotation.z]).toEqual(
      focusedPose.fins,
    );

    motion.apply(rig, "reward", 2.5);
    motion.apply(rig, "levelUp", 2.5);
    const levelEntryY = rig.petGroup.position.y;
    motion.apply(rig, "levelUp", 4.3);
    const levelExitY = rig.petGroup.position.y;
    motion.apply(rig, "idle", 4.3);
    expect(levelEntryY).toBeCloseTo(0.04, 6);
    expect(rig.petGroup.position.y).toBeCloseTo(levelExitY, 8);
    expect(rig.petGroup.rotation.y).toBeCloseTo(0, 8);
  });

  it.each(["bounce", "nod", "tilt"] as const)(
    "consumes a %s reaction while an authored root clip owns motion",
    (reaction) => {
      for (const [state, duration, expectedY] of [
        ["reward", 1.1, 0.04],
        ["levelUp", 1.8, 0.052],
      ] as const) {
        const rig = makeTimelineRig();
        const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
        motion.apply(rig, "idle", 0);
        motion.apply(rig, state, 1);
        motion.apply(rig, state, 1 + duration - 0.2);
        motion.react(reaction);
        motion.apply(rig, state, 1 + duration);

        expect(rig.petGroup.position.y).toBeCloseTo(expectedY, 6);
        expect(rig.petGroup.rotation.x).toBe(0);
        expect(rig.petGroup.rotation.z).toBe(0);
        expect(rig.petGroup.scale.toArray()).toEqual([1, 1, 1]);
      }
    },
  );

  it("uses an ease-out settle from 820ms through the end of reward", () => {
    const rig = makeTimelineRig();
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    motion.apply(rig, "reward", 1);

    motion.apply(rig, "reward", 1.82);
    expect(rig.petGroup.position.y).toBeCloseTo(0.048, 6);
    motion.apply(rig, "reward", 1.96);
    expect(rig.petGroup.position.y).toBeCloseTo(0.041, 6);
    expect(rig.petGroup.scale.y).toBeCloseTo(0.99775, 5);
    motion.apply(rig, "reward", 2.1);
    expect(rig.petGroup.position.y).toBeCloseTo(0.04, 8);
    expect(rig.petGroup.scale.toArray()).toEqual([1, 1, 1]);
  });

  it("updates Basic material energy without replacement or per-frame colour caches", () => {
    const rig = makeTimelineRig();
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    const core = rig.coreMat as THREE.MeshBasicMaterial;
    motion.apply(rig, "idle", 0);
    const materialIdentity = rig.coreMat;
    const baseColor = core.userData.baseColor as THREE.Color;
    const idleRed = core.color.r;

    motion.apply(rig, "reward", 1);
    motion.apply(rig, "reward", 1.18);
    const rewardRed = core.color.r;
    motion.apply(rig, "reward", 1.3);

    expect(rig.coreMat).toBe(materialIdentity);
    expect(core.userData.baseColor).toBe(baseColor);
    expect(rewardRed).toBeGreaterThan(idleRed);
  });

  it("strictly suppresses reduced-motion displacement and decorative motion", () => {
    const baseY = 2;
    const rig = makeTimelineRig();
    const motion = createPetMotionController({
      levelTier: 3,
      streakTier: 3,
      baseY,
    });
    const frame = { reducedMotion: true };
    motion.apply(rig, "idle", 0, "calm", frame);
    const haloRotation = rig.halo!.rotation.toArray();
    const orbitRotation = rig.orbitGroup!.rotation.toArray();
    const finRotations = [rig.leftFin!.rotation.z, rig.rightFin!.rotation.z];
    const flipperRotations = [
      rig.leftFlipper!.rotation.z,
      rig.rightFlipper!.rotation.z,
    ];
    motion.react("nod");

    for (const [state, time] of [
      ["focus", 0.08],
      ["reward", 0.18],
      ["levelUp", 0.7],
      ["levelUp", 2.6],
    ] as const) {
      motion.apply(rig, state, time, "curious", frame);
      expect(rig.petGroup.position.y).toBeGreaterThanOrEqual(baseY + 0.037);
      expect(rig.petGroup.position.y).toBeLessThanOrEqual(baseY + 0.045);
      expect(Math.abs(rig.petGroup.rotation.x)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(rig.petGroup.rotation.y)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(rig.petGroup.rotation.z)).toBeLessThanOrEqual(0.01);
      for (const component of rig.petGroup.scale.toArray()) {
        expect(component).toBeGreaterThanOrEqual(0.99);
        expect(component).toBeLessThanOrEqual(1.01);
      }
      expect(rig.halo!.rotation.toArray()).toEqual(haloRotation);
      expect(rig.orbitGroup!.rotation.toArray()).toEqual(orbitRotation);
      expect([rig.leftFin!.rotation.z, rig.rightFin!.rotation.z]).toEqual(
        finRotations,
      );
      expect([
        rig.leftFlipper!.rotation.z,
        rig.rightFlipper!.rotation.z,
      ]).toEqual(flipperRotations);
    }
  });

  it("freezes integrated decorations when reduced motion changes without snapping", () => {
    const rig = makeTimelineRig();
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    motion.apply(rig, "idle", 1 / 30);
    const haloBefore = rig.halo!.rotation.toArray();
    const orbitBefore = rig.orbitGroup!.rotation.toArray();

    motion.apply(rig, "idle", 2 / 30, "calm", { reducedMotion: true });
    expect(rig.halo!.rotation.toArray()).toEqual(haloBefore);
    expect(rig.orbitGroup!.rotation.toArray()).toEqual(orbitBefore);

    motion.apply(rig, "focus", 1, "focused", { reducedMotion: true });
    expect(rig.halo!.rotation.toArray()).toEqual(haloBefore);
    expect(rig.orbitGroup!.rotation.toArray()).toEqual(orbitBefore);
  });

  it("eases reduced-motion colour posture over 160ms", () => {
    const rig = makeTimelineRig();
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    const frame = { reducedMotion: true };
    motion.apply(rig, "idle", 0, "calm", frame);
    const idleColor = (rig.coreMat as THREE.MeshBasicMaterial).color.getHex();

    motion.apply(rig, "focus", 1, "focused", frame);
    expect((rig.coreMat as THREE.MeshBasicMaterial).color.getHex()).toBe(
      idleColor,
    );
    motion.apply(rig, "focus", 1.16, "focused", frame);
    expect((rig.coreMat as THREE.MeshBasicMaterial).color.getHex()).not.toBe(
      idleColor,
    );
  });

  it.each(["reward", "levelUp"] as const)(
    "ramps reduced-motion %s opacity to 180ms then settles",
    (state) => {
      const rig = makeTimelineRig();
      rig.haloGlowMat = new THREE.SpriteMaterial({ transparent: true });
      rig.coreGlowMat = new THREE.SpriteMaterial({ transparent: true });
      const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
      const frame = { reducedMotion: true };
      motion.apply(rig, "idle", 0, "calm", frame);
      motion.apply(rig, state, 1, "celebrating", frame);
      const entryHalo = rig.haloGlowMat.opacity;
      const entryAura = rig.auraMat!.opacity;

      motion.apply(rig, state, 1.18, "celebrating", frame);
      expect(rig.haloGlowMat.opacity).toBeGreaterThan(entryHalo);
      expect(rig.coreGlowMat.opacity).toBeGreaterThanOrEqual(
        rig.haloGlowMat.opacity,
      );
      expect(rig.auraMat!.opacity).toBeGreaterThan(entryAura);

      const settleAge = state === "reward" ? 0.68 : 0.88;
      motion.apply(rig, state, 1 + settleAge, "celebrating", frame);
      expect(rig.haloGlowMat.opacity).toBeCloseTo(entryHalo, 6);
      expect(rig.auraMat!.opacity).toBeCloseTo(entryAura, 6);
    },
  );

  it("eases reduced-motion brow expressions over 160ms", () => {
    const rig = makeTimelineRig();
    rig.leftBrow = new THREE.Group();
    rig.rightBrow = new THREE.Group();
    rig.leftBrow.userData.baseRotationZ = 0;
    rig.rightBrow.userData.baseRotationZ = 0;
    rig.leftBrow.userData.baseY = 1;
    rig.rightBrow.userData.baseY = 1;
    const motion = createPetMotionController({ levelTier: 0, streakTier: 0 });
    const frame = { reducedMotion: true };
    motion.apply(rig, "idle", 0, "calm", frame);
    motion.apply(rig, "focus", 1, "focused", frame);
    expect(rig.leftBrow.rotation.z).toBe(0);
    expect(rig.leftBrow.position.y).toBe(1);

    motion.apply(rig, "focus", 1.08, "focused", frame);
    expect(rig.leftBrow.rotation.z).toBeGreaterThan(-0.16);
    expect(rig.leftBrow.rotation.z).toBeLessThan(0);
    motion.apply(rig, "focus", 1.16, "focused", frame);
    expect(rig.leftBrow.rotation.z).toBeCloseTo(-0.16, 6);
    expect(rig.rightBrow.rotation.z).toBeCloseTo(0.16, 6);
  });

  it("rebases decoration phases when reduced motion is disabled", () => {
    const rig = makeTimelineRig();
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    motion.apply(rig, "idle", 1 / 30);
    motion.apply(rig, "idle", 2 / 30, "calm", { reducedMotion: true });
    for (let frame = 3; frame <= 303; frame += 1) {
      motion.apply(rig, "idle", frame / 30, "calm", {
        reducedMotion: true,
      });
    }
    const haloBefore = rig.halo!.rotation.toArray();
    const orbitBefore = rig.orbitGroup!.rotation.toArray();

    motion.apply(rig, "idle", 304 / 30, "calm", { reducedMotion: false });
    expect(rig.halo!.rotation.toArray()).toEqual(haloBefore);
    expect(rig.orbitGroup!.rotation.toArray()).toEqual(orbitBefore);
  });

  it("keeps streak-only aura subordinate in every state", () => {
    const rig = makeTimelineRig();
    rig.aura!.scale.setScalar(0.94);
    const motion = createPetMotionController({ levelTier: 2, streakTier: 3 });
    motion.apply(rig, "idle", 0);
    for (const [state, enteredAt, age] of [
      ["focus", 1, 0.4],
      ["reward", 2, 0.35],
      ["levelUp", 3, 0.7],
      ["idle", 5, 0.2],
    ] as const) {
      motion.apply(rig, state, enteredAt);
      motion.apply(rig, state, enteredAt + age);
      expect(rig.aura!.scale.toArray()).toEqual([0.94, 0.94, 0.94]);
      expect(rig.auraMat!.opacity).toBeLessThanOrEqual(0.09);
    }
  });

  it("preserves Standard emissive response and reduced-motion easing", () => {
    const rig = makeTimelineRig();
    rig.coreMat = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
    rig.accentMat = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
    rig.eyeMat = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
    rig.mouthMat = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
    rig.evolutionMat = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
    const motion = createPetMotionController({ levelTier: 3, streakTier: 3 });
    const frame = { reducedMotion: true };
    motion.apply(rig, "idle", 0, "calm", frame);
    const idleIntensity = rig.coreMat.emissiveIntensity;

    motion.apply(rig, "focus", 1, "focused", frame);
    expect(rig.coreMat.emissiveIntensity).toBeCloseTo(idleIntensity, 8);
    motion.apply(rig, "focus", 1.16, "focused", frame);
    expect(rig.coreMat.emissiveIntensity).not.toBeCloseTo(idleIntensity, 3);
    motion.apply(rig, "reward", 2, "celebrating", frame);
    motion.apply(rig, "reward", 2.18, "celebrating", frame);
    expect(rig.coreMat.emissiveIntensity).toBeGreaterThan(idleIntensity);
    expect(rig.accentMat.emissiveIntensity).toBeGreaterThan(0);
    expect(rig.eyeMat.emissiveIntensity).toBeGreaterThan(0);
    expect(rig.mouthMat.emissiveIntensity).toBeGreaterThan(0);
    expect(rig.evolutionMat.emissiveIntensity).toBeGreaterThan(0);
  });

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
    expect(orbitGroup.rotation.z).toBeCloseTo(0);

    motion.apply(rig, "reward", 1.1);
    motion.apply(rig, "reward", 1.4);
    expect(leftFlipper.rotation.z).not.toBeCloseTo(0);
    expect(auraMat.opacity).toBeGreaterThan(0.1);

    motion.apply(rig, "levelUp", 2);
    motion.apply(rig, "levelUp", 2.2);
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
    motion.apply(rig, "reward", 1.32, "proud");

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
    expect(focusRig.petGroup.scale.x).toBeLessThan(
      idleRig.petGroup.scale.x,
    );
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
