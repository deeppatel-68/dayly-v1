import { BorderRadius, Spacing } from "@/constants/Spacing";
import { FontFamilies, FontSizes } from "@/constants/Typography";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
          "Check Your Email! 📧",
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
          "Email Not Confirmed ⚠️",
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
        redirectTo: "exp://127.0.0.1:8081/auth/reset-password",
      });

      if (error) throw error;

      Alert.alert(
        "Check Your Email! 📧",
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.content}>
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
                backgroundColor: colors.card,
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
            editable={!loading}
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.accent },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowForgotPassword(false)}
            disabled={loading}
            style={styles.switchButton}
          >
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Main Auth Screen
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isSignUp ? "Create Account" : "Welcome Back"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isSignUp
            ? "Start your habit tracking journey"
            : "Continue your streak"}
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
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
          editable={!loading}
        />

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {!isSignUp && (
          <TouchableOpacity
            onPress={() => setShowForgotPassword(true)}
            style={styles.forgotPassword}
            disabled={loading}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.accent },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={loading}
          style={styles.switchButton}
        >
          <Text style={[styles.switchText, { color: colors.textSecondary }]}>
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        {isSignUp && (
          <Text style={[styles.noteText, { color: colors.textTertiary }]}>
            📧 You'll receive a confirmation email after signing up
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSizes["4xl"],
    fontFamily: FontFamilies.bold,
    marginBottom: Spacing.xs,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamilies.regular,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamilies.regular,
    borderWidth: 1,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  forgotPasswordText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamilies.semibold,
  },
  button: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: FontSizes.lg,
    fontFamily: FontFamilies.semibold,
    letterSpacing: 1,
  },
  switchButton: {
    marginTop: Spacing.md,
  },
  switchText: {
    textAlign: "center",
    fontSize: FontSizes.sm,
    fontFamily: FontFamilies.medium,
  },
  noteText: {
    textAlign: "center",
    marginTop: Spacing.md,
    fontSize: FontSizes.xs,
    fontFamily: FontFamilies.regular,
    fontStyle: "italic",
  },
});
