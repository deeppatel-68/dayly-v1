import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { AnalyticsPeriod } from "@/utils/analytics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const PERIODS: { id: AnalyticsPeriod; label: string; compact: string }[] = [
  { id: "day", label: "Today", compact: "1D" },
  { id: "week", label: "Week", compact: "7D" },
  { id: "month", label: "Month", compact: "30D" },
  { id: "3months", label: "3 Months", compact: "13W" },
];

interface PeriodSelectorProps {
  selected: AnalyticsPeriod;
  onSelect: (period: AnalyticsPeriod) => void;
}

export default function PeriodSelector({
  selected,
  onSelect,
}: PeriodSelectorProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {PERIODS.map((period) => {
        const isSelected = selected === period.id;
        return (
          <Pressable
            key={period.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(period.id)}
            style={({ pressed }) => [
              styles.option,
              isSelected && { backgroundColor: colors.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.compact,
                { color: isSelected ? colors.background : colors.textSecondary },
              ]}
            >
              {period.compact}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.label,
                { color: isSelected ? colors.background : colors.text },
              ]}
            >
              {period.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  option: {
    flex: 1,
    minHeight: 52,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  compact: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
  },
  pressed: {
    opacity: 0.75,
  },
});
