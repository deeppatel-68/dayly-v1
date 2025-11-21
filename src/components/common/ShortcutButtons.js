import { Spacing } from "@/constants/Spacing";
import { FontSizes } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

function ShortcutButtons() {
  const { colors } = useTheme();
  const router = useRouter();
  const buttons = [
    {
      icon: "book-outline",
      label: "Study",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/study");
      },
    },
    {
      icon: "checkmark-circle-outline",
      label: "Habits",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/habits");
      },
    },
    {
      icon: "stats-chart-outline",
      label: "Stats",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/stats");
      },
    },
  ];
  return (
    <View>
      <Text style={[styles.title, { color: colors.text }]}>Quick Launch</Text>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {buttons.map((button) => (
          <Pressable
            key={button.label}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={button.onPress}
          >
            <Ionicons name={button.icon} size={28} color={colors.text} />
            <Text style={[styles.buttonText, { color: colors.text }]}>
              {button.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default ShortcutButtons;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 10,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  buttonText: {
    marginTop: 10,
    fontSize: FontSizes.base,
    fontFamily: "Outfit-Regular",
  },
  title: {
    fontSize: FontSizes["2xl"],
    fontFamily: "Outfit-SemiBold",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    marginLeft: Spacing.sm,
    letterSpacing: 0.5,
  },
});
