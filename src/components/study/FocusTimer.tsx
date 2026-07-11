import SessionSummary from "@/components/study/SessionSummary";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useXp } from "@/context/XpContext";
import {
  beginStudySession,
  finishStudySession,
  resumeStudySession,
  saveFocusTimerState,
} from "@/services/studySessionService";
import {
  FocusTimerState,
  getActiveSeconds,
  pauseFocusTimer,
  resumeFocusTimer,
} from "@/utils/focusTimerState";
import { logSupabaseError } from "@/utils/supabaseErrors";
import { getLevelProgress, getStudyRewards } from "@/utils/xp";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

const { width } = Dimensions.get("window");
const TIMER_SIZE = width * 0.65;
const STROKE_WIDTH = 8;

interface FocusTimerProps {
  onStart?: () => void;
  // Lets a surrounding scene mirror the session (character focus/reward states)
  onStateChange?: (state: "idle" | "focus" | "reward" | "levelUp") => void;
}

interface SessionResult {
  minutes: number;
  xp: number;
  coins: number;
  leveledUp: boolean;
  totalFocusSeconds: number;
  totalXp: number;
  coinBalance: number;
  endedAt: string;
}

export default function FocusTimer({ onStart, onStateChange }: FocusTimerProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { xp } = useXp();
  const [timerState, setTimerState] = useState<FocusTimerState | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [summary, setSummary] = useState<SessionResult | null>(null);
  const playScale = useRef(new Animated.Value(1)).current;
  const playMounted = useRef(false);
  const onStateChangeRef = useRef(onStateChange);
  const isRunning = timerState?.runningSinceMs !== null && timerState !== null;

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  // Pop the play button when the session starts or pauses (not on mount)
  useEffect(() => {
    if (!playMounted.current) {
      playMounted.current = true;
      return;
    }
    playScale.setValue(0.94);
    Animated.spring(playScale, {
      toValue: 1,
      speed: 24,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  }, [isRunning, playScale]);

  useEffect(() => {
    if (!user) {
      setTimerState(null);
      setDisplaySeconds(0);
      setIsRestoring(false);
      return;
    }

    let cancelled = false;
    setTimerState(null);
    setDisplaySeconds(0);
    setIsRestoring(true);
    resumeStudySession(user.id)
      .then((restored) => {
        if (cancelled) return;
        if (!restored) {
          onStateChangeRef.current?.("idle");
          return;
        }
        setTimerState(restored);
        setDisplaySeconds(getActiveSeconds(restored, Date.now()));
        onStateChangeRef.current?.(
          restored.runningSinceMs === null ? "idle" : "focus"
        );
      })
      .catch((error) =>
        logSupabaseError("Error restoring focus session:", error)
      )
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!timerState || timerState.runningSinceMs === null) return;
    const refresh = () =>
      setDisplaySeconds(getActiveSeconds(timerState, Date.now()));
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [timerState]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && timerState) {
        setDisplaySeconds(getActiveSeconds(timerState, Date.now()));
      }
    });
    return () => subscription.remove();
  }, [timerState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const rewards = getStudyRewards(displaySeconds);

  const handlePlayPause = async () => {
    if (!user || isRestoring || isStarting || isFinishing) return;

    try {
      if (!timerState) {
        setIsStarting(true);
        const started = await beginStudySession(user.id);
        setTimerState(started);
        setDisplaySeconds(0);
        onStart?.();
        onStateChangeRef.current?.("focus");
        return;
      }

      const next = isRunning
        ? pauseFocusTimer(timerState, Date.now())
        : resumeFocusTimer(timerState, Date.now());
      await saveFocusTimerState(user.id, next);
      setTimerState(next);
      setDisplaySeconds(getActiveSeconds(next, Date.now()));
      onStateChangeRef.current?.(isRunning ? "idle" : "focus");
      if (!isRunning) onStart?.();
    } catch (error) {
      logSupabaseError("Error updating focus session:", error);
      Alert.alert(
        "Could Not Start Session",
        "Connect to the internet and try again."
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleFinish = async () => {
    if (!user || !timerState || isFinishing) return;
    const pausedState = pauseFocusTimer(timerState, Date.now());
    const activeSeconds = getActiveSeconds(pausedState, Date.now());

    try {
      await saveFocusTimerState(user.id, pausedState);
      setTimerState(pausedState);
      setDisplaySeconds(activeSeconds);
    } catch (error) {
      logSupabaseError("Error pausing focus session:", error);
      Alert.alert(
        "Could Not Update Session",
        "Your timer is still running. Please try again."
      );
      return;
    }

    if (activeSeconds < 60) {
      onStateChangeRef.current?.("idle");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Session Too Short",
        "Study for at least 1 minute to earn rewards."
      );
      return;
    }

    setIsFinishing(true);
    let leveledUp = false;

    try {
      const result = await finishStudySession(
        user.id,
        pausedState.clientSessionId,
        activeSeconds
      );
      leveledUp =
        getLevelProgress(result.progress.xp).level > getLevelProgress(xp).level;

      setSummary({
        minutes: Math.floor(result.session.duration / 60),
        xp: result.xp,
        coins: result.coins,
        leveledUp,
        totalFocusSeconds: result.progress.total_focus_seconds,
        totalXp: result.progress.xp,
        coinBalance: result.progress.coins,
        endedAt: result.session.endedAt,
      });
    } catch (error) {
      logSupabaseError("Error recording study session:", error);
      onStateChangeRef.current?.("idle");
      setIsFinishing(false);
      Alert.alert(
        "Session Save Failed",
        "Your focus time could not be saved. Please try again."
      );
      return;
    }
    setIsFinishing(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStateChangeRef.current?.(leveledUp ? "levelUp" : "reward");
    setTimerState(null);
    setDisplaySeconds(0);
  };

  const radius = (TIMER_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.container}>
      {/* Timer Circle */}
      <View style={styles.timerContainer}>
        <Svg width={TIMER_SIZE} height={TIMER_SIZE}>
          {/* Background Circle */}
          <Circle
            cx={TIMER_SIZE / 2}
            cy={TIMER_SIZE / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress Circle */}
          {displaySeconds > 0 && (
            <Circle
              cx={TIMER_SIZE / 2}
              cy={TIMER_SIZE / 2}
              r={radius}
              stroke={colors.accent}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * 0.25} // Shows progress
              strokeLinecap="round"
              rotation="-90"
              origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}
            />
          )}
        </Svg>

        {/* Timer Display */}
        <View style={styles.timerContent}>
          <Text style={[styles.timerText, { color: colors.text }]}>
            {formatTime(displaySeconds)}
          </Text>
          <Text style={[styles.phaseText, { color: colors.textSecondary }]}>
            FOCUS PHASE
          </Text>
          <Text style={[styles.xpText, { color: colors.accent }]}>
            +{rewards.xp} XP{rewards.coins > 0 ? `  •  +${rewards.coins}` : ""}
            {rewards.coins > 0 ? " coins" : ""}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Animated.View style={{ transform: [{ scale: playScale }] }}>
          <Pressable
            style={[styles.playButton, { backgroundColor: colors.accent }]}
            disabled={isRestoring || isStarting || isFinishing}
            onPress={handlePlayPause}
          >
            <Ionicons
              name={
                isRestoring || isStarting
                  ? "hourglass"
                  : isRunning
                  ? "pause"
                  : "play"
              }
              size={40}
              color={colors.background}
              style={isRunning ? {} : { marginLeft: 4 }}
            />
          </Pressable>
        </Animated.View>
        {displaySeconds > 0 && (
          <Pressable
            style={[
              styles.finishButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: isFinishing ? 0.6 : 1,
              },
            ]}
            disabled={isFinishing}
            onPress={handleFinish}
          >
            <Ionicons name="stop" size={24} color={colors.accent} />
            <Text style={[styles.finishText, { color: colors.text }]}>
              Finish
            </Text>
          </Pressable>
        )}
      </View>

      <SessionSummary
        visible={summary !== null}
        minutes={summary?.minutes ?? 0}
        xp={summary?.xp ?? 0}
        coins={summary?.coins ?? 0}
        leveledUp={summary?.leveledUp ?? false}
        totalFocusSeconds={summary?.totalFocusSeconds ?? 0}
        totalXp={summary?.totalXp ?? xp}
        coinBalance={summary?.coinBalance ?? 0}
        endedAt={summary?.endedAt}
        onClose={() => {
          setSummary(null);
          onStateChangeRef.current?.("idle");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  timerContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  timerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 56,
    fontFamily: "Outfit-Bold",
    letterSpacing: 2,
  },
  phaseText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    letterSpacing: 2,
    marginTop: Spacing.xs,
  },
  xpText: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
    marginTop: Spacing.xs,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  finishText: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D97757",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
});
