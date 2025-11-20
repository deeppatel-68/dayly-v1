// components/HabitListItem.tsx
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { Habit } from "@/types/habits";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
}

const HabitItem = ({ habit }: HabitItemProps) => {
  const { colors } = useTheme();
  const { toggleHabit, deleteHabit, updateHabit } = useHabits();

  //modal states
  const [showEditModal, setShowEditModal] = useState(false);

  //Animation Value
  const scale = useSharedValue(1);

  const handleToggle = () => {
    // Animate checkbox
    scale.value = withSequence(
      withSpring(1.3, { damping: 2 }),
      withSpring(1, { damping: 2 })
    );

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

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Pressable onPress={handleToggle} style={styles.checkboxContainer}>
        <Animated.View
          style={[
            styles.checkbox,
            {
              borderColor: habit.completed ? colors.completed : colors.border,
              backgroundColor: habit.completed
                ? colors.completed
                : colors.checkboxEmpty,
            },
          ]}
        >
          {habit.completed && (
            <Ionicons name="checkmark-circle" size={20} color={colors.text} />
          )}
        </Animated.View>
      </Pressable>
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              textDecorationLine: habit.completed ? "line-through" : "none",
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
                opacity: habit.completed ? 0.5 : 0.8,
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
          onPress={handleEdit}
          style={({ pressed }) => [
            styles.actionButton,
            styles.editButton,
            {
              backgroundColor: colors.backgroundSecondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="create-outline" size={18} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.actionButton,
            styles.deleteButton,
            {
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </Pressable>
      </View>
      <EditHabitModel
        isVisible={showEditModal}
        habitTitle={habit.title}
        habitDescription={habit.description || ""}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />
    </View>
  );
};

export default HabitItem;

const styles = StyleSheet.create({
  // UPDATE container style (around line 85):
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    // ADD THESE:
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
  },
  description: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    lineHeight: 18,
  },
  label: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
    letterSpacing: 1,
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
  editButton: {
    // Styled via backgroundColor in component
  },
  deleteButton: {
    // Styled via backgroundColor in component
  },
  deleteAction: {
    backgroundColor: "#EF4444", // Red color
    justifyContent: "center",
    alignItems: "center",
    width: 80, // Delete button is 80px wide
    height: "85%",
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    gap: 4, // Space between icon and text
    padding: Spacing.md,
  },
  deleteText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
});
