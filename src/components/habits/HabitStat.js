import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function HabitStat() {
  const { colors } = useTheme();
  const { completedCount, currentStreak, totalCount } = useHabits();
  const stats = [
    { icon: "radio-button-on", label: "Active", value: totalCount },
    { icon: "flame", label: "Streak", value: currentStreak },
    { icon: "checkmark-circle", label: "Today", value: completedCount },
  ];

  return (
    <View
      style={[
        styles.strip,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {stats.map((stat, index) => (
        <View
          key={stat.label}
          style={[
            styles.item,
            index > 0 && {
              borderLeftWidth: StyleSheet.hairlineWidth,
              borderLeftColor: colors.separator,
            },
          ]}
        >
          <Ionicons name={stat.icon} size={15} color={colors.accent} />
          <Text selectable style={[styles.value, { color: colors.text }]}>
            {stat.value}
          </Text>
          <Text selectable style={[styles.label, { color: colors.textSecondary }]}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    overflow: "hidden",
  },
  item: {
    flex: 1,
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  value: { ...StudioType.metric },
  label: { ...StudioType.detail, textTransform: "uppercase", letterSpacing: 0.4 },
});
