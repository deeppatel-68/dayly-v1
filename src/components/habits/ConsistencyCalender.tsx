import { BorderRadius, Spacing, TouchTarget } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { toLocalDateKey } from "@/utils/dateKey";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

function ConsistencyCalender() {
  const { colors } = useTheme();
  const { habits, toggleHabit } = useHabits();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Memoize week days calculation for performance
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentDate]);

  const todayKey = toLocalDateKey();
  const currentWeekStartKey = useMemo(() => {
    const date = new Date();
    const weekday = date.getDay();
    date.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1));
    return toLocalDateKey(date);
  }, []);
  const canMoveForward = toLocalDateKey(weekDays[0]) < currentWeekStartKey;

  const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

  // Navigate to previous week
  const changeWeek = (direction: "prev" | "next") => {
    if (direction === "next" && !canMoveForward) return;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === "prev" ? -7 : 7));
    setCurrentDate(newDate);
  };

  // Format month and date range (handles weeks spanning two months)
  const getMonthDisplay = useMemo(() => {
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    const firstMonth = firstDay.toLocaleDateString("en-US", { month: "short" });
    const lastMonth = lastDay.toLocaleDateString("en-US", { month: "short" });

    if (firstMonth === lastMonth) {
      return `${firstMonth} ${firstDay.getDate()}-${lastDay.getDate()}`;
    }
    return `${firstMonth} ${firstDay.getDate()} - ${lastMonth} ${lastDay.getDate()}`;
  }, [weekDays]);

  const handleCheckboxPress = async (habitId: string, date: Date) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await toggleHabit(habitId, toLocalDateKey(date));
    } catch {
      Alert.alert("Could Not Update Habit", "Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          THIS WEEK
        </Text>
        <View style={styles.navigation}>
          <Pressable
            onPress={() => changeWeek("prev")}
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {getMonthDisplay}
          </Text>
          <Pressable
            onPress={() => changeWeek("next")}
            disabled={!canMoveForward}
            accessibilityState={{ disabled: !canMoveForward }}
            style={[styles.navButton, !canMoveForward && styles.navButtonDisabled]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <View
        style={[
          styles.calendarCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={[styles.daysRow, { borderBottomColor: colors.border }]}>
          <View style={styles.dayLabelSpacer} />
          <View style={styles.daysColumns}>
            {dayNames.map((day, index) => {
              const date = weekDays[index];
              const dateKey = toLocalDateKey(date);
              const isToday = dateKey === todayKey;
              return (
                <View key={dateKey} style={styles.dayColumn}>
                  <Text
                    style={[
                      styles.dayName,
                      {
                        color: isToday ? colors.text : colors.textSecondary,
                      },
                    ]}
                  >
                    {day}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      {
                        color: isToday ? colors.text : colors.textSecondary,
                        fontWeight: isToday ? "bold" : "normal",
                      },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No habits yet. Add some habits to track your consistency!
            </Text>
          </View>
        ) : (
          habits.map((habit) => (
            <View
              key={habit.id}
              style={[styles.habitRow, { borderBottomColor: colors.borderLight }]}
            >
              <Text
                style={[styles.habitTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {habit.title}
              </Text>
              <View style={styles.checkboxRow}>
                {weekDays.map((day) => {
                  const dateKey = toLocalDateKey(day);
                  const isCompleted =
                    habit.completionHistory?.[dateKey] === true;
                  const isFutureDate = dateKey > todayKey;
                  const isActiveDate =
                    dateKey >= habit.startsOn &&
                    (!habit.archivedOn || dateKey < habit.archivedOn);
                  const isDisabled = isFutureDate || !isActiveDate;

                  return (
                    <View key={dateKey} style={styles.checkboxContainer}>
                      <Pressable
                        onPress={() => handleCheckboxPress(habit.id, day)}
                        disabled={isDisabled}
                        style={({ pressed }) => [
                          styles.checkbox,
                          {
                            backgroundColor: isCompleted
                              ? colors.completed
                              : colors.checkboxEmpty,
                            borderColor: isCompleted
                              ? colors.completed
                              : colors.checkboxEmpty,
                            opacity: isDisabled ? 0.3 : pressed ? 0.6 : 1,
                          },
                        ]}
                      >
                        {isCompleted && (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={colors.background}
                          />
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

export default ConsistencyCalender;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  title: {
    ...StudioType.section,
    letterSpacing: 1.1,
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  navButton: {
    width: TouchTarget,
    height: TouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: { opacity: 0.32 },
  monthText: {
    ...StudioType.bodyStrong,
    minWidth: 100,
    textAlign: "center",
  },
  calendarCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  dayLabelSpacer: {
    flex: 0.3,
    marginRight: Spacing.sm,
  },
  daysColumns: {
    flex: 0.7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayName: {
    ...StudioType.detail,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dayNumber: {
    ...StudioType.detail,
    fontSize: 14,
    fontWeight: "700",
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  habitTitle: {
    ...StudioType.detail,
    fontWeight: "600",
    flex: 0.3,
    marginRight: Spacing.sm,
  },
  checkboxRow: {
    flexDirection: "row",
    flex: 0.7,
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  checkboxContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...StudioType.body,
    textAlign: "center",
  },
});
