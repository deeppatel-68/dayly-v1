import StudyLineChart from "@/components/analytics/LineChart";
import { BorderRadius, Spacing, TouchTarget } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { ChartPoint } from "@/utils/analytics";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

interface FocusTrendCardProps {
  periodLabel: string;
  data: ChartPoint[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function FocusTrendCard({
  periodLabel,
  data,
  loading,
  error,
  onRetry,
}: FocusTrendCardProps) {
  const { colors } = useTheme();
  const surfaceStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.separator,
  };

  if (loading) {
    return (
      <View style={[styles.stateCard, surfaceStyle]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Loading focus history
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.stateCard, surfaceStyle]}>
        <Ionicons
          name="cloud-offline-outline"
          size={22}
          color={colors.textSecondary}
        />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Focus history unavailable
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry focus history"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.separator,
              opacity: pressed ? 0.76 : 1,
            },
          ]}
        >
          <Ionicons name="refresh" size={18} color={colors.accent} />
          <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (data.length === 0 || data.every((point) => point.value === 0)) {
    return (
      <View style={[styles.stateCard, surfaceStyle]}>
        <Ionicons name="timer-outline" size={24} color={colors.textSecondary} />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          No focus sessions yet
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, surfaceStyle]}>
      <StudyLineChart
        data={data}
        color={colors.accent}
        height={150}
        showValues={data.length <= 7}
        gridColor={colors.border}
        axisColor={colors.textSecondary}
        labelColor={colors.text}
        label={`${periodLabel} focus time`}
      />
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
  stateCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    minHeight: 132,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  stateText: { ...StudioType.bodyStrong, textAlign: "center" },
  retryButton: {
    minHeight: TouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryText: { ...StudioType.bodyStrong },
});
