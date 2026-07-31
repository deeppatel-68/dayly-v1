import { StudioType } from "@/constants/Typography";
import { ChartPoint } from "@/utils/analytics";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

const VIEWBOX_WIDTH = 320;
const PLOT_LEFT = 30;
const PLOT_RIGHT = 10;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 28;

type TrendChartProps = {
  data: ChartPoint[];
  color: string;
  height?: number;
  label?: string;
  gridColor: string;
  axisColor: string;
  labelColor: string;
};

export default function StudyTrendChart({
  data,
  color,
  height = 164,
  label,
  gridColor,
  axisColor,
  labelColor,
}: TrendChartProps) {
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const plotHeight = height - PLOT_TOP - PLOT_BOTTOM;
  const plotWidth = VIEWBOX_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const bandWidth = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.max(4, Math.min(18, bandWidth * 0.54));
  const gridValues = [0, 0.5, 1].map((fraction) =>
    Math.round(maxValue * fraction)
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? "Focus trend chart"}
      style={styles.container}
    >
      {label ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {gridValues.map((value, index) => {
          const fraction = index / (gridValues.length - 1);
          const y = PLOT_TOP + (1 - fraction) * plotHeight;
          return (
            <React.Fragment key={`${value}-${index}`}>
              <Line
                x1={PLOT_LEFT}
                x2={VIEWBOX_WIDTH - PLOT_RIGHT}
                y1={y}
                y2={y}
                stroke={gridColor}
                strokeWidth={1}
              />
              <SvgText
                x={PLOT_LEFT - 7}
                y={y + 3.5}
                fill={axisColor}
                fontSize={9}
                textAnchor="end"
              >
                {value}
              </SvgText>
            </React.Fragment>
          );
        })}
        {data.map((point, index) => {
          const x = PLOT_LEFT + index * bandWidth + (bandWidth - barWidth) / 2;
          const barHeight =
            point.value > 0 ? Math.max(3, (point.value / maxValue) * plotHeight) : 0;
          const y = PLOT_TOP + plotHeight - barHeight;
          const labelX = PLOT_LEFT + index * bandWidth + bandWidth / 2;

          return (
            <React.Fragment key={`${point.label}-${index}`}>
              {barHeight > 0 ? (
                <Rect x={x} y={y} width={barWidth} height={barHeight} rx={barWidth / 2} fill={color} />
              ) : null}
              {point.label ? (
                <SvgText
                  x={labelX}
                  y={height - 6}
                  fill={axisColor}
                  fontSize={9}
                  textAnchor="middle"
                >
                  {point.label}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  label: { ...StudioType.bodyStrong, marginBottom: 8 },
});
