import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { loadStudySessions } from "@/utils/studySessions";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ProgressDisplay() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { completedCount, totalCount } = useHabits();
  const [studyMinutes, setStudyMinutes] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;

      loadStudySessions(user.id).then((sessions) => {
        if (cancelled) return;
        const today = new Date().toDateString();
        const seconds = sessions
          .filter((session) => new Date(session.endedAt).toDateString() === today)
          .reduce((sum, session) => sum + session.duration, 0);
        setStudyMinutes(Math.floor(seconds / 60));
      });

      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  return (
    <View
      style={[
        styles.strip,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.item}>
        <Text selectable style={[styles.value, { color: colors.text }]}>
          {studyMinutes}m
        </Text>
        <Text selectable style={[styles.label, { color: colors.textSecondary }]}>
          Focus today
        </Text>
      </View>
      <View style={[styles.item, styles.divider, { borderLeftColor: colors.separator }]}>
        <Text selectable style={[styles.value, { color: colors.accent }]}>
          {completedCount}/{totalCount}
        </Text>
        <Text selectable style={[styles.label, { color: colors.textSecondary }]}>
          Habits today
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    overflow: "hidden",
  },
  item: { flex: 1, minHeight: 88, padding: Spacing.md, justifyContent: "center" },
  divider: { borderLeftWidth: StyleSheet.hairlineWidth },
  value: { ...StudioType.metric },
  label: { ...StudioType.detail, marginTop: 2 },
});
