import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface PeriodSummaryCardProps {
  periodLabel: string;
  focusTimeLabel: string;
  sessionCount: number;
  averageSessionMinutes: number;
  periodChange: number;
}

export default function PeriodSummaryCard({
  periodLabel,
  focusTimeLabel,
  sessionCount,
  averageSessionMinutes,
  periodChange,
}: PeriodSummaryCardProps) {
  const { colors } = useTheme();
  const showChange = Math.abs(periodChange) >= 1;
  const isUp = periodChange > 0;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flash" size={16} color={colors.accent} />
          <Text style={[styles.periodLabel, { color: colors.accent }]}>
            {periodLabel}
          </Text>
        </View>
        {showChange && (
          <View
            style={[
              styles.changeChip,
              {
                backgroundColor: isUp
                  ? `${colors.success}22`
                  : `${colors.error}22`,
              },
            ]}
          >
            <Ionicons
              name={isUp ? "arrow-up" : "arrow-down"}
              size={11}
              color={isUp ? colors.success : colors.error}
            />
            <Text
              style={[
                styles.changeText,
                { color: isUp ? colors.success : colors.error },
              ]}
            >
              {Math.abs(Math.round(periodChange))}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {focusTimeLabel}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            FOCUS
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {sessionCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            SESSIONS
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {Math.round(averageSessionMinutes)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            AVG MIN
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  periodLabel: {
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 1,
  },
  changeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  changeText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    letterSpacing: 0.5,
  },
});
