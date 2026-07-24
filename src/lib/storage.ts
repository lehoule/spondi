import {
  CURRENT_SCHEMA_VERSION,
  type AppState,
  type DailyLog,
  type DoseEvent,
  type Episode,
  type Medication,
  type TimelineEvent,
} from "../types";
import { compareISODates, datePart, isISODate, isISODateTime } from "./dates";

export const STORAGE_KEY = "spondi.health-tracker";

export type DataResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const TIMELINE_CATEGORIES = new Set([
  "diagnosis",
  "medication",
  "symptom",
  "test",
  "treatment",
  "function",
  "other",
]);
const BODY_SIDES = new Set(["left", "right", "both", "midline", "not-sure"]);
const MOVEMENT_IMPACTS = new Set([
  "none",
  "pain-limited",
  "weakness",
  "coordination",
  "mixed",
  "not-sure",
]);
const EPISODE_ONSETS = new Set(["sudden", "gradual", "not-sure"]);
const RECOVERY_STATUSES = new Set(["full", "partial", "not-yet", "not-sure"]);
const MEDICATION_ROUTES = new Set([
  "injection",
  "oral",
  "infusion",
  "topical",
  "other",
  "unknown",
]);
const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const CARE_STEP_STATUSES = new Set(["not-started", "planned", "done"]);
const DOSE_STATUSES = new Set(["as-prescribed", "late", "skipped", "not-sure"]);

function resultError<T>(message: string): DataResult<T> {
  return { ok: false, error: message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableScore(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 10)
  );
}

function isNullableYear(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1800 &&
      value <= 2200)
  );
}

function isNullableClockTime(value: unknown): boolean {
  return value === null || (typeof value === "string" && CLOCK_TIME_PATTERN.test(value));
}

function hasStrings(
  value: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  return fields.every((field) => typeof value[field] === "string");
}

function hasTimestamps(value: Record<string, unknown>): boolean {
  return isISODateTime(value.createdAt) && isISODateTime(value.updatedAt);
}

function validateTimelineEvent(value: unknown): value is TimelineEvent {
  return (
    isRecord(value) &&
    hasStrings(value, ["id", "title", "details"]) &&
    isISODate(value.date) &&
    typeof value.category === "string" &&
    TIMELINE_CATEGORIES.has(value.category) &&
    hasTimestamps(value)
  );
}

function validateDailyLog(value: unknown): value is DailyLog {
  return (
    isRecord(value) &&
    isISODate(value.date) &&
    isNullableScore(value.pain) &&
    isNullableScore(value.tingling) &&
    isNullableScore(value.cramping) &&
    isNullableScore(value.fatigue) &&
    isNullableScore(value.activityLimitation) &&
    (value.sleepHours === null ||
      (typeof value.sleepHours === "number" &&
        Number.isFinite(value.sleepHours) &&
        value.sleepHours >= 0 &&
        value.sleepHours <= 24)) &&
    isNullableScore(value.sleepQuality) &&
    isNullableScore(value.stress) &&
    isStringArray(value.activities) &&
    isStringArray(value.treatments) &&
    typeof value.notes === "string" &&
    hasTimestamps(value)
  );
}

function validateEpisode(value: unknown): value is Episode {
  return (
    isRecord(value) &&
    hasStrings(value, ["id", "taskOrPosture", "recovery", "notes"]) &&
    isISODateTime(value.onsetAt) &&
    typeof value.onsetPattern === "string" &&
    EPISODE_ONSETS.has(value.onsetPattern) &&
    (value.durationMinutes === null ||
      (typeof value.durationMinutes === "number" &&
        Number.isFinite(value.durationMinutes) &&
        value.durationMinutes >= 0)) &&
    isNullableScore(value.severity) &&
    Array.isArray(value.bodyAreas) &&
    value.bodyAreas.every(
      (bodyArea) =>
        isRecord(bodyArea) &&
        typeof bodyArea.area === "string" &&
        bodyArea.area.length > 0 &&
        typeof bodyArea.side === "string" &&
        BODY_SIDES.has(bodyArea.side),
    ) &&
    isStringArray(value.symptoms) &&
    isStringArray(value.impacts) &&
    typeof value.movementImpact === "string" &&
    MOVEMENT_IMPACTS.has(value.movementImpact) &&
    typeof value.recoveryStatus === "string" &&
    RECOVERY_STATUSES.has(value.recoveryStatus) &&
    typeof value.helpedBy === "string" &&
    typeof value.drivingRelated === "boolean" &&
    typeof value.pinned === "boolean" &&
    hasTimestamps(value)
  );
}

function validateMedication(value: unknown): value is Medication {
  return (
    isRecord(value) &&
    hasStrings(value, [
      "id",
      "name",
      "dose",
      "frequency",
      "prescriber",
      "notes",
    ]) &&
    typeof value.route === "string" &&
    MEDICATION_ROUTES.has(value.route) &&
    (value.startDate === null || isISODate(value.startDate)) &&
    (value.endDate === null || isISODate(value.endDate)) &&
    typeof value.active === "boolean" &&
    typeof value.labelVerified === "boolean" &&
    hasTimestamps(value)
  );
}

function validateDoseEvent(value: unknown): value is DoseEvent {
  return (
    isRecord(value) &&
    hasStrings(value, ["id", "medicationId", "dose", "notes"]) &&
    isISODate(value.date) &&
    isNullableClockTime(value.time) &&
    typeof value.status === "string" &&
    DOSE_STATUSES.has(value.status) &&
    hasTimestamps(value)
  );
}

function hasUniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export function createEmptyState(now = new Date().toISOString()): AppState {
  if (!isISODateTime(now)) {
    throw new RangeError(`Expected an ISO date-time, received "${now}".`);
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    consent: {
      dataOwnerConsented: false,
      consentedAt: null,
      sharingAllowed: false,
    },
    preferences: {
      reminderEnabled: false,
      reminderTime: null,
      reducedMotion: false,
    },
    careSteps: {
      identifyMedication: "not-started",
      contactPrescriber: "not-started",
      bookFamilyDoctor: "not-started",
      rheumatologyReview: "not-started",
    },
    profile: {
      preferredName: "",
      diagnosis: "Ankylosing spondylitis",
      diagnosisYear: null,
      symptomOnsetYear: null,
      clinicians: [],
      functionalHistory: "",
      goalsForCare: "",
      notes: "",
    },
    timeline: [],
    dailyLogs: [],
    episodes: [],
    medications: [],
    doseEvents: [],
  };
}

export function validateState(value: unknown): DataResult<AppState> {
  if (!isRecord(value)) return resultError("Backup must contain a JSON object.");

  if (value.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return resultError(
      `Unsupported backup version "${String(value.schemaVersion)}"; expected ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  if (!isISODateTime(value.createdAt) || !isISODateTime(value.updatedAt)) {
    return resultError("Backup has invalid createdAt or updatedAt timestamps.");
  }

  if (
    !isRecord(value.consent) ||
    typeof value.consent.dataOwnerConsented !== "boolean" ||
    (value.consent.consentedAt !== null &&
      !isISODateTime(value.consent.consentedAt)) ||
    typeof value.consent.sharingAllowed !== "boolean"
  ) {
    return resultError("Backup has invalid consent settings.");
  }

  if (
    !isRecord(value.preferences) ||
    typeof value.preferences.reminderEnabled !== "boolean" ||
    !isNullableClockTime(value.preferences.reminderTime) ||
    typeof value.preferences.reducedMotion !== "boolean"
  ) {
    return resultError("Backup has invalid preferences.");
  }

  const careSteps = value.careSteps;
  if (
    !isRecord(careSteps) ||
    !["identifyMedication", "contactPrescriber", "bookFamilyDoctor", "rheumatologyReview"].every(
      (key) =>
        typeof careSteps[key] === "string" &&
        CARE_STEP_STATUSES.has(careSteps[key] as string),
    )
  ) {
    return resultError("Backup has invalid next-step statuses.");
  }

  if (
    !isRecord(value.profile) ||
    !hasStrings(value.profile, [
      "preferredName",
      "diagnosis",
      "functionalHistory",
      "goalsForCare",
      "notes",
    ]) ||
    !isNullableYear(value.profile.diagnosisYear) ||
    !isNullableYear(value.profile.symptomOnsetYear) ||
    !isStringArray(value.profile.clinicians)
  ) {
    return resultError("Backup has an invalid medical profile.");
  }

  if (
    !Array.isArray(value.timeline) ||
    !value.timeline.every(validateTimelineEvent)
  ) {
    return resultError("Backup has an invalid timeline event.");
  }
  if (
    !Array.isArray(value.dailyLogs) ||
    !value.dailyLogs.every(validateDailyLog)
  ) {
    return resultError("Backup has an invalid daily log.");
  }
  if (
    !Array.isArray(value.episodes) ||
    !value.episodes.every(validateEpisode)
  ) {
    return resultError("Backup has an invalid episode.");
  }
  if (
    !Array.isArray(value.medications) ||
    !value.medications.every(validateMedication)
  ) {
    return resultError("Backup has an invalid medication.");
  }
  if (
    !Array.isArray(value.doseEvents) ||
    !value.doseEvents.every(validateDoseEvent)
  ) {
    return resultError("Backup has an invalid dose event.");
  }

  if (!hasUniqueStrings(value.dailyLogs.map((entry) => entry.date))) {
    return resultError("Backup contains more than one daily log for the same date.");
  }

  const idGroups = [
    ["timeline", value.timeline.map((entry) => entry.id)],
    ["episodes", value.episodes.map((entry) => entry.id)],
    ["medications", value.medications.map((entry) => entry.id)],
    ["dose events", value.doseEvents.map((entry) => entry.id)],
  ] as const;
  for (const [label, ids] of idGroups) {
    if (ids.some((id) => id.length === 0) || !hasUniqueStrings(ids)) {
      return resultError(`Backup contains an empty or duplicate ID in ${label}.`);
    }
  }

  const medicationIds = new Set(value.medications.map((medication) => medication.id));
  if (
    value.doseEvents.some((event) => !medicationIds.has(event.medicationId))
  ) {
    return resultError("Backup contains a dose event for an unknown medication.");
  }

  if (
    value.medications.some(
      (medication) =>
        medication.startDate !== null &&
        medication.endDate !== null &&
        compareISODates(medication.endDate, medication.startDate) < 0,
    )
  ) {
    return resultError("Backup contains a medication ending before its start date.");
  }

  return { ok: true, value: value as unknown as AppState };
}

export function importBackupJson(json: string): DataResult<AppState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return resultError("The selected backup is not valid JSON.");
  }
  return validateState(parsed);
}

export function exportBackupJson(state: AppState): string {
  const validated = validateState(state);
  if (!validated.ok) {
    throw new TypeError(validated.error);
  }
  return `${JSON.stringify(validated.value, null, 2)}\n`;
}

function browserStorage(): DataResult<StorageLike> {
  try {
    const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
    return candidate
      ? { ok: true, value: candidate }
      : resultError("Local storage is unavailable in this browser.");
  } catch {
    return resultError("Local storage is unavailable in this browser.");
  }
}

export function loadState(storage?: StorageLike): DataResult<AppState> {
  const resolved = storage ? { ok: true as const, value: storage } : browserStorage();
  if (!resolved.ok) return resolved;

  try {
    const serialized = resolved.value.getItem(STORAGE_KEY);
    return serialized === null
      ? { ok: true, value: createEmptyState() }
      : importBackupJson(serialized);
  } catch {
    return resultError("Saved health data could not be read from this browser.");
  }
}

export function saveState(
  state: AppState,
  storage?: StorageLike,
): DataResult<void> {
  const validated = validateState(state);
  if (!validated.ok) return validated;

  const resolved = storage ? { ok: true as const, value: storage } : browserStorage();
  if (!resolved.ok) return resolved;

  try {
    resolved.value.setItem(STORAGE_KEY, JSON.stringify(validated.value));
    return { ok: true, value: undefined };
  } catch {
    return resultError(
      "Health data could not be saved. Browser storage may be full or unavailable.",
    );
  }
}

export function clearStoredState(storage?: StorageLike): DataResult<void> {
  const resolved = storage ? { ok: true as const, value: storage } : browserStorage();
  if (!resolved.ok) return resolved;

  try {
    resolved.value.removeItem(STORAGE_KEY);
    return { ok: true, value: undefined };
  } catch {
    return resultError("Saved health data could not be removed from this browser.");
  }
}

function replaceById<T extends { id: string }>(
  values: readonly T[],
  next: T,
): T[] {
  return [...values.filter((value) => value.id !== next.id), next];
}

function stateTimestamp(current: AppState, candidate: string): string {
  return candidate.localeCompare(current.updatedAt) > 0
    ? candidate
    : current.updatedAt;
}

export function upsertDailyLog(state: AppState, log: DailyLog): AppState {
  const dailyLogs = [
    ...state.dailyLogs.filter((entry) => entry.date !== log.date),
    log,
  ].sort((left, right) => compareISODates(left.date, right.date));

  return {
    ...state,
    updatedAt: stateTimestamp(state, log.updatedAt),
    dailyLogs,
  };
}

export function upsertTimelineEvent(
  state: AppState,
  event: TimelineEvent,
): AppState {
  const timeline = replaceById(state.timeline, event).sort(
    (left, right) =>
      compareISODates(left.date, right.date) || left.id.localeCompare(right.id),
  );
  return {
    ...state,
    updatedAt: stateTimestamp(state, event.updatedAt),
    timeline,
  };
}

export function upsertEpisode(state: AppState, episode: Episode): AppState {
  const episodes = replaceById(state.episodes, episode).sort(
    (left, right) =>
      left.onsetAt.localeCompare(right.onsetAt) || left.id.localeCompare(right.id),
  );
  return {
    ...state,
    updatedAt: stateTimestamp(state, episode.updatedAt),
    episodes,
  };
}

export function upsertMedication(
  state: AppState,
  medication: Medication,
): AppState {
  const medications = replaceById(state.medications, medication).sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
  return {
    ...state,
    updatedAt: stateTimestamp(state, medication.updatedAt),
    medications,
  };
}

export function recordDose(state: AppState, doseEvent: DoseEvent): AppState {
  const doseEvents = replaceById(state.doseEvents, doseEvent).sort(
    (left, right) =>
      compareISODates(left.date, right.date) ||
      (left.time ?? "").localeCompare(right.time ?? "") ||
      left.id.localeCompare(right.id),
  );
  return {
    ...state,
    updatedAt: stateTimestamp(state, doseEvent.updatedAt),
    doseEvents,
  };
}

export function removeDailyLog(state: AppState, date: string): AppState {
  return {
    ...state,
    dailyLogs: state.dailyLogs.filter((entry) => entry.date !== date),
  };
}

export function removeEpisode(state: AppState, id: string): AppState {
  return {
    ...state,
    episodes: state.episodes.filter((episode) => episode.id !== id),
  };
}

export function removeTimelineEvent(state: AppState, id: string): AppState {
  return {
    ...state,
    timeline: state.timeline.filter((event) => event.id !== id),
  };
}

export function removeMedication(state: AppState, id: string): AppState {
  return {
    ...state,
    medications: state.medications.filter((medication) => medication.id !== id),
    doseEvents: state.doseEvents.filter((event) => event.medicationId !== id),
  };
}

export function removeDoseEvent(state: AppState, id: string): AppState {
  return {
    ...state,
    doseEvents: state.doseEvents.filter((event) => event.id !== id),
  };
}

export function episodeDate(episode: Episode): string {
  return datePart(episode.onsetAt);
}
