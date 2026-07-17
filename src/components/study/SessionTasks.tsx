import { BorderRadius, Spacing, TouchTarget } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Task = {
  id: string;
  text: string;
  completed: boolean;
};

export default function SessionTasks() {
  const { colors } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTextTask, setNewTextTask] = useState("");

  const toggleTask = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const deleteTask = (id: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const addTask = () => {
    // Validation
    if (newTextTask.trim() === "") {
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    // Create new task
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTextTask.trim(),
      completed: false,
    };

    // Add to beginning of list (new tasks appear at top)
    setTasks((prevTasks) => [newTask, ...prevTasks]);

    // Clear input
    setNewTextTask("");

    // Success feedback
    if (process.env.EXPO_OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.addTaskContainer,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          style={[styles.addTaskInput, { color: colors.text }]}
          placeholder="Add a task..."
          placeholderTextColor={colors.textTertiary}
          value={newTextTask}
          onChangeText={setNewTextTask}
          onSubmitEditing={addTask}
          returnKeyType="done"
        />
        <Pressable
          style={[
            styles.addButton,
            {
              backgroundColor: colors.accent,
              opacity: newTextTask.trim() === "" ? 0.5 : 1,
            },
          ]}
          onPress={addTask}
          disabled={newTextTask.trim() === ""}
        >
          <Ionicons name="add" size={24} color={colors.onAccent} />
        </Pressable>
      </View>

      {/* Tasks List */}
      <View
        style={[
          styles.tasksContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {tasks.length === 0 ? (
          // Empty state - when all tasks are deleted
          <View style={styles.emptyState}>
            <Ionicons
              name="checkmark-done-outline"
              size={32}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add a small target for this focus session.
            </Text>
          </View>
        ) : (
          // Tasks list
          tasks.map((task, index) => (
            <View
              key={task.id}
              style={[
                styles.taskItem,
                index < tasks.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              {/* Left side - Pressable for toggle */}
              <Pressable
                style={styles.taskLeft}
                onPress={() => toggleTask(task.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: task.completed
                        ? colors.accent
                        : colors.border,
                      backgroundColor: task.completed
                        ? colors.accent
                        : "transparent",
                    },
                  ]}
                >
                  {task.completed && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.onAccent}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.taskText,
                    {
                      color: task.completed
                        ? colors.textSecondary
                        : colors.text,
                      textDecorationLine: task.completed
                        ? "line-through"
                        : "none",
                    },
                  ]}
                >
                  {task.text}
                </Text>
              </Pressable>

              {/* Right side - Delete button */}
              <Pressable
                style={({ pressed }) => [
                  styles.deleteButton,
                  {
                    backgroundColor: pressed
                      ? colors.border + "80"
                      : colors.border + "40",
                  },
                ]}
                onPress={() => deleteTask(task.id)}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  // Add Task Styles
  addTaskContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  addTaskInput: {
    flex: 1,
    ...StudioType.body,
    paddingVertical: Spacing.sm,
  },
  addButton: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // Tasks List Styles
  tasksContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  taskLeft: {
    // ✅ New style
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  taskText: {
    ...StudioType.body,
    flex: 1,
  },
  deleteButton: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    ...StudioType.body,
    marginTop: Spacing.sm,
  },
});
