import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useCharacter } from "@/context/CharacterContext";
import { useTheme } from "@/context/ThemeContext";
import { getLevelProgress } from "@/utils/xp";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface SessionSummaryProps {
  visible: boolean;
  minutes: number;
  xp: number;
  coins: number;
  leveledUp: boolean;
  totalFocusSeconds: number;
  totalXp: number;
  coinBalance: number;
  endedAt?: string;
  onClose: () => void;
}

export default function SessionSummary({
  visible,
  minutes,
  xp,
  coins,
  leveledUp,
  totalFocusSeconds,
  totalXp,
  coinBalance,
  endedAt,
  onClose,
}: SessionSummaryProps) {
  const { colors } = useTheme();
  const { character } = useCharacter();
  const { level, xpIntoLevel, xpForNextLevel, progress } =
    getLevelProgress(totalXp);
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const totalFocusMinutes = Math.floor(totalFocusSeconds / 60);
  const savedAt = endedAt
    ? new Date(endedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  // Spring the card in, then sweep the XP bar to its new progress
  useEffect(() => {
    if (!visible) return;
    cardScale.setValue(0.95);
    fillAnim.setValue(0);
    Animated.spring(cardScale, {
      toValue: 1,
      speed: 18,
      bounciness: 7,
      useNativeDriver: true,
    }).start();
    Animated.timing(fillAnim, {
      toValue: progress,
      duration: 600,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width animation
    }).start();
  }, [visible, progress, cardScale, fillAnim]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {leveledUp && (
            <View style={[styles.levelUpPill, { backgroundColor: colors.accent }]}>
              <Ionicons name="arrow-up" size={14} color={colors.onAccent} />
              <Text style={[styles.levelUpText, { color: colors.onAccent }]}>LEVEL UP</Text>
            </View>
          )}

          <Text style={[styles.title, { color: colors.text }]}>
            {character.companionName
              ? `${character.companionName} is proud of you`
              : "Session Complete"}
          </Text>

          <Text style={[styles.duration, { color: colors.text }]}>
            {minutes}m
          </Text>
          <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
            FOCUSED
          </Text>

          {savedAt && (
            <Text style={[styles.savedText, { color: colors.textSecondary }]}>
              Saved at {savedAt}
            </Text>
          )}

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
              <Ionicons name="star" size={18} color="#D4A27F" />
              <Text style={[styles.rewardText, { color: colors.text }]}>
                +{coins}
              </Text>
            </View>
          </View>

          <View style={styles.totalsGrid}>
            <View
              style={[
                styles.totalTile,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {totalFocusMinutes}m
              </Text>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                Total focus
              </Text>
            </View>
            <View
              style={[
                styles.totalTile,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {coinBalance}
              </Text>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                Coins
              </Text>
            </View>
            <View
              style={[
                styles.totalTile,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {totalXp}
              </Text>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                Total XP
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
              <Animated.View
                style={[
                  styles.fill,
                  {
                    backgroundColor: colors.accent,
                    width: fillAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
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
            <Text style={[styles.continueText, { color: colors.onAccent }]}>Continue</Text>
          </Pressable>
        </Animated.View>
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
    ...StudioType.detail,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    ...StudioType.title,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  duration: {
    fontSize: 56,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    lineHeight: 62,
  },
  durationLabel: {
    ...StudioType.detail,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  savedText: {
    ...StudioType.detail,
    marginBottom: Spacing.lg,
  },
  rewardsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
    ...StudioType.bodyStrong,
  },
  totalsGrid: {
    width: "100%",
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  totalTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: "center",
  },
  totalValue: {
    ...StudioType.bodyStrong,
    fontVariant: ["tabular-nums"],
  },
  totalLabel: {
    ...StudioType.detail,
    marginTop: 2,
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
    ...StudioType.bodyStrong,
  },
  levelXp: {
    ...StudioType.detail,
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
    ...StudioType.bodyStrong,
  },
});
