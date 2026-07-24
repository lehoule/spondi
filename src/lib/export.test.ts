import { describe, expect, it } from "vitest";
import type {
  DailyLog,
  DoseEvent,
  Episode,
  Medication,
} from "../types";
import { createEmptyState } from "./storage";
import {
  buildAppointmentSummary,
  rowsToCsv,
  selectRepresentativeEpisodes,
  summarizeDailyTrend,
} from "./export";

const NOW = "2026-07-23T12:00:00.000Z";

function episode(id: string, onsetAt: string, pinned = false): Episode {
  return {
    id,
    onsetAt,
    onsetPattern: "gradual",
    durationMinutes: 20,
    severity: 5,
    taskOrPosture: "",
    bodyAreas: [{ area: "leg", side: "right" }],
    symptoms: ["tingling"],
    impacts: [],
    movementImpact: "pain-limited",
    recoveryStatus: "partial",
    recovery: "",
    helpedBy: "",
    drivingRelated: false,
    pinned,
    notes: "",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function daily(date: string, pain: number | null): DailyLog {
  return {
    date,
    pain,
    tingling: pain,
    cramping: null,
    fatigue: null,
    activityLimitation: pain,
    sleepHours: 7,
    sleepQuality: null,
    stress: null,
    activities: [],
    treatments: [],
    notes: "",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("CSV encoding", () => {
  it("uses RFC4180 rows, escapes quotes, and neutralizes formulas", () => {
    const csv = rowsToCsv([
      ["Label", "Value"],
      ["unsafe", "=2+2"],
      ["quoted", 'hello, "friend"\nnext line'],
      ["spaced", "  @SUM(A1:A2)"],
    ]);

    expect(csv).toBe(
      '"Label","Value"\r\n' +
        '"unsafe","\'=2+2"\r\n' +
        '"quoted","hello, ""friend""\nnext line"\r\n' +
        '"spaced","\'  @SUM(A1:A2)"\r\n',
    );
  });
});

describe("deterministic appointment summaries", () => {
  it("puts pinned episodes first, then uses newest onset and a stable ID tie-break", () => {
    const episodes = [
      episode("older", "2026-06-01T10:00:00.000Z"),
      episode("future", "2027-01-01T10:00:00.000Z", true),
      episode("pinned", "2026-05-01T10:00:00.000Z", true),
      episode("newer-b", "2026-07-01T10:00:00.000Z"),
      episode("newer-a", "2026-07-01T10:00:00.000Z"),
    ];

    expect(
      selectRepresentativeEpisodes(episodes, "2026-07-23", 3).map(
        (item) => item.id,
      ),
    ).toEqual(["pinned", "newer-a", "newer-b"]);
  });

  it("calculates trend averages from records on or before the as-of date", () => {
    const trend = summarizeDailyTrend(
      [
        daily("2026-07-20", 2),
        daily("2026-07-21", 5),
        daily("2026-07-22", null),
        daily("2026-07-24", 10),
      ],
      "2026-07-23",
    );

    expect(trend).toMatchObject({
      entryCount: 3,
      firstDate: "2026-07-20",
      lastDate: "2026-07-22",
      averages: { pain: 3.5, tingling: 3.5, activityLimitation: 3.5 },
    });
  });

  it("includes medication timing for each representative episode", () => {
    const medication: Medication = {
      id: "med-1",
      name: "Example medication",
      dose: "50 mg",
      frequency: "Monthly",
      route: "injection",
      startDate: "2026-01-01",
      endDate: null,
      prescriber: "",
      active: true,
      labelVerified: true,
      notes: "",
      createdAt: NOW,
      updatedAt: NOW,
    };
    const dose: DoseEvent = {
      id: "dose-1",
      medicationId: medication.id,
      date: "2026-07-01",
      time: null,
      dose: medication.dose,
      status: "as-prescribed",
      notes: "",
      createdAt: NOW,
      updatedAt: NOW,
    };
    const state = {
      ...createEmptyState(NOW),
      medications: [medication],
      doseEvents: [dose],
      episodes: [episode("episode-1", "2026-07-05T09:00:00.000Z", true)],
    };

    const first = buildAppointmentSummary(state, "2026-07-23");
    const second = buildAppointmentSummary(state, "2026-07-23");

    expect(first).toEqual(second);
    expect(first.medications[0].daysSinceLastDose).toBe(22);
    expect(
      first.representativeEpisodes[0].doseTiming[0].daysSinceDose,
    ).toBe(4);
  });
});
