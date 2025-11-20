import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Task = {
  id: string;
  text: string;
  completed: boolean;
};

const DEFAULT_TASKS: Task[] = [
  { id: "1", text: "REVIEW CHAPTER 3", completed: false },
  { id: "2", text: "SOLVE PRACTICE PROBLEMS", completed: false },
  { id: "3", text: "TAKE NOTES", completed: false },
];

export default function SessionTasks() {
  const { colors } = useTheme();
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);

  const toggleTask = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        SESSION TASKS
      </Text>
      <View
        style={[
          styles.tasksContainer,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {tasks.map((task, index) => (
          <Pressable
            key={task.id}
            style={[
              styles.taskItem,
              index < tasks.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
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
                  color={colors.background}
                />
              )}
            </View>
            <Text
              style={[
                styles.taskText,
                {
                  color: task.completed ? colors.textSecondary : colors.text,
                  textDecorationLine: task.completed
                    ? "line-through"
                    : "none",
                },
              ]}
            >
              {task.text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  tasksContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
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
    fontSize: 15,
    fontFamily: "Outfit-Medium",
    letterSpacing: 0.5,
    flex: 1,
  },
});

