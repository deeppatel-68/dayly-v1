// Import necessary libraries
// AsyncStorage: Used to save/load theme preference to device storage
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext, // Creates a context for sharing theme data
  ReactNode, // Type for React children components
  useContext, // Hook to access context data
  useEffect, // Hook to run code when component mounts
  useState, // Hook to manage theme state
} from "react";
import { useColorScheme } from "react-native"; // Detects device's system theme (light/dark)
import { Colors, ColorScheme, ThemeColors } from "../constants/Colors"; // Import color definitions

// Define what data and functions the ThemeContext will provide
type ThemeContextType = {
  colorScheme: ColorScheme; // Current theme: "light" or "dark"
  colors: ThemeColors; // Color palette for current theme
  toggleTheme: () => void; // Function to switch between light/dark
  setTheme: (theme: ColorScheme) => void; // Function to set a specific theme
};

// Create the context (starts as undefined until ThemeProvider wraps the app)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Key used to save theme preference in device storage
const THEME_STORAGE_KEY = "@app_theme";

// Main component that provides theme data to all child components
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Get the device's system theme preference (light or dark)
  // This detects if user has dark mode enabled in their phone settings
  const systemColorScheme = useColorScheme();

  // Initialize theme state
  // Defaults to system preference, or "light" if system preference is unavailable
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    systemColorScheme === "dark" ? "dark" : "light"
  );

  // When component first loads, check if user previously saved a theme preference
  useEffect(() => {
    loadTheme();
  }, []); // Empty array means this runs only once when component mounts

  // Load saved theme preference from device storage
  const loadTheme = async () => {
    try {
      // Try to get saved theme from storage
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      // If a valid theme was saved, use it
      if (savedTheme === "light" || savedTheme === "dark") {
        setColorScheme(savedTheme);
      }
      // If nothing was saved, the default from useState above will be used
    } catch (error) {
      // If there's an error reading storage, just use the default theme
      console.error("Error loading theme:", error);
    }
  };

  // Save theme preference to device storage so it persists between app launches
  const saveTheme = async (theme: ColorScheme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // If saving fails, log error but don't crash the app
      console.error("Error saving theme:", error);
    }
  };

  // Toggle between light and dark theme
  const toggleTheme = () => {
    // Switch to opposite theme
    const newTheme = colorScheme === "light" ? "dark" : "light";
    setColorScheme(newTheme as ColorScheme); // Update state immediately
    saveTheme(newTheme); // Save preference for next time
  };

  // Set theme to a specific value (light or dark)
  const setTheme = (theme: ColorScheme) => {
    setColorScheme(theme); // Update state
    saveTheme(theme); // Save preference
  };

  // Package all theme data and functions into one object
  const value = {
    colorScheme, // Current theme ("light" or "dark")
    colors: Colors[colorScheme], // Color palette matching current theme
    toggleTheme, // Function to switch themes
    setTheme, // Function to set specific theme
  };

  // Provide the theme data to all child components
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Custom hook to easily access theme data in any component
// Usage: const { colorScheme, colors, toggleTheme } = useTheme();
export function useTheme() {
  const context = useContext(ThemeContext);
  // Safety check: make sure this hook is used inside a ThemeProvider
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context; // Return theme data and functions
}
