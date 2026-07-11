import { Spacing } from "@/constants/Spacing";
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
          borderColor={colors.border}
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
  borderColor,
  textColor,
  onSelect,
}: {
  hex: string;
  name: string;
  selected: boolean;
  showName: boolean;
  accentColor: string;
  borderColor: string;
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
      style={styles.option}
    >
      {({ pressed }) => (
        <>
          <Animated.View
            style={[
              styles.swatch,
              {
                backgroundColor: hex,
                borderColor: selected ? accentColor : borderColor,
                borderWidth: selected ? 3 : 1,
                opacity: pressed ? 0.8 : 1,
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
    gap: Spacing.md,
  },
  option: {
    alignItems: "center",
    minWidth: 38,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  name: {
    fontFamily: "Outfit-Regular",
    fontSize: 11,
    marginTop: Spacing.xs,
    maxWidth: 52,
  },
});
