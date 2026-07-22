import FadeInView from "@/components/common/FadeInView";
import ArenaPlaceholder from "@/components/dashboard-stats/ArenaPlaceholder";
import ProgressDisplay from "@/components/dashboard-stats/ProgressDisplay";
import XpBar from "@/components/dashboard-stats/XpBar";
import HabitItem from "@/components/habits/HabitItem";
import { StudioButton, StudioEmptyState, StudioGroup, StudioSection } from "@/components/ui/StudioPrimitives";
import StudySpacePlaceholder from "@/components/study/StudySpacePlaceholder";
import { Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { AvatarState } from "@/components/avatar/avatarTypes";
import { useCharacter } from "@/context/CharacterContext";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { habits, completedCount } = useHabits();
  const { character } = useCharacter();
  const [showStudySpace, setShowStudySpace] = useState(false);
  const [characterState, setCharacterState] = useState<AvatarState>("idle");
  const prevCompleted = useRef(completedCount);

  useEffect(() => {
    const increased = completedCount > prevCompleted.current;
    prevCompleted.current = completedCount;
    if (!increased) return;

    setCharacterState("reward");
    const timeout = setTimeout(() => setCharacterState("idle"), 2600);
    return () => clearTimeout(timeout);
  }, [completedCount]);

  const completedToday = habits.filter((habit) => habit.completed).length;
  const companionName = character.companionName || "Deep";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView style={styles.sceneBand}>
          <ArenaPlaceholder
            active={!showStudySpace}
            onOpenSpace={() => setShowStudySpace(true)}
            onCustomise={() => router.push("/customise")}
            state={characterState}
          />
        </FadeInView>

        <FadeInView delay={40} style={styles.prompt}>
          <Text selectable style={[styles.promptTitle, { color: colors.text }]}>
            {completedToday === habits.length && habits.length > 0
              ? `${companionName} is proud of today.`
              : "Make the next small win count."}
          </Text>
          <Text selectable style={[styles.promptDetail, { color: colors.textSecondary }]}>
            {habits.length > 0
              ? `${completedToday} of ${habits.length} habits complete`
              : "Start with one habit or a focused session."}
          </Text>
          <StudioButton
            label="Start a focus session"
            icon="timer-outline"
            onPress={() => router.push("/study")}
            style={styles.focusAction}
          />
        </FadeInView>

        <FadeInView delay={80}>
          <StudioSection title="Growth">
            <XpBar />
            <ProgressDisplay />
          </StudioSection>
        </FadeInView>

        <FadeInView delay={120}>
          <StudioSection
            title="Today"
            action={
              <Text selectable style={[styles.sectionAction, { color: colors.textSecondary }]}>
                {completedToday}/{habits.length}
              </Text>
            }
          >
            {habits.length ? (
              <StudioGroup>
                {habits.map((habit, index) => (
                  <HabitItem
                    key={habit.id}
                    habit={habit}
                    last={index === habits.length - 1}
                  />
                ))}
              </StudioGroup>
            ) : (
              <StudioEmptyState
                icon="checkmark-circle-outline"
                title="Start a daily rhythm"
                detail="Add a habit and Deep will help you turn it into momentum."
                action={
                  <StudioButton
                    label="Add a habit"
                    tone="secondary"
                    icon="add"
                    onPress={() => router.push("/habits")}
                  />
                }
              />
            )}
          </StudioSection>
        </FadeInView>
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
  container: { flex: 1 },
  content: { paddingBottom: Spacing.xxl, gap: Spacing.lg },
  sceneBand: { paddingHorizontal: Spacing.md },
  prompt: { paddingHorizontal: Spacing.md, gap: Spacing.xs },
  promptTitle: { ...StudioType.title },
  promptDetail: { ...StudioType.body },
  focusAction: { marginTop: Spacing.sm, alignSelf: "flex-start" },
  sectionAction: { ...StudioType.detail, fontVariant: ["tabular-nums"] },
});
