import SessionSummary from "@/components/study/SessionSummary";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useXp } from "@/context/XpContext";
import { recordStudySession } from "@/utils/studySessions";
import { getLevelProgress, getStudyRewards } from "@/utils/xp";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

type FocusMode = "SOLO" | "GROUP" | "CAMPUS";

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
  const [isRunning, setIsRunning] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [time, setTime] = useState(0); // Time in seconds
  const [mode, setMode] = useState<FocusMode>("SOLO");
  const [summary, setSummary] = useState<SessionResult | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const rewards = getStudyRewards(time);

  const handleFinish = async () => {
    if (isFinishing) return;
    setIsRunning(false);

    if (rewards.minutes < 1) {
      onStateChange?.("idle");
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
      if (!user) throw new Error("No user logged in");
      const result = await recordStudySession(user.id, {
        duration: time,
        xp: rewards.xp,
        coins: rewards.coins,
      });
      leveledUp =
        getLevelProgress(result.progress.xp).level > getLevelProgress(xp).level;

      setSummary({
        minutes: rewards.minutes,
        xp: result.xp,
        coins: result.coins,
        leveledUp,
        totalFocusSeconds: result.progress.total_focus_seconds,
        totalXp: result.progress.xp,
        coinBalance: result.progress.coins,
        endedAt: result.session.endedAt,
      });
    } catch (error) {
      console.error("Error recording study session:", error);
      onStateChange?.("idle");
      setIsFinishing(false);
      Alert.alert(
        "Session Save Failed",
        "Your focus time could not be saved. Please try again."
      );
      return;
    }
    setIsFinishing(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStateChange?.(leveledUp ? "levelUp" : "reward");
    setTime(0);
  };

  const radius = (TIMER_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.container}>
      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        {(["SOLO", "GROUP", "CAMPUS"] as FocusMode[]).map((m) => (
          <Pressable
            key={m}
            style={[
              styles.modeButton,
              {
                backgroundColor: mode === m ? colors.accent : "transparent",
                borderColor: mode === m ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setMode(m)}
          >
            <Ionicons
              name={
                m === "SOLO"
                  ? "flash"
                  : m === "GROUP"
                  ? "people-outline"
                  : "business-outline"
              }
              size={16}
              color={mode === m ? colors.background : colors.textSecondary}
              style={styles.modeIcon}
            />
            <Text
              style={[
                styles.modeText,
                {
                  color: mode === m ? colors.background : colors.textSecondary,
                },
              ]}
            >
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

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
          {time > 0 && (
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
            {formatTime(time)}
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
        <Pressable
          style={[styles.playButton, { backgroundColor: colors.accent }]}
          onPress={() => {
            const wasRunning = isRunning;
            setIsRunning(!isRunning);
            onStateChange?.(wasRunning ? "idle" : "focus");
            // If starting the timer (wasn't running, now will be), trigger callback
            if (!wasRunning && onStart) {
              onStart();
            }
          }}
        >
          <Ionicons
            name={isRunning ? "pause" : "play"}
            size={40}
            color={colors.background}
            style={isRunning ? {} : { marginLeft: 4 }}
          />
        </Pressable>
        {time > 0 && (
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
          onStateChange?.("idle");
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
  modeSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  modeIcon: {
    marginRight: 2,
  },
  modeText: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
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
    shadowColor: "#ff6b35",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
