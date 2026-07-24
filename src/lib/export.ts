import type {
  AppState,
  DailyLog,
  DoseEvent,
  Episode,
  ISODate,
  Medication,
  Score,
  TimelineEvent,
} from "../types";
import {
  compareISODates,
  datePart,
  daysSinceLastDose,
  latestDoseOnOrBefore,
} from "./dates";

type CsvValue = string | number | boolean | null | undefined;

export interface DoseTimingSummary {
  medicationId: string;
  medicationName: string;
  lastDoseDate: ISODate | null;
  daysSinceDose: number | null;
}

export interface SummaryEpisode {
  episode: Episode;
  doseTiming: DoseTimingSummary[];
}

export interface MedicationSummary {
  medication: Medication;
  lastDose: DoseEvent | null;
  daysSinceLastDose: number | null;
}

export interface DailyTrendSummary {
  entryCount: number;
  firstDate: ISODate | null;
  lastDate: ISODate | null;
  averages: {
    pain: number | null;
    tingling: number | null;
    cramping: number | null;
    fatigue: number | null;
    activityLimitation: number | null;
    sleepQuality: number | null;
    stress: number | null;
  };
}

export interface AppointmentSummary {
  asOfDate: ISODate;
  profile: AppState["profile"];
  timeline: TimelineEvent[];
  medications: MedicationSummary[];
  representativeEpisodes: SummaryEpisode[];
  dailyTrend: DailyTrendSummary;
  recentDailyLogs: DailyLog[];
}

export interface AppointmentSummaryOptions {
  maxEpisodes?: number;
  maxTimelineEvents?: number;
  maxRecentDailyLogs?: number;
}

function formulaSafe(value: string): string {
  return /^[\t\r]|^\s*[=+\-@]/.test(value) ? `'${value}` : value;
}

export function escapeCsvField(value: CsvValue): string {
  const safe = formulaSafe(value === null || value === undefined ? "" : String(value));
  return `"${safe.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: readonly (readonly CsvValue[])[]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n") + "\r\n";
}

function score(value: Score): CsvValue {
  return value;
}

function bodyAreas(episode: Episode): string {
  return episode.bodyAreas
    .map((item) => `${item.area} (${item.side})`)
    .join("; ");
}

export function dailyLogsToCsv(logs: readonly DailyLog[]): string {
  const sorted = [...logs].sort(
    (left, right) => compareISODates(left.date, right.date),
  );
  return rowsToCsv([
    [
      "Date",
      "Pain (0-10)",
      "Tingling (0-10)",
      "Cramping (0-10)",
      "Fatigue (0-10)",
      "Activity limitation (0-10)",
      "Sleep hours",
      "Sleep quality (0-10)",
      "Stress (0-10)",
      "Activities",
      "Treatments",
      "Notes",
      "Updated at",
    ],
    ...sorted.map((log) => [
      log.date,
      score(log.pain),
      score(log.tingling),
      score(log.cramping),
      score(log.fatigue),
      score(log.activityLimitation),
      log.sleepHours,
      score(log.sleepQuality),
      score(log.stress),
      log.activities.join("; "),
      log.treatments.join("; "),
      log.notes,
      log.updatedAt,
    ]),
  ]);
}

export function episodesToCsv(episodes: readonly Episode[]): string {
  const sorted = [...episodes].sort(
    (left, right) =>
      left.onsetAt.localeCompare(right.onsetAt) || left.id.localeCompare(right.id),
  );
  return rowsToCsv([
    [
      "ID",
      "Onset",
      "Onset pattern",
      "Pinned",
      "Severity (0-10)",
      "Task or posture",
      "Body areas",
      "Symptoms",
      "Impacts",
      "Duration (minutes)",
      "Movement impact",
      "Recovery status",
      "Recovery",
      "What helped",
      "Driving related",
      "Notes",
    ],
    ...sorted.map((episode) => [
      episode.id,
      episode.onsetAt,
      episode.onsetPattern,
      episode.pinned,
      score(episode.severity),
      episode.taskOrPosture,
      bodyAreas(episode),
      episode.symptoms.join("; "),
      episode.impacts.join("; "),
      episode.durationMinutes,
      episode.movementImpact,
      episode.recoveryStatus,
      episode.recovery,
      episode.helpedBy,
      episode.drivingRelated,
      episode.notes,
    ]),
  ]);
}

export function medicationsToCsv(
  medications: readonly Medication[],
  doseEvents: readonly DoseEvent[],
  asOfDate: ISODate,
): string {
  const sorted = [...medications].sort(
    (left, right) =>
      Number(right.active) - Number(left.active) ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  );
  return rowsToCsv([
    [
      "ID",
      "Name",
      "Dose",
      "Frequency",
      "Route",
      "Start date",
      "End date",
      "Active",
      "Label verified",
      "Prescriber",
      "Last dose date",
      "Days since last dose",
      "Notes",
    ],
    ...sorted.map((medication) => {
      const lastDose = latestDoseOnOrBefore(
        doseEvents,
        asOfDate,
        medication.id,
      );
      return [
        medication.id,
        medication.name,
        medication.dose,
        medication.frequency,
        medication.route,
        medication.startDate,
        medication.endDate,
        medication.active,
        medication.labelVerified,
        medication.prescriber,
        lastDose?.date ?? null,
        lastDose
          ? daysSinceLastDose(doseEvents, asOfDate, medication.id)
          : null,
        medication.notes,
      ];
    }),
  ]);
}

export function doseEventsToCsv(
  events: readonly DoseEvent[],
  medications: readonly Medication[],
): string {
  const medicationNames = new Map(
    medications.map((medication) => [medication.id, medication.name]),
  );
  const sorted = [...events].sort(
    (left, right) =>
      compareISODates(left.date, right.date) ||
      (left.time ?? "").localeCompare(right.time ?? "") ||
      left.id.localeCompare(right.id),
  );
  return rowsToCsv([
    ["ID", "Medication", "Date", "Time", "Dose", "Status", "Notes"],
    ...sorted.map((event) => [
      event.id,
      medicationNames.get(event.medicationId) ?? "Unknown medication",
      event.date,
      event.time,
      event.dose,
      event.status,
      event.notes,
    ]),
  ]);
}

export function timelineToCsv(events: readonly TimelineEvent[]): string {
  const sorted = [...events].sort(
    (left, right) =>
      compareISODates(left.date, right.date) || left.id.localeCompare(right.id),
  );
  return rowsToCsv([
    ["ID", "Date", "Category", "Title", "Details"],
    ...sorted.map((event) => [
      event.id,
      event.date,
      event.category,
      event.title,
      event.details,
    ]),
  ]);
}

function boundedInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.trunc(value));
}

export function selectRepresentativeEpisodes(
  episodes: readonly Episode[],
  asOfDate: ISODate,
  maximum = 5,
): Episode[] {
  const limit = boundedInteger(maximum, 5);
  return [...episodes]
    .filter((episode) => compareISODates(datePart(episode.onsetAt), asOfDate) <= 0)
    .sort(
      (left, right) =>
        Number(right.pinned) - Number(left.pinned) ||
        right.onsetAt.localeCompare(left.onsetAt) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, limit);
}

function average(values: readonly Score[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  const mean = present.reduce((total, value) => total + value, 0) / present.length;
  return Math.round(mean * 10) / 10;
}

export function summarizeDailyTrend(
  logs: readonly DailyLog[],
  asOfDate: ISODate,
): DailyTrendSummary {
  const eligible = [...logs]
    .filter((log) => compareISODates(log.date, asOfDate) <= 0)
    .sort((left, right) => compareISODates(left.date, right.date));

  return {
    entryCount: eligible.length,
    firstDate: eligible[0]?.date ?? null,
    lastDate: eligible.at(-1)?.date ?? null,
    averages: {
      pain: average(eligible.map((log) => log.pain)),
      tingling: average(eligible.map((log) => log.tingling)),
      cramping: average(eligible.map((log) => log.cramping)),
      fatigue: average(eligible.map((log) => log.fatigue)),
      activityLimitation: average(
        eligible.map((log) => log.activityLimitation),
      ),
      sleepQuality: average(eligible.map((log) => log.sleepQuality)),
      stress: average(eligible.map((log) => log.stress)),
    },
  };
}

function medicationOrder(left: Medication, right: Medication): number {
  return (
    Number(right.active) - Number(left.active) ||
    left.name.localeCompare(right.name) ||
    left.id.localeCompare(right.id)
  );
}

export function buildAppointmentSummary(
  state: AppState,
  asOfDate: ISODate,
  options: AppointmentSummaryOptions = {},
): AppointmentSummary {
  const maxEpisodes = boundedInteger(options.maxEpisodes, 5);
  const maxTimeline = boundedInteger(options.maxTimelineEvents, 12);
  const maxRecentLogs = boundedInteger(options.maxRecentDailyLogs, 14);
  const medications = [...state.medications].sort(medicationOrder);
  const representativeEpisodes = selectRepresentativeEpisodes(
    state.episodes,
    asOfDate,
    maxEpisodes,
  );

  const timeline = [...state.timeline]
    .filter((event) => compareISODates(event.date, asOfDate) <= 0)
    .sort(
      (left, right) =>
        compareISODates(right.date, left.date) || left.id.localeCompare(right.id),
    )
    .slice(0, maxTimeline);

  const eligibleDailyLogs = [...state.dailyLogs]
    .filter((log) => compareISODates(log.date, asOfDate) <= 0)
    .sort((left, right) => compareISODates(right.date, left.date));

  return {
    asOfDate,
    profile: state.profile,
    timeline,
    medications: medications.map((medication) => {
      const lastDose = latestDoseOnOrBefore(
        state.doseEvents,
        asOfDate,
        medication.id,
      );
      return {
        medication,
        lastDose,
        daysSinceLastDose: lastDose
          ? daysSinceLastDose(state.doseEvents, asOfDate, medication.id)
          : null,
      };
    }),
    representativeEpisodes: representativeEpisodes.map((episode) => {
      const episodeAsOf = datePart(episode.onsetAt);
      return {
        episode,
        doseTiming: medications.map((medication) => {
          const lastDose = latestDoseOnOrBefore(
            state.doseEvents,
            episodeAsOf,
            medication.id,
          );
          return {
            medicationId: medication.id,
            medicationName: medication.name,
            lastDoseDate: lastDose?.date ?? null,
            daysSinceDose: lastDose
              ? daysSinceLastDose(
                  state.doseEvents,
                  episodeAsOf,
                  medication.id,
                )
              : null,
          };
        }),
      };
    }),
    dailyTrend: summarizeDailyTrend(state.dailyLogs, asOfDate),
    recentDailyLogs: eligibleDailyLogs.slice(0, maxRecentLogs),
  };
}

export function exportCsvBundle(
  state: AppState,
  asOfDate: ISODate,
): Record<string, string> {
  return {
    "daily-logs.csv": dailyLogsToCsv(state.dailyLogs),
    "episodes.csv": episodesToCsv(state.episodes),
    "medications.csv": medicationsToCsv(
      state.medications,
      state.doseEvents,
      asOfDate,
    ),
    "dose-events.csv": doseEventsToCsv(state.doseEvents, state.medications),
    "timeline.csv": timelineToCsv(state.timeline),
  };
}
