import { describe, expect, it } from "vitest";
import {
  CompanionSnapshot,
  deriveCompanionCue,
} from "../companionBehavior";

const base: CompanionSnapshot = {
  state: "idle",
  completedHabits: 0,
  totalHabits: 3,
  streak: 0,
  level: 1,
  at: new Date(2026, 6, 12, 9, 0),
};

describe("companion behavior", () => {
  it("uses event precedence over progress and time", () => {
    expect(
      deriveCompanionCue({ ...base, state: "levelUp", completedHabits: 3 }).mood
    ).toBe("celebrating");
    expect(deriveCompanionCue({ ...base, state: "reward" }).mood).toBe("proud");
    expect(deriveCompanionCue({ ...base, state: "focus" }).mood).toBe("focused");
  });

  it("responds to setup, remaining work, completion, and streaks", () => {
    expect(deriveCompanionCue({ ...base, totalHabits: 0 }).mood).toBe("curious");
    expect(deriveCompanionCue({ ...base, completedHabits: 2 }).mood).toBe(
      "encouraging"
    );
    expect(deriveCompanionCue({ ...base, completedHabits: 3 }).mood).toBe(
      "proud"
    );
    expect(deriveCompanionCue({ ...base, streak: 5 }).mood).toBe("ready");
  });

  it("uses local time for calm morning, evening, and night moods", () => {
    expect(deriveCompanionCue(base).mood).toBe("ready");
    expect(
      deriveCompanionCue({ ...base, at: new Date(2026, 6, 12, 19, 0) }).mood
    ).toBe("encouraging");
    expect(
      deriveCompanionCue({ ...base, at: new Date(2026, 6, 12, 23, 0) }).mood
    ).toBe("sleepy");
  });

  it("is deterministic while varying interaction copy from automatic copy", () => {
    const first = deriveCompanionCue(base);
    expect(deriveCompanionCue(base)).toEqual(first);
    expect(deriveCompanionCue({ ...base, interaction: true }).id).not.toBe(
      first.id
    );
  });

  it("never uses punitive or pet-care language", () => {
    const prohibited = /disappoint|failed|lazy|hungry|neglect|angry|guilty/i;
    const scenarios = [
      base,
      { ...base, at: new Date(2026, 6, 12, 19, 0) },
      { ...base, totalHabits: 0 },
      { ...base, completedHabits: 2 },
      { ...base, state: "reward" as const },
    ];
    scenarios.forEach((scenario) => {
      expect(deriveCompanionCue(scenario).line).not.toMatch(prohibited);
    });
  });
});
