import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

function Ring({ percentage = 33, completed = 1, total = 3 }) {
  const { colors } = useTheme();

  // Configuration Constants
  const size = 200;
  const strokeWidth = 20; // Thickness of the ring
  const radius = size / 2 - strokeWidth / 2; // Radius of the ring
  const circumference = 2 * Math.PI * radius; // Circumference of the ring

  // Progress Calculation
  const progress = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.container}>
      {/* Ring Background */}
      <Svg width={size} height={size}>
        {/* Background Circle (Gray) */}
        <Circle
          cx={size / 2} // Center X = 100 (half of 200)
          cy={size / 2} // Center Y = 100 (half of 200)
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Circle - The orange ring showing completion */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.accent} // Orange color
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference} // Total length of dashes
          strokeDashoffset={progress} // How much to offset (hide)
          strokeLinecap="round" // Rounded ends
          rotation="-90" // Rotate to start at top
          origin={`${size / 2}, ${size / 2}`} // Rotate around center
        />
      </Svg>

      {/* Center Text */}
      <View style={styles.centerText}>
        <Text style={[styles.percentage, { color: colors.text }]}>
          {percentage}%
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {completed} of {total} habits
        </Text>
      </View>
    </View>
  );
}

export default Ring;
const styles = StyleSheet.create({
  container: {
    alignItems: "center", // Center children horizontally
    justifyContent: "center", // Center children vertically
    marginVertical: 20, // 30px space above and below
  },
  centerText: {
    position: "absolute", // Float above everything else
    alignItems: "center", // Center text horizontally
  },
  percentage: {
    fontSize: 40,
    fontFamily: "Outfit-Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    marginTop: 4,
  },
});
