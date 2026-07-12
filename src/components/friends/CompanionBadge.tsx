import { DEFAULT_BODY_COLOR } from "@/data/avatarColors";
import type { CompanionAppearance } from "@/types/friends";
import { companionGlyphFor } from "@/utils/leaderboard";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

interface CompanionBadgeProps {
  companion: CompanionAppearance;
  size?: number;
}

// A friend's companion identity as a cheap 2D badge: body-colour disc,
// accent ring, visor face dots, and the equipped accessory as a glyph.
// FlatList-safe — no GL contexts (see CLAUDE.md 3D gotchas).
export default function CompanionBadge({
  companion,
  size = 44,
}: CompanionBadgeProps) {
  const bodyColor = companion.bodyColor ?? DEFAULT_BODY_COLOR;
  const accentColor = companion.accentColor ?? "#D97757";
  const glyph = companionGlyphFor(companion.accessoryId);
  const visorWidth = size * 0.62;
  const visorHeight = size * 0.34;
  const eyeSize = Math.max(3, size * 0.1);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bodyColor,
            borderColor: accentColor,
          },
        ]}
      >
        <View
          style={[
            styles.visor,
            {
              width: visorWidth,
              height: visorHeight,
              borderRadius: visorHeight / 2,
            },
          ]}
        >
          <View
            style={[
              styles.eye,
              { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 },
            ]}
          />
          <View
            style={[
              styles.eye,
              { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 },
            ]}
          />
        </View>
      </View>
      {glyph ? (
        <View
          style={[
            styles.glyphBadge,
            {
              backgroundColor: accentColor,
              width: size * 0.42,
              height: size * 0.42,
              borderRadius: size * 0.21,
            },
          ]}
        >
          <Ionicons
            name={glyph as keyof typeof Ionicons.glyphMap}
            size={size * 0.24}
            color="#ffffff"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  visor: {
    backgroundColor: "#17171A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  eye: {
    backgroundColor: "#FFE3BD",
  },
  glyphBadge: {
    position: "absolute",
    bottom: -2,
    right: -4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#00000030",
  },
});
