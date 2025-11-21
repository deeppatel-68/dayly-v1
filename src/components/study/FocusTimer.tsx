import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const { width } = Dimensions.get("window");
const TIMER_SIZE = width * 0.65;
const STROKE_WIDTH = 8;

type FocusMode = "SOLO" | "GROUP" | "CAMPUS";

interface FocusTimerProps {
  onStart?: () => void;
}

export default function FocusTimer({ onStart }: FocusTimerProps) {
  const { colors } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // Time in seconds
  const [mode, setMode] = useState<FocusMode>("SOLO");

  useEffect(() => {
    let interval: NodeJS.Timeout;
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

  const calculateXP = () => {
    // +1 XP per minute
    return Math.floor(time / 60);
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
            +{calculateXP()} XP
          </Text>
        </View>
      </View>

      {/* Play/Pause Button */}
      <Pressable
        style={[styles.playButton, { backgroundColor: colors.accent }]}
        onPress={() => {
          const wasRunning = isRunning;
          setIsRunning(!isRunning);
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
