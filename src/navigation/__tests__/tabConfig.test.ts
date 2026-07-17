import { describe, expect, it } from "vitest";
import { COMPANION_STUDIO_TABS } from "../tabConfig";

describe("Companion Studio navigation", () => {
  it("keeps the four primary destinations stable and ordered", () => {
    expect(COMPANION_STUDIO_TABS.map((tab) => tab.id)).toEqual([
      "home",
      "habits",
      "study",
      "stats",
    ]);
    expect(COMPANION_STUDIO_TABS.map((tab) => tab.path)).toEqual([
      "/",
      "/habits",
      "/study",
      "/stats",
    ]);
  });
});
