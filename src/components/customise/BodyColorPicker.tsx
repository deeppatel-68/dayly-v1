import { BorderRadius, Spacing, TouchTarget } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { AVATAR_BODY_COLORS } from "@/data/avatarColors";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

interface BodyColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  showNames?: boolean;
}

export default function BodyColorPicker({
  value,
  onChange,
  showNames = false,
}: BodyColorPickerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {AVATAR_BODY_COLORS.map((swatch) => (
        <ColorSwatch
          key={swatch.id}
          hex={swatch.hex}
          name={swatch.name}
          selected={value.toLowerCase() === swatch.hex.toLowerCase()}
          showName={showNames}
          accentColor={colors.accent}
          focusRingColor={colors.focusRing}
          surfaceColor={colors.surface}
          selectedSurfaceColor={colors.surfaceSelected}
          separatorColor={colors.separator}
          textColor={colors.textSecondary}
          onSelect={() => {
            Haptics.selectionAsync().catch(() => {});
            onChange(swatch.hex);
          }}
        />
      ))}
    </View>
  );
}

function ColorSwatch({
  hex,
  name,
  selected,
  showName,
  accentColor,
  focusRingColor,
  surfaceColor,
  selectedSurfaceColor,
  separatorColor,
  textColor,
  onSelect,
}: {
  hex: string;
  name: string;
  selected: boolean;
  showName: boolean;
  accentColor: string;
  focusRingColor: string;
  surfaceColor: string;
  selectedSurfaceColor: string;
  separatorColor: string;
  textColor: string;
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
  }, [scale, selected]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? selectedSurfaceColor : surfaceColor,
          borderColor: selected ? focusRingColor : separatorColor,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      {() => (
        <>
          <Animated.View
            style={[
              styles.swatch,
              {
                backgroundColor: hex,
                borderColor: selected ? accentColor : surfaceColor,
                borderWidth: selected ? 3 : 2,
                transform: [{ scale }],
              },
            ]}
          />
          {showName && (
            <Text numberOfLines={1} style={[styles.name, { color: textColor }]}>
              {name.split(" ")[0]}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    width: TouchTarget,
    minHeight: TouchTarget,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  name: {
    ...StudioType.detail,
    marginTop: 2,
    maxWidth: TouchTarget + Spacing.xs,
    textAlign: "center",
  },
});
