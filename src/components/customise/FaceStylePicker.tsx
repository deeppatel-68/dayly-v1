import { BorderRadius, Spacing } from "@/constants/Spacing";
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
          borderColor={colors.border}
          cardColor={colors.card}
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
  borderColor,
  cardColor,
  textColor,
  onSelect,
}: {
  name: string;
  selected: boolean;
  accentColor: string;
  borderColor: string;
  cardColor: string;
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
              backgroundColor: cardColor,
              borderColor: selected ? accentColor : borderColor,
              borderWidth: selected ? 2 : 1,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale }],
            },
          ]}
        >
          <Text style={[styles.chipText, { color: textColor }]}>{name}</Text>
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
    minHeight: 40,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    fontFamily: "Outfit-SemiBold",
    fontSize: 14,
  },
});
