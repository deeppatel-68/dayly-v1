import { BorderRadius, Spacing } from "@/constants/Spacing";
import { FontSizes } from "@/constants/Typography";
import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { loadStudySessions } from "@/utils/studySessions";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

function ProgressDisplay() {
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
          .filter((s) => new Date(s.endedAt).toDateString() === today)
          .reduce((sum, s) => sum + s.duration, 0);
        setStudyMinutes(Math.floor(seconds / 60));
      });

      return () => {
        cancelled = true;
      };
    }, [user])
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.heading, { color: colors.text }]}>
          {"Today's Progress"}
        </Text>

        <View style={styles.progressContainer}>
          {/* Study Time */}
          <View style={styles.statGroup}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {studyMinutes}m
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Study Time
            </Text>
          </View>

          {/* Habits - Orange accent */}
          <View style={styles.statGroup}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {completedCount}/{totalCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Habits
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default ProgressDisplay;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  heading: {
    fontSize: FontSizes.lg,
    marginBottom: Spacing.sm,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statGroup: {},
  statValue: {
    fontSize: FontSizes["3xl"],
    fontFamily: "Outfit-Bold",
    lineHeight: 36,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    fontFamily: "Outfit-Regular",
    marginTop: 4,
  },
});
