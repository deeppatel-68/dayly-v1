import FadeInView from "@/components/common/FadeInView";
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
import { AvatarState } from "@/components/avatar/avatarTypes";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const { habits, completedCount } = useHabits();
  const [showStudySpace, setShowStudySpace] = useState(false);
  const [characterState, setCharacterState] = useState<AvatarState>("idle");
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
        <FadeInView style={styles.arenaContainer}>
          <ArenaPlaceholder
            active={!showStudySpace}
            onOpenSpace={() => setShowStudySpace(true)}
            onCustomise={() => router.push("/(tabs)/customise")}
            state={characterState}
          />
        </FadeInView>
        <FadeInView delay={40}>
          <ShortcutButton />
        </FadeInView>
        <FadeInView delay={80}>
          <XpBar />
        </FadeInView>
        <FadeInView delay={120}>
          <ProgressDisplay />
        </FadeInView>
        {habits.length > 0 && (
          <FadeInView delay={160} style={styles.habitsSection}>
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
          </FadeInView>
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
