import type { AvatarState } from "@/components/avatar/avatarTypes";

export type RgbColor = readonly [number, number, number];

export interface EnvironmentProfile {
  sky: RgbColor;
  skyIntensity: number;
  celestial: RgbColor;
  celestialIntensity: number;
  starOpacity: number;
  hemisphereSky: RgbColor;
  hemisphereGround: RgbColor;
  hemisphereIntensity: number;
  key: RgbColor;
  keyIntensity: number;
  lampIntensity: number;
  stringIntensity: number;
  screenIntensity: number;
  companionWarmth: number;
  decorationMotion: number;
}

interface TimeKeyframe extends EnvironmentProfile {
  minute: number;
}

const rgb = (hex: string): RgbColor => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
};

const NIGHT: Omit<TimeKeyframe, "minute"> = {
  sky: rgb("#1F3150"),
  skyIntensity: 1.05,
  celestial: rgb("#FFE8B8"),
  celestialIntensity: 1.35,
  starOpacity: 1,
  hemisphereSky: rgb("#9AA8C1"),
  hemisphereGround: rgb("#24211E"),
  hemisphereIntensity: 0.62,
  key: rgb("#D8DEEA"),
  keyIntensity: 0.72,
  lampIntensity: 1.2,
  stringIntensity: 1.1,
  screenIntensity: 0.62,
  companionWarmth: 0.16,
  decorationMotion: 0.8,
};

const DAWN: Omit<TimeKeyframe, "minute"> = {
  sky: rgb("#8A667A"),
  skyIntensity: 0.72,
  celestial: rgb("#FFD5A4"),
  celestialIntensity: 1.08,
  starOpacity: 0.25,
  hemisphereSky: rgb("#E0B8B4"),
  hemisphereGround: rgb("#302722"),
  hemisphereIntensity: 0.72,
  key: rgb("#FFD8B7"),
  keyIntensity: 0.9,
  lampIntensity: 0.95,
  stringIntensity: 0.8,
  screenIntensity: 0.56,
  companionWarmth: 0.54,
  decorationMotion: 0.9,
};

const DAY: Omit<TimeKeyframe, "minute"> = {
  sky: rgb("#6F9DC4"),
  skyIntensity: 0.42,
  celestial: rgb("#FFF1C7"),
  celestialIntensity: 0.88,
  starOpacity: 0,
  hemisphereSky: rgb("#D8E8F2"),
  hemisphereGround: rgb("#39332D"),
  hemisphereIntensity: 0.84,
  key: rgb("#FFF2DC"),
  keyIntensity: 1.02,
  lampIntensity: 0.55,
  stringIntensity: 0.42,
  screenIntensity: 0.5,
  companionWarmth: 0.28,
  decorationMotion: 1,
};

const DUSK: Omit<TimeKeyframe, "minute"> = {
  sky: rgb("#805A70"),
  skyIntensity: 0.7,
  celestial: rgb("#F3B889"),
  celestialIntensity: 1.02,
  starOpacity: 0.18,
  hemisphereSky: rgb("#C99DAB"),
  hemisphereGround: rgb("#2C2522"),
  hemisphereIntensity: 0.68,
  key: rgb("#F4C7AA"),
  keyIntensity: 0.82,
  lampIntensity: 1.05,
  stringIntensity: 0.86,
  screenIntensity: 0.58,
  companionWarmth: 0.48,
  decorationMotion: 0.86,
};

const KEYFRAMES: readonly TimeKeyframe[] = [
  { minute: 0, ...NIGHT },
  { minute: 300, ...NIGHT },
  { minute: 375, ...DAWN },
  { minute: 450, ...DAY },
  { minute: 1020, ...DAY },
  { minute: 1125, ...DUSK },
  { minute: 1230, ...NIGHT },
  { minute: 1440, ...NIGHT },
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const mixColor = (a: RgbColor, b: RgbColor, amount: number): RgbColor => [
  mix(a[0], b[0], amount),
  mix(a[1], b[1], amount),
  mix(a[2], b[2], amount),
];

function interpolate(
  from: EnvironmentProfile,
  to: EnvironmentProfile,
  amount: number
): EnvironmentProfile {
  return {
    sky: mixColor(from.sky, to.sky, amount),
    skyIntensity: mix(from.skyIntensity, to.skyIntensity, amount),
    celestial: mixColor(from.celestial, to.celestial, amount),
    celestialIntensity: mix(
      from.celestialIntensity,
      to.celestialIntensity,
      amount
    ),
    starOpacity: mix(from.starOpacity, to.starOpacity, amount),
    hemisphereSky: mixColor(
      from.hemisphereSky,
      to.hemisphereSky,
      amount
    ),
    hemisphereGround: mixColor(
      from.hemisphereGround,
      to.hemisphereGround,
      amount
    ),
    hemisphereIntensity: mix(
      from.hemisphereIntensity,
      to.hemisphereIntensity,
      amount
    ),
    key: mixColor(from.key, to.key, amount),
    keyIntensity: mix(from.keyIntensity, to.keyIntensity, amount),
    lampIntensity: mix(from.lampIntensity, to.lampIntensity, amount),
    stringIntensity: mix(from.stringIntensity, to.stringIntensity, amount),
    screenIntensity: mix(from.screenIntensity, to.screenIntensity, amount),
    companionWarmth: mix(
      from.companionWarmth,
      to.companionWarmth,
      amount
    ),
    decorationMotion: mix(
      from.decorationMotion,
      to.decorationMotion,
      amount
    ),
  };
}

function profileForMinute(minute: number): EnvironmentProfile {
  const clampedMinute = Math.max(0, Math.min(1440, minute));
  const upperIndex = KEYFRAMES.findIndex(
    (keyframe) => keyframe.minute >= clampedMinute
  );
  const to = KEYFRAMES[Math.max(1, upperIndex)];
  const from = KEYFRAMES[Math.max(0, upperIndex - 1)];
  const duration = Math.max(1, to.minute - from.minute);
  return interpolate(from, to, (clampedMinute - from.minute) / duration);
}

const REWARD_DAWN: EnvironmentProfile = {
  ...DAWN,
  sky: rgb("#C77F68"),
  skyIntensity: 0.68,
  celestial: rgb("#FFF0C8"),
  celestialIntensity: 1.12,
  starOpacity: 0.06,
  hemisphereSky: rgb("#FFD6B7"),
  key: rgb("#FFE0BD"),
  hemisphereIntensity: 0.92,
  keyIntensity: 1.18,
  lampIntensity: 1.55,
  stringIntensity: 1.8,
  screenIntensity: 0.76,
  companionWarmth: 1,
};

export function createEnvironmentProfile(
  at: Date,
  state: AvatarState,
  rewardBlend = 0
): EnvironmentProfile {
  const minute = at.getHours() * 60 + at.getMinutes() + at.getSeconds() / 60;
  const base = profileForMinute(minute);
  const bloom = clamp01(rewardBlend);
  let profile = bloom > 0 ? interpolate(base, REWARD_DAWN, bloom) : base;
  if (state === "levelUp" && bloom > 0) {
    const boost = 1 + bloom * 0.15;
    profile = {
      ...profile,
      hemisphereIntensity: profile.hemisphereIntensity * boost,
      keyIntensity: profile.keyIntensity * boost,
      stringIntensity: profile.stringIntensity * boost,
      screenIntensity: profile.screenIntensity * boost,
      companionWarmth: Math.min(1, profile.companionWarmth * boost),
    };
  }

  if (state !== "focus") return profile;
  return {
    ...profile,
    lampIntensity: 2.15,
    screenIntensity: Math.max(profile.screenIntensity, 0.82),
    stringIntensity: profile.stringIntensity * 0.72,
    decorationMotion: 0.35,
    companionWarmth: Math.max(profile.companionWarmth, 0.42),
  };
}

export function rgbToHex(color: RgbColor): string {
  const channel = (value: number) =>
    Math.round(clamp01(value) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${channel(color[0])}${channel(color[1])}${channel(color[2])}`;
}
