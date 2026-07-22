import { BorderRadius, Spacing, TouchTarget } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
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

  const selectedHabit = useMemo(
    () => habits.find((habit) => habit.id === selectedHabitId) || habits[0] || null,
    [habits, selectedHabitId]
  );

  React.useEffect(() => {
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  const calendarDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates: (Date | null)[] = [];

    for (let day = 0; day < firstDay.getDay(); day += 1) dates.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      dates.push(new Date(year, month, day));
    }

    return dates;
  }, [currentMonth]);

  const monthDisplay = useMemo(
    () =>
      currentMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [currentMonth]
  );

  const changeMonth = (delta: number) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1)
    );
  };

  if (habits.length === 0 || !selectedHabit) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.separator },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
          Consistency
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
        { backgroundColor: colors.surface, borderColor: colors.separator },
      ]}
    >
      <View style={styles.matrixHeader}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
          Consistency
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose habit, currently ${selectedHabit.title}`}
          onPress={() => setShowHabitDropdown(true)}
          style={({ pressed }) => [
            styles.dropdownButton,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.separator,
              opacity: pressed ? 0.76 : 1,
            },
          ]}
        >
          <Text numberOfLines={1} style={[styles.dropdownText, { color: colors.text }]}>
            {selectedHabit.title}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.monthNavigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={4}
          onPress={() => changeMonth(-1)}
          style={({ pressed }) => [
            styles.navButton,
            pressed && { backgroundColor: colors.surfaceSelected },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to current month"
          onPress={() => setCurrentMonth(new Date())}
          style={({ pressed }) => [
            styles.monthDisplayButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.monthDisplayText, { color: colors.text }]}>
            {monthDisplay}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={4}
          onPress={() => changeMonth(1)}
          style={({ pressed }) => [
            styles.navButton,
            pressed && { backgroundColor: colors.surfaceSelected },
          ]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.dayHeaders}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <View key={`${day}-${index}`} style={styles.dayHeader}>
              <Text style={[styles.dayHeaderText, { color: colors.textTertiary }]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDates.map((date, index) => {
            if (!date) {
              return <View key={index} style={[styles.calendarCell, styles.emptyCell]} />;
            }

            const dateKey = toLocalDateKey(date);
            const isCompleted = selectedHabit.completionHistory?.[dateKey] === true;
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <View
                key={dateKey}
                accessibilityLabel={`${date.toLocaleDateString()}, ${
                  isCompleted ? "completed" : "not completed"
                }`}
                style={[
                  styles.calendarCell,
                  {
                    backgroundColor: isCompleted
                      ? colors.accent
                      : colors.checkboxEmpty,
                    borderColor: isToday
                      ? colors.focusRing
                      : isCompleted
                        ? colors.accent
                        : colors.border,
                    borderWidth: isToday ? 2 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateNumber,
                    {
                      color: isCompleted ? colors.onAccent : colors.text,
                      fontWeight: isToday ? "700" : "400",
                    },
                  ]}
                >
                  {date.getDate()}
                </Text>
                {isCompleted ? (
                  <Ionicons
                    name="checkmark"
                    size={10}
                    color={colors.onAccent}
                    style={styles.checkmark}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <Modal
        visible={showHabitDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHabitDropdown(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close habit selector"
          onPress={() => setShowHabitDropdown(false)}
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            accessibilityViewIsModal
            style={[
              styles.dropdownMenu,
              { backgroundColor: colors.surface, borderColor: colors.separator },
            ]}
          >
            {habits.map((habit, index) => {
              const isSelected = selectedHabitId === habit.id;
              return (
                <Pressable
                  key={habit.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    setSelectedHabitId(habit.id);
                    setShowHabitDropdown(false);
                  }}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    {
                      backgroundColor: isSelected
                        ? colors.surfaceSelected
                        : "transparent",
                      borderBottomColor: colors.separator,
                      borderBottomWidth:
                        index === habits.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    },
                    pressed && { opacity: 0.72 },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.dropdownItemText,
                      { color: isSelected ? colors.accent : colors.text },
                    ]}
                  >
                    {habit.title}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  ) : null}
                </Pressable>
              );
            })}
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
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    ...StudioType.section,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  emptyText: { ...StudioType.body, marginTop: Spacing.sm },
  matrixHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dropdownButton: {
    minHeight: TouchTarget,
    maxWidth: "62%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  dropdownText: { ...StudioType.detail, flexShrink: 1, fontWeight: "600" },
  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  navButton: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  monthDisplayButton: {
    minHeight: TouchTarget,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthDisplayText: { ...StudioType.bodyStrong },
  calendarContainer: { gap: Spacing.sm },
  dayHeaders: { flexDirection: "row", width: "100%" },
  dayHeader: { width: "14.285%", alignItems: "center", justifyContent: "center" },
  dayHeaderText: { ...StudioType.detail, fontSize: 11, fontWeight: "600" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", width: "100%" },
  calendarCell: {
    width: "14.285%",
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: Spacing.xs,
  },
  emptyCell: { borderWidth: 0, backgroundColor: "transparent" },
  dateNumber: { ...StudioType.detail, fontSize: 11 },
  checkmark: { position: "absolute", top: 2, right: 2, opacity: 0.94 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  dropdownMenu: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  dropdownItem: {
    minHeight: TouchTarget + 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  dropdownItemText: { ...StudioType.body, flex: 1 },
});
