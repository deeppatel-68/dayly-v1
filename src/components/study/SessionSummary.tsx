import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { useXp } from "@/context/XpContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface SessionSummaryProps {
  visible: boolean;
  minutes: number;
  xp: number;
  coins: number;
  leveledUp: boolean;
  onClose: () => void;
}

export default function SessionSummary({
  visible,
  minutes,
  xp,
  coins,
  leveledUp,
  onClose,
}: SessionSummaryProps) {
  const { colors } = useTheme();
  // Live values — already include this session's XP when the modal shows
  const { level, xpIntoLevel, xpForNextLevel, progress } = useXp();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {leveledUp && (
            <View style={[styles.levelUpPill, { backgroundColor: colors.accent }]}>
              <Ionicons name="arrow-up" size={14} color="#ffffff" />
              <Text style={styles.levelUpText}>LEVEL UP</Text>
            </View>
          )}

          <Text style={[styles.title, { color: colors.text }]}>
            Session Complete
          </Text>

          <Text style={[styles.duration, { color: colors.text }]}>
            {minutes}m
          </Text>
          <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
            FOCUSED
          </Text>

          <View style={styles.rewardsRow}>
            <View
              style={[
                styles.rewardChip,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="flash" size={18} color={colors.accent} />
              <Text style={[styles.rewardText, { color: colors.text }]}>
                +{xp} XP
              </Text>
            </View>
            <View
              style={[
                styles.rewardChip,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="star" size={18} color="#ffd700" />
              <Text style={[styles.rewardText, { color: colors.text }]}>
                +{coins}
              </Text>
            </View>
          </View>

          <View style={styles.levelSection}>
            <View style={styles.levelRow}>
              <Text style={[styles.levelLabel, { color: colors.text }]}>
                Level {level}
              </Text>
              <Text style={[styles.levelXp, { color: colors.textSecondary }]}>
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

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: "center",
  },
  levelUpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  levelUpText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    color: "#ffffff",
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
  },
  duration: {
    fontSize: 56,
    fontFamily: "Outfit-Bold",
    lineHeight: 62,
  },
  durationLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    letterSpacing: 2,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  rewardsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  rewardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  rewardText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
  },
  levelSection: {
    width: "100%",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelLabel: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
  },
  levelXp: {
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
  continueButton: {
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  continueText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
    color: "#ffffff",
  },
});
