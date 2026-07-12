import type { AvatarState } from "@/components/avatar/avatarTypes";
import { toLocalDateKey } from "@/utils/dateKey";

export type CompanionMood =
  | "calm"
  | "ready"
  | "curious"
  | "focused"
  | "encouraging"
  | "proud"
  | "celebrating"
  | "sleepy";

export type CompanionReaction = "wave" | "nod" | "tilt" | "bounce";

export interface CompanionReactionToken {
  id: number;
  reaction: CompanionReaction;
}

export interface CompanionSnapshot {
  state: AvatarState;
  completedHabits: number;
  totalHabits: number;
  streak: number;
  level: number;
  at?: Date;
  interaction?: boolean;
}

export interface CompanionCue {
  id: string;
  mood: CompanionMood;
  line: string;
  reaction: CompanionReaction;
  priority: number;
}

type CueCategory =
  | "level-up"
  | "reward"
  | "focus"
  | "no-habits"
  | "all-done"
  | "one-left"
  | "streak"
  | "morning"
  | "evening"
  | "night"
  | "general";

const COPY: Record<CueCategory, readonly string[]> = {
  "level-up": [
    "We grew stronger together.",
    "Look at us level up.",
    "That effort changed us.",
  ],
  reward: [
    "You showed up. That counts.",
    "That was a real win.",
    "I knew you had it in you.",
  ],
  focus: [
    "I'm right here. Let's focus.",
    "One task. One steady breath.",
    "Let's settle into the work.",
  ],
  "no-habits": [
    "What should we grow first?",
    "Give us one small goal.",
    "Let's choose our first win.",
  ],
  "all-done": [
    "Everything's done. I'm proud.",
    "You kept every promise today.",
    "That's today wrapped up.",
  ],
  "one-left": [
    "One small win left.",
    "Just one more. We've got this.",
    "The finish line is close.",
  ],
  streak: [
    "That rhythm suits us.",
    "Your consistency is showing.",
    "We're building real momentum.",
  ],
  morning: [
    "Morning. Let's start gently.",
    "A small win is enough to begin.",
    "Ready when you are.",
  ],
  evening: [
    "One calm step still counts.",
    "There's still room for a small win.",
    "Let's finish the day gently.",
  ],
  night: [
    "We can take it easy tonight.",
    "Quiet progress still matters.",
    "I'm glad you checked in.",
  ],
  general: [
    "Pick one thing. I'm with you.",
    "We only need the next step.",
    "Let's make a little progress.",
  ],
};

const CATEGORY_META: Record<
  CueCategory,
  { mood: CompanionMood; reaction: CompanionReaction; priority: number }
> = {
  "level-up": { mood: "celebrating", reaction: "bounce", priority: 100 },
  reward: { mood: "proud", reaction: "bounce", priority: 90 },
  focus: { mood: "focused", reaction: "nod", priority: 80 },
  "no-habits": { mood: "curious", reaction: "tilt", priority: 70 },
  "all-done": { mood: "proud", reaction: "wave", priority: 70 },
  "one-left": { mood: "encouraging", reaction: "nod", priority: 60 },
  streak: { mood: "ready", reaction: "wave", priority: 50 },
  morning: { mood: "ready", reaction: "wave", priority: 30 },
  evening: { mood: "encouraging", reaction: "nod", priority: 30 },
  night: { mood: "sleepy", reaction: "tilt", priority: 30 },
  general: { mood: "calm", reaction: "tilt", priority: 10 },
};

function hash(value: string): number {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function categoryFor(snapshot: CompanionSnapshot, at: Date): CueCategory {
  if (snapshot.state === "levelUp") return "level-up";
  if (snapshot.state === "reward") return "reward";
  if (snapshot.state === "focus") return "focus";
  if (snapshot.totalHabits === 0) return "no-habits";
  if (snapshot.completedHabits >= snapshot.totalHabits) return "all-done";
  if (snapshot.totalHabits - snapshot.completedHabits === 1) return "one-left";
  if (snapshot.streak >= 3) return "streak";

  const hour = at.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 18 && hour < 21) return "evening";
  if (hour >= 21 || hour < 5) return "night";
  return "general";
}

export function deriveCompanionCue(
  snapshot: CompanionSnapshot
): CompanionCue {
  const at = snapshot.at ?? new Date();
  const category = categoryFor(snapshot, at);
  const lines = COPY[category];
  const dateKey = toLocalDateKey(at);
  const seed = `${dateKey}|${category}|${snapshot.level}|${snapshot.streak}|${
    snapshot.interaction ? "tap" : "auto"
  }`;
  const lineIndex = hash(seed) % lines.length;
  const meta = CATEGORY_META[category];

  return {
    id: `${dateKey}:${category}:${lineIndex}:${snapshot.interaction ? "tap" : "auto"}`,
    line: lines[lineIndex],
    ...meta,
  };
}
