import { HabitsProvider } from "@/context/HabitsContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { CharacterProvider } from "@/context/CharacterContext";
import { CoinsProvider } from "@/context/CoinsContext";
import { ShopProvider } from "@/context/ShopContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { XpProvider } from "@/context/XpContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import {
  getOnboardingComplete,
  setOnboardingComplete,
} from "@/services/onboardingService";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

// Prevent the splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

// Inner component that can use hooks
function AppContent() {
  const { user, loading } = useAuth();
  const { colorScheme, colors } = useTheme();
  const navigationTheme = useMemo(
    () => ({
      dark: colorScheme === "dark",
      colors: {
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.separator,
        notification: colors.accent,
      },
      fonts: {
        regular: { fontFamily: "System", fontWeight: "400" as const },
        medium: { fontFamily: "System", fontWeight: "500" as const },
        bold: { fontFamily: "System", fontWeight: "700" as const },
        heavy: { fontFamily: "System", fontWeight: "800" as const },
      },
    }),
    [colorScheme, colors]
  );

  // First-run onboarding gate: checked per-user against AsyncStorage
  // (@onboarding_complete:<userId>). null = not checked yet, so we never
  // flash the Stack (or the flow) before we know which one to show.
  const [onboardingComplete, setOnboardingCompleteState] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    if (!user) {
      setOnboardingCompleteState(null);
      return;
    }

    let cancelled = false;
    setOnboardingCompleteState(null);
    getOnboardingComplete(user.id).then((complete) => {
      if (!cancelled) setOnboardingCompleteState(complete);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Show loading indicator while checking auth state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Show auth screen if not authenticated
  if (!user) {
    return <AuthScreen />;
  }

  // Show main app if authenticated. Onboarding needs Character/Habits
  // context (companion preview, starter habit picker), so it renders inside
  // the same provider tree as the Stack rather than gating in front of it.
  return (
    <XpProvider>
      <CoinsProvider>
        <HabitsProvider>
          <CharacterProvider>
            <ShopProvider>
              {onboardingComplete === null ? (
                <View
                  style={[
                    styles.loadingContainer,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              ) : onboardingComplete ? (
                <NavigationThemeProvider value={navigationTheme}>
                  <Stack
                    screenOptions={{
                      contentStyle: { backgroundColor: colors.background },
                      headerStyle: { backgroundColor: colors.surface },
                      headerTintColor: colors.text,
                      headerShadowVisible: false,
                      headerBackButtonDisplayMode: "minimal",
                    }}
                  >
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="customise"
                      options={{ title: "Customise", headerBackTitle: "Home" }}
                    />
                    <Stack.Screen
                      name="profile"
                      options={{ title: "Profile", headerBackTitle: "Home" }}
                    />
                    <Stack.Screen
                      name="friends/index"
                      options={{ title: "Friends", headerBackTitle: "Profile" }}
                    />
                    <Stack.Screen
                      name="friends/leaderboard"
                      options={{ title: "Leaderboard", headerBackTitle: "Friends" }}
                    />
                    <Stack.Screen name="auth" options={{ headerShown: false }} />
                  </Stack>
                </NavigationThemeProvider>
              ) : (
                <OnboardingFlow
                  onComplete={() => {
                    setOnboardingComplete(user.id);
                    setOnboardingCompleteState(true);
                  }}
                />
              )}
            </ShopProvider>
          </CharacterProvider>
        </HabitsProvider>
      </CoinsProvider>
    </XpProvider>
  );
}

export default function RootLayout() {
  // Load fonts from assets
  const [fontsLoaded, fontError] = useFonts({
    "Outfit-Regular": require("../assets/fonts/Outfit-Regular.ttf"),
    "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
    "Outfit-Medium": require("../assets/fonts/Outfit-Medium.ttf"),
    "Outfit-Light": require("../assets/fonts/Outfit-Light.ttf"),
    "Outfit-SemiBold": require("../assets/fonts/Outfit-SemiBold.ttf"),
    "Outfit-Thin": require("../assets/fonts/Outfit-Thin.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync(); // Hide the splash screen after fonts are loaded
    }
  }, [fontsLoaded, fontError]);

  // Don't render anything until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
