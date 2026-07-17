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
  const { totalCount, percentage, currentStreak } = useHabits();
  const { xp, level } = useXp();
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const username = profile?.username || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const initial = username.slice(0, 1).toUpperCase();

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
        saveError instanceof Error ? saveError.message : "Could not update your username."
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
        onPress: () => signOut().catch(() => Alert.alert("Could not sign out", "Please try again.")),
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.onAccent }]}>{initial}</Text>
          </View>
          <View style={styles.identityCopy}>
            <View style={styles.nameRow}>
              <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
              <StudioIconButton icon="pencil-outline" label="Edit username" onPress={openEditor} />
            </View>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
            <Text style={[styles.level, { color: colors.accent }]}>Level {level}  ·  {xp} XP</Text>
          </View>
        </View>

        <StudioSection title="Your rhythm">
          <StudioGroup style={styles.metricsGroup}>
            <Metric value={totalCount} label="Habits" />
            <Metric value={`${Math.round(percentage)}%`} label="Today" divider />
            <Metric value={currentStreak} label="Streak" divider />
          </StudioGroup>
        </StudioSection>

        <StudioSection title="Community">
          <StudioGroup>
            <StudioRow
              title="Friends"
              detail="Compare your shared momentum"
              leading={<Ionicons name="people-outline" size={20} color={colors.accent} />}
              trailing={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
              onPress={() => router.push("/friends")}
              last
            />
          </StudioGroup>
        </StudioSection>

        <StudioSection title="Appearance">
          <StudioGroup>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceCopy}>
                <Ionicons
                  name={colorScheme === "dark" ? "moon-outline" : "sunny-outline"}
                  size={20}
                  color={colors.accent}
                />
                <Text style={[styles.preferenceTitle, { color: colors.text }]}>Dark appearance</Text>
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

        <StudioButton
          label="Sign out"
          icon="log-out-outline"
          onPress={confirmSignOut}
          tone="secondary"
          style={styles.signOut}
          textStyle={{ color: colors.error }}
        />
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
          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        </View>
      </StudioSheet>
    </View>
  );
}

function Metric({ value, label, divider = false }: { value: string | number; label: string; divider?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metric, divider && { borderLeftColor: colors.separator, borderLeftWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: Spacing.lg, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  identity: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingVertical: Spacing.sm },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontWeight: "700" },
  identityCopy: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  username: { ...StudioType.title, flexShrink: 1 },
  email: { ...StudioType.detail },
  level: { ...StudioType.detail, fontWeight: "600", marginTop: 2, fontVariant: ["tabular-nums"] },
  metricsGroup: { flexDirection: "row", marginHorizontal: 0 },
  metric: { flex: 1, alignItems: "center", gap: 2, paddingVertical: Spacing.md },
  metricValue: { ...StudioType.metric },
  metricLabel: { ...StudioType.detail },
  preferenceRow: { minHeight: 60, paddingHorizontal: Spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  preferenceCopy: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  preferenceTitle: { ...StudioType.body },
  signOut: { marginTop: Spacing.sm },
  editor: { gap: Spacing.sm },
  usernameInput: { minHeight: 52, borderWidth: StyleSheet.hairlineWidth, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, ...StudioType.body },
  error: { ...StudioType.detail },
  sheetButton: { flex: 1 },
});
