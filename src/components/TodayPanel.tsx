"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  AppState,
  CareStepStatus,
  DailyLog,
  Score,
} from "../types";
import { formatDate, localDate, mean } from "../lib/browser";
import { ChipGroup, RangeField, SegmentGroup } from "./FormControls";
import { Icon } from "./Icons";

const ACTIVITY_OPTIONS = [
  "Desk work",
  "Computer / gaming",
  "Driving",
  "Walking",
  "Exercise",
  "Physiotherapy",
  "Long sitting",
  "Unusual exertion",
];

const TREATMENT_OPTIONS = [
  "Gentle massage",
  "Stretching",
  "Exercise",
  "Rest",
  "Heat",
  "Medication",
  "Breathing / relaxation",
];

const CARE_STEPS: Array<{
  id: keyof AppState["careSteps"];
  title: string;
  detail: string;
  destination: "medication" | "settings";
}> = [
  {
    id: "identifyMedication",
    title: "Identify the exact injection",
    detail: "Use the label, pharmacy record, or prescription list",
    destination: "medication",
  },
  {
    id: "contactPrescriber",
    title: "Contact the prescriber",
    detail: "Report progressive sensory symptoms and functional loss",
    destination: "settings",
  },
  {
    id: "bookFamilyDoctor",
    title: "Book a family-doctor visit",
    detail: "Ask for an in-person neurological and functional exam",
    destination: "settings",
  },
  {
    id: "rheumatologyReview",
    title: "Arrange rheumatology review",
    detail: "Reassess disease activity, medication response, and safety",
    destination: "settings",
  },
];

type DailyDraft = {
  date: string;
  pain: number;
  tingling: number;
  cramping: number;
  fatigue: number;
  activityLimitation: number;
  stress: number;
  sleepHours: string;
  sleepQuality: string;
  activities: string[];
  treatments: string[];
  notes: string;
};

function draftFromLog(log?: DailyLog): DailyDraft {
  return {
    date: log?.date ?? localDate(),
    pain: log?.pain ?? 0,
    tingling: log?.tingling ?? 0,
    cramping: log?.cramping ?? 0,
    fatigue: log?.fatigue ?? 0,
    activityLimitation: log?.activityLimitation ?? 0,
    stress: log?.stress ?? 0,
    sleepHours: log?.sleepHours === null || log?.sleepHours === undefined
      ? ""
      : String(log.sleepHours),
    sleepQuality:
      log?.sleepQuality === null || log?.sleepQuality === undefined
        ? ""
        : String(log.sleepQuality),
    activities: log?.activities ?? [],
    treatments: log?.treatments ?? [],
    notes: log?.notes ?? "",
  };
}

function score(value: number): Score {
  return Number.isFinite(value) ? value : null;
}

export function TodayPanel({
  state,
  onSave,
  onCareStep,
  onNavigate,
  onNewEpisode,
}: {
  state: AppState;
  onSave: (log: DailyLog) => void;
  onCareStep: (
    step: keyof AppState["careSteps"],
    status: CareStepStatus,
  ) => void;
  onNavigate: (view: "medication" | "settings") => void;
  onNewEpisode: () => void;
}) {
  const today = localDate();
  const existingToday = state.dailyLogs.find((log) => log.date === today);
  const [draft, setDraft] = useState<DailyDraft>(() =>
    draftFromLog(existingToday),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = state.dailyLogs.find((log) => log.date === draft.date);
    if (existing) setDraft(draftFromLog(existing));
    // Only reload when the selected date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.date]);

  const recent = useMemo(
    () => state.dailyLogs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7),
    [state.dailyLogs],
  );
  const averages = {
    symptoms: mean(
      recent.flatMap((log) => [log.pain, log.tingling, log.cramping]),
    ),
    fatigue: mean(recent.map((log) => log.fatigue)),
    limitation: mean(recent.map((log) => log.activityLimitation)),
  };

  const setValue = <K extends keyof DailyDraft>(
    key: K,
    value: DailyDraft[K],
  ) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleDate = (date: string) => {
    const existing = state.dailyLogs.find((log) => log.date === date);
    setSaved(false);
    setDraft(existing ? draftFromLog(existing) : { ...draftFromLog(), date });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const existing = state.dailyLogs.find((log) => log.date === draft.date);
    const now = new Date().toISOString();
    onSave({
      date: draft.date,
      pain: score(draft.pain),
      tingling: score(draft.tingling),
      cramping: score(draft.cramping),
      fatigue: score(draft.fatigue),
      activityLimitation: score(draft.activityLimitation),
      sleepHours: draft.sleepHours === "" ? null : Number(draft.sleepHours),
      sleepQuality:
        draft.sleepQuality === "" ? null : Number(draft.sleepQuality),
      stress: score(draft.stress),
      activities: draft.activities,
      treatments: draft.treatments,
      notes: draft.notes.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    setSaved(true);
  };

  return (
    <section className="page" aria-labelledby="today-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Private care journal</p>
          <h1 id="today-title">
            {state.profile.preferredName
              ? `Good to see you, ${state.profile.preferredName}.`
              : "Make today useful later."}
          </h1>
          <p>
            A brief record now can make the next medical conversation clearer.
          </p>
        </div>
        <div className="page-actions">
          <button className="button button--soft" onClick={onNewEpisode} type="button">
            <Icon name="plus" />
            Log an episode
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <form className="card" onSubmit={submit}>
          <header className="card__header">
            <div>
              <p className="eyebrow">About 60 seconds</p>
              <h2>Daily check-in</h2>
              <p>Record what you noticed—without trying to explain it.</p>
            </div>
            <div className="field">
              <label htmlFor="daily-date">Date</label>
              <input
                id="daily-date"
                max={today}
                onChange={(event) => handleDate(event.target.value)}
                type="date"
                value={draft.date}
              />
            </div>
          </header>

          {draft.date !== today ? (
            <div className="notice" style={{ margin: "1rem 1.25rem 0" }}>
              <Icon name="calendar" />
              <div>
                <strong>Entered later</strong>
                <p>
                  This check-in is for {formatDate(draft.date)}. Recall may be
                  less precise, and that is okay.
                </p>
              </div>
            </div>
          ) : null}

          <div className="form-section">
            <div className="range-grid">
              <RangeField
                id="pain"
                label="Pain"
                onChange={(value) => setValue("pain", value)}
                value={draft.pain}
              />
              <RangeField
                id="tingling"
                label="Tingling / numbness"
                onChange={(value) => setValue("tingling", value)}
                value={draft.tingling}
              />
              <RangeField
                id="cramping"
                label="Cramping / tightness"
                onChange={(value) => setValue("cramping", value)}
                value={draft.cramping}
              />
              <RangeField
                highLabel="Unable"
                id="limitation"
                label="Activity limitation"
                onChange={(value) => setValue("activityLimitation", value)}
                value={draft.activityLimitation}
              />
              <RangeField
                id="fatigue"
                label="Fatigue"
                onChange={(value) => setValue("fatigue", value)}
                value={draft.fatigue}
              />
              <RangeField
                highLabel="Very high"
                id="stress"
                label="Stress / arousal"
                onChange={(value) => setValue("stress", value)}
                value={draft.stress}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__head">
              <div>
                <h3>Sleep and context</h3>
                <p>Optional context can help a clinician read the pattern.</p>
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="sleep-hours">Sleep last night</label>
                <input
                  id="sleep-hours"
                  max="24"
                  min="0"
                  onChange={(event) => setValue("sleepHours", event.target.value)}
                  placeholder="Hours"
                  step="0.5"
                  type="number"
                  value={draft.sleepHours}
                />
              </div>
              <SegmentGroup
                label="Sleep quality"
                name="sleep-quality"
                onChange={(value) => setValue("sleepQuality", value)}
                options={[
                  { value: "2", label: "Poor" },
                  { value: "5", label: "Fair" },
                  { value: "8", label: "Good" },
                  { value: "10", label: "Very good" },
                ]}
                value={draft.sleepQuality}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="field-grid">
              <ChipGroup
                label="Activities or exposures"
                onChange={(values) => setValue("activities", values)}
                options={ACTIVITY_OPTIONS}
                values={draft.activities}
              />
              <ChipGroup
                label="What helped or was tried"
                onChange={(values) => setValue("treatments", values)}
                options={TREATMENT_OPTIONS}
                values={draft.treatments}
              />
              <div className="field field--full">
                <label htmlFor="daily-note">Optional note</label>
                <textarea
                  id="daily-note"
                  maxLength={600}
                  onChange={(event) => setValue("notes", event.target.value)}
                  placeholder="Anything unusual or important today?"
                  value={draft.notes}
                />
              </div>
            </div>
          </div>

          <footer className="form-actions">
            {saved ? (
              <span aria-live="polite" className="save-state">
                <Icon name="check" size={17} />
                Saved on this device
              </span>
            ) : null}
            <button className="button button--primary" type="submit">
              Save check-in
              <Icon name="arrow" />
            </button>
          </footer>
        </form>

        <aside className="dashboard-side">
          <section className="hero-card">
            <p className="eyebrow">Your visit brief</p>
            <h2>Turn separate moments into one clear story.</h2>
            <p>
              The summary brings together medication timing, daily scores, and
              the episodes you choose to highlight.
            </p>
            <button
              className="button button--small"
              onClick={() => onNavigate("settings")}
              type="button"
            >
              Complete your profile
              <Icon name="arrow" size={17} />
            </button>
          </section>

          <section className="driving-card">
            <div className="driving-card__title">
              <Icon name="alert" />
              Pedal control comes first
            </div>
            <p>
              Do not drive while control or sensation is unreliable. Never
              trigger symptoms on purpose for the journal.
            </p>
          </section>

          <section className="card">
            <header className="card__header">
              <div>
                <h3>Next clinical steps</h3>
                <p>Status here is organizational—not medical clearance.</p>
              </div>
            </header>
            <div className="card__body">
              <div className="next-list">
                {CARE_STEPS.map((item) => {
                  const status = state.careSteps[item.id];
                  const nextStatus: CareStepStatus =
                    status === "not-started"
                      ? "planned"
                      : status === "planned"
                        ? "done"
                        : "not-started";
                  return (
                    <div
                      className={`next-item${status === "done" ? " next-item--done" : ""}`}
                      key={item.id}
                    >
                      <button
                        aria-label={`Set ${item.title} to ${nextStatus}`}
                        className="next-item__check"
                        onClick={() => onCareStep(item.id, nextStatus)}
                        type="button"
                      >
                        <Icon name="check" size={16} />
                      </button>
                      <button
                        className="next-item__text"
                        onClick={() => onNavigate(item.destination)}
                        style={{
                          border: 0,
                          background: "transparent",
                          padding: 0,
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                        type="button"
                      >
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </button>
                      <span
                        className={`status-pill${status === "done" ? " status-pill--done" : ""}`}
                      >
                        {status === "not-started"
                          ? "Not started"
                          : status === "planned"
                            ? "Planned"
                            : "Done"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="card">
            <header className="card__header">
              <div>
                <h3>Recent snapshot</h3>
                <p>Simple averages across the latest seven check-ins.</p>
              </div>
            </header>
            <div className="card__body">
              <div className="stat-grid">
                <div className="stat">
                  <span className="stat__value">
                    {averages.symptoms ?? "—"}
                  </span>
                  <span className="stat__label">Symptoms</span>
                </div>
                <div className="stat">
                  <span className="stat__value">{averages.fatigue ?? "—"}</span>
                  <span className="stat__label">Fatigue</span>
                </div>
                <div className="stat">
                  <span className="stat__value">
                    {averages.limitation ?? "—"}
                  </span>
                  <span className="stat__label">Limitation</span>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
