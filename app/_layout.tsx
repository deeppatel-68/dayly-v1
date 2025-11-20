import { HabitsProvider } from "@/context/HabitsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { CharacterProvider } from "@/context/CharacterContext";
import { CoinsProvider } from "@/context/CoinsContext";
import { ShopProvider } from "@/context/ShopContext";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";

// Prevent the splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

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
    <ThemeProvider>
      <HabitsProvider>
        <CharacterProvider>
          <CoinsProvider>
            <ShopProvider>
              <Stack />
            </ShopProvider>
          </CoinsProvider>
        </CharacterProvider>
      </HabitsProvider>
    </ThemeProvider>
  );
}
