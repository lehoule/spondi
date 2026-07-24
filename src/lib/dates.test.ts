import { describe, expect, it } from "vitest";
import type { DoseEvent } from "../types";
import {
  calendarDayDifference,
  daysSinceLastDose,
  isISODate,
  latestDoseOnOrBefore,
} from "./dates";

function dose(
  id: string,
  medicationId: string,
  date: string,
  time: string | null = null,
): DoseEvent {
  return {
    id,
    medicationId,
    date,
    time,
    dose: "",
    status: "as-prescribed",
    notes: "",
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

describe("calendar date helpers", () => {
  it("validates actual calendar dates", () => {
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("2023-02-29")).toBe(false);
    expect(isISODate("2026-2-03")).toBe(false);
  });

  it("counts calendar boundaries across leap days and DST dates", () => {
    expect(calendarDayDifference("2024-03-01", "2024-02-28")).toBe(2);
    expect(calendarDayDifference("2026-03-09", "2026-03-07")).toBe(2);
    expect(calendarDayDifference("2026-03-07", "2026-03-09")).toBe(-2);
  });
});

describe("dose timing", () => {
  const events = [
    dose("a", "med-a", "2026-02-28"),
    dose("b", "med-a", "2026-03-08", "08:00"),
    dose("c", "med-b", "2026-03-09"),
    dose("future", "med-a", "2026-03-20"),
  ];

  it("selects the latest matching dose on or before the requested day", () => {
    expect(latestDoseOnOrBefore(events, "2026-03-10", "med-a")?.id).toBe("b");
    expect(latestDoseOnOrBefore(events, "2026-03-08", "med-b")).toBeNull();
  });

  it("returns calendar days since dose and ignores future entries", () => {
    expect(daysSinceLastDose(events, "2026-03-10", "med-a")).toBe(2);
    expect(daysSinceLastDose(events, "2026-02-01", "med-a")).toBeNull();
  });

  it("does not treat a skipped medication event as an administered dose", () => {
    const skipped = {
      ...dose("skipped", "med-a", "2026-03-10"),
      status: "skipped" as const,
    };

    expect(
      latestDoseOnOrBefore([...events, skipped], "2026-03-10", "med-a")?.id,
    ).toBe("b");
    expect(daysSinceLastDose([...events, skipped], "2026-03-10", "med-a")).toBe(2);
  });
});
