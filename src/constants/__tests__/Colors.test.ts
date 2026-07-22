import { describe, expect, it } from "vitest";
import { Colors, getContrastRatio, getThemeColors } from "../Colors";

describe("Companion Studio color tokens", () => {
  it("provides the full semantic studio surface contract in both themes", () => {
    for (const scheme of ["dark", "light"] as const) {
      expect(getThemeColors(scheme)).toMatchObject({
        background: expect.any(String),
        surface: expect.any(String),
        surfaceRaised: expect.any(String),
        surfaceSelected: expect.any(String),
        separator: expect.any(String),
        onAccent: expect.any(String),
        overlay: expect.any(String),
        focusRing: expect.any(String),
      });
    }
  });

  it("keeps primary text and accent actions readable against their surfaces", () => {
    for (const theme of [Colors.dark, Colors.light]) {
      expect(getContrastRatio(theme.text, theme.background)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
});
