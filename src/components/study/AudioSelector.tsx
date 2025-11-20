import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type AudioMode = "SOUNDS" | "AMBIENT";

export default function AudioSelector() {
  const { colors } = useTheme();
  const [audioMode, setAudioMode] = useState<AudioMode>("SOUNDS");

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        AUDIO
      </Text>
      <View style={styles.audioButtons}>
        {(["SOUNDS", "AMBIENT"] as AudioMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={[
              styles.audioButton,
              {
                backgroundColor:
                  audioMode === mode ? colors.accent : "transparent",
                borderColor:
                  audioMode === mode ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setAudioMode(mode)}
          >
            <Ionicons
              name={mode === "SOUNDS" ? "volume-high" : "musical-notes"}
              size={20}
              color={
                audioMode === mode ? colors.background : colors.textSecondary
              }
              style={styles.audioIcon}
            />
            <Text
              style={[
                styles.audioText,
                {
                  color:
                    audioMode === mode
                      ? colors.background
                      : colors.textSecondary,
                },
              ]}
            >
              {mode}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  audioButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  audioButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    flex: 1,
    justifyContent: "center",
  },
  audioIcon: {
    marginRight: 4,
  },
  audioText: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
});

