// components/HabitListItem.tsx
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { Habit } from "@/types/habits";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Alert,
  ColorValue,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import EditHabitModel from "./EditHabitModel";

interface HabitItemProps {
  habit: Habit;
}

const hexToRgba = (color: string, alpha = 1) => {
  if (!color.startsWith("#")) return color;
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const HabitItem = ({ habit }: HabitItemProps) => {
  const { colors, colorScheme } = useTheme();
  const { toggleHabit, deleteHabit, updateHabit } = useHabits();

  //modal states
  const [showEditModal, setShowEditModal] = useState(false);

  //Animation Value
  const cardScale = useSharedValue(1);

  const handleToggle = () => {
    Haptics.impactAsync(
      habit.completed
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );

    toggleHabit(habit.id);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Habit",
      `Are you sure you want to delete ${habit.title}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // Success feedback
            deleteHabit(habit.id); // Delete habit
          },
        },
      ]
    );
  };

  const renderRightActions = () => (
    <Pressable onPress={handleDelete} style={styles.deleteAction}>
      <Ionicons name="trash-outline" size={24} color="#FFF" />
      <Text style={styles.deleteText}>Delete</Text>
    </Pressable>
  );

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEditModal(true);
  };

  const handleSaveEdit = (title: string, description: string) => {
    updateHabit(habit.id, title, description);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // Success feedback
    setShowEditModal(false);
  };

  const gradientColors = useMemo<[ColorValue, ColorValue]>(() => {
    const primary = hexToRgba(colors.card, 0.98);
    const secondaryOpacity = colorScheme === "dark" ? 0.8 : 0.9;
    return [primary, hexToRgba(colors.card, secondaryOpacity)];
  }, [colorScheme, colors.card]);

  const handleCardPressIn = () => {
    cardScale.value = withSpring(0.97, { damping: 12, stiffness: 200 });
  };

  const handleCardPressOut = () => {
    cardScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const preventPropagation =
    (callback: () => void) => (event: GestureResponderEvent) => {
      event.stopPropagation();
      callback();
    };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const subtleBorder =
    colorScheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const shadowBase = colorScheme === "dark" ? "#000000" : "#0f0f0f";

  return (
    <>
      <Animated.View
        style={[
          styles.cardWrapper,
          { shadowColor: shadowBase },
          cardAnimatedStyle,
        ]}
      >
        <Pressable
          onPress={handleToggle}
          onPressIn={handleCardPressIn}
          onPressOut={handleCardPressOut}
          style={({ pressed }) => [
            styles.pressableContainer,
            {
              borderColor: subtleBorder,
              opacity: pressed ? 0.98 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradientBackground,
              { backgroundColor: colors.card },
            ]}
          >
            <Pressable
              onPress={preventPropagation(handleToggle)}
              style={styles.checkboxContainer}
            >
              <Animated.View
                style={[
                  styles.checkbox,
                  {
                    borderColor: habit.completed
                      ? colors.completed
                      : colors.border,
                    backgroundColor: habit.completed
                      ? colors.completed
                      : colors.checkboxEmpty,
                  },
                ]}
              >
                {habit.completed && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.text}
                  />
                )}
              </Animated.View>
            </Pressable>
            <View style={styles.content}>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.text,
                    textDecorationLine: habit.completed
                      ? "line-through"
                      : "none",
                    opacity: habit.completed ? 0.6 : 1,
                  },
                ]}
              >
                {habit.title}
              </Text>
              {habit.description && habit.description.trim() !== "" && (
                <Text
                  style={[
                    styles.description,
                    {
                      color: colors.textSecondary,
                      opacity: habit.completed ? 0.5 : 0.85,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {habit.description}
                </Text>
              )}
            </View>
            <View style={styles.actionButtons}>
              <Pressable
                onPress={preventPropagation(handleEdit)}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Ionicons name="create-outline" size={18} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={preventPropagation(handleDelete)}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
      <EditHabitModel
        isVisible={showEditModal}
        habitTitle={habit.title}
        habitDescription={habit.description || ""}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />
    </>
  );
};

export default HabitItem;

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  pressableContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  gradientBackground: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  checkboxContainer: {
    padding: Spacing.xs,
  },
  checkbox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontSize: 18,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteAction: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "85%",
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    gap: 4,
    padding: Spacing.md,
  },
  deleteText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
});
