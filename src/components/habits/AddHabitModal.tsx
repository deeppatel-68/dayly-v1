import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface AddHabitModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
  currentHabitCount: number;
  maxHabits: number;
}

function AddHabitModal({
  isVisible,
  onClose,
  onSave,
  currentHabitCount,
  maxHabits,
}: AddHabitModalProps) {
  const { colors } = useTheme();

  // Local State for input fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isVisible) {
      setTitle("");
      setDescription("");
    }
  }, [isVisible]);

  const handleSave = () => {
    // Validate input
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for the habit");
      return;
    }

    if (currentHabitCount >= maxHabits) {
      Alert.alert(
        "Limit Reached",
        `You can only add up to ${maxHabits} habits. Please delete one to add another.`
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Call the onSave callback with the values
    onSave(title.trim(), description.trim());
    // Reset form
    setTitle("");
    setDescription("");
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add New Habit
            </Text>
            <Text style={[styles.habitCount, { color: colors.textSecondary }]}>
              {currentHabitCount} / {maxHabits} habits
            </Text>
          </View>

          {/* Habit Name Input Container */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Habit Name:{" "}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter habit name"
              placeholderTextColor={colors.textSecondary}
              autoFocus={true}
            />
          </View>

          {/* Habit Description Input Container */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Description (Optional):
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter habit description (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline={true}
              numberOfLines={4}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <Pressable
              style={[
                styles.modalButton,
                {
                  borderColor: colors.border,
                },
              ]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalButton,
                styles.addButton,
                {
                  backgroundColor: colors.accent,
                  opacity: currentHabitCount >= maxHabits ? 0.5 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={currentHabitCount >= maxHabits}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default AddHabitModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  titleContainer: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
  },
  habitCount: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    letterSpacing: 0.5,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    fontFamily: "Outfit-Regular",
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  addButton: {
    borderWidth: 0,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 1,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
    color: "#FFF",
    letterSpacing: 1,
  },
});

