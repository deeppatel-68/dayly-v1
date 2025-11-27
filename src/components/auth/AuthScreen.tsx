import { BorderRadius, Spacing } from "@/constants/Spacing";
import { FontFamilies, FontSizes } from "@/constants/Typography";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
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
          "Please check your email and password and try again.\n\nMake sure you've confirmed your email first."
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

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
