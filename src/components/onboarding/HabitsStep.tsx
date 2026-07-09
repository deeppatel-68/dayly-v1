import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { useHabits } from "@/context/HabitsContext";
import { MAX_HABITS } from "@/services/habitsService";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

interface SuggestedHabit {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// New users already get 3 starter habits auto-seeded by HabitsContext
// (Drink Water, Exercise, Read). This step OFFERS additional suggestions on
// top of those defaults rather than replacing them, respecting the 5-habit
// cap. Suggestions that exactly match an existing habit title show as
// "Added" instead of a duplicate pick.
const SUGGESTED_HABITS: SuggestedHabit[] = [
  { title: "Drink Water", icon: "water-outline" },
  { title: "Read 10 Pages", icon: "book-outline" },
  { title: "Exercise", icon: "walk-outline" },
  { title: "Sleep by 11", icon: "moon-outline" },
  { title: "Review Notes", icon: "document-text-outline" },
  { title: "Stretch", icon: "body-outline" },
];

interface HabitsStepProps {
  selected: string[];
  onToggle: (title: string) => void;
}

export default function HabitsStep({ selected, onToggle }: HabitsStepProps) {
  const { colors } = useTheme();
  const { habits, loading } = useHabits();

  const existingTitles = new Set(
    habits.map((habit) => habit.title.trim().toLowerCase())
  );
  const remainingSlots = Math.max(
    0,
    MAX_HABITS - habits.length - selected.length
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Choose your habits
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Pick a few to start with. Completing them earns XP for your
        companion — you can always add more later.
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Setting up your starter habits...
          </Text>
        </View>
      ) : (
        <View style={styles.chipGrid}>
          {SUGGESTED_HABITS.map((habit) => {
            const isAdded = existingTitles.has(habit.title.trim().toLowerCase());
            const isSelected = selected.includes(habit.title);
            const isDisabled = isAdded || (!isSelected && remainingSlots <= 0);

            return (
              <Pressable
                key={habit.title}
                disabled={isDisabled}
                onPress={() => {
                  if (isDisabled) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggle(habit.title);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.card,
                    borderColor: isSelected ? colors.accent : colors.border,
                    opacity: isAdded ? 0.55 : isDisabled ? 0.4 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={isAdded ? "checkmark-circle" : habit.icon}
                  size={16}
                  color={isSelected ? colors.background : colors.text}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? colors.background : colors.text },
                  ]}
                >
                  {habit.title}
                </Text>
                {isAdded && (
                  <Text
                    style={[styles.chipMeta, { color: colors.textSecondary }]}
                  >
                    Added
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {!loading && remainingSlots <= 0 && (
        <Text style={[styles.capNote, { color: colors.textSecondary }]}>
          You&apos;ve reached the 5-habit limit — manage habits anytime from
          the Habits tab.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Outfit-SemiBold",
  },
  chipMeta: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
  },
  capNote: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    marginTop: Spacing.lg,
  },
});
