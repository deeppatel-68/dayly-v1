import CustomizeStep from "@/components/onboarding/CustomizeStep";
import HabitsStep from "@/components/onboarding/HabitsStep";
import ReadyStep from "@/components/onboarding/ReadyStep";
import WelcomeStep from "@/components/onboarding/WelcomeStep";
import FadeInView from "@/components/common/FadeInView";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useCharacter } from "@/context/CharacterContext";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STEP_COUNT = 4;

interface OnboardingFlowProps {
  onComplete: () => void;
}

// Full-screen, paged first-run flow: meet the companion, name + colour it,
// pick starter habits, then land on the dashboard invested in the avatar.
// Rendered inside XpProvider/CoinsProvider/HabitsProvider/CharacterProvider/
// ShopProvider (app/_layout.tsx) since the companion preview and habit
// picker both read live context state.
export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { colors } = useTheme();
  const { character, updateCharacter } = useCharacter();
  const { addHabit } = useHabits();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(character.companionName ?? "");
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleHabit = (title: string) => {
    setSelectedHabits((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const goBack = () => {
    if (step === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((prev) => prev - 1);
  };

  const goNext = async () => {
    if (submitting) return;

    // Commit the name when leaving step 2 (avoid saving half-typed input)
    if (step === 1) {
      const trimmed = name.trim();
      updateCharacter({ companionName: trimmed || undefined });
    }

    // Add any selected suggested habits when leaving step 3
    if (step === 2 && selectedHabits.length > 0) {
      setSubmitting(true);
      try {
        for (const title of selectedHabits) {
          await addHabit(title);
        }
      } catch (error) {
        console.error("Error adding onboarding habits:", error);
      } finally {
        setSubmitting(false);
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === STEP_COUNT - 1) {
      onComplete();
      return;
    }

    setStep((prev) => prev + 1);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.dotsRow}>
        {Array.from({ length: STEP_COUNT }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index <= step ? colors.accent : colors.border,
                width: index === step ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      <FadeInView key={step} style={styles.content}>
        {step === 0 && <WelcomeStep />}
        {step === 1 && (
          <CustomizeStep
            name={name}
            onChangeName={setName}
            bodyColor={character.bodyColor}
            onSelectBodyColor={(hex) => updateCharacter({ bodyColor: hex })}
          />
        )}
        {step === 2 && (
          <HabitsStep selected={selectedHabits} onToggle={toggleHabit} />
        )}
        {step === 3 && <ReadyStep companionName={name} />}
      </FadeInView>

      <View style={styles.footer}>
        {step > 0 && step < STEP_COUNT - 1 && (
          <Pressable onPress={goBack} hitSlop={8} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>
              Back
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={goNext}
          disabled={submitting}
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor: colors.accent,
              opacity: submitting ? 0.7 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Text style={[styles.continueText, { color: colors.onAccent }]}>
              {step === STEP_COUNT - 1 ? "Start" : "Continue"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: BorderRadius.full,
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: Spacing.xs,
  },
  backText: {
    ...StudioType.detail,
    fontWeight: "600",
  },
  continueButton: {
    minHeight: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    ...StudioType.bodyStrong,
  },
});
