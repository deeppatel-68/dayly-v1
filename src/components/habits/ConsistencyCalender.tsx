import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
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

  // Memoize today's date string to avoid recreating on every render
  const todayString = useMemo(() => new Date().toDateString(), []);

  const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

  // Navigate to previous week
  const changeWeek = (direction: "prev" | "next") => {
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

  const handleCheckboxPress = (habitId: string, date: string) => {
    const dateKey = date.split("T")[0]; // Extract date key from ISO string
    const isFuture = new Date(date) > new Date();
    if (isFuture) {
      Alert.alert("You cannot mark a habit as completed for a future date.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleHabit(habitId, dateKey);
  };

  return (
    <View style={styles.container}>
      {/* Header with month navigation */}

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          CONSISTENCY CALENDAR
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
            style={styles.navButton}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>
      {/* Calendar cards for each day of the week */}
      <View
        style={[
          styles.calendarCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Day names header */}
        <View style={styles.daysRow}>
          {dayNames.map((day, index) => {
            const date = weekDays[index];
            const isToday = date.toDateString() === todayString;
            const dateKey = date.toISOString().split("T")[0];
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
        {/* Habit rows */}
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No habits yet. Add some habits to track your consistency!
            </Text>
          </View>
        ) : (
          habits.map((habit) => (
            <View key={habit.id} style={styles.habitRow}>
              <Text
                style={[styles.habitTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {habit.title}
              </Text>
              <View style={styles.checkboxRow}>
                {weekDays.map((day) => {
                  const dateKey = day.toISOString().split("T")[0];
                  const isCompleted =
                    habit.completionHistory?.[dateKey] === true;
                  const isFutureDate = day > new Date();

                  return (
                    <View key={dateKey} style={styles.checkboxContainer}>
                      <Pressable
                        onPress={() =>
                          handleCheckboxPress(habit.id, day.toISOString())
                        }
                        disabled={isFutureDate}
                        style={({ pressed }) => [
                          styles.checkbox,
                          {
                            backgroundColor: isCompleted
                              ? colors.completed
                              : colors.checkboxEmpty,
                            borderColor: isCompleted
                              ? colors.completed
                              : colors.checkboxEmpty,
                            opacity: isFutureDate ? 0.3 : pressed ? 0.6 : 1,
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
    marginBottom: Spacing.xl, // Add this line
  },
  header: {
    flexDirection: "row", // Add this
    alignItems: "center", // Add this
    justifyContent: "space-between", // Add this
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    letterSpacing: 1,
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  navButton: {
    padding: Spacing.xs,
  },
  monthText: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
    minWidth: 100,
    textAlign: "center",
  },
  // UPDATE calendarCard style (around line 212):
  calendarCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    // ADD THESE:
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 0, // Ensure no extra padding
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayName: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  habitTitle: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    flex: 0.3,
    marginRight: Spacing.sm,
  },
  checkboxRow: {
    flexDirection: "row",
    flex: 0.7,
    justifyContent: "space-between",
    paddingHorizontal: 0, // Match daysRow padding
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
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
  },
});
