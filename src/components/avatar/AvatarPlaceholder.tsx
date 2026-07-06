import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { AvatarRendererProps } from "./avatarTypes";
import { useAvatarData } from "./useAvatarData";

// Polished no-asset fallback: a breathing accent core with a level badge.
// Used when neither the 2.5D assets nor the 3D fallback are available.
export default function AvatarPlaceholder(props: AvatarRendererProps) {
  const { state = "idle" } = props;
  const { colors } = useTheme();
  const { level, accentColor } = useAvatarData(props);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const celebrating = state === "reward" || state === "levelUp";
    const duration = celebrating ? 450 : state === "focus" ? 800 : 1400;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.halo,
          {
            backgroundColor: accentColor,
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08, 0.2],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1.06],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          {
            backgroundColor: accentColor,
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.08],
                }),
              },
            ],
          },
        ]}
      />
      <View
        style={[
          styles.badge,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.badgeText, { color: colors.text }]}>
          Lv {level}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  halo: {
    position: "absolute",
    width: "55%",
    aspectRatio: 1,
    borderRadius: 9999,
  },
  core: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
});
