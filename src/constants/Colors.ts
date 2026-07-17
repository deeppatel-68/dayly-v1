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

// The UI is intentionally quieter than the companion. Dark graphite and cool
// silver establish the studio; ember appears only when progress needs attention.
export const Colors: Record<ColorScheme, ThemeColors> = {
  dark: {
    background: "#0C1117",
    backgroundSecondary: "#141B24",
    card: "#18212C",
    surface: "#18212C",
    surfaceRaised: "#202B38",
    surfaceSelected: "#2A3746",
    text: "#F4F7FA",
    textSecondary: "#AAB6C5",
    textTertiary: "#738194",
    accent: "#F28A63",
    accentLight: "#FFC1A9",
    onAccent: "#151A20",
    border: "#2A3746",
    borderLight: "#202B38",
    separator: "#334253",
    overlay: "rgba(3, 7, 12, 0.74)",
    focusRing: "#FFC1A9",
    glassFallback: "rgba(18, 25, 34, 0.92)",
    completed: "#F28A63",
    completedBackground: "rgba(242, 138, 99, 0.14)",
    checkboxEmpty: "#202B38",
    checkboxFilled: "#F28A63",
    success: "#98C6A4",
    error: "#F38B89",
  },
  light: {
    background: "#F4F6F8",
    backgroundSecondary: "#E9EEF3",
    card: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    surfaceSelected: "#E6ECF2",
    text: "#141A22",
    textSecondary: "#59697A",
    textTertiary: "#788697",
    accent: "#B84F31",
    accentLight: "#D86B49",
    onAccent: "#FFFFFF",
    border: "#D6DEE7",
    borderLight: "#E9EEF3",
    separator: "#D6DEE7",
    overlay: "rgba(15, 23, 33, 0.42)",
    focusRing: "#9E3E25",
    glassFallback: "rgba(255, 255, 255, 0.94)",
    completed: "#B84F31",
    completedBackground: "rgba(184, 79, 49, 0.1)",
    checkboxEmpty: "#E9EEF3",
    checkboxFilled: "#B84F31",
    success: "#367A50",
    error: "#B94343",
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
