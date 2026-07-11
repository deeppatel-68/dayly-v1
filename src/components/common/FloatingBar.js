import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HIDDEN_ROUTE_NAMES = new Set(["customise", "profile", "social"]);

function TabButton({ iconName, isFocused, colors, onPress, onLongPress }) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      speed: 22,
      bounciness: 3,
      useNativeDriver: true,
    }).start();
  }, [isFocused, focusAnim]);

  const springTo = (value) =>
    Animated.spring(pressScale, {
      toValue: value,
      speed: 26,
      bounciness: 3,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => springTo(0.92)}
      onPressOut={() => springTo(1)}
      style={styles.tab}
    >
      {/* Active indicator - springs in when focused */}
      <Animated.View
        style={[
          styles.activeBackground,
          {
            backgroundColor: colors.accent,
            shadowColor: colors.accent,
            opacity: focusAnim,
            transform: [
              {
                scale: focusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.75, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[styles.icon, { transform: [{ scale: pressScale }] }]}
      >
        <Ionicons
          name={iconName}
          size={24}
          color={isFocused ? colors.background : colors.textSecondary}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index];

  // Hidden detail routes (Customise, Profile) own their own back navigation.
  // Keeping the main dock visible there creates inactive/unknown controls.
  if (HIDDEN_ROUTE_NAMES.has(currentRoute.name)) return null;

  return (
    <View
      style={[styles.container, { bottom: Math.max(insets.bottom - 12, 15) }]}
    >
      <BlurView
        intensity={80}
        tint="dark"
        style={[
          styles.tabBar,
          {
            backgroundColor:
              Platform.OS === "ios" ? "rgba(32, 31, 28, 0.85)" : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {state.routes
          .filter((route) => !HIDDEN_ROUTE_NAMES.has(route.name))
          .map((route) => {
            const isFocused =
              state.index ===
              state.routes.findIndex((r) => r.key === route.key);

            // Get icon name based on route and focus state
            const iconName = (() => {
              switch (route.name) {
                case "index":
                  return isFocused ? "home" : "home-outline";
                case "myspace":
                  return isFocused ? "person" : "person-outline";
                case "stats":
                  return isFocused ? "stats-chart" : "stats-chart-outline";
                case "habits":
                  return isFocused
                    ? "checkmark-circle"
                    : "checkmark-circle-outline";
                case "study":
                  return isFocused ? "book" : "book-outline";
                default:
                  return "help-circle-outline";
              }
            })();

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabButton
                key={route.key}
                iconName={iconName}
                isFocused={isFocused}
                colors={colors}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing.sm,
    right: Spacing.sm,
    alignItems: "center",
    zIndex: 1000,
    pointerEvents: "box-none",
  },
  tabBar: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 30,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
  },
  activeBackground: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    opacity: 0.95,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    zIndex: 1,
  },
});
