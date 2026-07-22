import { StudioButton, StudioSheet } from "@/components/ui/StudioPrimitives";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

interface AddHabitModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
  currentHabitCount: number;
  maxHabits: number;
}

export default function AddHabitModal({
  isVisible,
  onClose,
  onSave,
  currentHabitCount,
  maxHabits,
}: AddHabitModalProps) {
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isVisible) return;
    setTitle("");
    setDescription("");
  }, [isVisible]);

  const close = () => {
    setTitle("");
    setDescription("");
    onClose();
  };

  const save = () => {
    if (!title.trim()) {
      Alert.alert("Add a name", "Give this habit a short, clear name.");
      return;
    }
    if (currentHabitCount >= maxHabits) {
      Alert.alert(
        "Habit limit reached",
        `Archive a habit before adding another. You can keep up to ${maxHabits} active habits.`
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    onSave(title.trim(), description.trim());
  };

  return (
    <StudioSheet
      visible={isVisible}
      title="New habit"
      detail={`${currentHabitCount} of ${maxHabits} active habits`}
      onClose={close}
      footer={
        <>
          <StudioButton label="Cancel" onPress={close} tone="secondary" style={styles.footerButton} />
          <StudioButton
            label="Add habit"
            icon="add"
            onPress={save}
            disabled={currentHabitCount >= maxHabits}
            style={styles.footerButton}
          />
        </>
      }
    >
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            placeholder="Read for 20 minutes"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="next"
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Note</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional detail"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.note,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        </View>
      </View>
    </StudioSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  field: { gap: Spacing.sm },
  label: { ...StudioType.section },
  input: {
    minHeight: 52,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...StudioType.body,
  },
  note: { minHeight: 124 },
  footerButton: { flex: 1 },
});
