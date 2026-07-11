import TopBar from "@/components/common/TopBar";
import AddHabitModal from "@/components/habits/AddHabitModal";
import ConsistencyCalender from "@/components/habits/ConsistencyCalender";
import HabitItem from "@/components/habits/HabitItem";
import HabitStat from "@/components/habits/HabitStat";
import { Spacing } from "@/constants/Spacing";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function HabitsScreen() {
  const { colors } = useTheme();
  const { habits, addHabit } = useHabits();
  const [showAddModal, setShowAddModal] = useState(false);

  const MAX_HABITS = 5;

  const handleAddHabit = (title: string, description: string) => {
    if (habits.length >= MAX_HABITS) {
      Alert.alert(
        "Limit Reached",
        `You can only add up to ${MAX_HABITS} habits. Please delete one to add another.`
      );
      return;
    }
    addHabit(title, description);
    setShowAddModal(false);
  };

  const handleOpenAddModal = () => {
    if (habits.length >= MAX_HABITS) {
      Alert.alert(
        "Limit Reached",
        `You can only add up to ${MAX_HABITS} habits. Please delete one to add another.`
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(true);
  };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <TopBar />
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={[styles.title, { color: colors.text }]}>HABITS</Text>
              {habits.length < MAX_HABITS && (
                <Pressable
                  onPress={handleOpenAddModal}
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      backgroundColor: colors.accent,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.addButtonText}>Add</Text>
                </Pressable>
              )}
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              BUILD DISCIPLINE DAILY
            </Text>
          </View>
          <HabitStat />
          <ConsistencyCalender />
          <View style={styles.habitsList}>
            {habits.length === 0 ? (
              <View style={styles.emptyState}>
                <View
                  style={[
                    styles.emptyIconContainer,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={60}
                    color={colors.text}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Habits Yet
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Start building discipline by adding your first habit
                </Text>
                <Pressable
                  onPress={handleOpenAddModal}
                  style={({ pressed }) => [
                    styles.emptyAddButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={32}
                    color={colors.accent}
                  />
                  <Text
                    style={[styles.emptyAddButtonText, { color: colors.text }]}
                  >
                    Add Your First Habit
                  </Text>
                </Pressable>
              </View>
            ) : (
              habits.map((habit) => <HabitItem key={habit.id} habit={habit} />)
            )}
          </View>
          <AddHabitModal
            isVisible={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSave={handleAddHabit}
            currentHabitCount={habits.length}
            maxHabits={MAX_HABITS}
          />
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 140,
  },
  header: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 32,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    letterSpacing: 0.5,
  },
  habitsList: {
    paddingHorizontal: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
});
