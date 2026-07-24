export const CURRENT_SCHEMA_VERSION = 1 as const;

export type ISODate = string;
export type ISODateTime = string;
export type ClockTime = string;

export type Score = number | null;

export interface ConsentState {
  dataOwnerConsented: boolean;
  consentedAt: ISODateTime | null;
  sharingAllowed: boolean;
}

export interface AppPreferences {
  reminderEnabled: boolean;
  reminderTime: ClockTime | null;
  reducedMotion: boolean;
}

export type CareStepStatus = "not-started" | "planned" | "done";

export interface CareSteps {
  identifyMedication: CareStepStatus;
  contactPrescriber: CareStepStatus;
  bookFamilyDoctor: CareStepStatus;
  rheumatologyReview: CareStepStatus;
}

export interface MedicalProfile {
  preferredName: string;
  diagnosis: string;
  diagnosisYear: number | null;
  symptomOnsetYear: number | null;
  clinicians: string[];
  functionalHistory: string;
  goalsForCare: string;
  notes: string;
}

export type TimelineCategory =
  | "diagnosis"
  | "medication"
  | "symptom"
  | "test"
  | "treatment"
  | "function"
  | "other";

export interface TimelineEvent {
  id: string;
  date: ISODate;
  category: TimelineCategory;
  title: string;
  details: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface DailyLog {
  date: ISODate;
  pain: Score;
  tingling: Score;
  cramping: Score;
  fatigue: Score;
  activityLimitation: Score;
  sleepHours: number | null;
  sleepQuality: Score;
  stress: Score;
  activities: string[];
  treatments: string[];
  notes: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type BodySide = "left" | "right" | "both" | "midline" | "not-sure";

export interface EpisodeBodyArea {
  area: string;
  side: BodySide;
}

export type MovementImpact =
  | "none"
  | "pain-limited"
  | "weakness"
  | "coordination"
  | "mixed"
  | "not-sure";

export type EpisodeOnset = "sudden" | "gradual" | "not-sure";
export type RecoveryStatus = "full" | "partial" | "not-yet" | "not-sure";

export interface Episode {
  id: string;
  onsetAt: ISODateTime;
  onsetPattern: EpisodeOnset;
  durationMinutes: number | null;
  severity: Score;
  taskOrPosture: string;
  bodyAreas: EpisodeBodyArea[];
  symptoms: string[];
  impacts: string[];
  movementImpact: MovementImpact;
  recoveryStatus: RecoveryStatus;
  recovery: string;
  helpedBy: string;
  drivingRelated: boolean;
  pinned: boolean;
  notes: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type MedicationRoute =
  | "injection"
  | "oral"
  | "infusion"
  | "topical"
  | "other"
  | "unknown";

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  route: MedicationRoute;
  startDate: ISODate | null;
  endDate: ISODate | null;
  prescriber: string;
  active: boolean;
  labelVerified: boolean;
  notes: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type DoseStatus = "as-prescribed" | "late" | "skipped" | "not-sure";

export interface DoseEvent {
  id: string;
  medicationId: string;
  date: ISODate;
  time: ClockTime | null;
  dose: string;
  status: DoseStatus;
  notes: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface AppState {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  consent: ConsentState;
  preferences: AppPreferences;
  careSteps: CareSteps;
  profile: MedicalProfile;
  timeline: TimelineEvent[];
  dailyLogs: DailyLog[];
  episodes: Episode[];
  medications: Medication[];
  doseEvents: DoseEvent[];
}
