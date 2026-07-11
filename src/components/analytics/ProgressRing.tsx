import React from "react";
import { Text, View } from "react-native";

export const CircularProgress = ({
  progress,
  size = 80,
  strokeWidth = 8,
  color = "#00CFFF",
  bgColor = "#1a2633",
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
}) => {
  // Note: SVG implementation would be ideal, but simplified View-based implementation
  // is requested/provided in prompt. Using basic rotation logic.

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background Circle */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: bgColor,
        }}
      />
      {/* Progress Circle - Simplified representation */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: progress < 25 ? "transparent" : color,
          borderRightColor: progress < 50 ? "transparent" : color,
          borderBottomColor: progress < 75 ? "transparent" : color,
          borderLeftColor:
            progress < 95 ? (progress >= 75 ? color : "transparent") : color,
          transform: [{ rotate: `${progress * 3.6 - 45}deg` }], // Adjusted rotation
          // This View-based partial circle is tricky without SVG.
          // For now, I'll stick to the prompt's simplified implementation but maybe slightly adjusted.
          // The prompt's implementation:
          // borderTopColor: progress < 25 ? 'transparent' : color, ...
          // This creates a rough approximation.
        }}
      />
      {/* Re-implementing prompt's logic exactly to match expected output style */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: progress < 25 ? "transparent" : color,
          borderRightColor: progress < 50 ? "transparent" : color,
          borderBottomColor: progress < 75 ? "transparent" : color,
          borderLeftColor: progress < 100 ? "transparent" : color, // Added left
          transform: [{ rotate: `${progress * 3.6 - 45}deg` }],
        }}
      />

      <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>
        {Math.round(progress)}%
      </Text>
    </View>
  );
};

export default CircularProgress;
