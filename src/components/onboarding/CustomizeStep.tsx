import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import BodyColorPicker from "@/components/customise/BodyColorPicker";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

const NAME_MAX_LENGTH = 20;

interface CustomizeStepProps {
  name: string;
  onChangeName: (name: string) => void;
  bodyColor: string;
  onSelectBodyColor: (hex: string) => void;
}

// Step 2: name the companion and pick its body colour. Body colour persists
// immediately (matches the shop's swatch pattern); name commits when the
// user continues, so a half-typed name never gets saved prematurely.
export default function CustomizeStep({
  name,
  onChangeName,
  bodyColor,
  onSelectBodyColor,
}: CustomizeStepProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatarFrame,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <AvatarRenderer state="idle" variant="shop" bodyColor={bodyColor} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Make it yours</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Give your companion a name and a colour. You can change these later
        in the shop.
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        value={name}
        onChangeText={onChangeName}
        placeholder="Name your companion (e.g. Nova, Pip, Ember)"
        placeholderTextColor={colors.textSecondary}
        maxLength={NAME_MAX_LENGTH}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
      />

      <BodyColorPicker value={bodyColor} onChange={onSelectBodyColor} />
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
    height: 220,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
    fontFamily: "Outfit-Medium",
    marginBottom: Spacing.lg,
  },
});
