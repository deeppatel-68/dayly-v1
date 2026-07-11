import * as THREE from "three";
import { AvatarState } from "@/components/avatar/avatarTypes";

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
  halo?: THREE.Mesh;
  eyeMat?: THREE.MeshStandardMaterial | null;
  coreMat?: THREE.MeshStandardMaterial | null;
  accentMat?: THREE.MeshStandardMaterial | null;
}

export interface PetMotionOptions {
  levelTier: number; // 0..3
  streakTier: number; // 0..3
  // Pet's resting Y in the scene (0 for a scene where the pod sits at origin)
  baseY?: number;
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
  let pokeStartedAt = -Infinity;

  function poke() {
    pokeStartedAt = lastTime;
  }

  function apply(rig: PetRig, state: AvatarState, t: number) {
    lastTime = t;
    const celebrating = state === "reward" || state === "levelUp";
    const { petGroup } = rig;
    const pokeProgress = Math.min(1, Math.max(0, (t - pokeStartedAt) / 1.2));
    const poking = pokeProgress < 1;
    const pokeBounce = poking ? Math.sin(pokeProgress * Math.PI) : 0;

    // Bob: gentle idle float, calmer in focus, bouncy when celebrating
    if (celebrating) {
      petGroup.position.y = baseY + Math.abs(Math.sin(t * 3.2)) * 0.11;
    } else {
      const bobAmp = state === "focus" ? 0.02 : 0.04;
      const bobFreq = state === "focus" ? 2.0 : 1.6;
      petGroup.position.y = baseY + Math.sin(t * bobFreq) * bobAmp + 0.02;
    }
    petGroup.position.y += pokeBounce * 0.13;

    // Sway faces mostly forward; celebrations spin, then ease back to front
    if (celebrating) {
      rewardSpin += 0.12;
    } else if (rewardSpin % TWO_PI !== 0) {
      const target = Math.round(rewardSpin / TWO_PI) * TWO_PI;
      rewardSpin += (target - rewardSpin) * 0.08;
      if (Math.abs(target - rewardSpin) < 0.001) rewardSpin = target;
    }
    const sway = state === "focus" ? 0 : Math.sin(t * 0.5) * 0.28;
    petGroup.rotation.y = sway + rewardSpin;
    petGroup.rotation.z = poking
      ? Math.sin(pokeProgress * Math.PI * 4) * (1 - pokeProgress) * 0.1
      : 0;

    // Level-up celebration adds a scale pulse
    const levelScale = state === "levelUp" ? Math.sin(t * 6) * 0.05 : 0;
    const scale = 1 + levelScale + pokeBounce * 0.06;
    petGroup.scale.setScalar(scale);

    // Energy core heartbeat: quickens in focus, flashes on celebration
    if (rig.coreMat) {
      rig.coreMat.emissiveIntensity =
        (glowBase +
          Math.sin(t * (state === "focus" ? 3.4 : 1.6)) * 0.15 +
          (celebrating ? 0.8 : 0)) *
        TONE_BOOST;
    }

    // Halo + pod ring glow: subtle at rest, streaks deepen, celebrations flash
    if (rig.accentMat) {
      rig.accentMat.emissiveIntensity =
        (glowBase +
          Math.sin(t * (state === "focus" ? 3.0 : 1.8)) *
            (0.18 + streakBoost * 0.25) +
          (celebrating ? 0.9 : 0)) *
        TONE_BOOST;
    }

    // Eyes: brighter in focus/celebration, soft blink when idle
    if (rig.eyeMat) {
      rig.eyeMat.emissiveIntensity =
        (state === "focus" ? 1.05 : celebrating ? 1.15 : 0.72) * TONE_BOOST;
    }
    if (rig.leftEye && rig.rightEye) {
      const blink = state === "idle" && t % 3.6 > 3.48 ? 0.1 : 1;
      rig.leftEye.scale.y = blink;
      rig.rightEye.scale.y = blink;
    }

    // Halo charm: lazy spin (baked tilt makes it wobble like a charm)
    if (rig.halo) rig.halo.rotation.y = t * 0.7;
  }

  return { apply, poke, glowBase, streakBoost };
}
