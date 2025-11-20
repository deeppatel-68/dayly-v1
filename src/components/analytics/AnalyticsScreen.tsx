import InsightsCard from "@/components/analytics/Insights";
import LineChart from "@/components/analytics/LineChart";
import TopBar from "@/components/common/TopBar";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import {
  calculateDayStats,
  calculatePeriodStats,
  generateInsights,
  getDatesForPeriod,
} from "@/utils/analytics";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { habits } = useHabits();
  // Mock sessions for now
  const sessions: any[] = [];

  const [selectedPeriod, setSelectedPeriod] = useState<
    "day" | "week" | "month" | "3months"
  >("week");
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(
    habits.length > 0 ? habits[0].id : null
  );
  const [showHabitDropdown, setShowHabitDropdown] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  // Get chart data for weekly study time
  const weeklyChartData = useMemo(() => {
    const dates = getDatesForPeriod("week");
    return dates.map((date) => {
      const dayStats = calculateDayStats(date, habits, sessions);
      return {
        label: date
          .toLocaleDateString("en", { weekday: "short" })
          .toUpperCase()
          .slice(0, 3),
        value: dayStats.studyMinutes,
      };
    });
  }, [habits, sessions]);

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

  // Calculate total time, sessions, avg min for today
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().split("T")[0];
    const todayStats = calculateDayStats(today, habits, sessions);

    return {
      totalTime: Math.round(todayStats.studyMinutes / 60), // Convert to hours
      sessions: sessions.filter((s) => {
        const sessionDate = new Date(s.startTime || s.date);
        return sessionDate.toISOString().split("T")[0] === todayKey;
      }).length,
      avgMin:
        sessions.length > 0
          ? Math.round(
              sessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
                sessions.length
            )
          : 0,
    };
  }, [habits, sessions]);

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

        {/* Today's Stats Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.todayHeader}>
            <Ionicons name="flash" size={16} color={colors.accent} />
            <Text style={[styles.todayLabel, { color: colors.accent }]}>
              TODAY
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {todayStats.totalTime}H
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                TOTAL TIME
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {todayStats.sessions}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                SESSIONS
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {todayStats.avgMin}
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

                  const dateKey = date.toISOString().split("T")[0];
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
                          opacity: isCompleted ? 0.6 : 1,
                          shadowColor: isCompleted
                            ? colors.accent
                            : "transparent",
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: isCompleted ? 0.8 : 0,
                          shadowRadius: isCompleted ? 4 : 0,
                          elevation: isCompleted ? 3 : 0,
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

        {/* Weekly Study Time Chart */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
            WEEKLY STUDY TIME
          </Text>
          <LineChart
            data={weeklyChartData}
            color={colors.accent}
            height={150}
            showValues={true}
          />
        </View>

        {/* AI Insights */}
        {insights.length > 0 && <InsightsCard insights={insights} />}

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
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xs,
  },
  dayHeader: {
    width: "13%",
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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xs,
  },
  calendarCell: {
    width: "13%",
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
