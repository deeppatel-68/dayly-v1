import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useHabits } from "@/context/HabitsContext";
function HabitStat() {
  const { colors } = useTheme();
  const { completedCount, currentStreak, totalCount } = useHabits();
  // Calculate total completions across all habits and all dates
  const stats = [
    {
      icon: "radio-button-on",
      label: "ACTIVE",
      value: totalCount,
    },
    {
      icon: "flame",
      label: "STREAK",
      value: currentStreak.toString(),
    },
    {
      icon: "checkmark-circle",
      label: "TOTAL",
      value: completedCount.toString(),
    },
  ];
  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name={stat.icon} size={24} color={colors.text} />
          <Text style={[styles.value, { color: colors.text }]}>
            {stat.value}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default HabitStat;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  // UPDATE card style (around line 65):
  card: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    // ADD THESE:
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  value: {
    fontSize: 32,
    fontFamily: "Outfit-Bold",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    letterSpacing: 0.5,
    paddingBottom: Spacing.xs,
  },
});
