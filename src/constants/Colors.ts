/**
 * Anthropic/Claude-inspired theme - ivory, warm charcoal, terracotta
 * Dayly: gamified productivity companion
 */

const accent = "#D97757"; // Claude terracotta
const accentLight = "#D4A27F"; // Kraft tan

export const Colors = {
  light: {
    // Backgrounds - warm ivory
    background: "#FAF9F5",
    backgroundSecondary: "#F0EEE6",
    card: "#FFFFFF",

    // Text
    text: "#141413",
    textSecondary: "#87867F",
    textTertiary: "#B0AEA5",

    // Accent
    accent: accent,
    accentLight: accentLight,

    // Borders
    border: "#E5E3DA",
    borderLight: "#F0EEE6",

    // Task completion
    completed: accent,
    completedBackground: "rgba(217, 119, 87, 0.1)",

    // Interactive states
    checkboxEmpty: "#E5E3DA",
    checkboxFilled: accent,

    // Status
    success: "#6A9B5E",
    error: "#C65B4E",
  },

  dark: {
    // Backgrounds - Claude warm charcoal
    background: "#1F1E1D",
    backgroundSecondary: "#30302E",
    card: "#262624",

    // Text - ivory
    text: "#F0EEE6",
    textSecondary: "#B0AEA5",
    textTertiary: "#87867F",

    // Accent - terracotta in both themes
    accent: accent,
    accentLight: accentLight,

    // Borders - warm subtle lines
    border: "#3E3D3A",
    borderLight: "#30302E",

    // Task completion
    completed: accent,
    completedBackground: "rgba(217, 119, 87, 0.12)",

    // Interactive states
    checkboxEmpty: "#3E3D3A",
    checkboxFilled: accent,

    // Status
    success: "#6A9B5E",
    error: "#C65B4E",
  },
};

export type ColorScheme = "light" | "dark";
export type ThemeColors = typeof Colors.light;
