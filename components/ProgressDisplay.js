import { BorderRadius, Spacing } from "@/constants/Spacing";
import { FontSizes } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet, Text, View } from "react-native";

function ProgressDisplay() {
  const { colors } = useTheme();

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
          Today's Progress
        </Text>

        <View style={styles.progressContainer}>
          {/* Study Time */}
          <View style={styles.statGroup}>
            <Text style={[styles.statValue, { color: colors.text }]}>0m</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Study Time
            </Text>
          </View>

          {/* Habits - Orange accent */}
          <View style={styles.statGroup}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              1/3
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
    padding: Spacing.lg,
  },
  heading: {
    fontSize: FontSizes["2xl"],
    marginBottom: Spacing.md,
    fontFamily: "Outfit-Bold",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statGroup: {
    // Optional: add alignment if needed
  },
  statValue: {
    fontSize: 48,
    fontFamily: "Outfit-Bold",
    lineHeight: 56,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    marginTop: 4,
  },
});
