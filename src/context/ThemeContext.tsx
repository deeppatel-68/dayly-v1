import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { Colors, ColorScheme, ThemeColors } from "../constants/Colors";
import { useAuth } from "./AuthContext";
import { getUserSettings, setUserTheme } from "@/services/settingsService";

type ThemeContextType = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@app_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(
    systemColorScheme === "dark" ? "dark" : "light"
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    const loadTheme = async () => {
      try {
        const cachedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (
          !cancelled &&
          (cachedTheme === "light" || cachedTheme === "dark")
        ) {
          setColorSchemeState(cachedTheme);
        }

        if (!user) return;

        const settings = await getUserSettings(user.id);
        if (!cancelled && settings.theme) {
          setColorSchemeState(settings.theme);
          await AsyncStorage.setItem(THEME_STORAGE_KEY, settings.theme);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    loadTheme();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const persistTheme = async (theme: ColorScheme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
      if (user && loaded) {
        await setUserTheme(user.id, theme);
      }
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = colorScheme === "light" ? "dark" : "light";
    setColorSchemeState(newTheme);
    persistTheme(newTheme);
  };

  const setTheme = (theme: ColorScheme) => {
    setColorSchemeState(theme);
    persistTheme(theme);
  };

  const value = {
    colorScheme,
    colors: Colors[colorScheme],
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
