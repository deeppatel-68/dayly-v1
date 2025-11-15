/**
 * Black and Orange Theme - Minimalist Design
 * Inspired by the "Dayly" app aesthetic
 */

const accent = "#ff6b35"; // Orange accent color

export const Colors = {
  light: {
    // Backgrounds
    background: "#ffffff",
    backgroundSecondary: "#f5f5f5",
    card: "#ffffff",

    // Text
    text: "#1a1a1a",
    textSecondary: "#666666",
    textTertiary: "#999999",

    // Accent
    accent: accent,
    accentLight: "#ff8a5c",

    // Borders
    border: "#e0e0e0",
    borderLight: "#f0f0f0",

    // Task completion
    completed: accent,
    completedBackground: "rgba(255, 107, 53, 0.1)",

    // Interactive states
    checkboxEmpty: "#e0e0e0",
    checkboxFilled: accent,

    // Status
    success: accent,
    error: "#f44336",
  },

  dark: {
    // Backgrounds - Pure black like the design
    background: "#000000",
    backgroundSecondary: "#1a1a1a",
    card: "#1a1a1a",

    // Text
    text: "#ffffff",
    textSecondary: "#999999",
    textTertiary: "#666666",

    // Accent - Same orange in both themes
    accent: accent,
    accentLight: "#ff8a5c",

    // Borders - Subtle gray lines
    border: "#333333",
    borderLight: "#2a2a2a",

    // Task completion
    completed: accent,
    completedBackground: "rgba(255, 107, 53, 0.1)",

    // Interactive states
    checkboxEmpty: "#333333",
    checkboxFilled: accent,

    // Status
    success: accent,
    error: "#f44336",
  },
};

export type ColorScheme = "light" | "dark";
export type ThemeColors = typeof Colors.light;
