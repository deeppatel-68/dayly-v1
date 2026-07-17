import { ThemeColors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
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
        { backgroundColor: colors.surface, borderColor: colors.separator },
      ]}
    >
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {companionName ? `${companionName}'s growth record` : "Your growth record"}
      </Text>

      <View style={styles.heroRow}>
        <View style={[styles.heroIcon, { backgroundColor: colors.completedBackground }]}>
          <Ionicons name="flame" size={20} color={colors.accent} />
        </View>
        <Text style={[styles.heroValue, { color: colors.text }]}>
          {currentStreak}
        </Text>
        <Text style={[styles.heroUnit, { color: colors.textSecondary }]}>
          day streak
        </Text>
      </View>
      <Text style={[styles.tierLabel, { color: colors.accent }]}>{tierLabel}</Text>

      <View style={styles.statsRow}>
        <Metric value={bestStreak} label="Best streak" colors={colors} />
        <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
        <Metric value={focusHours} label="Focus hours" colors={colors} />
        <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
        <Metric value={totalCompleted} label="Habits done" colors={colors} />
      </View>
    </View>
  );
}

function Metric({
  value,
  label,
  colors,
}: {
  value: string | number;
  label: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...StudioType.section,
    textTransform: "uppercase",
    letterSpacing: 0.2,
    marginBottom: Spacing.md,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  heroValue: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  heroUnit: { ...StudioType.detail },
  tierLabel: {
    ...StudioType.bodyStrong,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },
  statValue: { ...StudioType.metric, fontSize: 22, marginBottom: Spacing.xs },
  statLabel: { ...StudioType.detail, fontSize: 11, textAlign: "center" },
});
