import { BorderRadius, Spacing } from "@/constants/Spacing";
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
  return (
    <View style={styles.rail} accessibilityRole="tablist">
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
              selected && styles.buttonSelected,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons
              name={zone.icon}
              size={19}
              color={selected ? "#171512" : "#F0EEE6"}
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
    borderColor: "rgba(240,238,230,0.14)",
    backgroundColor: "rgba(24,23,21,0.82)",
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSelected: {
    backgroundColor: "#D97757",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});
