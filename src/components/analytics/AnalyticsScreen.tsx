import AnalyticsInsightsCard from "@/components/analytics/Insights";
import StudyLineChart from "@/components/analytics/LineChart";
import PeriodSelector from "@/components/analytics/PeriodSelector";
import TopBar from "@/components/common/TopBar";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import {
  loadStudySessions,
  StudySession,
  subscribeToStudySessions,
} from "@/services/studySessionService";
import {
  AnalyticsPeriod,
  buildStudyChartData,
  calculatePeriodStats,
  generateInsights,
} from "@/utils/analytics";
import { toLocalDateKey } from "@/utils/dateKey";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { habits } = useHabits();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [selectedPeriod, setSelectedPeriod] =
    useState<AnalyticsPeriod>("week");
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(
    habits.length > 0 ? habits[0].id : null
  );
  const [showHabitDropdown, setShowHabitDropdown] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  // Calculate all metrics based on selected period
  const periodStats = useMemo(
    () => calculatePeriodStats(habits, sessions, selectedPeriod),
    [habits, sessions, selectedPeriod]
  );

  // Generate insights
  const insights = useMemo(
    () => generateInsights(habits, sessions, periodStats),
    [habits, sessions, periodStats]
  );

  const studyChartData = useMemo(
    () => buildStudyChartData(sessions, selectedPeriod),
    [selectedPeriod, sessions]
  );

  // Get current month calendar dates
  const calendarDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get first day of month and what day of week it falls on
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const dates: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      dates.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }

    return dates;
  }, [currentMonth]);

  // Get month display string
  const monthDisplay = useMemo(() => {
    return currentMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  // Reset to current month
  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Get selected habit
  const selectedHabit = useMemo(() => {
    return habits.find((h) => h.id === selectedHabitId) || habits[0] || null;
  }, [habits, selectedHabitId]);

  // Update selected habit when habits change
  React.useEffect(() => {
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  const periodLabel = {
    day: "TODAY",
    week: "LAST 7 DAYS",
    month: "LAST 30 DAYS",
    "3months": "LAST 13 WEEKS",
  }[selectedPeriod];
  const focusTimeLabel =
    periodStats.totalStudyMinutes < 60
      ? `${periodStats.totalStudyMinutes}M`
      : `${(periodStats.totalStudyMinutes / 60).toFixed(1)}H`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <TopBar />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>ANALYTICS</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            DISCIPLINE ENGINE
          </Text>
        </View>

        <PeriodSelector
          selected={selectedPeriod}
          onSelect={setSelectedPeriod}
        />

        {/* Selected period summary */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.todayHeader}>
            <Ionicons name="flash" size={16} color={colors.accent} />
            <Text style={[styles.todayLabel, { color: colors.accent }]}>
              {periodLabel}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {focusTimeLabel}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                FOCUS
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {periodStats.sessionCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                SESSIONS
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {Math.round(periodStats.averageSessionMinutes)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                AVG MIN
              </Text>
            </View>
          </View>
        </View>

        {/* Consistency Matrix Card */}
        {habits.length > 0 && selectedHabit && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.matrixHeader}>
              <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
                CONSISTENCY MATRIX
              </Text>
              <Pressable
                onPress={() => setShowHabitDropdown(true)}
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.dropdownText, { color: colors.text }]}>
                  {selectedHabit.title.toUpperCase()}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNavigation}>
              <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={goToCurrentMonth}
                style={styles.monthDisplayButton}
              >
                <Text style={[styles.monthDisplayText, { color: colors.text }]}>
                  {monthDisplay.toUpperCase()}
                </Text>
              </Pressable>
              <Pressable onPress={goToNextMonth} style={styles.navButton}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text}
                />
              </Pressable>
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarContainer}>
              {/* Day headers */}
              <View style={styles.dayHeaders}>
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <View key={index} style={styles.dayHeader}>
                    <Text
                      style={[
                        styles.dayHeaderText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar dates */}
              <View style={styles.calendarGrid}>
                {calendarDates.map((date, index) => {
                  if (!date) {
                    return (
                      <View
                        key={index}
                        style={[styles.calendarCell, styles.emptyCell]}
                      />
                    );
                  }

                  const dateKey = toLocalDateKey(date);
                  const isCompleted =
                    selectedHabit.completionHistory?.[dateKey] === true;
                  const isToday =
                    date.toDateString() === new Date().toDateString();
                  const dayNumber = date.getDate();

                  return (
                    <View
                      key={index}
                      style={[
                        styles.calendarCell,
                        {
                          backgroundColor: isCompleted
                            ? colors.accent
                            : colors.checkboxEmpty,
                          borderWidth: isToday ? 2 : 1,
                          borderColor: isToday
                            ? colors.accent
                            : isCompleted
                            ? colors.accent
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateNumber,
                          {
                            color: isCompleted
                              ? colors.background
                              : colors.text,
                            fontWeight: isToday ? "bold" : "normal",
                          },
                        ]}
                      >
                        {dayNumber}
                      </Text>
                      {isCompleted && (
                        <Ionicons
                          name="checkmark"
                          size={10}
                          color={colors.background}
                          style={[styles.checkmark, { opacity: 0.9 }]}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Habit Dropdown Modal */}
            <Modal
              visible={showHabitDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowHabitDropdown(false)}
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setShowHabitDropdown(false)}
              >
                <View
                  style={[
                    styles.dropdownMenu,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {habits.map((habit) => (
                    <Pressable
                      key={habit.id}
                      onPress={() => {
                        setSelectedHabitId(habit.id);
                        setShowHabitDropdown(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor:
                            selectedHabitId === habit.id
                              ? colors.backgroundSecondary
                              : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color:
                              selectedHabitId === habit.id
                                ? colors.accent
                                : colors.text,
                            fontWeight:
                              selectedHabitId === habit.id ? "600" : "normal",
                          },
                        ]}
                      >
                        {habit.title.toUpperCase()}
                      </Text>
                      {selectedHabitId === habit.id && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={colors.accent}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            </Modal>
          </View>
        )}

        {sessionsLoading && (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              LOADING FOCUS HISTORY
            </Text>
          </View>
        )}

        {!sessionsLoading && sessionsError && (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={22}
              color={colors.textSecondary}
            />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              FOCUS HISTORY UNAVAILABLE
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry focus history"
              onPress={refreshSessions}
              style={[styles.retryButton, { borderColor: colors.border }]}
            >
              <Ionicons name="refresh" size={18} color={colors.accent} />
              <Text style={[styles.retryText, { color: colors.accent }]}>
                RETRY
              </Text>
            </Pressable>
          </View>
        )}

        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="timer-outline"
              size={24}
              color={colors.textSecondary}
            />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              NO FOCUS DATA YET
            </Text>
          </View>
        )}

        {/* Study time chart */}
        {!sessionsLoading && !sessionsError && sessions.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
              {periodLabel} STUDY TIME
            </Text>
            <StudyLineChart
              data={studyChartData}
              color={colors.accent}
              height={150}
              showValues={studyChartData.length <= 7}
            />
          </View>
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <AnalyticsInsightsCard insights={insights} />
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Bottom padding clears the floating nav
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 140,
  },
  header: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    letterSpacing: 0.5,
  },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  todayLabel: {
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  stateCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    minHeight: 112,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  stateText: {
    fontSize: 11,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 1,
  },
  retryButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  matrixHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  dropdownText: {
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  navButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  monthDisplayButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  monthDisplayText: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
  calendarContainer: {
    gap: Spacing.md,
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
    width: "100%",
  },
  dayHeader: {
    width: `${100 / 7}%`,
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeaderText: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  calendarCell: {
    // Exact sevenths so rows align and partial weeks stay left-aligned
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: Spacing.xs,
  },
  emptyCell: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  dateNumber: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
  },
  checkmark: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  dropdownMenu: {
    minWidth: 200,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  dropdownItemText: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    letterSpacing: 0.5,
  },
});
