import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { AVATAR_BODY_COLORS } from "@/data/avatarColors";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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

      <View style={styles.swatchRow}>
        {AVATAR_BODY_COLORS.map((swatch) => (
          <ColorSwatch
            key={swatch.id}
            hex={swatch.hex}
            name={swatch.name}
            selected={bodyColor === swatch.hex}
            accentColor={colors.accent}
            borderColor={colors.border}
            onSelect={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectBodyColor(swatch.hex);
            }}
          />
        ))}
      </View>
    </View>
  );
}

// Body colour swatch with a spring when it becomes selected — copied from
// the shop's ColorSwatch pattern (StudySpacePlaceholder.tsx) since it's not
// exported for reuse.
function ColorSwatch({
  hex,
  name,
  selected,
  accentColor,
  borderColor,
  onSelect,
}: {
  hex: string;
  name: string;
  selected: boolean;
  accentColor: string;
  borderColor: string;
  onSelect: () => void;
}) {
  const scale = useRef(new Animated.Value(selected ? 1.08 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.08 : 1,
      speed: 24,
      bounciness: 3,
      useNativeDriver: true,
    }).start();
  }, [selected, scale]);

  return (
    <Pressable accessibilityLabel={name} onPress={onSelect}>
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.swatch,
            {
              backgroundColor: hex,
              borderColor: selected ? accentColor : borderColor,
              borderWidth: selected ? 2 : 1,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale }],
            },
          ]}
        />
      )}
    </Pressable>
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
  swatchRow: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});
