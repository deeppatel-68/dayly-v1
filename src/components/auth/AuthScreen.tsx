import { BorderRadius, Spacing } from "@/constants/Spacing";
import { FontFamilies, StudioType } from "@/constants/Typography";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export const AuthScreen = () => {
  const { signIn, signUp } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);

        // Show success message with instructions
        Alert.alert(
          "Check your email",
          `We've sent a confirmation link to:\n${email}\n\nPlease check your inbox (and spam folder) and click the link to activate your account.\n\nAfter confirming, come back here to sign in.`,
          [
            {
              text: "OK",
              onPress: () => {
                setIsSignUp(false); // Switch to sign in mode
                // Keep email filled in for convenience
                setPassword("");
              },
            },
          ]
        );
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      console.error("Auth error:", error);

      // Handle specific error cases
      const errorMessage =
        error?.message || error?.toString() || "An error occurred";

      if (errorMessage.includes("Email not confirmed")) {
        Alert.alert(
          "Email not confirmed",
          `Please check your email (${email}) and click the confirmation link we sent you.\n\nDidn't receive it? Check your spam folder.`,
          [
            {
              text: "I Confirmed",
              onPress: () => {
                Alert.alert("Great!", "Try signing in again now.");
              },
            },
            { text: "OK" },
          ]
        );
      } else if (errorMessage.includes("Invalid login credentials")) {
        Alert.alert(
          "Invalid Credentials",
          'Please check your email and password and try again.\n\nForgot your password? Use the "Forgot Password?" link below.'
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Email Required", "Please enter your email address first.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL("/auth/reset-password"),
      });

      if (error) throw error;

      Alert.alert(
        "Check your email",
        `We've sent a password reset link to:\n${email}\n\nClick the link in the email to reset your password.\n\nThe link will expire in 1 hour.`,
        [{ text: "OK", onPress: () => setShowForgotPassword(false) }]
      );
    } catch (error: any) {
      console.error("Password reset error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Screen
  if (showForgotPassword) {
    return (
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <AuthBrand colors={colors} />
          <Text style={[styles.title, { color: colors.accent }]}>
            Reset Password
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email to receive a reset link
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent },
              loading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onAccent }]}>Send Reset Link</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setShowForgotPassword(false)}
            disabled={loading}
            style={styles.switchButton}
          >
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              Back to Sign In
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Main Auth Screen
  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <AuthBrand colors={colors} />
        <Text style={[styles.title, { color: colors.text }]}>
          {isSignUp ? "Create your Dayly" : "Welcome back"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isSignUp
            ? "Build habits, focus deeply, and grow a companion of your own."
            : "Your habits, focus history, and companion are waiting."}
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={isSignUp ? "new-password" : "current-password"}
          editable={!loading}
        />

        {!isSignUp && (
          <Pressable
            onPress={() => setShowForgotPassword(true)}
            style={styles.forgotPassword}
            disabled={loading}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>
              Forgot Password?
            </Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent },
            loading && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.onAccent }]}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={loading}
          style={styles.switchButton}
        >
          <Text style={[styles.switchText, { color: colors.textSecondary }]}>
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>

        {isSignUp && (
          <Text style={[styles.noteText, { color: colors.textTertiary }]}>
            {"You'll be signed in automatically after creating your account"}
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function AuthBrand({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={styles.brandRow}>
      <View style={[styles.brandMark, { backgroundColor: colors.accent }]} />
      <Text style={[styles.brand, { color: colors.text }]}>dayly</Text>
    </View>
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
    gap: Spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  brandMark: { width: 9, height: 9, borderRadius: 5 },
  brand: { fontFamily: FontFamilies.semibold, fontSize: 28 },
  title: {
    ...StudioType.largeTitle,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    ...StudioType.body,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...StudioType.body,
    borderWidth: 1,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  forgotPasswordText: {
    ...StudioType.detail,
    fontWeight: "600",
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
  switchButton: {
    marginTop: Spacing.md,
  },
  switchText: {
    textAlign: "center",
    ...StudioType.detail,
    fontWeight: "500",
  },
  noteText: {
    textAlign: "center",
    marginTop: Spacing.md,
    ...StudioType.detail,
    fontStyle: "italic",
  },
});
