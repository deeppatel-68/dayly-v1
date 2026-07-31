import { BorderRadius, Spacing, TouchTarget } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { AnalyticsPeriod } from "@/utils/analytics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "day", label: "Today" },
  { id: "week", label: "7D" },
  { id: "month", label: "30D" },
  { id: "3months", label: "13W" },
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
      accessibilityRole="tablist"
      style={[
        styles.container,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.separator },
      ]}
    >
      {PERIODS.map((period) => {
        const isSelected = selected === period.id;
        return (
          <Pressable
            key={period.id}
            accessibilityRole="tab"
            accessibilityLabel={`${
              period.id === "day"
                ? "Today"
                : period.id === "week"
                  ? "7 days"
                  : period.id === "month"
                    ? "30 days"
                    : "13 weeks"
            } analytics period`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(period.id)}
            style={({ pressed }) => [
              styles.option,
              isSelected && { backgroundColor: colors.accent },
              pressed && !isSelected && { backgroundColor: colors.surfaceSelected },
              pressed && isSelected && { opacity: 0.82 },
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.label,
                { color: isSelected ? colors.onAccent : colors.textSecondary },
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
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
  },
  option: {
    flex: 1,
    minHeight: TouchTarget,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  label: {
    ...StudioType.detail,
    fontWeight: "600",
    textAlign: "center",
  },
});
