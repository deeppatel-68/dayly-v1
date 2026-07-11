import { describe, expect, it } from "vitest";
import {
  addDateKeyDays,
  fromLocalDateKey,
  toLocalDateKey,
} from "@/utils/dateKey";

describe("local calendar dates", () => {
  it("crosses into the next Brisbane day before UTC midnight", () => {
    expect(toLocalDateKey(new Date("2026-07-10T13:59:59.000Z"))).toBe(
      "2026-07-10"
    );
    expect(toLocalDateKey(new Date("2026-07-10T14:00:00.000Z"))).toBe(
      "2026-07-11"
    );
  });

  it("handles month and year rollover with calendar arithmetic", () => {
    expect(addDateKeyDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDateKeyDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDateKeyDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("rejects impossible date keys", () => {
    expect(() => fromLocalDateKey("2026-02-30")).toThrow(
      "Invalid calendar date"
    );
  });
});
