import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useAuth } from "@/context/AuthContext";
import { useHabits } from "@/context/HabitsContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, colorScheme, toggleTheme } = useTheme();
  const isDark = colorScheme === "dark";
  const { user, profile, signOut, updateUsername } = useAuth();
  const { habits, completedCount, totalCount, percentage, currentStreak } =
    useHabits();

  const [showEditModal, setShowEditModal] = React.useState(false);
  const [usernameInput, setUsernameInput] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // Get username from profile or fallback to email prefix
  const userName = profile?.username || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleEditUsername = () => {
    setUsernameInput(userName);
    setError("");
    setShowEditModal(true);
  };

  const handleSaveUsername = async () => {
    if (!usernameInput.trim()) {
      setError("Username cannot be empty");
      return;
    }

    if (usernameInput.trim() === userName) {
      setShowEditModal(false);
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await updateUsername(usernameInput.trim());
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to update username");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Coming Soon",
              "Account deletion will be available soon."
            );
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header with Back Button */}
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Profile
          </Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        {/* Profile Header */}
        <View style={styles.header}>
          <View
            style={[styles.avatarLarge, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <View style={styles.userNameContainer}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {userName}
            </Text>
            <Pressable
              onPress={handleEditUsername}
              style={({ pressed }) => [
                styles.editButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {userEmail}
          </Text>
        </View>

        {/* Stats Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            STATS
          </Text>
          <View
            style={[
              styles.statsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {totalCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Habits
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {Math.round(percentage)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Today
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {currentStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Day Streak
              </Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            SETTINGS
          </Text>
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.settingRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name={isDark ? "moon" : "sunny"}
                  size={22}
                  color={colors.text}
                />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={colors.text}
                />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Notifications
                </Text>
              </View>
              <Switch
                value={false}
                onValueChange={() =>
                  Alert.alert(
                    "Coming Soon",
                    "Notifications will be available soon."
                  )
                }
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ACCOUNT
          </Text>
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                {
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Password change will be available soon."
                )
              }
            >
              <View style={styles.settingLeft}>
                <Ionicons name="key-outline" size={22} color={colors.text} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Change Password
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleDeleteAccount}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
                <Text style={[styles.settingLabel, { color: colors.error }]}>
                  Delete Account
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.accent,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.accent} />
            <Text style={[styles.signOutText, { color: colors.accent }]}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Edit Username Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isSaving && setShowEditModal(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Username
            </Text>

            <TextInput
              style={[
                styles.usernameInput,
                {
                  backgroundColor: colors.background,
                  borderColor: error ? colors.error : colors.border,
                  color: colors.text,
                },
              ]}
              value={usernameInput}
              onChangeText={(text) => {
                setUsernameInput(text);
                setError("");
              }}
              placeholder="Enter username"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              maxLength={30}
              editable={!isSaving}
            />

            {error ? (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            ) : null}

            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              2-30 characters, letters, numbers, and underscores only
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowEditModal(false)}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.cancelButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveUsername}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.saveButton,
                  {
                    backgroundColor: colors.accent,
                    opacity: pressed || isSaving ? 0.7 : 1,
                  },
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 40,
    fontFamily: "Outfit-Bold",
    color: "#ffffff",
  },
  userNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  userName: {
    fontSize: 28,
    fontFamily: "Outfit-Bold",
  },
  editButton: {
    padding: Spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  statsCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
  statDivider: {
    width: 1,
    marginHorizontal: Spacing.md,
  },
  settingsCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: "Outfit-Medium",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.md,
  },
  usernameInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    fontFamily: "Outfit-Regular",
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    marginBottom: Spacing.xs,
  },
  helperText: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginBottom: Spacing.md,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelButton: {},
  saveButton: {},
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
    color: "#ffffff",
  },
});
