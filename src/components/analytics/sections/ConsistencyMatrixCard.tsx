import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Habit } from "@/types/habits";
import { toLocalDateKey } from "@/utils/dateKey";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface ConsistencyMatrixCardProps {
  habits: Habit[];
}

export default function ConsistencyMatrixCard({
  habits,
}: ConsistencyMatrixCardProps) {
  const { colors } = useTheme();
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(
    habits.length > 0 ? habits[0].id : null
  );
  const [showHabitDropdown, setShowHabitDropdown] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const selectedHabit = useMemo(() => {
    return habits.find((h) => h.id === selectedHabitId) || habits[0] || null;
  }, [habits, selectedHabitId]);

  React.useEffect(() => {
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  const calendarDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const dates: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      dates.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }
    return dates;
  }, [currentMonth]);

  const monthDisplay = useMemo(() => {
    return currentMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  if (habits.length === 0 || !selectedHabit) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
          Consistency matrix
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Add your first habit to start your record.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.matrixHeader}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
          Consistency matrix
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
            {selectedHabit.title}
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
            {monthDisplay}
          </Text>
        </Pressable>
        <Pressable onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarContainer}>
        <View style={styles.dayHeaders}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <View key={index} style={styles.dayHeader}>
              <Text
                style={[styles.dayHeaderText, { color: colors.textSecondary }]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

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
            const isToday = date.toDateString() === new Date().toDateString();
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
                      color: isCompleted ? colors.background : colors.text,
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
              { backgroundColor: colors.card, borderColor: colors.border },
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
                  {habit.title}
                </Text>
                {selectedHabitId === habit.id && (
                  <Ionicons name="checkmark" size={16} color={colors.accent} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
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
