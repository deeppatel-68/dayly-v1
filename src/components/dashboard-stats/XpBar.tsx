import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { useXp } from "@/context/XpContext";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

function XpBar() {
  const { colors } = useTheme();
  const { level, xpIntoLevel, xpForNextLevel, progress } = useXp();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.levelGroup}>
            <View
              style={[styles.levelBadge, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.levelNumber}>{level}</Text>
            </View>
            <Text style={[styles.levelLabel, { color: colors.text }]}>
              Level {level}
            </Text>
          </View>
          <Text style={[styles.xpText, { color: colors.textSecondary }]}>
            {xpIntoLevel} / {xpForNextLevel} XP
          </Text>
        </View>
        <View
          style={[
            styles.track,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                backgroundColor: colors.accent,
                width: `${Math.min(100, Math.round(progress * 100))}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

export default XpBar;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNumber: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    color: "#ffffff",
  },
  levelLabel: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.3,
  },
  xpText: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
  },
  track: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
});
