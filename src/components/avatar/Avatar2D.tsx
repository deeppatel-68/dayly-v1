import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { AvatarRendererProps } from "./avatarTypes";
import { AvatarManifest } from "./manifest";
import { useAvatarData } from "./useAvatarData";

interface Avatar2DProps extends AvatarRendererProps {
  manifest: AvatarManifest;
}

// 2.5D renderer: layered pose/accessory/aura images animated with RN
// Animated (idle bob, focus glow pulse, reward bounce, level-up pulse).
// No GL, no extra dependencies.
export default function Avatar2D({ manifest, ...props }: Avatar2DProps) {
  const { state = "idle", variant = "dashboard" } = props;
  const { levelTier, streakTier, accentColor, equippedItems } =
    useAvatarData(props);

  const bob = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  // Idle/focus bob loop; quicker and shallower while focused
  useEffect(() => {
    const amplitude = state === "focus" ? 3 : 6;
    const duration = state === "focus" ? 800 : 1300;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -amplitude,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state, bob]);

  // Focus glow pulse behind the pet
  useEffect(() => {
    if (state !== "focus") {
      glow.setValue(0);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [state, glow]);

  // Reward bounce / level-up pulse
  useEffect(() => {
    if (state !== "reward" && state !== "levelUp") return;

    const strength = state === "levelUp" ? 1.12 : 1.08;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.spring(scale, {
          toValue: strength,
          speed: 20,
          bounciness: 12,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          speed: 20,
          bounciness: 12,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => {
      pulse.stop();
      scale.setValue(1);
    };
  }, [state, scale]);

  const pose = manifest.poses[state] ?? manifest.poses.idle;
  const auraOpacity = Math.min(1, 0.25 + levelTier * 0.2 + streakTier * 0.1);

  return (
    <View style={styles.container}>
      {/* Focus glow halo */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: accentColor,
            opacity: glow.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.22],
            }),
            transform: [
              {
                scale: glow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1.05],
                }),
              },
            ],
          },
        ]}
      />
      {manifest.aura && (
        <Image
          source={manifest.aura}
          style={[styles.layer, { opacity: auraOpacity }]}
          resizeMode="contain"
        />
      )}
      <Animated.View
        style={[
          styles.layer,
          variant === "shop" && styles.shopPreview,
          { transform: [{ translateY: bob }, { scale }] },
        ]}
      >
        <Image source={pose} style={styles.image} resizeMode="contain" />
        {equippedItems.map((id) => {
          const overlay = manifest.accessories?.[id];
          if (!overlay) return null;
          return (
            <Image
              key={id}
              source={overlay}
              style={[styles.image, StyleSheet.absoluteFillObject]}
              resizeMode="contain"
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  shopPreview: {
    transform: [{ scale: 0.9 }],
  },
  glow: {
    position: "absolute",
    width: "70%",
    aspectRatio: 1,
    borderRadius: 9999,
  },
  image: {
    width: "85%",
    height: "85%",
  },
});
