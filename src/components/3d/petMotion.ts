import * as THREE from "three";
import { AvatarState } from "@/components/avatar/avatarTypes";
import type {
  CompanionMood,
  CompanionReaction,
} from "@/components/companion/companionBehavior";

const TWO_PI = Math.PI * 2;

// Scenes render with ACESFilmic tone mapping (see sceneRenderer.ts), which
// compresses highlights — emissives must run hotter to read the same as the
// pre-tone-mapped tuning.
const TONE_BOOST = 1.35;

// Everything a scene must hand the controller so state-driven motion can be
// applied. All fields optional-safe: scenes pass what their pet instance has.
export interface PetRig {
  petGroup: THREE.Group;
  leftEye?: THREE.Mesh;
  rightEye?: THREE.Mesh;
  leftPupil?: THREE.Mesh;
  rightPupil?: THREE.Mesh;
  leftBrow?: THREE.Object3D;
  rightBrow?: THREE.Object3D;
  mouth?: THREE.Mesh;
  leftFlipper?: THREE.Object3D;
  rightFlipper?: THREE.Object3D;
  halo?: THREE.Mesh;
  leftFin?: THREE.Mesh;
  rightFin?: THREE.Mesh;
  orbitGroup?: THREE.Group;
  aura?: THREE.Object3D;
  eyeMat?: THREE.MeshStandardMaterial | null;
  mouthMat?: THREE.MeshStandardMaterial | null;
  coreMat?: THREE.MeshStandardMaterial | null;
  accentMat?: THREE.MeshStandardMaterial | null;
  evolutionMat?: THREE.MeshStandardMaterial | null;
  auraMat?: THREE.MeshBasicMaterial | null;
}

export interface PetMotionOptions {
  levelTier: number; // 0..3
  streakTier: number; // 0..3
  // Pet's resting Y in the scene (0 for a scene where the pod sits at origin)
  baseY?: number;
}

export interface PetMotionFrameOptions {
  reducedMotion?: boolean;
  environmentWarmth?: number;
  decorationMotion?: number;
}

// State→motion mapping for the companion, shared by every 3D scene that
// renders the pet (avatar card, study room). One place to tune; scenes only
// apply numbers. Stateful because celebration spin eases back to front.
export function createPetMotionController(options: PetMotionOptions) {
  const { levelTier, streakTier, baseY = 0 } = options;
  const glowBase = 0.7 + levelTier * 0.2;
  const streakBoost = streakTier / 3;
  let rewardSpin = 0;
  let lastTime = 0;
  let reactionStartedAt = -Infinity;
  let activeReaction: CompanionReaction = "bounce";

  function react(reaction: CompanionReaction) {
    activeReaction = reaction;
    reactionStartedAt = lastTime;
  }

  function poke() {
    react("bounce");
  }

  function apply(
    rig: PetRig,
    state: AvatarState,
    t: number,
    mood: CompanionMood = "calm",
    frame: PetMotionFrameOptions = {}
  ) {
    const deltaTime = Math.max(0, Math.min(0.1, t - lastTime));
    lastTime = t;
    const celebrating = state === "reward" || state === "levelUp";
    const reducedMotion = frame.reducedMotion ?? false;
    const environmentWarmth = frame.environmentWarmth ?? 0;
    const decorationMotion = frame.decorationMotion ?? 1;
    const { petGroup } = rig;
    const reactionProgress = Math.min(
      1,
      Math.max(0, (t - reactionStartedAt) / 1.2)
    );
    const reacting = reactionProgress < 1;
    const reactionEase = reacting ? Math.sin(reactionProgress * Math.PI) : 0;
    const reactionBounce =
      activeReaction === "bounce" ? reactionEase : reactionEase * 0.2;
    const ambientStrength = reducedMotion ? 0.22 : 1;
    const breathing = Math.sin(t * 1.25) * 0.009 * ambientStrength;

    // Bob: gentle idle float, calmer in focus, bouncy when celebrating
    if (celebrating && !reducedMotion) {
      petGroup.position.y = baseY + Math.abs(Math.sin(t * 3.2)) * 0.1;
    } else {
      const bobAmp =
        (state === "focus" ? 0.018 : mood === "sleepy" ? 0.015 : 0.034) *
        ambientStrength;
      const bobFreq = state === "focus" ? 2.0 : 1.6;
      petGroup.position.y = baseY + Math.sin(t * bobFreq) * bobAmp + 0.02;
    }
    petGroup.position.y += reactionBounce * (reducedMotion ? 0.025 : 0.13);

    // Sway faces mostly forward; celebrations spin, then ease back to front
    if (state === "levelUp" && !reducedMotion) {
      rewardSpin += deltaTime * 3.6;
    } else if (rewardSpin % TWO_PI !== 0) {
      const target = Math.round(rewardSpin / TWO_PI) * TWO_PI;
      rewardSpin += (target - rewardSpin) * 0.08;
      if (Math.abs(target - rewardSpin) < 0.001) rewardSpin = target;
    }
    const sway =
      state === "focus"
        ? 0
        : Math.sin(t * 0.48) * 0.2 * ambientStrength * decorationMotion;
    petGroup.rotation.y = sway + rewardSpin;
    const moodTilt =
      mood === "curious" ? Math.sin(t * 0.7) * 0.055 * ambientStrength : 0;
    const interactionTilt =
      activeReaction === "tilt" ? reactionEase * 0.16 : 0;
    petGroup.rotation.x =
      activeReaction === "nod"
        ? Math.sin(reactionProgress * Math.PI * 2) * reactionEase * 0.12
        : 0;
    petGroup.rotation.z = moodTilt + interactionTilt;

    // Level-up celebration adds a scale pulse
    const levelScale =
      state === "levelUp" && !reducedMotion ? Math.sin(t * 6) * 0.05 : 0;
    const scale = 1 + levelScale + reactionBounce * 0.055;
    petGroup.scale.set(scale - breathing * 0.4, scale + breathing, scale);

    // Energy core heartbeat: quickens in focus, flashes on celebration.
    if (rig.coreMat) {
      rig.coreMat.emissiveIntensity =
        (glowBase +
          Math.sin(t * (state === "focus" ? 3.4 : 1.6)) * 0.15 +
          (celebrating ? 0.8 : 0) +
          environmentWarmth * 0.18) *
        TONE_BOOST;
    }

    // Halo + pod ring glow: subtle at rest, streaks deepen, celebrations flash
    if (rig.accentMat) {
      rig.accentMat.emissiveIntensity =
        (glowBase +
          Math.sin(t * (state === "focus" ? 3.0 : 1.8)) *
            (0.18 + streakBoost * 0.25) +
          (celebrating ? 0.9 : 0) +
          environmentWarmth * 0.12) *
        TONE_BOOST;
    }

    // Eyes carry the expression: focus narrows, reward soft-squints, level-up
    // opens wide. Idle retains the occasional quick blink.
    if (rig.eyeMat) {
      rig.eyeMat.emissiveIntensity =
        (state === "focus" ? 1.05 : celebrating ? 1.15 : 0.72) *
        TONE_BOOST *
        (1 + environmentWarmth * 0.08);
    }
    if (rig.leftEye && rig.rightEye) {
      const blinkPhase = t % 4.7;
      const doubleBlink = Math.floor(t / 4.7) % 3 === 2;
      const blinking =
        state === "idle" &&
        (blinkPhase > 4.56 || (doubleBlink && blinkPhase > 4.28 && blinkPhase < 4.4));
      const blink = blinking ? 0.1 : 1;
      const expressionY =
        state === "focus"
          ? 0.7
          : state === "reward"
            ? 0.78 + Math.sin(t * 7) * 0.06
            : state === "levelUp"
              ? 1.14
              : mood === "sleepy"
                ? 0.48
                : mood === "proud"
                  ? 0.82 + Math.sin(t * 2.4) * 0.03
                  : mood === "curious"
                    ? 1.05
                    : blink;
      const expressionX = state === "focus" ? 0.9 : state === "levelUp" ? 1.08 : 1;
      const leftBase = rig.leftEye.userData.baseScale as
        | THREE.Vector3
        | undefined;
      const rightBase =
        rig.rightEye.userData.baseScale as THREE.Vector3 | undefined;
      rig.leftEye.scale.set(
        (leftBase?.x ?? 1) * expressionX,
        (leftBase?.y ?? 1) * expressionY,
        leftBase?.z ?? 1
      );
      rig.rightEye.scale.set(
        (rightBase?.x ?? 1) * expressionX,
        (rightBase?.y ?? 1) *
          (mood === "curious" ? expressionY * 0.9 : expressionY),
        rightBase?.z ?? 1
      );
    }

    if (rig.leftPupil && rig.rightPupil) {
      const glance =
        Math.sin(t * 0.43) * 0.014 * ambientStrength * decorationMotion;
      const lift = mood === "curious" ? 0.008 : mood === "sleepy" ? -0.012 : 0;
      for (const pupil of [rig.leftPupil, rig.rightPupil]) {
        const base =
          (pupil.userData.basePosition as THREE.Vector3 | undefined) ??
          pupil.position;
        pupil.position.set(base.x + glance, base.y + lift, base.z);
      }
    }

    if (rig.leftBrow && rig.rightBrow) {
      const leftBase = Number(rig.leftBrow.userData.baseRotationZ ?? 0);
      const rightBase = Number(rig.rightBrow.userData.baseRotationZ ?? 0);
      const leftY = Number(rig.leftBrow.userData.baseY ?? rig.leftBrow.position.y);
      const rightY = Number(rig.rightBrow.userData.baseY ?? rig.rightBrow.position.y);
      let leftAngle = leftBase;
      let rightAngle = rightBase;
      let yOffset = 0;
      if (state === "focus" || mood === "focused") {
        leftAngle = -0.16;
        rightAngle = 0.16;
        yOffset = -0.012;
      } else if (mood === "proud" || mood === "celebrating") {
        leftAngle = 0.12;
        rightAngle = -0.12;
        yOffset = 0.01;
      } else if (mood === "curious") {
        leftAngle = 0.16;
        rightAngle = -0.02;
        yOffset = 0.008;
      } else if (mood === "sleepy") {
        yOffset = -0.035;
      }
      rig.leftBrow.rotation.z = leftAngle;
      rig.rightBrow.rotation.z = rightAngle;
      rig.leftBrow.position.y = leftY + yOffset;
      rig.rightBrow.position.y = rightY + yOffset;
    }

    if (rig.mouth) {
      const base = rig.mouth.userData.baseScale as THREE.Vector3 | undefined;
      const smile =
        state === "focus" || mood === "focused"
          ? 0.12
          : state === "levelUp" || mood === "celebrating"
            ? 1.18
            : state === "reward" || mood === "proud"
              ? 1
              : mood === "sleepy"
                ? 0.2
                : mood === "curious"
                  ? 0.42
                  : 0.62;
      const width = celebrating ? 1.12 : mood === "curious" ? 0.88 : 1;
      rig.mouth.scale.set(
        (base?.x ?? 1) * width,
        (base?.y ?? 1) * smile,
        base?.z ?? 1
      );
      rig.mouth.rotation.z =
        Math.PI + (mood === "curious" ? Math.sin(t * 0.7) * 0.08 : 0);
    }

    if (rig.mouthMat) {
      rig.mouthMat.emissiveIntensity =
        (0.46 + (celebrating ? 0.42 : 0) + environmentWarmth * 0.14) *
        TONE_BOOST;
    }

    // Flippers make state changes legible even when the face is small.
    if (rig.leftFlipper && rig.rightFlipper) {
      const leftBase = Number(rig.leftFlipper.userData.baseRotationZ ?? 0);
      const rightBase = Number(rig.rightFlipper.userData.baseRotationZ ?? 0);
      const stateWave = celebrating && !reducedMotion ? Math.sin(t * 8) * 0.55 : 0;
      const reactionWave =
        activeReaction === "wave"
          ? Math.sin(reactionProgress * Math.PI * 5) * reactionEase * 0.65
          : 0;
      const idleCycle = t % 11;
      const stretch =
        state === "idle" && idleCycle > 8 && idleCycle < 9.3
          ? Math.sin(((idleCycle - 8) / 1.3) * Math.PI) * 0.12 * ambientStrength
          : 0;
      const focusTuck = state === "focus" ? 0.18 : 0;
      rig.leftFlipper.rotation.z =
        leftBase + stateWave + reactionWave + stretch - focusTuck;
      rig.rightFlipper.rotation.z =
        rightBase - stateWave + stretch * 0.45 + focusTuck;
    }

    // Evolution fins breathe at rest, tuck into focus, and flare for wins.
    if (rig.leftFin && rig.rightFin) {
      const flare = celebrating ? 0.32 + Math.sin(t * 7) * 0.12 : 0;
      const focusFold = state === "focus" ? -0.18 : 0;
      rig.leftFin.rotation.z = -0.9 - flare - focusFold;
      rig.rightFin.rotation.z = 0.9 + flare + focusFold;
    }

    if (rig.evolutionMat) {
      rig.evolutionMat.emissiveIntensity =
        (0.42 + levelTier * 0.12 + streakBoost * 0.16 + (celebrating ? 0.4 : 0)) *
        TONE_BOOST;
    }

    // Tier-two focus nodes orbit slowly at rest, lock in while focusing, and
    // accelerate through reward/level-up moments.
    if (rig.orbitGroup) {
      const speed =
        (state === "focus" ? 0.22 : celebrating ? 1.8 : 0.5) *
        (reducedMotion ? 0.25 : decorationMotion);
      rig.orbitGroup.rotation.z = t * speed;
      rig.orbitGroup.rotation.y = Math.sin(t * 0.7) * 0.04;
    }

    // Streak aura remains restrained at rest and blooms only when momentum
    // or a celebration calls for it.
    if (rig.aura && rig.auraMat) {
      const pulse = (Math.sin(t * 1.8) + 1) * 0.5;
      rig.auraMat.opacity =
        0.025 + streakBoost * 0.045 + pulse * 0.015 + (celebrating ? 0.055 : 0);
      const auraScale = 1 + pulse * 0.035 + (state === "levelUp" ? 0.1 : 0);
      rig.aura.scale.setScalar(auraScale);
    }

    // Halo charm: lazy spin at rest, intentional lock during focus, and a
    // quick orbit during celebrations.
    if (rig.halo) {
      rig.halo.rotation.x =
        1.05 + Math.sin(t * 0.8) * 0.05 * ambientStrength;
      rig.halo.rotation.y = 0.12;
      rig.halo.rotation.z =
        -0.16 +
        t *
          (state === "focus" ? 0.2 : celebrating ? 2.1 : 0.7) *
          (reducedMotion ? 0.15 : decorationMotion);
    }
  }

  return { apply, react, poke, glowBase, streakBoost };
}
