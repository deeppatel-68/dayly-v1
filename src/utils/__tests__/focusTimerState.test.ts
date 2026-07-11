import { describe, expect, it } from "vitest";
import {
  FocusTimerState,
  getActiveSeconds,
  MAX_REWARDED_FOCUS_SECONDS,
  pauseFocusTimer,
  resumeFocusTimer,
} from "@/utils/focusTimerState";

const baseState: FocusTimerState = {
  clientSessionId: "session-1",
  serverStartedAt: "2026-07-11T00:00:00.000Z",
  accumulatedActiveMs: 30_000,
  runningSinceMs: 1_000,
};

describe("focus timer timestamp state", () => {
  it("derives elapsed time after backgrounding or process restart", () => {
    expect(getActiveSeconds(baseState, 31_000)).toBe(60);
  });

  it("does not count time while paused and resumes from accumulated time", () => {
    const paused = pauseFocusTimer(baseState, 31_000);
    expect(getActiveSeconds(paused, 91_000)).toBe(60);

    const resumed = resumeFocusTimer(paused, 91_000);
    expect(getActiveSeconds(resumed, 121_000)).toBe(90);
  });

  it("caps client display and submitted active time at eight hours", () => {
    expect(getActiveSeconds(baseState, 100_000_000)).toBe(
      MAX_REWARDED_FOCUS_SECONDS
    );
  });
});
