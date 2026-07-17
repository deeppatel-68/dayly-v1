import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface InsightsCardProps {
  insights: string[];
  companionName?: string;
}

export default function InsightsCard({ insights }: InsightsCardProps) {
  const { colors } = useTheme();
  if (insights.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.separator },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: colors.completedBackground }]}>
          <Ionicons name="sparkles-outline" size={17} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          Companion reflection
        </Text>
      </View>
      <Text style={[styles.insightText, { color: colors.text }]}>
        {insights.join(" ")}
      </Text>
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
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...StudioType.section,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  insightText: { ...StudioType.body },
});
