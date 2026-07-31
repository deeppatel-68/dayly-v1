import { BorderRadius, Spacing } from "@/constants/Spacing";
import { FontFamilies, StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"password" | "confirm" | null>(null);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      Alert.alert(
        "Password updated",
        "Your password has been reset successfully. You can now sign in with your new password.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to auth screen
              router.replace("/");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Reset password error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.accent }]} />
          <Text style={[styles.brand, { color: colors.text }]}>dayly</Text>
        </View>
        <View style={styles.entryCopy}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>ACCOUNT RECOVERY</Text>
          <Text style={[styles.title, { color: colors.text }]}>Choose a new password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Make it something only you will know.
          </Text>
        </View>

        <View style={[styles.formSurface, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>New password</Text>
          <TextInput
            accessibilityLabel="New password"
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceRaised,
                color: colors.text,
                borderColor: focusedField === "password" ? colors.focusRing : colors.border,
              },
            ]}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            secureTextEntry
            autoComplete="new-password"
            editable={!loading}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Confirm password</Text>
          <TextInput
            accessibilityLabel="Confirm new password"
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceRaised,
                color: colors.text,
                borderColor: focusedField === "confirm" ? colors.focusRing : colors.border,
              },
            ]}
            placeholder="Enter it again"
            placeholderTextColor={colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onFocus={() => setFocusedField("confirm")}
            onBlur={() => setFocusedField(null)}
            secureTextEntry
            autoComplete="new-password"
            editable={!loading}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset password"
            accessibilityState={{ disabled: loading, busy: loading }}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent },
              loading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onAccent }]}>Reset Password</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          onPress={() => router.replace("/")}
          disabled={loading}
          style={styles.backButton}
        >
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to Sign In</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: "center",
    gap: Spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  brandMark: { width: 9, height: 9, borderRadius: 5 },
  brand: { fontFamily: FontFamilies.semibold, fontSize: 28 },
  entryCopy: { gap: Spacing.xs },
  eyebrow: { ...StudioType.detail, fontWeight: "700", letterSpacing: 0.8 },
  title: { ...StudioType.displayLarge },
  subtitle: { ...StudioType.body },
  formSurface: {
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  fieldLabel: { ...StudioType.detail, fontWeight: "600", marginTop: Spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    ...StudioType.body,
  },
  button: {
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: { opacity: 0.78 },
  buttonText: {
    textAlign: "center",
    ...StudioType.bodyStrong,
  },
  backButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    textAlign: "center",
    ...StudioType.detail,
    fontWeight: "600",
  },
});
