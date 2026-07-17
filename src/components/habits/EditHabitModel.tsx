import { StudioButton, StudioSheet } from "@/components/ui/StudioPrimitives";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

interface EditHabitModelProps {
  isVisible: boolean;
  habitTitle: string;
  habitDescription: string;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
}

export default function EditHabitModel({
  isVisible,
  habitTitle,
  habitDescription,
  onClose,
  onSave,
}: EditHabitModelProps) {
  const { colors } = useTheme();
  const [title, setTitle] = useState(habitTitle);
  const [description, setDescription] = useState(habitDescription);

  useEffect(() => {
    if (!isVisible) return;
    setTitle(habitTitle);
    setDescription(habitDescription);
  }, [habitDescription, habitTitle, isVisible]);

  const save = () => {
    if (!title.trim()) {
      Alert.alert("Add a name", "Give this habit a short, clear name.");
      return;
    }
    onSave(title.trim(), description.trim());
  };

  return (
    <StudioSheet
      visible={isVisible}
      title="Edit habit"
      onClose={onClose}
      footer={
        <>
          <StudioButton label="Cancel" onPress={onClose} tone="secondary" style={styles.footerButton} />
          <StudioButton label="Save changes" onPress={save} style={styles.footerButton} />
        </>
      }
    >
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Habit name"
            placeholderTextColor={colors.textTertiary}
            autoFocus
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
