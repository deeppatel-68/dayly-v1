import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
              Platform.OS === "ios" ? "rgba(26, 26, 26, 0.8)" : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

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
              case "social":
                return isFocused ? "people" : "people-outline";
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
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              {/* Active indicator - glowing circle */}
              {isFocused && (
                <View
                  style={[
                    styles.activeBackground,
                    {
                      backgroundColor: colors.accent,
                      shadowColor: colors.accent,
                    },
                  ]}
                />
              )}

              {/* Icon */}
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? colors.background : colors.textSecondary}
                style={styles.icon}
              />
            </Pressable>
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
    opacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  icon: {
    zIndex: 1,
  },
});
