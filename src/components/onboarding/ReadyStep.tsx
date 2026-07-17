import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ReadyStepProps {
  companionName?: string;
}

// Step 4: the finale — companion in its reward state, one warm summary
// line, then the Start button (rendered by OnboardingFlow's shared footer).
export default function ReadyStep({ companionName }: ReadyStepProps) {
  const { colors } = useTheme();
  const displayName = companionName?.trim() || "Your companion";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatarFrame,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}
      >
        <AvatarRenderer state="reward" variant="dashboard" />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        {displayName} is ready
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Complete your first habit to earn XP and watch {displayName} grow.
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
    ...StudioType.title,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  body: {
    ...StudioType.body,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
});
