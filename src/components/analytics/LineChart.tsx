import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Polyline, Circle, Line } from "react-native-svg";

export const LineChart = ({
  data,
  color = "#ff6b35",
  height = 150,
  showValues = true,
  label = "",
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  showValues?: boolean;
  label?: string;
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const valueRange = maxValue - minValue || 1;
  const chartHeight = height - 40;
  const chartWidth = 300; // Fixed width for SVG calculations
  const padding = 20;

  // Calculate positions for each point
  const points = data.map((item, index) => {
    const x =
      padding +
      (index / Math.max(data.length - 1, 1)) * (chartWidth - padding * 2);
    const normalizedValue = (item.value - minValue) / valueRange;
    const y = padding + (1 - normalizedValue) * chartHeight;
    return {
      x,
      y,
      value: item.value,
      label: item.label,
    };
  });

  // Create polyline points string
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Generate Y-axis scale values
  const yAxisValues = [];
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    yAxisValues.push(minValue + (valueRange * i) / steps);
  }

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: "white" }]}>{label}</Text>
      ) : null}
      <View style={styles.chartWrapper}>
        {/* Y-axis labels */}
        <View style={[styles.yAxis, { height: chartHeight + padding * 2 }]}>
          {yAxisValues.reverse().map((value, index) => (
            <Text
              key={index}
              style={[styles.yAxisLabel, { color: "#6b7280" }]}
            >
              {Math.round(value)}
            </Text>
          ))}
        </View>

        {/* Chart area with SVG */}
        <View style={[styles.chartArea, { height }]}>
          <Svg
            width="100%"
            height={chartHeight + padding * 2}
            viewBox={`0 0 ${chartWidth} ${chartHeight + padding * 2}`}
            preserveAspectRatio="xMidYMid meet"
            style={styles.svg}
          >
            {/* Grid lines */}
            {yAxisValues.map((_, index) => {
              const yPos = padding + (index / (yAxisValues.length - 1 || 1)) * chartHeight;
              return (
                <Line
                  key={`grid-${index}`}
                  x1={padding}
                  y1={yPos}
                  x2={chartWidth - padding}
                  y2={yPos}
                  stroke="#333333"
                  strokeWidth="1"
                />
              );
            })}

            {/* Line chart */}
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((point, index) => (
              <Circle
                key={`point-${index}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                stroke={color}
                strokeWidth="2"
              />
            ))}
          </Svg>

          {/* Value labels */}
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
                <Text style={[styles.valueText, { color }]}>
                  {point.value}
                </Text>
              </View>
            ))}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={styles.xAxis}>
        {points.map((point, index) => (
          <Text
            key={index}
            style={[styles.xAxisLabel, { color: "#6b7280" }]}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    fontFamily: "Outfit-SemiBold",
  },
  chartWrapper: {
    flexDirection: "row",
    width: "100%",
  },
  yAxis: {
    width: 35,
    justifyContent: "space-between",
    paddingRight: 8,
    alignItems: "flex-end",
    paddingTop: 8,
    paddingBottom: 8,
  },
  yAxisLabel: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
  },
  chartArea: {
    flex: 1,
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  valueLabel: {
    position: "absolute",
    width: 30,
    alignItems: "center",
  },
  valueText: {
    fontSize: 10,
    fontFamily: "Outfit-SemiBold",
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingLeft: 35,
  },
  xAxisLabel: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    flex: 1,
    textAlign: "center",
  },
});

export default LineChart;
