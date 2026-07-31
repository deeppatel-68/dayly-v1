export type ColorScheme = "light" | "dark";

export type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  card: string;
  surface: string;
  surfaceRaised: string;
  surfaceSelected: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentLight: string;
  onAccent: string;
  border: string;
  borderLight: string;
  separator: string;
  overlay: string;
  focusRing: string;
  glassFallback: string;
  completed: string;
  completedBackground: string;
  checkboxEmpty: string;
  checkboxFilled: string;
  success: string;
  error: string;
};

// Ember Nocturne keeps the utility layer quiet and lets progress feel warm.
// The companion and focus moments carry the most saturation and visual drama.
export const Colors: Record<ColorScheme, ThemeColors> = {
  dark: {
    background: "#120E0F",
    backgroundSecondary: "#1A1415",
    card: "#201819",
    surface: "#201819",
    surfaceRaised: "#2A2022",
    surfaceSelected: "#36292B",
    text: "#F5EEE8",
    textSecondary: "#C1B3AB",
    textTertiary: "#8D7D77",
    accent: "#EC9B78",
    accentLight: "#FFC7AE",
    onAccent: "#2B1814",
    border: "#3A2B2D",
    borderLight: "#2A2022",
    separator: "#4A3738",
    overlay: "rgba(14, 8, 9, 0.8)",
    focusRing: "#FFC7AE",
    glassFallback: "rgba(35, 25, 27, 0.92)",
    completed: "#EC9B78",
    completedBackground: "rgba(236, 155, 120, 0.16)",
    checkboxEmpty: "#2A2022",
    checkboxFilled: "#EC9B78",
    success: "#A6C6A3",
    error: "#F2A19A",
  },
  light: {
    background: "#FAF6F3",
    backgroundSecondary: "#F1EAE5",
    card: "#FFFDFC",
    surface: "#FFFDFC",
    surfaceRaised: "#F8F1EC",
    surfaceSelected: "#F0E3DB",
    text: "#261B1A",
    textSecondary: "#675653",
    textTertiary: "#8A7772",
    accent: "#B95636",
    accentLight: "#D87957",
    onAccent: "#FFFFFF",
    border: "#E0D2CB",
    borderLight: "#F1EAE5",
    separator: "#E0D2CB",
    overlay: "rgba(30, 17, 16, 0.44)",
    focusRing: "#9E4127",
    glassFallback: "rgba(255, 251, 248, 0.94)",
    completed: "#B95636",
    completedBackground: "rgba(185, 86, 54, 0.11)",
    checkboxEmpty: "#F1EAE5",
    checkboxFilled: "#B95636",
    success: "#3D7449",
    error: "#B64A43",
  },
};

export function getThemeColors(colorScheme: ColorScheme): ThemeColors {
  return Colors[colorScheme];
}

function luminance(hex: string): number {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Expected a six-digit hex color, received ${hex}.`);
  }

  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function getContrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}
