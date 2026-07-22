import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { ChartPoint } from "@/utils/analytics";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

interface CompletionChartCardProps {
  data: ChartPoint[];
  hasHabits: boolean;
}

const CHART_HEIGHT = 100;
const BAR_GAP = 4;

export default function CompletionChartCard({
  data,
  hasHabits,
}: CompletionChartCardProps) {
  const { colors } = useTheme();

  if (!hasHabits) return null;

  const showLabels = data.some((point) => point.label);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.separator },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
        Habit completion
      </Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="Habit completion chart"
      >
        <Svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${data.length * 10} ${CHART_HEIGHT}`}
        >
          {data.map((point, index) => {
            const barWidth = 10 - BAR_GAP;
            const x = index * 10 + BAR_GAP / 2;
            const barHeight = Math.max(2, (point.value / 100) * CHART_HEIGHT);
            const y = CHART_HEIGHT - barHeight;

            return (
              <React.Fragment key={index}>
                <Rect
                  x={x}
                  y={0}
                  width={barWidth}
                  height={CHART_HEIGHT}
                  rx={2}
                  fill={colors.checkboxEmpty}
                />
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  fill={colors.accent}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
      {showLabels ? (
        <View style={styles.labelsRow}>
          {data.map((point, index) => (
            <Text
              key={index}
              numberOfLines={1}
              style={[styles.labelText, { color: colors.textSecondary }]}
            >
              {point.label}
            </Text>
          ))}
        </View>
      ) : null}
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
  cardTitle: {
    ...StudioType.section,
    textTransform: "uppercase",
    letterSpacing: 0.2,
    marginBottom: Spacing.md,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  labelText: {
    ...StudioType.detail,
    fontSize: 10,
    flex: 1,
    textAlign: "center",
  },
});
