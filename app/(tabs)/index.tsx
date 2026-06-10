import ShortcutButton from "@/components/common/ShortcutButtons";
import TopBar from "@/components/common/TopBar";
import ArenaPlaceholder from "@/components/dashboard-stats/ArenaPlaceholder";
import ProgressDisplay from "@/components/dashboard-stats/ProgressDisplay";
import XpBar from "@/components/dashboard-stats/XpBar";
import HabitItem from "@/components/habits/HabitItem";
import StudySpacePlaceholder from "@/components/study/StudySpacePlaceholder";
import { Spacing } from "@/constants/Spacing";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { CharacterState } from "@/components/character/CharacterScene";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
export default function Index() {
  const { colors } = useTheme();
  const { habits, completedCount } = useHabits();
  const [showStudySpace, setShowStudySpace] = useState(false);
  const [characterState, setCharacterState] = useState<CharacterState>("idle");
  const prevCompleted = useRef(completedCount);

  // Celebrate on the dashboard avatar when a habit gets completed
  useEffect(() => {
    const increased = completedCount > prevCompleted.current;
    prevCompleted.current = completedCount;
    if (!increased) return;

    setCharacterState("reward");
    const timeout = setTimeout(() => setCharacterState("idle"), 2600);
    return () => clearTimeout(timeout);
  }, [completedCount]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <TopBar />
        <View style={styles.arenaContainer}>
          <ArenaPlaceholder
            onPress={() => setShowStudySpace(true)}
            state={characterState}
          />
        </View>
        {/* <View>
        <RoundStat />
      </View> */}
        <View>
          <ShortcutButton />
        </View>
        <XpBar />
        <ProgressDisplay />
        {habits.length > 0 && (
          <View style={styles.habitsSection}>
            <View style={styles.habitsHeader}>
              <Text style={[styles.habitsTitle, { color: colors.text }]}>
                {"Today's Habits"}
              </Text>
              <Text
                style={[styles.habitsSubtitle, { color: colors.textSecondary }]}
              >
                {habits.filter((h) => h.completed).length} of {habits.length}{" "}
                completed
              </Text>
            </View>
            <View style={styles.habitsList}>
              {habits.map((habit) => (
                <HabitItem key={habit.id} habit={habit} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <StudySpacePlaceholder
        visible={showStudySpace}
        onClose={() => setShowStudySpace(false)}
        showTimer={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "black",
  },
  arenaContainer: {
    paddingHorizontal: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 140,
  },
  habitsSection: {
    marginTop: Spacing.lg,
  },
  habitsHeader: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  habitsTitle: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  habitsSubtitle: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    letterSpacing: 0.5,
  },
  habitsList: {
    paddingHorizontal: Spacing.md,
  },
});
