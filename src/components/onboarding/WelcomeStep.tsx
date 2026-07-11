import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Step 1: first impression of the 3D companion — no decisions yet, just
// establishing the emotional hook ("your avatar grows as you do").
export default function WelcomeStep() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatarFrame,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <AvatarRenderer state="idle" variant="dashboard" />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        Meet your companion
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        This is your Dayly companion. It grows, glows, and levels up as you
        build habits and stay focused — a living reflection of your
        progress.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  avatarFrame: {
    width: "100%",
    height: 320,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: 15,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
});
