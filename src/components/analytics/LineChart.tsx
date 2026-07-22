import { StudioType } from "@/constants/Typography";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

export const LineChart = ({
  data,
  color = "#D97757",
  height = 150,
  showValues = true,
  label = "",
  gridColor = "#333333",
  axisColor = "#6b7280",
  labelColor = "#ffffff",
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  showValues?: boolean;
  label?: string;
  gridColor?: string;
  axisColor?: string;
  labelColor?: string;
}) => {
  const maxValue = Math.max(...data.map((datum) => datum.value), 1);
  const minValue = Math.min(...data.map((datum) => datum.value), 0);
  const valueRange = maxValue - minValue || 1;
  const chartHeight = height - 40;
  const chartWidth = 300;
  const padding = 20;
  const yAxisValues = Array.from({ length: 5 }, (_, index) => {
    return minValue + (valueRange * index) / 4;
  });

  const points = data.map((item, index) => {
    const x =
      padding +
      (index / Math.max(data.length - 1, 1)) * (chartWidth - padding * 2);
    const normalizedValue = (item.value - minValue) / valueRange;
    const y = padding + (1 - normalizedValue) * chartHeight;

    return { x, y, value: item.value, label: item.label };
  });
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label || "Focus trend chart"}
      style={styles.container}
    >
      {label ? (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      ) : null}

      <View style={styles.chartWrapper}>
        <View style={[styles.yAxis, { height: chartHeight + padding * 2 }]}>
          {[...yAxisValues].reverse().map((value, index) => (
            <Text key={index} style={[styles.yAxisLabel, { color: axisColor }]}>
              {Math.round(value)}
            </Text>
          ))}
        </View>

        <View style={[styles.chartArea, { height }]}>
          <Svg
            width="100%"
            height={chartHeight + padding * 2}
            viewBox={`0 0 ${chartWidth} ${chartHeight + padding * 2}`}
            preserveAspectRatio="xMidYMid meet"
            style={styles.svg}
          >
            {yAxisValues.map((_, index) => {
              const yPosition =
                padding + (index / (yAxisValues.length - 1 || 1)) * chartHeight;
              return (
                <Line
                  key={`grid-${index}`}
                  x1={padding}
                  y1={yPosition}
                  x2={chartWidth - padding}
                  y2={yPosition}
                  stroke={gridColor}
                  strokeWidth="1"
                />
              );
            })}

            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, index) => (
              <Circle
                key={`point-${index}`}
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill={color}
                stroke={color}
                strokeWidth="2"
              />
            ))}
          </Svg>

          {showValues &&
            points.map((point, index) => (
              <View
                key={`label-${index}`}
                style={[
                  styles.valueLabel,
                  {
                    left: point.x - 15,
                    top: point.y < chartHeight / 2 ? point.y + 12 : point.y - 20,
                  },
                ]}
              >
                <Text style={[styles.valueText, { color }]}>{point.value}</Text>
              </View>
            ))}
        </View>
      </View>

      <View style={styles.xAxis}>
        {points.map((point, index) => (
          <Text key={index} style={[styles.xAxisLabel, { color: axisColor }]}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%" },
  label: { ...StudioType.bodyStrong, marginBottom: 12 },
  chartWrapper: { flexDirection: "row", width: "100%" },
  yAxis: {
    width: 35,
    justifyContent: "space-between",
    paddingRight: 8,
    alignItems: "flex-end",
    paddingTop: 8,
    paddingBottom: 8,
  },
  yAxisLabel: { ...StudioType.detail, fontSize: 11 },
  chartArea: { flex: 1, position: "relative" },
  svg: { position: "absolute", top: 0, left: 0, right: 0 },
  valueLabel: { position: "absolute", width: 30, alignItems: "center" },
  valueText: { ...StudioType.detail, fontWeight: "600" },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingLeft: 35,
  },
  xAxisLabel: { ...StudioType.detail, fontSize: 11, flex: 1, textAlign: "center" },
});

export default LineChart;
