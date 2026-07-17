import CompletionChartCard from "@/components/analytics/sections/CompletionChartCard";
import ConsistencyMatrixCard from "@/components/analytics/sections/ConsistencyMatrixCard";
import FocusTrendCard from "@/components/analytics/sections/FocusTrendCard";
import InsightsCard from "@/components/analytics/sections/InsightsCard";
import MomentumCard from "@/components/analytics/sections/MomentumCard";
import PeriodSelector from "@/components/analytics/PeriodSelector";
import PeriodSummaryCard from "@/components/analytics/sections/PeriodSummaryCard";
import FadeInView from "@/components/common/FadeInView";
import { Spacing } from "@/constants/Spacing";
import { useAuth } from "@/context/AuthContext";
import { useCharacter } from "@/context/CharacterContext";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getUserProgress,
  subscribeToProgress,
  UserProgress,
} from "@/services/progressService";
import {
  loadStudySessions,
  StudySession,
  subscribeToStudySessions,
} from "@/services/studySessionService";
import {
  AnalyticsPeriod,
  buildCompletionChartData,
  buildStudyChartData,
  calculatePeriodStats,
  generateInsights,
} from "@/utils/analytics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, ScrollView, StyleSheet, View } from "react-native";

const STAGGER_STEP = 40;

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { habits, currentStreak } = useHabits();
  const { character } = useCharacter();

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [selectedPeriod, setSelectedPeriod] =
    useState<AnalyticsPeriod>("week");

  const refreshSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setSessionsLoading(false);
      setSessionsError(null);
      return;
    }

    setSessionsLoading(true);
    setSessionsError(null);
    try {
      setSessions(await loadStudySessions(user.id));
    } catch (error) {
      setSessionsError(
        error instanceof Error ? error.message : "Could not load focus history."
      );
    } finally {
      setSessionsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setSessionsLoading(false);
      setSessionsError(null);
      return;
    }

    const unsubscribe = subscribeToStudySessions(setSessions);
    refreshSessions();
    return unsubscribe;
  }, [refreshSessions, user]);

  useEffect(() => {
    if (!user) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshSessions();
    });
    return () => subscription.remove();
  }, [refreshSessions, user]);

  useEffect(() => {
    if (!user) {
      setProgress(null);
      return;
    }

    const unsubscribe = subscribeToProgress(setProgress);
    getUserProgress(user.id)
      .then(setProgress)
      .catch(() => {});
    return unsubscribe;
  }, [user]);

  const periodStats = useMemo(
    () => calculatePeriodStats(habits, sessions, selectedPeriod),
    [habits, sessions, selectedPeriod]
  );

  const insights = useMemo(
    () =>
      generateInsights(habits, sessions, periodStats, character.companionName),
    [habits, sessions, periodStats, character.companionName]
  );

  const studyChartData = useMemo(
    () => buildStudyChartData(sessions, selectedPeriod),
    [selectedPeriod, sessions]
  );

  const completionChartData = useMemo(
    () => buildCompletionChartData(habits, selectedPeriod),
    [habits, selectedPeriod]
  );

  const periodLabel = {
    day: "Today",
    week: "Last 7 days",
    month: "Last 30 days",
    "3months": "Last 13 weeks",
  }[selectedPeriod];

  const focusTimeLabel =
    periodStats.totalStudyMinutes < 60
      ? `${periodStats.totalStudyMinutes}M`
      : `${(periodStats.totalStudyMinutes / 60).toFixed(1)}H`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.contentContainer}
      >
        <FadeInView delay={0 * STAGGER_STEP}>
          <MomentumCard
            currentStreak={currentStreak}
            bestStreak={progress?.best_streak ?? currentStreak}
            progress={progress}
            companionName={character.companionName}
          />
        </FadeInView>

        <FadeInView delay={1 * STAGGER_STEP}>
          <PeriodSelector selected={selectedPeriod} onSelect={setSelectedPeriod} />
        </FadeInView>

        <FadeInView delay={2 * STAGGER_STEP}>
          <PeriodSummaryCard
            periodLabel={periodLabel}
            focusTimeLabel={focusTimeLabel}
            sessionCount={periodStats.sessionCount}
            averageSessionMinutes={periodStats.averageSessionMinutes}
            periodChange={periodStats.periodChange}
          />
        </FadeInView>

        <FadeInView delay={3 * STAGGER_STEP}>
          <FocusTrendCard
            periodLabel={periodLabel}
            data={studyChartData}
            loading={sessionsLoading}
            error={sessionsError}
            onRetry={refreshSessions}
          />
        </FadeInView>

        <FadeInView delay={4 * STAGGER_STEP}>
          <CompletionChartCard
            data={completionChartData}
            hasHabits={habits.length > 0}
          />
        </FadeInView>

        <FadeInView delay={5 * STAGGER_STEP}>
          <ConsistencyMatrixCard habits={habits} />
        </FadeInView>

        <FadeInView delay={6 * STAGGER_STEP}>
          <InsightsCard
            insights={insights}
            companionName={character.companionName}
          />
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: Spacing.xl,
  },
});
