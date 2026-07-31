import {
  StudioButton,
  StudioGroup,
  StudioIconButton,
  StudioRow,
  StudioSection,
  StudioSheet,
} from "@/components/ui/StudioPrimitives";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useAuth } from "@/context/AuthContext";
import { useCharacter } from "@/context/CharacterContext";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { useXp } from "@/context/XpContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ProfileScreen() {
  const { colors, colorScheme, toggleTheme } = useTheme();
  const { user, profile, signOut, updateUsername } = useAuth();
  const { character } = useCharacter();
  const { totalCount, percentage, currentStreak } = useHabits();
  const { xp, level } = useXp();
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const username = profile?.username || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const initial = username.slice(0, 1).toUpperCase();
  const companionName = character.companionName || "Deep";

  const openEditor = () => {
    setUsernameInput(username);
    setError("");
    setShowEditSheet(true);
  };

  const saveUsername = async () => {
    const nextUsername = usernameInput.trim();
    if (!nextUsername) {
      setError("Choose a username to continue.");
      return;
    }
    if (nextUsername === username) {
      setShowEditSheet(false);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await updateUsername(nextUsername);
      setShowEditSheet(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update your username."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out", "You can sign back in whenever you are ready.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () =>
          signOut().catch(() =>
            Alert.alert("Could not sign out", "Please try again.")
          ),
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.completedBackground,
                borderColor: colors.accent,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {initial}
            </Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: colors.accent }]}>YOUR SPACE</Text>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={[styles.username, { color: colors.text }]}>
                {username}
              </Text>
              <StudioIconButton
                icon="pencil-outline"
                label="Edit username"
                onPress={openEditor}
                style={styles.editButton}
              />
            </View>
            <Text numberOfLines={1} style={[styles.email, { color: colors.textSecondary }]}>
              {email}
            </Text>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <Text style={[styles.levelText, { color: colors.text }]}>Level {level}</Text>
              <Text style={[styles.levelXp, { color: colors.textSecondary }]}>{xp} XP</Text>
            </View>
          </View>
        </View>

        <StudioSection title="Your rhythm">
          <StudioGroup style={styles.metricsGroup}>
            <Metric value={totalCount} label="Habits" />
            <Metric value={`${Math.round(percentage)}%`} label="Today" divider />
            <Metric value={currentStreak} label="Streak" divider />
          </StudioGroup>
        </StudioSection>

        <StudioSection title="Companion gallery">
          <StudioGroup>
            <StudioRow
              title={companionName}
              detail="Appearance, equipment, and room"
              leading={
                <View style={[styles.rowIcon, { backgroundColor: colors.completedBackground }]}>
                  <Ionicons name="happy-outline" size={19} color={colors.accent} />
                </View>
              }
              trailing={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
              onPress={() => router.push("/customise")}
              last
            />
          </StudioGroup>
        </StudioSection>

        <StudioSection title="Shared momentum">
          <StudioGroup>
            <StudioRow
              title="Friends"
              detail="See the rhythms you share"
              leading={
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="people-outline" size={19} color={colors.accent} />
                </View>
              }
              trailing={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
              onPress={() => router.push("/friends")}
              last
            />
          </StudioGroup>
        </StudioSection>

        <StudioSection title="Studio appearance">
          <StudioGroup>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceCopy}>
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons
                    name={colorScheme === "dark" ? "moon-outline" : "sunny-outline"}
                    size={19}
                    color={colors.accent}
                  />
                </View>
                <View>
                  <Text style={[styles.preferenceTitle, { color: colors.text }]}>
                    Dark appearance
                  </Text>
                  <Text style={[styles.preferenceDetail, { color: colors.textSecondary }]}>
                    {colorScheme === "dark" ? "On" : "Off"}
                  </Text>
                </View>
              </View>
              <Switch
                accessibilityLabel="Toggle dark appearance"
                value={colorScheme === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.onAccent}
              />
            </View>
          </StudioGroup>
        </StudioSection>

        <StudioSection title="Account session">
          <StudioGroup>
            <StudioRow
              title="Sign out"
              detail="End this session on this device"
              leading={
                <View style={[styles.rowIcon, { backgroundColor: `${colors.error}18` }]}>
                  <Ionicons name="log-out-outline" size={19} color={colors.error} />
                </View>
              }
              trailing={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
              onPress={confirmSignOut}
              destructive
              last
            />
          </StudioGroup>
        </StudioSection>
      </ScrollView>

      <StudioSheet
        visible={showEditSheet}
        title="Edit username"
        detail="Letters, numbers, and underscores"
        onClose={() => !isSaving && setShowEditSheet(false)}
        footer={
          <>
            <StudioButton
              label="Cancel"
              tone="secondary"
              onPress={() => setShowEditSheet(false)}
              disabled={isSaving}
              style={styles.sheetButton}
            />
            <StudioButton
              label="Save"
              onPress={saveUsername}
              loading={isSaving}
              style={styles.sheetButton}
            />
          </>
        }
      >
        <View style={styles.editor}>
          <TextInput
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSaving}
            maxLength={30}
            value={usernameInput}
            onChangeText={(value) => {
              setUsernameInput(value);
              setError("");
            }}
            placeholder="Username"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.usernameInput,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: error ? colors.error : colors.border,
                color: colors.text,
              },
            ]}
          />
          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          ) : null}
        </View>
      </StudioSheet>
    </View>
  );
}

function Metric({
  value,
  label,
  divider = false,
}: {
  value: string | number;
  label: string;
  divider?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.metric,
        divider && {
          borderLeftColor: colors.separator,
          borderLeftWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 30, fontWeight: "700", fontVariant: ["small-caps"] },
  heroCopy: { flex: 1, minWidth: 0, gap: 3, paddingVertical: 2 },
  heroEyebrow: {
    ...StudioType.detail,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  username: { ...StudioType.title, flex: 1 },
  editButton: { width: 36, height: 36, borderRadius: BorderRadius.sm },
  email: { ...StudioType.detail },
  levelBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    marginTop: Spacing.xs,
  },
  levelText: { ...StudioType.detail, fontWeight: "700" },
  levelXp: { ...StudioType.detail, fontVariant: ["tabular-nums"] },
  metricsGroup: { flexDirection: "row", marginHorizontal: 0 },
  metric: { flex: 1, alignItems: "center", gap: 2, paddingVertical: Spacing.md },
  metricValue: { ...StudioType.metric },
  metricLabel: { ...StudioType.detail },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  preferenceRow: {
    minHeight: 68,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preferenceCopy: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  preferenceTitle: { ...StudioType.body },
  preferenceDetail: { ...StudioType.detail, marginTop: 1 },
  editor: { gap: Spacing.sm },
  usernameInput: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    ...StudioType.body,
  },
  error: { ...StudioType.detail },
  sheetButton: { flex: 1 },
});
