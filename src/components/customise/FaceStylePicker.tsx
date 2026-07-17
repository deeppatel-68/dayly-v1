import { BorderRadius, Spacing, TouchTarget } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { AVATAR_FACE_STYLES, FaceStyle } from "@/data/faceStyles";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

interface FaceStylePickerProps {
  value: FaceStyle;
  onChange: (faceStyle: FaceStyle) => void;
}

export default function FaceStylePicker({
  value,
  onChange,
}: FaceStylePickerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {AVATAR_FACE_STYLES.map((style) => (
        <FaceChip
          key={style.id}
          name={style.name}
          selected={value === style.id}
          accentColor={colors.accent}
          focusRingColor={colors.focusRing}
          surfaceColor={colors.surface}
          selectedSurfaceColor={colors.surfaceSelected}
          separatorColor={colors.separator}
          textColor={colors.text}
          onSelect={() => {
            Haptics.selectionAsync().catch(() => {});
            onChange(style.id);
          }}
        />
      ))}
    </View>
  );
}

function FaceChip({
  name,
  selected,
  accentColor,
  focusRingColor,
  surfaceColor,
  selectedSurfaceColor,
  separatorColor,
  textColor,
  onSelect,
}: {
  name: string;
  selected: boolean;
  accentColor: string;
  focusRingColor: string;
  surfaceColor: string;
  selectedSurfaceColor: string;
  separatorColor: string;
  textColor: string;
  onSelect: () => void;
}) {
  const scale = useRef(new Animated.Value(selected ? 1.05 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.05 : 1,
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
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.chip,
            {
              backgroundColor: selected ? selectedSurfaceColor : surfaceColor,
              borderColor: selected ? focusRingColor : separatorColor,
              borderWidth: 1,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale }],
            },
          ]}
        >
          <Text style={[styles.chipText, { color: selected ? accentColor : textColor }]}>
            {name}
          </Text>
        </Animated.View>
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
  chip: {
    minHeight: TouchTarget,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md + Spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    ...StudioType.bodyStrong,
  },
});
