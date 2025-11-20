import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface EditHabitModelProps {
  isVisible: boolean;
  habitTitle: string;
  habitDescription: string;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
}

function EditHabitModel({
  isVisible,
  habitTitle,
  habitDescription,
  onClose,
  onSave,
}: EditHabitModelProps) {
  const { colors } = useTheme();

  //Local State for input fields
  const [editedTitle, setEditedTitle] = useState(habitTitle);
  const [editedDescription, setEditedDescription] = useState(habitDescription);

  //Update local state when props change or modal opens
  useEffect(() => {
    if (isVisible) {
      setEditedTitle(habitTitle);
      setEditedDescription(habitDescription);
    }
  }, [habitTitle, habitDescription, isVisible]);

  const handleSave = () => {
    //Validate input
    if (!editedTitle.trim()) {
      Alert.alert("Please enter a title for the habit");
      return;
    }

    //Call the onSave callback with the edited values
    onSave(editedTitle.trim(), editedDescription.trim());
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Title */}
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Edit Habit
          </Text>
          {/* Habit NameInput Container */}
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
              value={editedTitle}
              onChangeText={setEditedTitle}
              placeholder="Enter habit name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          {/* Habit Description Input Container */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Description:
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
              value={editedDescription}
              onChangeText={setEditedDescription}
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
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalButton,
                styles.updateButton,
                { backgroundColor: colors.accent },
              ]}
              onPress={handleSave}
            >
              <Text style={styles.updateButtonText}>Update</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default EditHabitModel;

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
  modalTitle: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
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
  },
  updateButton: {
    borderWidth: 0,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 1,
  },
  updateButtonText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
    color: "#FFF",
    letterSpacing: 1,
  },
});
