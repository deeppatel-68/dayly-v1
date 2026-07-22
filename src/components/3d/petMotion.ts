import * as THREE from "three";
import { AvatarState } from "@/components/avatar/avatarTypes";
import type {
  CompanionMood,
  CompanionReaction,
} from "@/components/companion/companionBehavior";

const TWO_PI = Math.PI * 2;
const TONE_BOOST = 1.35;
const HOVER_BASELINE = 0.04;
const EMPTY_FRAME_OPTIONS: Readonly<PetMotionFrameOptions> = Object.freeze({});

type CompanionSurfaceMaterial =
  | THREE.MeshBasicMaterial
  | THREE.MeshStandardMaterial;

interface MotionPose {
  eyeScaleX: number;
  eyeScaleY: number;
  mouthScaleY?: number;
}

interface MotionProfile {
  blinkScaleY: number | null;
  focus: MotionPose;
  reward: MotionPose;
  levelUp: MotionPose;
}

const DEFAULT_FACE_PROFILE: MotionProfile = {
  blinkScaleY: 0.1,
  focus: { eyeScaleX: 0.9, eyeScaleY: 0.7, mouthScaleY: 0.12 },
  reward: { eyeScaleX: 1, eyeScaleY: 0.84, mouthScaleY: 1 },
  levelUp: { eyeScaleX: 1.08, eyeScaleY: 1.14, mouthScaleY: 1.18 },
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const lerp = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

// Module-level curves keep the render loop allocation-free and make every
// authored state clip use the same timing language.
const smoothstep = (value: number) => {
  const u = clamp01(value);
  return u * u * (3 - 2 * u);
};

const easeOutCubic = (value: number) => {
  const u = 1 - clamp01(value);
  return 1 - u * u * u;
};

const easeInOutCubic = (value: number) => {
  const u = clamp01(value);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};

const focusEntryBlend = (age: number) => {
  if (age >= 0.4) return 1;
  if (age <= 0.28) return easeOutCubic(age / 0.28) * 1.04;
  return lerp(1.04, 1, easeOutCubic((age - 0.28) / 0.12));
};

const singleBlinkRatio = (elapsed: number, closedRatio: number) => {
  if (elapsed < 0 || elapsed >= 0.18) return 1;
  if (elapsed < 0.055) {
    return lerp(1, closedRatio, smoothstep(elapsed / 0.055));
  }
  if (elapsed < 0.08) return closedRatio;
  return lerp(closedRatio, 1, smoothstep((elapsed - 0.08) / 0.1));
};

const blinkRatioAt = (animationTime: number, closedRatio: number) => {
  const cycle = animationTime % 4.7;
  const blinkStart = 4.52;
  const primary = singleBlinkRatio(cycle - blinkStart, closedRatio);
  const doubleBlink = Math.floor(animationTime / 4.7) % 3 === 2;
  return doubleBlink
    ? Math.min(
        primary,
        singleBlinkRatio(cycle - (blinkStart - 0.3), closedRatio),
      )
    : primary;
};

const idleYawAt = (animationTime: number) =>
  Math.sin(animationTime * (TWO_PI / 8.4)) * 0.055;

const normalizedAngle = (angle: number) => {
  const normalized = Math.atan2(Math.sin(angle), Math.cos(angle));
  return Math.abs(normalized) < 1e-10 ? 0 : normalized;
};

const celebrationSignal = (
  state: AvatarState,
  age: number,
  reducedMotion: boolean,
) => {
  if (state !== "reward" && state !== "levelUp") return 0;
  const peak = 0.18;
  const settle =
    state === "reward"
      ? reducedMotion
        ? 0.5
        : 0.72
      : reducedMotion
        ? 0.7
        : 1.62;
  if (age <= peak) return easeOutCubic(age / peak);
  return 1 - easeOutCubic((age - peak) / settle);
};

const applyEnergyMaterial = (
  material: CompanionSurfaceMaterial | null | undefined,
  basicBrightness: number,
  standardIntensity: number,
) => {
  if (material instanceof THREE.MeshStandardMaterial) {
    material.emissiveIntensity = standardIntensity;
    return;
  }
  if (!(material instanceof THREE.MeshBasicMaterial)) return;
  let baseColor = material.userData.baseColor as THREE.Color | undefined;
  if (!baseColor) {
    baseColor = material.color.clone();
    material.userData.baseColor = baseColor;
  }
  material.color
    .copy(baseColor)
    .multiplyScalar(Math.max(0.78, Math.min(1.12, basicBrightness)));
};

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
  eyeMat?: CompanionSurfaceMaterial | null;
  mouthMat?: CompanionSurfaceMaterial | null;
  coreMat?: CompanionSurfaceMaterial | null;
  accentMat?: CompanionSurfaceMaterial | null;
  haloGlowMat?: THREE.SpriteMaterial | null;
  coreGlowMat?: THREE.SpriteMaterial | null;
  evolutionMat?: CompanionSurfaceMaterial | null;
  auraMat?: THREE.MeshBasicMaterial | null;
}

export interface PetMotionOptions {
  levelTier: number;
  streakTier: number;
  baseY?: number;
}

export interface PetMotionFrameOptions {
  reducedMotion?: boolean;
  environmentWarmth?: number;
  decorationMotion?: number;
}

export const SETTLE_MICRO = { period: 16.3, duration: 0.72, squash: 0.025 };
export const EYE_DART_MICRO = { period: 9.7, duration: 0.22, offset: 0.01 };
export const HALO_LAG_SECONDS = 0.12;

export function createPetMotionController(options: PetMotionOptions) {
  const { levelTier, streakTier, baseY = 0 } = options;
  const glowBase = 0.7 + levelTier * 0.2;
  const streakBoost = streakTier / 3;
  let lastTime = 0;
  let hasFrameTime = false;
  let animationTime = 0;
  let previousState: AvatarState | null = null;
  let stateBeforeEntry: AvatarState | null = null;
  let stateEnteredAt = 0;
  let transitionY = baseY + HOVER_BASELINE;
  let transitionScaleX = 1;
  let transitionScaleY = 1;
  let transitionScaleZ = 1;
  let transitionRotationY = 0;
  let transitionEyeX = 1;
  let transitionEyeY = 1;
  let transitionMouthY = 1;
  let transitionLeftFlipperZ = 0;
  let transitionRightFlipperZ = 0;
  let transitionLeftFinZ = 0;
  let transitionRightFinZ = 0;
  let transitionLeftBrowZ = 0;
  let transitionRightBrowZ = 0;
  let transitionLeftBrowY = 0;
  let transitionRightBrowY = 0;
  let lastCoreBrightness = 0.9;
  let lastAccentBrightness = 0.91;
  let lastEyeBrightness = 0.9;
  let lastMouthBrightness = 0.84;
  let lastEvolutionBrightness =
    0.84 + levelTier * 0.04 + streakBoost * 0.05;
  let transitionCoreBrightness = lastCoreBrightness;
  let transitionAccentBrightness = lastAccentBrightness;
  let transitionEyeBrightness = lastEyeBrightness;
  let transitionMouthBrightness = lastMouthBrightness;
  let transitionEvolutionBrightness = lastEvolutionBrightness;
  let lastCoreIntensity = glowBase * TONE_BOOST;
  let lastAccentIntensity = glowBase * TONE_BOOST;
  let lastEyeIntensity = 0.72 * TONE_BOOST;
  let lastMouthIntensity = 0.46 * TONE_BOOST;
  let lastEvolutionIntensity =
    (0.42 + levelTier * 0.12 + streakBoost * 0.16) * TONE_BOOST;
  let transitionCoreIntensity = lastCoreIntensity;
  let transitionAccentIntensity = lastAccentIntensity;
  let transitionEyeIntensity = lastEyeIntensity;
  let transitionMouthIntensity = lastMouthIntensity;
  let transitionEvolutionIntensity = lastEvolutionIntensity;
  let celebrationEntryHaloGlow = 0.75;
  let celebrationEntryCoreGlow = 0.85;
  let haloAngle = 0;
  let orbitAngle = 0;
  let decorationTime = 0;
  let hasDecorationTime = false;
  let wasReducedMotion = false;
  let decorationResumedAt = -Infinity;
  let resumeHaloX = 0;
  let resumeHaloY = 0;
  let resumeHaloZ = 0;
  let resumeOrbitY = 0;
  let resumeOrbitZ = 0;
  let resumeLeftFinZ = 0;
  let resumeRightFinZ = 0;
  let resumeAuraScale = 1;
  let resumeAuraOpacity = 0;
  let reactionStartedAt = -Infinity;
  let activeReaction: CompanionReaction = "bounce";
  let pendingBounce = false;
  let clipOwnedRootOnLastFrame = false;

  function playBounce() {
    activeReaction = "bounce";
    if (clipOwnedRootOnLastFrame) {
      reactionStartedAt = -Infinity;
      pendingBounce = false;
      return;
    }
    reactionStartedAt = lastTime;
    pendingBounce = !hasFrameTime;
  }

  function react(reaction: CompanionReaction) {
    if (reaction === "bounce") {
      playBounce();
      return;
    }
    activeReaction = reaction;
    if (clipOwnedRootOnLastFrame) {
      reactionStartedAt = -Infinity;
      pendingBounce = false;
      return;
    }
    reactionStartedAt = lastTime;
  }

  function poke() {
    playBounce();
  }

  function apply(
    rig: PetRig,
    state: AvatarState,
    t: number,
    mood: CompanionMood = "calm",
    frame: PetMotionFrameOptions = EMPTY_FRAME_OPTIONS,
  ) {
    const deltaTime = hasFrameTime
      ? Math.max(0, Math.min(0.1, t - lastTime))
      : 0;
    if (!hasFrameTime) animationTime = t;
    else animationTime += deltaTime;
    hasFrameTime = true;
    lastTime = t;
    if (pendingBounce) {
      reactionStartedAt = t;
      pendingBounce = false;
    }

    const profile =
      (rig.petGroup.userData.faceMotionProfile as MotionProfile | undefined) ??
      DEFAULT_FACE_PROFILE;
    const leftEyeBase = rig.leftEye?.userData.baseScale as
      | THREE.Vector3
      | undefined;
    const mouthBase = rig.mouth?.userData.baseScale as
      | THREE.Vector3
      | undefined;

    let stateChanged = false;
    if (previousState === null) {
      previousState = state;
      stateEnteredAt = t;
    } else if (previousState !== state) {
      stateChanged = true;
      stateBeforeEntry = previousState;
      previousState = state;
      stateEnteredAt = t;
      transitionY = rig.petGroup.position.y;
      transitionScaleX = rig.petGroup.scale.x;
      transitionScaleY = rig.petGroup.scale.y;
      transitionScaleZ = rig.petGroup.scale.z;
      transitionRotationY = normalizedAngle(rig.petGroup.rotation.y);
      transitionEyeX = rig.leftEye
        ? rig.leftEye.scale.x / (leftEyeBase?.x ?? 1)
        : 1;
      transitionEyeY = rig.leftEye
        ? rig.leftEye.scale.y / (leftEyeBase?.y ?? 1)
        : 1;
      transitionMouthY = rig.mouth
        ? rig.mouth.scale.y / (mouthBase?.y ?? 1)
        : 1;
      transitionLeftFlipperZ = rig.leftFlipper?.rotation.z ?? 0;
      transitionRightFlipperZ = rig.rightFlipper?.rotation.z ?? 0;
      transitionLeftFinZ = rig.leftFin?.rotation.z ?? 0;
      transitionRightFinZ = rig.rightFin?.rotation.z ?? 0;
      transitionLeftBrowZ = rig.leftBrow?.rotation.z ?? 0;
      transitionRightBrowZ = rig.rightBrow?.rotation.z ?? 0;
      transitionLeftBrowY = rig.leftBrow?.position.y ?? 0;
      transitionRightBrowY = rig.rightBrow?.position.y ?? 0;
      transitionCoreBrightness = lastCoreBrightness;
      transitionAccentBrightness = lastAccentBrightness;
      transitionEyeBrightness = lastEyeBrightness;
      transitionMouthBrightness = lastMouthBrightness;
      transitionEvolutionBrightness = lastEvolutionBrightness;
      transitionCoreIntensity = lastCoreIntensity;
      transitionAccentIntensity = lastAccentIntensity;
      transitionEyeIntensity = lastEyeIntensity;
      transitionMouthIntensity = lastMouthIntensity;
      transitionEvolutionIntensity = lastEvolutionIntensity;
      celebrationEntryHaloGlow = rig.haloGlowMat?.opacity ?? 0.75;
      celebrationEntryCoreGlow = rig.coreGlowMat?.opacity ?? 0.85;
    }
    // Normalise the subtraction so the same authored clip age is bit-for-bit
    // identical at small and large host-clock values (for example 1.35/101.35).
    const stateAge = Math.max(
      0,
      Math.round((t - stateEnteredAt) * 1_000_000) / 1_000_000,
    );
    const reducedMotion = frame.reducedMotion ?? false;
    const environmentWarmth = frame.environmentWarmth ?? 0;
    const decorationMotion = frame.decorationMotion ?? 1;
    const celebrating = state === "reward" || state === "levelUp";
    const rewardClipOwnsRoot = state === "reward" && stateAge < 1.1;
    const levelClipOwnsRoot = state === "levelUp" && stateAge < 1.8;
    const clipOwnsRoot = rewardClipOwnsRoot || levelClipOwnsRoot;

    if (clipOwnsRoot && reactionStartedAt > -Infinity) {
      reactionStartedAt = -Infinity;
      pendingBounce = false;
    }

    const resumedDecorations = wasReducedMotion && !reducedMotion;
    if (!hasDecorationTime) {
      decorationTime = animationTime;
      hasDecorationTime = true;
    } else if (!reducedMotion && !resumedDecorations) {
      decorationTime += deltaTime;
    }
    if (resumedDecorations) {
      decorationResumedAt = t;
      resumeHaloX = rig.halo?.rotation.x ?? 0;
      resumeHaloY = rig.halo?.rotation.y ?? 0;
      resumeHaloZ = rig.halo?.rotation.z ?? 0;
      resumeOrbitY = rig.orbitGroup?.rotation.y ?? 0;
      resumeOrbitZ = rig.orbitGroup?.rotation.z ?? 0;
      resumeLeftFinZ = rig.leftFin?.rotation.z ?? 0;
      resumeRightFinZ = rig.rightFin?.rotation.z ?? 0;
      resumeAuraScale = rig.aura?.scale.x ?? 1;
      resumeAuraOpacity = rig.auraMat?.opacity ?? 0;
    }
    const decorationResumeBlend = smoothstep(
      (t - decorationResumedAt) / 0.3,
    );

    if (!reducedMotion && !resumedDecorations) {
      const haloSpeed =
        state === "focus" ? 0.08 : celebrating ? 1.5 : 0.7;
      const orbitSpeed =
        state === "focus" ? 0.12 : celebrating ? 1.5 : 0.5;
      haloAngle += deltaTime * haloSpeed * decorationMotion;
      orbitAngle += deltaTime * orbitSpeed * decorationMotion;
    }

    const reactionAge = Math.max(0, t - reactionStartedAt);
    const reactionProgress = clamp01(reactionAge / 1.2);
    const reactionActive = reactionAge < 1.2;
    const reactionEase = reactionActive
      ? Math.sin(reactionProgress * Math.PI)
      : 0;
    const bounce =
      activeReaction === "bounce" && reactionActive && !clipOwnsRoot
        ? Math.exp(-1.8 * reactionAge) *
          Math.sin((Math.PI * reactionAge) / 1.2)
        : 0;
    const reactionLift =
      activeReaction !== "bounce" && reactionActive && !clipOwnsRoot
        ? reactionEase * 0.025
        : 0;

    let rootY = baseY + HOVER_BASELINE;
    let rootScaleX = 1;
    let rootScaleY = 1;
    let rootScaleZ = 1;
    let rootRotationY = 0;

    if (reducedMotion) {
      rootY += Math.sin(animationTime * (TWO_PI / 3.8)) * 0.003;
      rootRotationY = Math.sin(animationTime * (TWO_PI / 8.4)) * 0.01;
    } else if (state === "idle") {
      rootY += Math.sin(animationTime * (TWO_PI / 3.8)) * 0.018;
      const breath = Math.sin(animationTime * (TWO_PI / 5.2)) * 0.008;
      rootScaleY = 1 + breath;
      rootScaleX = rootScaleZ = 1 / Math.sqrt(rootScaleY);
      rootRotationY = idleYawAt(animationTime);

      const settleCycle = animationTime % SETTLE_MICRO.period;
      const settleStart = SETTLE_MICRO.period - SETTLE_MICRO.duration;
      if (!reactionActive && settleCycle >= settleStart) {
        const settle = Math.sin(
          ((settleCycle - settleStart) / SETTLE_MICRO.duration) * Math.PI,
        );
        rootY -= settle * 0.005;
        rootScaleX = lerp(rootScaleX, 1.016, settle);
        rootScaleY = lerp(rootScaleY, 0.975, settle);
        rootScaleZ = lerp(rootScaleZ, 1.016, settle);
      }

      if (stateBeforeEntry !== null && stateAge < 0.3) {
        const blend = smoothstep(stateAge / 0.3);
        rootY = lerp(transitionY, rootY, blend);
        rootScaleX = lerp(transitionScaleX, rootScaleX, blend);
        rootScaleY = lerp(transitionScaleY, rootScaleY, blend);
        rootScaleZ = lerp(transitionScaleZ, rootScaleZ, blend);
        rootRotationY = lerp(transitionRotationY, rootRotationY, blend);
      }
    } else if (state === "focus") {
      rootY =
        baseY +
        HOVER_BASELINE -
        0.008 +
        Math.sin(animationTime * (TWO_PI / 4.8)) * 0.01;
      const breath = Math.sin(animationTime * (TWO_PI / 5.6)) * 0.005;
      rootScaleY = 1 + breath;
      rootScaleX = rootScaleZ = 1 / Math.sqrt(rootScaleY);
      if (stateChanged || stateBeforeEntry !== null) {
        const blend = focusEntryBlend(stateAge);
        rootY = lerp(transitionY, rootY, blend);
        rootScaleX = lerp(transitionScaleX, rootScaleX, blend);
        rootScaleY = lerp(transitionScaleY, rootScaleY, blend);
        rootScaleZ = lerp(transitionScaleZ, rootScaleZ, blend);
        rootRotationY = lerp(transitionRotationY, 0, blend);
      }
    } else if (state === "reward") {
      if (stateAge <= 0.12) {
        const blend = smoothstep(stateAge / 0.12);
        rootY = lerp(transitionY, baseY + HOVER_BASELINE - 0.018, blend);
        rootScaleX = lerp(transitionScaleX, 1.035, blend);
        rootScaleY = lerp(transitionScaleY, 0.945, blend);
        rootScaleZ = lerp(transitionScaleZ, 1.035, blend);
        rootRotationY = lerp(transitionRotationY, 0, blend);
      } else if (stateAge <= 0.35) {
        const u = smoothstep((stateAge - 0.12) / 0.23);
        rootY = baseY + HOVER_BASELINE + lerp(-0.018, 0.15, u);
        rootScaleX = rootScaleZ = lerp(1.035, 0.96, u);
        rootScaleY = lerp(0.945, 1.09, u);
      } else if (stateAge <= 0.58) {
        const u = smoothstep((stateAge - 0.35) / 0.23);
        rootY = baseY + HOVER_BASELINE + lerp(0.15, 0, u);
        rootScaleX = rootScaleZ = lerp(0.96, 1.07, u);
        rootScaleY = lerp(1.09, 0.9, u);
      } else if (stateAge <= 0.82) {
        const u = (stateAge - 0.58) / 0.24;
        const settleEntry = smoothstep(u);
        rootY =
          baseY +
          HOVER_BASELINE +
          Math.sin(clamp01(u) * Math.PI) * 0.035 +
          settleEntry * 0.008;
        const reboundSettle = easeOutCubic(u);
        rootScaleX = rootScaleZ = lerp(1.07, 1.012, reboundSettle);
        rootScaleY = lerp(0.9, 0.982, reboundSettle);
      } else if (stateAge < 1.1) {
        const remaining = 1 - easeOutCubic((stateAge - 0.82) / 0.28);
        rootY = baseY + HOVER_BASELINE + remaining * 0.008;
        rootScaleX = rootScaleZ = 1 + remaining * 0.012;
        rootScaleY = 1 - remaining * 0.018;
      }
    } else {
      if (stateAge <= 0.16) {
        const blend = smoothstep(stateAge / 0.16);
        rootY = lerp(transitionY, baseY + HOVER_BASELINE - 0.022, blend);
        rootScaleX = lerp(transitionScaleX, 1.045, blend);
        rootScaleY = lerp(transitionScaleY, 0.93, blend);
        rootScaleZ = lerp(transitionScaleZ, 1.045, blend);
        rootRotationY = lerp(transitionRotationY, 0, blend);
      } else if (stateAge <= 0.39) {
        const u = smoothstep((stateAge - 0.16) / 0.23);
        rootY = baseY + HOVER_BASELINE + lerp(-0.022, 0.19, u);
        rootScaleX = rootScaleZ = lerp(1.045, 0.94, u);
        rootScaleY = lerp(0.93, 1.12, u);
      } else if (stateAge <= 0.62) {
        const u = smoothstep((stateAge - 0.39) / 0.23);
        rootY = baseY + HOVER_BASELINE + lerp(0.19, 0, u);
        rootScaleX = rootScaleZ = lerp(0.94, 1.1, u);
        rootScaleY = lerp(1.12, 0.88, u);
      } else if (stateAge <= 0.98) {
        const u = (stateAge - 0.62) / 0.36;
        rootY =
          baseY + HOVER_BASELINE + Math.sin(clamp01(u) * Math.PI) * 0.045;
        const settle = easeOutCubic(u);
        rootScaleX = rootScaleZ = lerp(1.1, 1, settle);
        rootScaleY = lerp(0.88, 1, settle);
      } else if (stateAge < 1.8) {
        rootY =
          baseY + HOVER_BASELINE + easeOutCubic((stateAge - 0.98) / 0.82) * 0.012;
      } else {
        rootY = baseY + HOVER_BASELINE + 0.012;
      }
      rootRotationY =
        stateAge <= 0.18
          ? 0
          : TWO_PI * easeInOutCubic((stateAge - 0.18) / 0.9);
    }

    if (!reducedMotion && !clipOwnsRoot) {
      rootY += bounce * 0.38 + reactionLift;
      rootScaleX += bounce * 0.26;
      rootScaleY += bounce * 0.38;
      rootScaleZ -= bounce * 0.18;
    }

    rig.petGroup.position.y = rootY;
    rig.petGroup.scale.set(rootScaleX, rootScaleY, rootScaleZ);
    rig.petGroup.rotation.y = rootRotationY;
    rig.petGroup.rotation.x =
      !reducedMotion && activeReaction === "nod" && reactionActive && !clipOwnsRoot
        ? Math.sin(reactionProgress * Math.PI * 2) * reactionEase * 0.12
        : 0;
    rig.petGroup.rotation.z =
      !reducedMotion && activeReaction === "tilt" && reactionActive && !clipOwnsRoot
        ? reactionEase * 0.16
        : !reducedMotion && mood === "curious"
          ? Math.sin(animationTime * 0.7) * 0.055
          : 0;

    const signal = celebrationSignal(state, stateAge, reducedMotion);
    const focusPulse =
      state === "focus"
        ? Math.sin(animationTime * (TWO_PI / 1.85)) * 0.5 + 0.5
        : 0;
    let coreBrightness =
      0.9 + focusPulse * 0.1 + signal * 0.22 + environmentWarmth * 0.04;
    let accentBrightness = 0;
    let eyeBrightness =
      (state === "focus" ? 0.94 : 0.9) + signal * 0.2;
    let mouthBrightness = 0.84 + signal * 0.24;
    let evolutionBrightness =
      0.84 + levelTier * 0.04 + streakBoost * 0.05 + signal * 0.18;
    let coreIntensity =
      (glowBase + focusPulse * 0.25 + signal * 0.8 + environmentWarmth * 0.18) *
      TONE_BOOST;
    let eyeIntensity =
      (state === "focus" ? 1.05 : celebrating ? 1.15 : 0.72) *
      TONE_BOOST *
      (1 + environmentWarmth * 0.08);
    let mouthIntensity =
      (0.46 + signal * 0.42 + environmentWarmth * 0.14) * TONE_BOOST;
    let evolutionIntensity =
      (0.42 + levelTier * 0.12 + streakBoost * 0.16 + signal * 0.4) *
      TONE_BOOST;
    if (reducedMotion && stateBeforeEntry !== null && stateAge < 0.16) {
      const colourBlend = easeOutCubic(stateAge / 0.16);
      coreBrightness = lerp(
        transitionCoreBrightness,
        coreBrightness,
        colourBlend,
      );
      eyeBrightness = lerp(
        transitionEyeBrightness,
        eyeBrightness,
        colourBlend,
      );
      mouthBrightness = lerp(
        transitionMouthBrightness,
        mouthBrightness,
        colourBlend,
      );
      evolutionBrightness = lerp(
        transitionEvolutionBrightness,
        evolutionBrightness,
        colourBlend,
      );
      coreIntensity = lerp(
        transitionCoreIntensity,
        coreIntensity,
        colourBlend,
      );
      eyeIntensity = lerp(
        transitionEyeIntensity,
        eyeIntensity,
        colourBlend,
      );
      mouthIntensity = lerp(
        transitionMouthIntensity,
        mouthIntensity,
        colourBlend,
      );
      evolutionIntensity = lerp(
        transitionEvolutionIntensity,
        evolutionIntensity,
        colourBlend,
      );
    }
    applyEnergyMaterial(
      rig.coreMat,
      coreBrightness,
      coreIntensity,
    );
    const accentPulse =
      Math.sin(animationTime * (TWO_PI / (state === "focus" ? 1.85 : 3.4))) *
        0.5 +
      0.5;
    accentBrightness = 0.86 + accentPulse * 0.1 + signal * 0.2;
    let accentIntensity =
      (glowBase + accentPulse * (0.18 + streakBoost * 0.25) + signal * 0.9) *
      TONE_BOOST;
    if (reducedMotion && stateBeforeEntry !== null && stateAge < 0.16) {
      const colourBlend = easeOutCubic(stateAge / 0.16);
      accentBrightness = lerp(
        transitionAccentBrightness,
        accentBrightness,
        colourBlend,
      );
      accentIntensity = lerp(
        transitionAccentIntensity,
        accentIntensity,
        colourBlend,
      );
    }
    applyEnergyMaterial(
      rig.accentMat,
      accentBrightness,
      accentIntensity,
    );
    applyEnergyMaterial(
      rig.eyeMat,
      eyeBrightness,
      eyeIntensity,
    );
    applyEnergyMaterial(
      rig.mouthMat,
      mouthBrightness,
      mouthIntensity,
    );
    applyEnergyMaterial(
      rig.evolutionMat,
      evolutionBrightness,
      evolutionIntensity,
    );
    lastCoreBrightness = coreBrightness;
    lastAccentBrightness = accentBrightness;
    lastEyeBrightness = eyeBrightness;
    lastMouthBrightness = mouthBrightness;
    lastEvolutionBrightness = evolutionBrightness;
    lastCoreIntensity = coreIntensity;
    lastAccentIntensity = accentIntensity;
    lastEyeIntensity = eyeIntensity;
    lastMouthIntensity = mouthIntensity;
    lastEvolutionIntensity = evolutionIntensity;

    if (rig.haloGlowMat || rig.coreGlowMat) {
      const ambientGlow =
        state === "focus"
          ? 0.55 + focusPulse * 0.25
          : 0.35 + accentPulse * 0.2;
      const haloGlow = celebrating
        ? reducedMotion
          ? lerp(celebrationEntryHaloGlow, 1, signal)
          : 0.75 + signal * 0.25
        : ambientGlow;
      const coreGlow =
        celebrating && reducedMotion
          ? lerp(celebrationEntryCoreGlow, 1, signal)
          : Math.min(1, haloGlow + 0.1);
      if (rig.haloGlowMat) rig.haloGlowMat.opacity = haloGlow;
      if (rig.coreGlowMat) rig.coreGlowMat.opacity = coreGlow;
    }

    let eyeX = 1;
    let eyeY = 1;
    let mouthY = 0.62;
    if (state === "focus") {
      eyeX = profile.focus.eyeScaleX;
      eyeY = profile.focus.eyeScaleY;
      mouthY = profile.focus.mouthScaleY ?? mouthY;
    } else if (state === "reward") {
      eyeX = profile.reward.eyeScaleX;
      eyeY = profile.reward.eyeScaleY;
      mouthY = profile.reward.mouthScaleY ?? mouthY;
    } else if (state === "levelUp") {
      eyeX = profile.levelUp.eyeScaleX;
      eyeY = profile.levelUp.eyeScaleY;
      mouthY = profile.levelUp.mouthScaleY ?? mouthY;
    } else if (mood === "sleepy") {
      eyeY = 0.48;
      mouthY = 0.2;
    } else if (mood === "proud") {
      eyeY = 0.82;
      mouthY = 1;
    } else if (mood === "curious") {
      eyeY = 1.05;
      mouthY = 0.42;
    } else if (profile.blinkScaleY !== null) {
      eyeY = blinkRatioAt(animationTime, profile.blinkScaleY);
    }

    let expressionBlend = 1;
    if (stateBeforeEntry !== null) {
      const duration = reducedMotion
        ? 0.16
        : state === "focus"
          ? 0.4
          : state === "idle"
            ? 0.3
            : state === "reward"
              ? 0.12
              : 0.16;
      expressionBlend =
        state === "focus" && !reducedMotion
          ? focusEntryBlend(stateAge)
          : easeOutCubic(stateAge / duration);
      eyeX = lerp(transitionEyeX, eyeX, expressionBlend);
      eyeY = lerp(transitionEyeY, eyeY, expressionBlend);
      mouthY = lerp(transitionMouthY, mouthY, expressionBlend);
    }

    if (rig.leftEye && rig.rightEye) {
      const rightEyeBase = rig.rightEye.userData.baseScale as
        | THREE.Vector3
        | undefined;
      rig.leftEye.scale.set(
        (leftEyeBase?.x ?? 1) * eyeX,
        (leftEyeBase?.y ?? 1) * eyeY,
        leftEyeBase?.z ?? 1,
      );
      rig.rightEye.scale.set(
        (rightEyeBase?.x ?? 1) * eyeX,
        (rightEyeBase?.y ?? 1) * (mood === "curious" ? eyeY * 0.9 : eyeY),
        rightEyeBase?.z ?? 1,
      );
    }

    if (rig.leftPupil && rig.rightPupil) {
      const faceStyle = String(rig.petGroup.userData.faceStyle ?? "classic");
      const dartAllowed = faceStyle !== "joy" && faceStyle !== "screen";
      const dartCycle = animationTime % EYE_DART_MICRO.period;
      const dartDirection =
        Math.floor(animationTime / EYE_DART_MICRO.period) % 2 === 0 ? 1 : -1;
      const dart =
        !reducedMotion &&
        state === "idle" &&
        dartAllowed &&
        dartCycle < EYE_DART_MICRO.duration
          ? Math.sin((dartCycle / EYE_DART_MICRO.duration) * Math.PI) *
            EYE_DART_MICRO.offset *
            dartDirection
          : 0;
      const glance = reducedMotion
        ? 0
        : Math.sin(animationTime * 0.43) * 0.014 * decorationMotion + dart;
      const lift = mood === "curious" ? 0.008 : mood === "sleepy" ? -0.012 : 0;
      const leftBase = rig.leftPupil.userData.basePosition as
        | THREE.Vector3
        | undefined;
      const rightBase = rig.rightPupil.userData.basePosition as
        | THREE.Vector3
        | undefined;
      if (leftBase && rightBase) {
        rig.leftPupil.position.set(
          leftBase.x + glance,
          leftBase.y + lift,
          leftBase.z,
        );
        rig.rightPupil.position.set(
          rightBase.x + glance,
          rightBase.y + lift,
          rightBase.z,
        );
      }
    }

    if (rig.leftBrow && rig.rightBrow) {
      const leftBase = Number(rig.leftBrow.userData.baseRotationZ ?? 0);
      const rightBase = Number(rig.rightBrow.userData.baseRotationZ ?? 0);
      const leftY = Number(rig.leftBrow.userData.baseY ?? rig.leftBrow.position.y);
      const rightY = Number(
        rig.rightBrow.userData.baseY ?? rig.rightBrow.position.y,
      );
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
      const leftTargetY = leftY + yOffset;
      const rightTargetY = rightY + yOffset;
      rig.leftBrow.rotation.z =
        stateBeforeEntry === null
          ? leftAngle
          : lerp(transitionLeftBrowZ, leftAngle, expressionBlend);
      rig.rightBrow.rotation.z =
        stateBeforeEntry === null
          ? rightAngle
          : lerp(transitionRightBrowZ, rightAngle, expressionBlend);
      rig.leftBrow.position.y =
        stateBeforeEntry === null
          ? leftTargetY
          : lerp(transitionLeftBrowY, leftTargetY, expressionBlend);
      rig.rightBrow.position.y =
        stateBeforeEntry === null
          ? rightTargetY
          : lerp(transitionRightBrowY, rightTargetY, expressionBlend);
    }

    if (rig.mouth) {
      rig.mouth.scale.set(
        (mouthBase?.x ?? 1) * (celebrating ? 1.12 : mood === "curious" ? 0.88 : 1),
        (mouthBase?.y ?? 1) * mouthY,
        mouthBase?.z ?? 1,
      );
      const baseRotation = rig.mouth.userData.baseRotation as
        | THREE.Euler
        | undefined;
      rig.mouth.rotation.z =
        (baseRotation?.z ?? Math.PI) +
        (!reducedMotion && mood === "curious"
          ? Math.sin(animationTime * 0.7) * 0.08
          : 0);
    }

    if (rig.leftFlipper && rig.rightFlipper) {
      const leftBase = Number(
        rig.leftFlipper.userData.baseRotationZ ?? rig.leftFlipper.rotation.z,
      );
      const rightBase = Number(
        rig.rightFlipper.userData.baseRotationZ ?? rig.rightFlipper.rotation.z,
      );
      rig.leftFlipper.userData.baseRotationZ = leftBase;
      rig.rightFlipper.userData.baseRotationZ = rightBase;
      let outward = 0;
      let focusTuck = 0;
      if (!reducedMotion) {
        if (state === "reward") {
          outward =
            Math.sin(clamp01((stateAge - 0.07) / 0.46) * Math.PI) * 0.38;
        } else if (state === "levelUp") {
          outward =
            Math.sin(clamp01((stateAge - 0.09) / 0.62) * Math.PI) * 0.42;
        } else if (state === "focus") {
          focusTuck = 0.18 * focusEntryBlend(stateAge);
        } else {
          const idleCycle = animationTime % 11;
          if (idleCycle > 8 && idleCycle < 9.3) {
            outward = Math.sin(((idleCycle - 8) / 1.3) * Math.PI) * 0.12;
          }
        }
        if (activeReaction === "wave" && reactionActive && !clipOwnsRoot) {
          outward +=
            Math.abs(Math.sin(reactionProgress * Math.PI * 5)) *
            reactionEase *
            0.4;
        }
      }
      const leftTarget = leftBase + outward - focusTuck;
      const rightTarget = rightBase - outward + focusTuck;
      rig.leftFlipper.rotation.z =
        stateBeforeEntry === null
          ? leftTarget
          : lerp(transitionLeftFlipperZ, leftTarget, expressionBlend);
      rig.rightFlipper.rotation.z =
        stateBeforeEntry === null
          ? rightTarget
          : lerp(transitionRightFlipperZ, rightTarget, expressionBlend);
    }

    if (rig.leftFin && rig.rightFin) {
      const leftBase = Number(
        rig.leftFin.userData.motionBaseRotationZ ?? rig.leftFin.rotation.z,
      );
      const rightBase = Number(
        rig.rightFin.userData.motionBaseRotationZ ?? rig.rightFin.rotation.z,
      );
      rig.leftFin.userData.motionBaseRotationZ = leftBase;
      rig.rightFin.userData.motionBaseRotationZ = rightBase;
      let flare = 0;
      let focusFold = 0;
      if (!reducedMotion) {
        if (state === "reward") {
          flare =
            Math.sin(clamp01((stateAge - 0.16) / 0.46) * Math.PI) * 0.32;
        } else if (state === "levelUp") {
          flare =
            stateAge <= 0.71
              ? easeOutCubic((stateAge - 0.18) / 0.53) * 0.38
              : (1 - easeOutCubic((stateAge - 0.71) / 1.09)) * 0.38;
        } else if (state === "focus") {
          focusFold = -0.18 * focusEntryBlend(stateAge);
        } else {
          flare = Math.sin(decorationTime * 0.8) * 0.025;
        }
      }
      const leftTarget = leftBase - flare - focusFold;
      const rightTarget = rightBase + flare + focusFold;
      const leftPose =
        stateBeforeEntry === null
          ? leftTarget
          : lerp(transitionLeftFinZ, leftTarget, expressionBlend);
      const rightPose =
        stateBeforeEntry === null
          ? rightTarget
          : lerp(transitionRightFinZ, rightTarget, expressionBlend);
      rig.leftFin.rotation.z = reducedMotion
        ? leftPose
        : lerp(resumeLeftFinZ, leftPose, decorationResumeBlend);
      rig.rightFin.rotation.z = reducedMotion
        ? rightPose
        : lerp(resumeRightFinZ, rightPose, decorationResumeBlend);
    }

    if (rig.orbitGroup && !reducedMotion) {
      const targetY = Math.sin(decorationTime * 0.7) * 0.04;
      rig.orbitGroup.rotation.z = lerp(
        resumeOrbitZ,
        orbitAngle,
        decorationResumeBlend,
      );
      rig.orbitGroup.rotation.y = lerp(
        resumeOrbitY,
        targetY,
        decorationResumeBlend,
      );
    }

    if (rig.aura && rig.auraMat) {
      const baseAuraScale = Number(
        rig.aura.userData.motionBaseScale ?? rig.aura.scale.x,
      );
      rig.aura.userData.motionBaseScale = baseAuraScale;
      const pulse =
        reducedMotion ? 0 : (Math.sin(decorationTime * 1.8) + 1) * 0.5;
      const levelAuraSignal =
        state === "levelUp" && !reducedMotion
          ? stateAge <= 0.7
            ? easeOutCubic(stateAge / 0.7)
            : 1 - easeOutCubic((stateAge - 0.7) / 1.1)
          : signal;
      const auraScale =
        levelTier < 3
          ? 0.94
          : baseAuraScale *
              (1 +
                pulse * 0.035 +
                (reducedMotion ? 0 : levelAuraSignal * 0.1));
      rig.aura.scale.setScalar(
        reducedMotion
          ? auraScale
          : lerp(resumeAuraScale, auraScale, decorationResumeBlend),
      );
      const baseOpacity =
        levelTier >= 3 ? 0.1 : 0.025 + streakBoost * 0.045;
      const opacity =
        baseOpacity +
        (reducedMotion ? 0 : pulse * 0.015) +
        levelAuraSignal * 0.055;
      const auraOpacity =
        levelTier >= 3 ? Math.max(0.1, opacity) : Math.min(0.09, opacity);
      rig.auraMat.opacity = reducedMotion
        ? auraOpacity
        : lerp(resumeAuraOpacity, auraOpacity, decorationResumeBlend);
    }

    if (rig.halo && !reducedMotion) {
      const levelTurn =
        state === "levelUp"
          ? TWO_PI * easeInOutCubic((stateAge - 0.18) / 0.9)
          : 0;
      const delayedLevelTurn =
        state === "levelUp"
          ? TWO_PI *
            easeInOutCubic((stateAge - HALO_LAG_SECONDS - 0.18) / 0.9)
          : 0;
      const targetX = 1.05 + Math.sin(decorationTime * 0.8) * 0.05;
      const idleLag =
        !reducedMotion && state === "idle"
          ? idleYawAt(decorationTime - HALO_LAG_SECONDS) -
            idleYawAt(decorationTime)
          : 0;
      const targetY =
        0.12 +
        idleLag +
        delayedLevelTurn -
        levelTurn;
      const targetZ = -0.16 + haloAngle;
      rig.halo.rotation.x = lerp(
        resumeHaloX,
        targetX,
        decorationResumeBlend,
      );
      rig.halo.rotation.y = lerp(
        resumeHaloY,
        targetY,
        decorationResumeBlend,
      );
      rig.halo.rotation.z = lerp(
        resumeHaloZ,
        targetZ,
        decorationResumeBlend,
      );
    }

    clipOwnedRootOnLastFrame = clipOwnsRoot;
    wasReducedMotion = reducedMotion;
  }

  return { apply, react, playBounce, poke, glowBase, streakBoost };
}
