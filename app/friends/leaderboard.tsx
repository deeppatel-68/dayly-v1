import CompanionBadge from "@/components/friends/CompanionBadge";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { getLeaderboard } from "@/services/friendsService";
import type { LeaderboardMetric, LeaderboardRow } from "@/types/friends";
import { formatMetricValue, rankLeaderboard } from "@/utils/leaderboard";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const METRICS: { key: LeaderboardMetric; label: string }[] = [
  { key: "weeklyXp", label: "Weekly XP" },
  { key: "streak", label: "Streak" },
  { key: "weeklyFocus", label: "Focus" },
  { key: "allTime", label: "Level" },
];

const MEDAL_COLORS = ["#E8B923", "#B8B8C0", "#C08A5A"];

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const [rows, setRows] = React.useState<LeaderboardRow[]>([]);
  const [metric, setMetric] = React.useState<LeaderboardMetric>("weeklyXp");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    try {
      setRows(await getLeaderboard(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      refresh().catch(() => setLoading(false));
    }, [refresh])
  );

  const ranked = React.useMemo(
    () => rankLeaderboard(rows, metric),
    [rows, metric]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Leaderboard" }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={() => {
              setRefreshing(true);
              refresh().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {/* Metric tabs */}
        <View
          style={[
            styles.segments,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {METRICS.map((entry) => {
            const active = entry.key === metric;
            return (
              <Pressable
                key={entry.key}
                onPress={() => setMetric(entry.key)}
                style={[
                  styles.segment,
                  active && { backgroundColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? "#ffffff" : colors.textSecondary },
                  ]}
                >
                  {entry.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : ranked.length < 2 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="trophy-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No race yet
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Add friends to see who earns the most XP this week.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.board,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {ranked.map(({ rank, row }) => (
              <View
                key={row.userId}
                style={[
                  styles.row,
                  row.isSelf && {
                    backgroundColor: `${colors.accent}18`,
                    borderRadius: BorderRadius.md,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rank,
                    {
                      color:
                        rank <= 3 ? MEDAL_COLORS[rank - 1] : colors.textSecondary,
                    },
                  ]}
                >
                  {rank}
                </Text>
                <CompanionBadge companion={row.companion} size={40} />
                <View style={styles.nameBlock}>
                  <Text
                    style={[styles.name, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {row.username}
                  </Text>
                  {row.isSelf ? (
                    <View style={[styles.youPill, { backgroundColor: colors.accent }]}>
                      <Text style={styles.youPillText}>You</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.value, { color: colors.accent }]}>
                  {formatMetricValue(row, metric)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {metric === "weeklyXp" || metric === "weeklyFocus" ? (
          <Text style={[styles.footer, { color: colors.textSecondary }]}>
            Weekly boards reset every Monday
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  segments: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md - 2,
    alignItems: "center",
  },
  segmentText: { fontSize: 13, fontFamily: "Outfit-SemiBold" },
  loader: { marginTop: Spacing.xl },
  board: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  rank: {
    width: 24,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
  },
  nameBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  name: { fontSize: 15, fontFamily: "Outfit-Medium", flexShrink: 1 },
  youPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
  },
  youPillText: { color: "#ffffff", fontSize: 10, fontFamily: "Outfit-SemiBold" },
  value: { fontSize: 15, fontFamily: "Outfit-Bold" },
  emptyCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    padding: Spacing.xl,
    marginTop: Spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Outfit-SemiBold",
    marginTop: Spacing.sm,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  footer: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
