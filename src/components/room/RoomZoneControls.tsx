import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { RoomView } from "./roomNavigation";

const ZONES: {
  view: RoomView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { view: "home", label: "Home view", icon: "home" },
  { view: "desk", label: "Desk view", icon: "laptop" },
  { view: "windowShelf", label: "Window and shelf view", icon: "albums" },
];

export default function RoomZoneControls({
  value,
  onChange,
}: {
  value: RoomView;
  onChange: (view: RoomView) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.rail,
        { borderColor: colors.border, backgroundColor: colors.glassFallback },
      ]}
      accessibilityRole="tablist"
      pointerEvents="auto"
    >
      {ZONES.map((zone) => {
        const selected = value === zone.view;
        return (
          <Pressable
            key={zone.view}
            accessibilityRole="tab"
            accessibilityLabel={zone.label}
            accessibilityState={{ selected }}
            hitSlop={6}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(zone.view);
            }}
            style={({ pressed }) => [
              styles.button,
              selected && { backgroundColor: colors.accent },
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons
              name={zone.icon}
              size={19}
              color={selected ? colors.onAccent : colors.text}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    right: Spacing.md,
    top: "22%",
    gap: 6,
    padding: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});
