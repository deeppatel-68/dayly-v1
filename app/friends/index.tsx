import CompanionBadge from "@/components/friends/CompanionBadge";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  addFriendByCode,
  getFriendsOverview,
  getMyFriendProfile,
  removeFriend,
  respondToRequest,
  searchUsers,
  sendFriendRequest,
  subscribeToFriends,
} from "@/services/friendsService";
import {
  EMPTY_FRIENDS_OVERVIEW,
  FriendsOverview,
  UserSearchResult,
} from "@/types/friends";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, router, useFocusEffect } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const shareInvite = (friendCode: string | null) => {
  if (!friendCode) return;
  Share.share({
    message: `Add me on Dayly! My friend code is ${friendCode} — grow your study companion with me.`,
  }).catch(() => {});
};

export default function FriendsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const [overview, setOverview] = React.useState<FriendsOverview>(
    EMPTY_FRIENDS_OVERVIEW
  );
  const [friendCode, setFriendCode] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<UserSearchResult[]>(
    []
  );
  const [codeInput, setCodeInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    try {
      const [nextOverview, myProfile] = await Promise.all([
        getFriendsOverview(userId),
        getMyFriendProfile(userId),
      ]);
      setOverview(nextOverview);
      setFriendCode(myProfile.friendCode);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => subscribeToFriends(setOverview), []);

  useFocusEffect(
    React.useCallback(() => {
      refresh().catch(() => setLoading(false));
    }, [refresh])
  );

  // Debounced username search
  React.useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(query)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const runAction = async (action: () => Promise<void>, refreshSearch = false) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (refreshSearch && searchQuery.trim().length >= 2) {
        setSearchResults(await searchUsers(searchQuery.trim()));
      }
    } catch (error) {
      Alert.alert(
        "Friends",
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (friendUserId: string, username: string) => {
    Alert.alert(
      "Remove friend",
      `Remove ${username} from your friends?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => runAction(() => removeFriend(userId, friendUserId)),
        },
      ],
      { cancelable: true }
    );
  };

  const relationshipLabel = (result: UserSearchResult) => {
    switch (result.relationship) {
      case "friends":
        return "Friends";
      case "pending_out":
        return "Requested";
      case "pending_in":
        return "Respond";
      default:
        return "Add";
    }
  };

  const cardStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Friends",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/friends/leaderboard")}
              hitSlop={12}
              accessibilityLabel="Open leaderboard"
            >
              <Ionicons name="trophy-outline" size={22} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
        {/* Add friends */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          ADD FRIENDS
        </Text>
        <View style={[styles.card, cardStyle]}>
          <View
            style={[
              styles.inputRow,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by username"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {searchResults.map((result) => (
            <View key={result.userId} style={styles.row}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                {result.username}
              </Text>
              <Pressable
                disabled={busy || result.relationship !== "none"}
                onPress={() =>
                  runAction(
                    () => sendFriendRequest(userId, result.username),
                    true
                  )
                }
                style={({ pressed }) => [
                  styles.smallButton,
                  {
                    backgroundColor:
                      result.relationship === "none"
                        ? colors.accent
                        : colors.background,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.smallButtonText,
                    {
                      color:
                        result.relationship === "none"
                          ? colors.onAccent
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {relationshipLabel(result)}
                </Text>
              </Pressable>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View
            style={[
              styles.inputRow,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          >
            <Ionicons name="key-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={codeInput}
              onChangeText={setCodeInput}
              placeholder="Enter a friend code"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
            <Pressable
              disabled={busy || codeInput.trim().length < 8}
              onPress={() =>
                runAction(async () => {
                  await addFriendByCode(userId, codeInput);
                  setCodeInput("");
                })
              }
              hitSlop={8}
            >
              <Text
                style={[
                  styles.smallButtonText,
                  {
                    color:
                      codeInput.trim().length >= 8
                        ? colors.accent
                        : colors.textSecondary,
                  },
                ]}
              >
                Add
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => shareInvite(friendCode)}
            style={({ pressed }) => [
              styles.shareRow,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="share-outline" size={18} color={colors.accent} />
            <Text style={[styles.shareText, { color: colors.accent }]}>
              Share my code{friendCode ? ` · ${friendCode}` : ""}
            </Text>
          </Pressable>
        </View>

        {/* Pending requests */}
        {overview.pendingIn.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              REQUESTS
            </Text>
            <View style={[styles.card, cardStyle]}>
              {overview.pendingIn.map((request) => (
                <View key={request.friendshipId} style={styles.row}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {request.username}
                  </Text>
                  <View style={styles.rowActions}>
                    <Pressable
                      disabled={busy}
                      onPress={() =>
                        runAction(() =>
                          respondToRequest(userId, request.friendshipId, true)
                        )
                      }
                      style={[styles.iconButton, { backgroundColor: colors.accent }]}
                      accessibilityLabel={`Accept ${request.username}`}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.onAccent} />
                    </Pressable>
                    <Pressable
                      disabled={busy}
                      onPress={() =>
                        runAction(() =>
                          respondToRequest(userId, request.friendshipId, false)
                        )
                      }
                      style={[
                        styles.iconButton,
                        {
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: colors.border,
                        },
                      ]}
                      accessibilityLabel={`Decline ${request.username}`}
                    >
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Friends list */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          FRIENDS{overview.friends.length ? ` · ${overview.friends.length}` : ""}
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : overview.friends.length === 0 ? (
          <View style={[styles.card, cardStyle, styles.emptyCard]}>
            <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Invite your first friend
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Your companion loves company. Share your code and see who keeps
              their streak longest.
            </Text>
            <Pressable
              onPress={() => shareInvite(friendCode)}
              style={({ pressed }) => [
                styles.emptyCta,
                { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 },
              ]}
            >
            <Text style={[styles.emptyCtaText, { color: colors.onAccent }]}>Share invite</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.card, cardStyle]}>
            {overview.friends.map((friend) => (
              <Pressable
                key={friend.userId}
                onLongPress={() => confirmRemove(friend.userId, friend.username)}
                style={styles.row}
              >
                <View style={styles.friendLeft}>
                  <CompanionBadge companion={friend.companion} />
                  <View>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>
                      {friend.username}
                    </Text>
                    <Text
                      style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                    >
                      {friend.currentStreak > 0
                        ? `🔥 ${friend.currentStreak} day streak`
                        : "No streak yet"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            ))}
            {overview.pendingOut.length > 0 ? (
              <Text style={[styles.pendingOutNote, { color: colors.textSecondary }]}>
                {overview.pendingOut.length} request
                {overview.pendingOut.length > 1 ? "s" : ""} sent, awaiting reply
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  sectionTitle: {
    ...StudioType.section,
    color: undefined,
    letterSpacing: 0.2,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    ...StudioType.body,
    paddingVertical: 2,
  },
  divider: { height: 1, marginVertical: Spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  rowTitle: { ...StudioType.bodyStrong },
  rowSubtitle: { ...StudioType.detail, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: Spacing.sm },
  friendLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  smallButton: {
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  smallButtonText: { ...StudioType.detail, fontWeight: "600" },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  shareText: { ...StudioType.bodyStrong },
  loader: { marginTop: Spacing.lg },
  emptyCard: { alignItems: "center", paddingVertical: Spacing.xl },
  emptyTitle: {
    ...StudioType.bodyStrong,
    marginTop: Spacing.sm,
  },
  emptyBody: {
    ...StudioType.detail,
    textAlign: "center",
    marginTop: Spacing.xs,
    marginHorizontal: Spacing.lg,
  },
  emptyCta: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  emptyCtaText: { ...StudioType.bodyStrong },
  pendingOutNote: {
    ...StudioType.detail,
    paddingTop: Spacing.xs,
  },
});
