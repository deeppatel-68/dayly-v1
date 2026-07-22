import { ThemeColors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
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
  const changeColor = isUp ? colors.success : colors.error;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.separator },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flash-outline" size={17} color={colors.accent} />
          <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>
            {periodLabel}
          </Text>
        </View>
        {showChange ? (
          <View
            accessible
            accessibilityLabel={`${isUp ? "Up" : "Down"} ${Math.abs(
              Math.round(periodChange)
            )} percent`}
            style={[
              styles.changeChip,
              { backgroundColor: `${changeColor}1F` },
            ]}
          >
            <Ionicons
              name={isUp ? "arrow-up" : "arrow-down"}
              size={12}
              color={changeColor}
            />
            <Text style={[styles.changeText, { color: changeColor }]}>
              {Math.abs(Math.round(periodChange))}%
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <Metric value={focusTimeLabel} label="Focus" colors={colors} />
        <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
        <Metric value={sessionCount} label="Sessions" colors={colors} />
        <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
        <Metric
          value={Math.round(averageSessionMinutes)}
          label="Avg. min"
          colors={colors}
        />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  periodLabel: { ...StudioType.section, letterSpacing: 0.2 },
  changeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  changeText: { ...StudioType.detail, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },
  statValue: { ...StudioType.metric, fontSize: 28, marginBottom: Spacing.xs },
  statLabel: { ...StudioType.detail, fontSize: 11, textAlign: "center" },
});
