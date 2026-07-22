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
const EMPTY_FRAME_OPTIONS: Readonly<PetMotionFrameOptions> = Object.freeze({});
type CompanionSurfaceMaterial =
  | THREE.MeshBasicMaterial
  | THREE.MeshStandardMaterial;

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
  eyeMat?: CompanionSurfaceMaterial | null;
  mouthMat?: CompanionSurfaceMaterial | null;
  coreMat?: CompanionSurfaceMaterial | null;
  accentMat?: CompanionSurfaceMaterial | null;
  haloGlowMat?: THREE.SpriteMaterial | null;
  coreGlowMat?: THREE.SpriteMaterial | null;
  evolutionMat?: CompanionSurfaceMaterial | null;
  auraMat?: THREE.MeshBasicMaterial | null;
}

// Fake-bloom sprite opacity per state. Idle/focus pulse sinusoidally off the
// shared animation clock; reward/levelUp flare to 1.0 then ease to baseline.
// Chest dot runs CORE_HOTTER above the halo (clamped to 1). All tunable here.
const GLOW_PULSE = {
  idle: { min: 0.35, max: 0.55, period: 2.8 },
  focus: { min: 0.55, max: 0.8, period: 1.6 },
  celebrate: { baseline: 0.75, flareDuration: 0.7 },
  coreHotter: 0.1,
};

// Idle hover tuning. The pet's rest pose sits its feet on the pod (petGroup
// origin ≈ world y=0, pod/contact surface ≈ y=0.08–0.096). HOVER_BASELINE
// lifts the whole bob so even its LOWEST point keeps daylight above the pod
// top; amplitudes stay gentle. Invariant: HOVER_BASELINE − bobAmp must stay
// comfortably positive (never sink toward the platform).
const HOVER_BASELINE = 0.04;
const BOB_AMP = { idle: 0.02, focus: 0.014, sleepy: 0.012 };

// Flipper wave tuning. Waves are rectified so they only ever swing OUTWARD
// from the resting pose (left rest = +z, right rest = −z ⇒ outward is +z for
// left / −z for right); this guarantees a flipper never rotates inward across
// the torso, which was the source of the clipping. Amplitudes are conservative
// — a subtle wave is preferred over any body intersection.
const FLIPPER_WAVE = { celebrate: 0.32, reaction: 0.4 };

// Idle micro-motions: a rare "settle" squash-and-recover, a quick pupil
// dart, and the halo trailing the body sway. Periods are deliberately
// non-round so the beats don't sync with the bob/blink cycles.
export const SETTLE_MICRO = { period: 16.3, duration: 0.9, squash: 0.03 };
export const EYE_DART_MICRO = { period: 9.7, duration: 0.22, offset: 0.01 };
// The halo is light jewellery: it lags the body sway by ~120ms, which sells
// mass without a physics sim.
export const HALO_LAG_SECONDS = 0.12;

// Module-level (not a per-frame closure): the ambient yaw sway at a given
// time. Focus locks the body forward, so sway is zero there.
const swayAt = (
  time: number,
  focused: boolean,
  ambientStrength: number,
  decorationMotion: number,
) =>
  focused ? 0 : Math.sin(time * 0.48) * 0.2 * ambientStrength * decorationMotion;

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
  let hasFrameTime = false;
  let animationTime = 0;
  let reactionStartedAt = -Infinity;
  let activeReaction: CompanionReaction = "bounce";
  let pendingBounce = false;
  let glowFlareStartedAt = -Infinity;
  let wasCelebrating = false;

  function playBounce() {
    activeReaction = "bounce";
    reactionStartedAt = lastTime;
    pendingBounce = !hasFrameTime;
  }

  function react(reaction: CompanionReaction) {
    if (reaction === "bounce") {
      playBounce();
      return;
    }
    activeReaction = reaction;
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
    frame: PetMotionFrameOptions = EMPTY_FRAME_OPTIONS
  ) {
    const deltaTime = hasFrameTime
      ? Math.max(0, Math.min(0.1, t - lastTime))
      : 0;
    if (!hasFrameTime) animationTime = t;
    hasFrameTime = true;
    lastTime = t;
    if (deltaTime > 0) animationTime += deltaTime;
    if (pendingBounce) {
      reactionStartedAt = t;
      pendingBounce = false;
    }
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
    const bounceElapsed = Math.max(0, t - reactionStartedAt);
    const bounceActive = activeReaction === "bounce" && bounceElapsed < 1.2;
    const bounceSpring = bounceActive
      ? Math.exp(-1.8 * bounceElapsed) *
        Math.sin((Math.PI * bounceElapsed) / 1.2)
      : 0;
    const bounceImpact = bounceActive ? Math.exp(-18 * bounceElapsed) : 0;
    const reactionLift = activeReaction === "bounce" ? 0 : reactionEase * 0.025;
    const ambientStrength = reducedMotion ? 0.22 : 1;
    const breathing =
      Math.sin(animationTime * 1.25) * 0.009 * ambientStrength;

    // Bob: gentle idle float, calmer in focus, bouncy when celebrating
    if (celebrating && !reducedMotion) {
      // Ride the hover baseline so the bottom of each celebration bounce lands
      // at hover height (never feet-in-pod), matching the idle/focus/sleepy bobs.
      petGroup.position.y =
        baseY + HOVER_BASELINE + Math.abs(Math.sin(animationTime * 3.2)) * 0.1;
    } else {
      const bobAmp =
        (state === "focus"
          ? BOB_AMP.focus
          : mood === "sleepy"
            ? BOB_AMP.sleepy
            : BOB_AMP.idle) * ambientStrength;
      const bobFreq = state === "focus" ? 2.0 : 1.6;
      petGroup.position.y =
        baseY + HOVER_BASELINE + Math.sin(animationTime * bobFreq) * bobAmp;
    }
    petGroup.position.y +=
      bounceSpring * (reducedMotion ? 0.07 : 0.38) + reactionLift;

    // Sway faces mostly forward; celebrations spin, then ease back to front
    if (state === "levelUp" && !reducedMotion) {
      rewardSpin += deltaTime * 3.6;
    } else if (rewardSpin % TWO_PI !== 0) {
      const target = Math.round(rewardSpin / TWO_PI) * TWO_PI;
      const returnAlpha = 1 - Math.exp(-5 * deltaTime);
      rewardSpin = THREE.MathUtils.lerp(rewardSpin, target, returnAlpha);
      if (Math.abs(target - rewardSpin) < 0.001) rewardSpin = target;
    }
    const focused = state === "focus";
    const sway = swayAt(
      animationTime,
      focused,
      ambientStrength,
      decorationMotion,
    );
    petGroup.rotation.y = sway + rewardSpin;
    const moodTilt =
      mood === "curious"
        ? Math.sin(animationTime * 0.7) * 0.055 * ambientStrength
        : 0;
    const interactionTilt =
      activeReaction === "tilt" ? reactionEase * 0.16 : 0;
    petGroup.rotation.x =
      activeReaction === "nod"
        ? Math.sin(reactionProgress * Math.PI * 2) * reactionEase * 0.12
        : 0;
    petGroup.rotation.z = moodTilt + interactionTilt;

    // Level-up celebration adds a scale pulse
    const levelScale =
      state === "levelUp" && !reducedMotion
        ? Math.sin(animationTime * 6) * 0.05
        : 0;
    const scale = 1 + levelScale;
    const bounceStrength = reducedMotion ? 0.35 : 1;
    const squash =
      (bounceSpring * 0.26 + bounceImpact * 0.1) * bounceStrength;
    const stretch =
      (bounceSpring * 0.38 - bounceImpact * 0.08) * bounceStrength;
    const depthCompression =
      (bounceImpact * 0.06 - bounceSpring * 0.18) * bounceStrength;
    // Rare idle settle: a soft squash-and-recover, like shifting weight.
    const settleCycle = animationTime % SETTLE_MICRO.period;
    const settleStart = SETTLE_MICRO.period - SETTLE_MICRO.duration;
    const settleEase =
      state === "idle" && !reacting && settleCycle > settleStart
        ? Math.sin(
            ((settleCycle - settleStart) / SETTLE_MICRO.duration) * Math.PI
          ) *
          ambientStrength
        : 0;
    const settleSquash = settleEase * SETTLE_MICRO.squash;
    petGroup.scale.set(
      scale + squash + settleSquash * 0.65,
      scale + breathing + stretch - settleSquash,
      scale + depthCompression + settleSquash * 0.65
    );
    petGroup.position.y -= settleEase * 0.008;

    // Energy core heartbeat: quickens in focus, flashes on celebration.
    if (rig.coreMat instanceof THREE.MeshStandardMaterial) {
      rig.coreMat.emissiveIntensity =
        (glowBase +
          Math.sin(animationTime * (state === "focus" ? 3.4 : 1.6)) * 0.15 +
          (celebrating ? 0.8 : 0) +
          environmentWarmth * 0.18) *
        TONE_BOOST;
    }

    // Halo + pod ring glow: subtle at rest, streaks deepen, celebrations flash
    if (rig.accentMat instanceof THREE.MeshStandardMaterial) {
      rig.accentMat.emissiveIntensity =
        (glowBase +
          Math.sin(animationTime * (state === "focus" ? 3.0 : 1.8)) *
            (0.18 + streakBoost * 0.25) +
          (celebrating ? 0.9 : 0) +
          environmentWarmth * 0.12) *
        TONE_BOOST;
    }

    // Fake-bloom sprites: sinusoidal at idle/focus (phase-locked to the shared
    // clock), flaring to 1.0 and easing back on reward/level-up wins.
    if (rig.haloGlowMat || rig.coreGlowMat) {
      if (celebrating && !wasCelebrating) glowFlareStartedAt = t;
      let haloGlow: number;
      if (celebrating) {
        const { baseline, flareDuration } = GLOW_PULSE.celebrate;
        const flare = Math.max(0, 1 - (t - glowFlareStartedAt) / flareDuration);
        haloGlow = baseline + (1 - baseline) * flare * flare;
      } else {
        const c = state === "focus" ? GLOW_PULSE.focus : GLOW_PULSE.idle;
        const wave = Math.sin(animationTime * (TWO_PI / c.period)) * 0.5 + 0.5;
        haloGlow = c.min + (c.max - c.min) * wave;
      }
      if (rig.haloGlowMat) rig.haloGlowMat.opacity = haloGlow;
      if (rig.coreGlowMat) {
        rig.coreGlowMat.opacity = Math.min(1, haloGlow + GLOW_PULSE.coreHotter);
      }
    }
    wasCelebrating = celebrating;

    // Eyes carry the expression: focus narrows, reward soft-squints, level-up
    // opens wide. Idle retains the occasional quick blink.
    if (rig.eyeMat instanceof THREE.MeshStandardMaterial) {
      rig.eyeMat.emissiveIntensity =
        (state === "focus" ? 1.05 : celebrating ? 1.15 : 0.72) *
        TONE_BOOST *
        (1 + environmentWarmth * 0.08);
    }
    if (rig.leftEye && rig.rightEye) {
      const blinkPhase = animationTime % 4.7;
      const doubleBlink = Math.floor(animationTime / 4.7) % 3 === 2;
      const blinking =
        state === "idle" &&
        (blinkPhase > 4.56 || (doubleBlink && blinkPhase > 4.28 && blinkPhase < 4.4));
      const blink = blinking ? 0.1 : 1;
      const expressionY =
        state === "focus"
          ? 0.7
          : state === "reward"
            ? 0.78 + Math.sin(animationTime * 7) * 0.06
            : state === "levelUp"
              ? 1.14
              : mood === "sleepy"
                ? 0.48
                : mood === "proud"
                  ? 0.82 + Math.sin(animationTime * 2.4) * 0.03
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
      // Quick micro-dart layered over the slow glance; direction alternates
      // per cycle so it reads as curiosity, not a tic.
      const dartCycle = animationTime % EYE_DART_MICRO.period;
      const dartDirection =
        Math.floor(animationTime / EYE_DART_MICRO.period) % 2 === 0 ? 1 : -1;
      const dart =
        state === "idle" && dartCycle < EYE_DART_MICRO.duration
          ? Math.sin((dartCycle / EYE_DART_MICRO.duration) * Math.PI) *
            EYE_DART_MICRO.offset *
            dartDirection *
            ambientStrength
          : 0;
      const glance =
        Math.sin(animationTime * 0.43) *
          0.014 *
          ambientStrength *
          decorationMotion +
        dart;
      const lift = mood === "curious" ? 0.008 : mood === "sleepy" ? -0.012 : 0;
      const leftBase =
        (rig.leftPupil.userData.basePosition as THREE.Vector3 | undefined) ??
        rig.leftPupil.position;
      const rightBase =
        (rig.rightPupil.userData.basePosition as THREE.Vector3 | undefined) ??
        rig.rightPupil.position;
      rig.leftPupil.position.set(
        leftBase.x + glance,
        leftBase.y + lift,
        leftBase.z
      );
      rig.rightPupil.position.set(
        rightBase.x + glance,
        rightBase.y + lift,
        rightBase.z
      );
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
        Math.PI +
        (mood === "curious" ? Math.sin(animationTime * 0.7) * 0.08 : 0);
    }

    if (rig.mouthMat instanceof THREE.MeshStandardMaterial) {
      rig.mouthMat.emissiveIntensity =
        (0.46 + (celebrating ? 0.42 : 0) + environmentWarmth * 0.14) *
        TONE_BOOST;
    }

    // Flippers make state changes legible even when the face is small.
    if (rig.leftFlipper && rig.rightFlipper) {
      const leftBase = Number(rig.leftFlipper.userData.baseRotationZ ?? 0);
      const rightBase = Number(rig.rightFlipper.userData.baseRotationZ ?? 0);
      // Rectified (abs) ⇒ outward-only swing; magnitude added on the outward
      // side of each rest angle (+ for left, − for right) so the flipper never
      // crosses inward into the torso.
      const stateWave =
        celebrating && !reducedMotion
          ? Math.abs(Math.sin(animationTime * 8)) * FLIPPER_WAVE.celebrate
          : 0;
      const reactionWave =
        activeReaction === "wave"
          ? Math.abs(Math.sin(reactionProgress * Math.PI * 5)) *
            reactionEase *
            FLIPPER_WAVE.reaction
          : 0;
      const idleCycle = animationTime % 11;
      const stretch =
        state === "idle" && idleCycle > 8 && idleCycle < 9.3
          ? Math.sin(((idleCycle - 8) / 1.3) * Math.PI) * 0.12 * ambientStrength
          : 0;
      const focusTuck = state === "focus" ? 0.18 : 0;
      const outward = stateWave + reactionWave;
      rig.leftFlipper.rotation.z = leftBase + outward + stretch - focusTuck;
      rig.rightFlipper.rotation.z =
        rightBase - outward - stretch * 0.45 + focusTuck;
    }

    // Evolution fins breathe at rest, tuck into focus, and flare for wins.
    if (rig.leftFin && rig.rightFin) {
      const flare = celebrating
        ? 0.32 + Math.sin(animationTime * 7) * 0.12
        : 0;
      const focusFold = state === "focus" ? -0.18 : 0;
      rig.leftFin.rotation.z = -0.9 - flare - focusFold;
      rig.rightFin.rotation.z = 0.9 + flare + focusFold;
    }

    if (rig.evolutionMat instanceof THREE.MeshStandardMaterial) {
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
      rig.orbitGroup.rotation.z = animationTime * speed;
      rig.orbitGroup.rotation.y = Math.sin(animationTime * 0.7) * 0.04;
    }

    // Streak aura remains restrained at rest and blooms only when momentum
    // or a celebration calls for it.
    if (rig.aura && rig.auraMat) {
      const pulse = (Math.sin(animationTime * 1.8) + 1) * 0.5;
      rig.auraMat.opacity =
        0.025 + streakBoost * 0.045 + pulse * 0.015 + (celebrating ? 0.055 : 0);
      const auraScale = 1 + pulse * 0.035 + (state === "levelUp" ? 0.1 : 0);
      rig.aura.scale.setScalar(auraScale);
    }

    // Halo charm: lazy spin at rest, intentional lock during focus, and a
    // quick orbit during celebrations.
    if (rig.halo) {
      rig.halo.rotation.x =
        1.05 + Math.sin(animationTime * 0.8) * 0.05 * ambientStrength;
      // Secondary motion: trail the body sway slightly (the halo inherits the
      // pet group's rotation, so the offset is delayed-minus-current sway).
      rig.halo.rotation.y =
        0.12 +
        (swayAt(
          animationTime - HALO_LAG_SECONDS,
          focused,
          ambientStrength,
          decorationMotion,
        ) -
          sway);
      rig.halo.rotation.z =
        -0.16 +
        animationTime *
          (state === "focus" ? 0.2 : celebrating ? 2.1 : 0.7) *
          (reducedMotion ? 0.15 : decorationMotion);
    }
  }

  return { apply, react, playBounce, poke, glowBase, streakBoost };
}
