import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { UserProgress } from "@/services/progressService";
import { toStreakTier } from "@/utils/progression";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const STREAK_TIER_LABEL = ["Just getting started", "Warming up", "On fire", "Radiant"];

interface MomentumCardProps {
  currentStreak: number;
  bestStreak: number;
  progress: UserProgress | null;
  companionName?: string;
}

export default function MomentumCard({
  currentStreak,
  bestStreak,
  progress,
  companionName,
}: MomentumCardProps) {
  const { colors } = useTheme();
  const tier = toStreakTier(currentStreak);
  const tierLabel = STREAK_TIER_LABEL[tier];
  const focusHours = progress
    ? (progress.total_focus_seconds / 3600).toFixed(1)
    : "0.0";
  const totalCompleted = progress?.total_completed_habits ?? 0;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {companionName ? `${companionName}'s growth record` : "Your growth record"}
      </Text>

      <View style={styles.heroRow}>
        <Ionicons name="flame" size={28} color={colors.accent} />
        <Text style={[styles.heroValue, { color: colors.text }]}>
          {currentStreak}
        </Text>
        <Text style={[styles.heroUnit, { color: colors.textSecondary }]}>
          {currentStreak === 1 ? "day streak" : "day streak"}
        </Text>
      </View>
      <Text style={[styles.tierLabel, { color: colors.accent }]}>
        {tierLabel}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {bestStreak}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            BEST STREAK
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {focusHours}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            FOCUS HOURS
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {totalCompleted}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            HABITS DONE
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
    marginBottom: Spacing.md,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  heroValue: {
    fontSize: 44,
    fontFamily: "Outfit-Bold",
    lineHeight: 48,
  },
  heroUnit: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    marginBottom: Spacing.xs,
  },
  tierLabel: {
    fontSize: 13,
    fontFamily: "Outfit-SemiBold",
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    letterSpacing: 0.5,
  },
});
