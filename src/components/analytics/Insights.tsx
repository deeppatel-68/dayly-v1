import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export const InsightsCard = ({ insights }: { insights: string[] }) => {
  const { colors } = useTheme();
  if (insights.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="trending-up" size={16} color={colors.accent} />
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          AI INSIGHT
        </Text>
      </View>
      <Text style={[styles.insightText, { color: colors.text }]}>
        {insights.join(" ")}
      </Text>
    </View>
  );
};

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
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  title: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    letterSpacing: 1,
  },
  insightText: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
    letterSpacing: 0.5,
  },
});

export default InsightsCard;
