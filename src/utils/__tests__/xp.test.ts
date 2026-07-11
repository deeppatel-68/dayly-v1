import { describe, expect, it } from "vitest";
import { getStudyRewards } from "@/utils/xp";

describe("fixed study rewards", () => {
  it("requires a completed minute", () => {
    expect(getStudyRewards(59)).toEqual({ minutes: 0, xp: 0, coins: 0 });
    expect(getStudyRewards(60)).toEqual({ minutes: 1, xp: 1, coins: 0 });
  });

  it("awards one coin per five completed minutes", () => {
    expect(getStudyRewards(299)).toEqual({ minutes: 4, xp: 4, coins: 0 });
    expect(getStudyRewards(300)).toEqual({ minutes: 5, xp: 5, coins: 1 });
  });
});
