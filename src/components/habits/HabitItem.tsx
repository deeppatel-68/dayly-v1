import { BorderRadius, Spacing, TouchTarget } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { Habit } from "@/types/habits";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import EditHabitModel from "./EditHabitModel";

interface HabitItemProps {
  habit: Habit;
  last?: boolean;
}

export default function HabitItem({ habit, last = false }: HabitItemProps) {
  const { colors } = useTheme();
  const { toggleHabit, deleteHabit, updateHabit } = useHabits();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const checkScale = useSharedValue(1);

  useEffect(() => {
    if (!habit.completed) return;
    checkScale.value = withSequence(
      withSpring(1.12, { damping: 15, stiffness: 360 }),
      withSpring(1, { damping: 18, stiffness: 310 }),
    );
  }, [checkScale, habit.completed]);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleToggle = async () => {
    if (isToggling) return;
    Haptics.impactAsync(
      habit.completed
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    ).catch(() => {});

    try {
      setIsToggling(true);
      const reward = await toggleHabit(habit.id);
      if (reward?.awarded) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {},
        );
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleMore = () => {
    Alert.alert(habit.title, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => setShowEditModal(true) },
      {
        text: "Archive habit",
        style: "destructive",
        onPress: () => deleteHabit(habit.id),
      },
    ]);
  };

  const handleSaveEdit = async (title: string, description: string) => {
    await updateHabit(habit.id, title, description);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    setShowEditModal(false);
  };

  return (
    <>
      <View
        style={[
          styles.row,
          !last && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.separator,
          },
        ]}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Mark ${habit.title} as ${habit.completed ? "incomplete" : "complete"}`}
          accessibilityState={{ checked: habit.completed, disabled: isToggling }}
          disabled={isToggling}
          onPress={handleToggle}
          hitSlop={4}
          style={styles.checkPressable}
        >
          <Animated.View
            style={[
              styles.checkbox,
              checkAnimatedStyle,
              {
                borderColor: habit.completed ? colors.completed : colors.border,
                backgroundColor: habit.completed
                  ? colors.completed
                  : colors.backgroundSecondary,
              },
            ]}
          >
            {habit.completed ? (
              <Ionicons name="checkmark" size={17} color={colors.onAccent} />
            ) : null}
          </Animated.View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Toggle ${habit.title}`}
          disabled={isToggling}
          onPress={handleToggle}
          style={({ pressed }) => [styles.copyPressable, pressed && { opacity: 0.66 }]}
        >
          <Text
            selectable
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: habit.completed ? colors.textSecondary : colors.text,
                textDecorationLine: habit.completed ? "line-through" : "none",
              },
            ]}
          >
            {habit.title}
          </Text>
          {habit.description?.trim() ? (
            <Text selectable numberOfLines={1} style={[styles.description, { color: colors.textSecondary }]}>
              {habit.description}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`More options for ${habit.title}`}
          onPress={handleMore}
          hitSlop={4}
          style={({ pressed }) => [styles.moreButton, pressed && { backgroundColor: colors.surfaceSelected }]}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <EditHabitModel
        isVisible={showEditModal}
        habitTitle={habit.title}
        habitDescription={habit.description || ""}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TouchTarget + 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  checkPressable: {
    width: TouchTarget,
    height: TouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  copyPressable: {
    flex: 1,
    minHeight: TouchTarget,
    justifyContent: "center",
    gap: 2,
  },
  title: { ...StudioType.body },
  description: { ...StudioType.detail },
  moreButton: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
