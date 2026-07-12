import { useCharacter } from "@/context/CharacterContext";
import { useHabits } from "@/context/HabitsContext";
import { useXp } from "@/context/XpContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { AvatarState } from "../avatar/avatarTypes";
import {
  CompanionCue,
  CompanionReaction,
  CompanionReactionToken,
  deriveCompanionCue,
} from "./companionBehavior";

interface CompanionPresenceOptions {
  state: AvatarState;
  visible: boolean;
  suppressAutomatic?: boolean;
}

interface CompanionPresence {
  companionName: string;
  cue: CompanionCue | null;
  mood: CompanionCue["mood"];
  reactionToken: CompanionReactionToken | null;
  interact: () => CompanionReaction;
}

const CUE_DURATION_MS = 4500;
const GREETING_DELAY_MS = 650;

export function useCompanionPresence({
  state,
  visible,
  suppressAutomatic = false,
}: CompanionPresenceOptions): CompanionPresence {
  const {
    completedCount,
    totalCount,
    currentStreak,
    loading: habitsLoading,
  } = useHabits();
  const { level } = useXp();
  const { character, loading: characterLoading } = useCharacter();
  const [now, setNow] = useState(() => new Date());
  const [cue, setCue] = useState<CompanionCue | null>(null);
  const [reactionToken, setReactionToken] =
    useState<CompanionReactionToken | null>(null);
  const previousState = useRef<AvatarState>(state);
  const shownAutomatic = useRef(false);
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionId = useRef(0);

  const snapshot = useMemo(
    () => ({
      state,
      completedHabits: completedCount,
      totalHabits: totalCount,
      streak: currentStreak,
      level,
      at: now,
    }),
    [completedCount, currentStreak, level, now, state, totalCount]
  );
  const baseline = useMemo(() => deriveCompanionCue(snapshot), [snapshot]);

  const clearCueTimer = useCallback(() => {
    if (cueTimer.current) clearTimeout(cueTimer.current);
    cueTimer.current = null;
  }, []);

  const showCue = useCallback(
    (nextCue: CompanionCue, triggerReaction = true) => {
      clearCueTimer();
      setCue(nextCue);
      if (triggerReaction) {
        reactionId.current += 1;
        setReactionToken({
          id: reactionId.current,
          reaction: nextCue.reaction,
        });
      }
      cueTimer.current = setTimeout(() => {
        setCue(null);
        cueTimer.current = null;
      }, CUE_DURATION_MS);
    },
    [clearCueTimer]
  );

  useEffect(() => {
    const refreshClock = () => setNow(new Date());
    const interval = setInterval(refreshClock, 60_000);
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      shownAutomatic.current = false;
      refreshClock();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      shownAutomatic.current = false;
      setCue(null);
      clearCueTimer();
      if (greetingTimer.current) clearTimeout(greetingTimer.current);
      greetingTimer.current = null;
    }
  }, [clearCueTimer, visible]);

  useEffect(() => {
    if (
      !visible ||
      habitsLoading ||
      characterLoading ||
      suppressAutomatic ||
      state !== "idle" ||
      shownAutomatic.current
    ) {
      return;
    }

    if (greetingTimer.current) clearTimeout(greetingTimer.current);
    greetingTimer.current = setTimeout(() => {
      shownAutomatic.current = true;
      showCue(deriveCompanionCue(snapshot));
      greetingTimer.current = null;
    }, GREETING_DELAY_MS);
    return () => {
      if (greetingTimer.current) clearTimeout(greetingTimer.current);
      greetingTimer.current = null;
    };
  }, [
    characterLoading,
    habitsLoading,
    showCue,
    snapshot,
    state,
    suppressAutomatic,
    visible,
  ]);

  useEffect(() => {
    const previous = previousState.current;
    previousState.current = state;

    if (!visible) return;
    if (state === "focus") {
      setCue(null);
      clearCueTimer();
      return;
    }
    if (
      state !== previous &&
      (state === "reward" || state === "levelUp")
    ) {
      shownAutomatic.current = true;
      showCue(deriveCompanionCue(snapshot));
    }
  }, [clearCueTimer, showCue, snapshot, state, visible]);

  useEffect(
    () => () => {
      clearCueTimer();
      if (greetingTimer.current) clearTimeout(greetingTimer.current);
    },
    [clearCueTimer]
  );

  const interact = useCallback(() => {
    const nextCue = deriveCompanionCue({
      ...snapshot,
      at: new Date(),
      interaction: true,
    });
    showCue(nextCue, false);
    return nextCue.reaction;
  }, [showCue, snapshot]);

  return {
    companionName: character.companionName || "Companion",
    cue,
    mood: baseline.mood,
    reactionToken,
    interact,
  };
}
