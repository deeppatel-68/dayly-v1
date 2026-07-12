import StudyLineChart from "@/components/analytics/LineChart";
import { BorderRadius, Spacing } from "@/constants/Spacing";
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

  if (loading) {
    return (
      <View
        style={[
          styles.stateCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          LOADING FOCUS HISTORY
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.stateCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={22}
          color={colors.textSecondary}
        />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          FOCUS HISTORY UNAVAILABLE
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry focus history"
          onPress={onRetry}
          style={[styles.retryButton, { borderColor: colors.border }]}
        >
          <Ionicons name="refresh" size={18} color={colors.accent} />
          <Text style={[styles.retryText, { color: colors.accent }]}>
            RETRY
          </Text>
        </Pressable>
      </View>
    );
  }

  if (data.length === 0 || data.every((point) => point.value === 0)) {
    return (
      <View
        style={[
          styles.stateCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name="timer-outline"
          size={24}
          color={colors.textSecondary}
        />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          NO FOCUS DATA YET
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
        {periodLabel} focus time
      </Text>
      <StudyLineChart
        data={data}
        color={colors.accent}
        height={150}
        showValues={data.length <= 7}
        gridColor={colors.border}
        axisColor={colors.textSecondary}
        labelColor={colors.text}
      />
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
  cardTitle: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
    marginBottom: Spacing.md,
  },
  stateCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    minHeight: 112,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  stateText: {
    fontSize: 11,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 1,
  },
  retryButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
});
