export const MAX_REWARDED_FOCUS_SECONDS = 8 * 60 * 60;

export interface FocusTimerState {
  clientSessionId: string;
  serverStartedAt: string;
  accumulatedActiveMs: number;
  runningSinceMs: number | null;
}

export function getActiveMilliseconds(
  state: FocusTimerState,
  nowMs: number
): number {
  const runningMs =
    state.runningSinceMs === null
      ? 0
      : Math.max(0, nowMs - state.runningSinceMs);

  return Math.min(
    MAX_REWARDED_FOCUS_SECONDS * 1000,
    Math.max(0, state.accumulatedActiveMs) + runningMs
  );
}

export function getActiveSeconds(
  state: FocusTimerState,
  nowMs: number
): number {
  return Math.floor(getActiveMilliseconds(state, nowMs) / 1000);
}

export function pauseFocusTimer(
  state: FocusTimerState,
  nowMs: number
): FocusTimerState {
  if (state.runningSinceMs === null) return state;

  return {
    ...state,
    accumulatedActiveMs: getActiveMilliseconds(state, nowMs),
    runningSinceMs: null,
  };
}

export function resumeFocusTimer(
  state: FocusTimerState,
  nowMs: number
): FocusTimerState {
  if (state.runningSinceMs !== null) return state;
  return { ...state, runningSinceMs: nowMs };
}

