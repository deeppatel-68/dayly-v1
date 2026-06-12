import { HabitsProvider } from "@/context/HabitsContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { CharacterProvider } from "@/context/CharacterContext";
import { CoinsProvider } from "@/context/CoinsContext";
import { ShopProvider } from "@/context/ShopContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { XpProvider } from "@/context/XpContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

// Prevent the splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

// Inner component that can use hooks
function AppContent() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

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

  // Show main app if authenticated
  return (
    <XpProvider>
      <CoinsProvider>
        <HabitsProvider>
          <CharacterProvider>
            <ShopProvider>
              <Stack screenOptions={{ headerShown: false }} />
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
