/**
 * Typography system - font sizes and weights
 */

import type { TextStyle } from "react-native";

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
};

export const FontWeights = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const FontFamilies = {
  regular: "Outfit-Regular",
  medium: "Outfit-Medium",
  semibold: "Outfit-SemiBold",
  bold: "Outfit-Bold",
};

// Refreshed product UI defaults to the platform typeface. Outfit remains a
// brand asset for the Dayly wordmark and companion-specific moments.
export const StudioType: Record<
  "largeTitle" | "title" | "section" | "body" | "bodyStrong" | "detail" | "metric",
  TextStyle
> = {
  largeTitle: { fontSize: 34, fontWeight: "700" as const, lineHeight: 41 },
  title: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  section: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
  body: { fontSize: 17, fontWeight: "400" as const, lineHeight: 23 },
  bodyStrong: { fontSize: 17, fontWeight: "600" as const, lineHeight: 23 },
  detail: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  metric: {
    fontSize: 28,
    fontWeight: "700" as const,
    fontVariant: ["tabular-nums"],
  },
};
