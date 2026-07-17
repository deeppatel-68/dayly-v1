import AddHabitModal from "@/components/habits/AddHabitModal";
import ConsistencyCalender from "@/components/habits/ConsistencyCalender";
import HabitItem from "@/components/habits/HabitItem";
import HabitStat from "@/components/habits/HabitStat";
import { StudioButton, StudioEmptyState, StudioGroup, StudioSection } from "@/components/ui/StudioPrimitives";
import { Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

const MAX_HABITS = 5;

export default function HabitsScreen() {
  const { colors } = useTheme();
  const { habits, addHabit } = useHabits();
  const [showAddModal, setShowAddModal] = useState(false);
  const completedToday = habits.filter((habit) => habit.completed).length;

  const handleAddHabit = async (title: string, description: string) => {
    if (habits.length >= MAX_HABITS) {
      Alert.alert("Habit limit reached", `Keep up to ${MAX_HABITS} active habits at a time.`);
      return;
    }
    await addHabit(title, description);
    setShowAddModal(false);
  };

  const handleOpenAddModal = () => {
    if (habits.length >= MAX_HABITS) {
      Alert.alert("Habit limit reached", `Keep up to ${MAX_HABITS} active habits at a time.`);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowAddModal(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text selectable style={[styles.summary, { color: colors.textSecondary }]}>
            {habits.length
              ? `${completedToday} of ${habits.length} complete today`
              : "Build a small rhythm that Deep can grow with."}
          </Text>
          <StudioButton
            label="Add habit"
            icon="add"
            onPress={handleOpenAddModal}
            disabled={habits.length >= MAX_HABITS}
            style={styles.addAction}
          />
        </View>

        {habits.length ? (
          <>
            <HabitStat />
            <StudioSection title="Your habits">
              <StudioGroup>
                {habits.map((habit, index) => (
                  <HabitItem
                    key={habit.id}
                    habit={habit}
                    last={index === habits.length - 1}
                  />
                ))}
              </StudioGroup>
            </StudioSection>
            <StudioSection title="Consistency">
              <ConsistencyCalender />
            </StudioSection>
          </>
        ) : (
          <StudioEmptyState
            icon="checkmark-circle-outline"
            title="Your first habit starts here"
            detail="Choose one action worth repeating and let Deep celebrate every return."
            action={<StudioButton label="Add your first habit" icon="add" onPress={handleOpenAddModal} />}
          />
        )}
      </ScrollView>
      <AddHabitModal
        isVisible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddHabit}
        currentHabitCount={habits.length}
        maxHabits={MAX_HABITS}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: Spacing.xxl, gap: Spacing.lg },
  intro: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  summary: { ...StudioType.body },
  addAction: { alignSelf: "flex-start" },
});
