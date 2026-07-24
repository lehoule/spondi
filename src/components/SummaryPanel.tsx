"use client";

import { useMemo, useState } from "react";
import type { AppState, ISODate } from "../types";
import {
  buildAppointmentSummary,
  exportCsvBundle,
} from "../lib/export";
import {
  downloadText,
  formatDate,
  localDate,
  mean,
  truncate,
} from "../lib/browser";
import { datePart } from "../lib/dates";
import { Icon } from "./Icons";
import { Modal } from "./Modal";

function daysAgoDate(days: number): ISODate {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return localDate(value);
}

function score(value: number | null) {
  return value === null ? "—" : value;
}

export function SummaryPanel({ state }: { state: AppState }) {
  const [startDate, setStartDate] = useState(() => daysAgoDate(29));
  const [endDate, setEndDate] = useState(() => localDate());
  const [reason, setReason] = useState(
    "Progressive sensory symptoms, cramps, and functional loss affecting pedal use and driving.",
  );
  const [exporting, setExporting] = useState(false);

  const filteredState = useMemo(
    () => ({
      ...state,
      dailyLogs: state.dailyLogs.filter(
        (log) => log.date >= startDate && log.date <= endDate,
      ),
      episodes: state.episodes.filter((episode) => {
        const date = datePart(episode.onsetAt);
        return date >= startDate && date <= endDate;
      }),
    }),
    [endDate, startDate, state],
  );
  const summary = useMemo(
    () =>
      buildAppointmentSummary(filteredState, endDate, {
        maxEpisodes: 5,
        maxTimelineEvents: 8,
        maxRecentDailyLogs: 14,
      }),
    [endDate, filteredState],
  );
  const symptomAverage = mean(
    summary.recentDailyLogs.flatMap((log) => [
      log.pain,
      log.tingling,
      log.cramping,
    ]),
  );
  const drivingEpisodes = filteredState.episodes.filter(
    (episode) => episode.drivingRelated,
  ).length;

  const downloadCsv = (filename: string) => {
    const bundle = exportCsvBundle(state, endDate);
    const content = bundle[filename];
    if (!content) return;
    downloadText(
      content,
      `spondi-${filename}`,
      "text/csv;charset=utf-8",
    );
  };

  return (
    <section className="page" aria-labelledby="summary-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Appointment preparation</p>
          <h1 id="summary-title">Visit brief</h1>
          <p>
            A concise, patient-recorded overview. Review it before choosing
            what to share.
          </p>
        </div>
      </header>

      <section className="card summary-controls no-print">
        <div className="field">
          <label htmlFor="summary-start">From</label>
          <input
            id="summary-start"
            max={endDate}
            onChange={(event) => setStartDate(event.target.value)}
            type="date"
            value={startDate}
          />
        </div>
        <div className="field">
          <label htmlFor="summary-end">Through</label>
          <input
            id="summary-end"
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
            type="date"
            value={endDate}
          />
        </div>
        <div className="page-actions">
          <button
            className="button"
            onClick={() => setExporting(true)}
            type="button"
          >
            <Icon name="download" />
            Export CSV
          </button>
          <button
            className="button button--primary"
            onClick={() => window.print()}
            type="button"
          >
            <Icon name="printer" />
            Print / save PDF
          </button>
        </div>
      </section>

      <article className="summary-paper" aria-label="Printable appointment brief">
        <header className="summary-paper__head">
          <div className="summary-paper__brand">
            <div className="brand-mark" aria-hidden="true">
              <span />
              <span />
            </div>
            <div>
              <strong>Spondi Care Journal</strong>
              <div>Patient-recorded visit brief</div>
            </div>
          </div>
          <div className="summary-paper__meta">
            <strong>
              {state.profile.preferredName || "Name not recorded"}
            </strong>
            <br />
            {formatDate(startDate, { year: undefined })}–{formatDate(endDate)}
          </div>
        </header>

        <div className="summary-reason">
          <span>Reason for visit</span>
          <textarea
            aria-label="Reason for visit"
            className="summary-reason__input no-print"
            maxLength={400}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
          <p className="print-only">{reason}</p>
        </div>

        <section className="summary-section">
          <h2>30-day snapshot</h2>
          <div className="summary-snapshot">
            <div>
              <strong>{summary.dailyTrend.entryCount}</strong>
              <span>Daily check-ins</span>
            </div>
            <div>
              <strong>{filteredState.episodes.length}</strong>
              <span>Episodes recorded</span>
            </div>
            <div>
              <strong>{symptomAverage ?? "—"}</strong>
              <span>Avg. symptom score / 10</span>
            </div>
            <div>
              <strong>
                {score(summary.dailyTrend.averages.activityLimitation)}
              </strong>
              <span>Avg. activity limitation / 10</span>
            </div>
          </div>
        </section>

        <section className="summary-section">
          <h2>Background and functional change</h2>
          <table className="summary-table">
            <tbody>
              <tr>
                <th>Recorded diagnosis</th>
                <td>
                  {state.profile.diagnosis || "Not recorded"}
                  {state.profile.diagnosisYear
                    ? ` (${state.profile.diagnosisYear})`
                    : ""}
                </td>
              </tr>
              <tr>
                <th>Symptom onset</th>
                <td>{state.profile.symptomOnsetYear ?? "Not recorded"}</td>
              </tr>
              <tr>
                <th>Functional history</th>
                <td>
                  {state.profile.functionalHistory
                    ? truncate(state.profile.functionalHistory, 360)
                    : "Not yet recorded"}
                </td>
              </tr>
              <tr>
                <th>Driving / pedals</th>
                <td>
                  {drivingEpisodes
                    ? `${drivingEpisodes} episode(s) in this period were recorded as affecting pedal use or driving.`
                    : "No driving-related episode was recorded in this period. This does not establish fitness to drive."}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="summary-section">
          <h2>Medication reconciliation</h2>
          {summary.medications.length ? (
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Dose / frequency</th>
                  <th>Current</th>
                  <th>Last recorded dose</th>
                </tr>
              </thead>
              <tbody>
                {summary.medications.map(({ medication, lastDose }) => (
                  <tr key={medication.id}>
                    <td>
                      <strong>{medication.name}</strong>
                      <br />
                      {medication.labelVerified
                        ? "Label verified"
                        : "Not yet verified"}
                    </td>
                    <td>
                      {[medication.dose, medication.frequency]
                        .filter(Boolean)
                        .join(" · ") || "Not recorded"}
                    </td>
                    <td>{medication.active ? "Yes" : "No"}</td>
                    <td>{lastDose ? formatDate(lastDose.date) : "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="summary-note">No medication details recorded yet.</p>
          )}
        </section>

        <section className="summary-section">
          <h2>Representative episodes</h2>
          {summary.representativeEpisodes.length ? (
            <>
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Date / task</th>
                    <th>Symptoms and function</th>
                    <th>Recovery</th>
                    <th>Dose timing</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.representativeEpisodes.map(
                    ({ episode, doseTiming }) => {
                      const relevantTiming = doseTiming.filter(
                        (item) => item.daysSinceDose !== null,
                      );
                      return (
                        <tr key={episode.id}>
                          <td>
                            <strong>{formatDate(datePart(episode.onsetAt))}</strong>
                            <br />
                            {truncate(episode.taskOrPosture, 90)}
                          </td>
                          <td>
                            {episode.symptoms.slice(0, 4).join(", ") ||
                              "Not specified"}
                            <br />
                            Intensity {episode.severity ?? "—"}/10 ·{" "}
                            {episode.movementImpact.replaceAll("-", " ")}
                            {episode.drivingRelated
                              ? " · pedal/driving impact"
                              : ""}
                          </td>
                          <td>
                            {episode.recoveryStatus.replaceAll("-", " ")}
                            {episode.recovery
                              ? ` · ${truncate(episode.recovery, 80)}`
                              : ""}
                          </td>
                          <td>
                            {relevantTiming.length
                              ? relevantTiming
                                  .map(
                                    (item) =>
                                      `${item.daysSinceDose} day(s) after ${item.medicationName}`,
                                  )
                                  .join("; ")
                              : "Not available"}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
              <p className="summary-note">
                Medication timing is shown for discussion only. It does not
                establish a cause.
              </p>
            </>
          ) : (
            <p className="summary-note">
              No episodes fall within this date range.
            </p>
          )}
        </section>

        {summary.timeline.length ? (
          <section className="summary-section">
            <h2>Major timeline</h2>
            <table className="summary-table">
              <tbody>
                {summary.timeline.slice(0, 6).map((event) => (
                  <tr key={event.id}>
                    <th>{formatDate(event.date)}</th>
                    <td>
                      <strong>{event.title}</strong>
                      {event.details
                        ? ` — ${truncate(event.details, 160)}`
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="summary-section">
          <h2>Questions for the clinical team</h2>
          <ol className="summary-questions">
            <li>
              Does this pattern appear related to inflammatory disease
              activity, treatment, or a separate neurological or mechanical
              condition?
            </li>
            <li>
              What focused examination, tests, or referrals are appropriate?
            </li>
            <li>
              What activities and driving restrictions are appropriate now?
            </li>
          </ol>
        </section>

        <footer className="summary-paper__footer">
          Patient-recorded information; not a diagnosis or treatment
          recommendation. Generated {formatDate(localDate())}. Full structured
          records remain available in CSV.
        </footer>
      </article>

      {exporting ? (
        <Modal onClose={() => setExporting(false)} title="Export sensitive health data">
          <div className="notice notice--amber">
            <Icon name="lock" />
            <div>
              <strong>Choose a safe destination</strong>
              <p>
                CSV files contain sensitive health information. Store them on
                a protected device and share only with permission.
              </p>
            </div>
          </div>
          <div className="action-list" style={{ marginTop: "1rem" }}>
            {[
              ["daily-logs.csv", "Daily check-ins"],
              ["episodes.csv", "Episodes"],
              ["medications.csv", "Medication list"],
              ["dose-events.csv", "Medication events"],
              ["timeline.csv", "Medical timeline"],
            ].map(([filename, label]) => (
              <div className="action-row" key={filename}>
                <div>
                  <strong>{label}</strong>
                  <span>{filename}</span>
                </div>
                <button
                  className="button button--small"
                  onClick={() => downloadCsv(filename)}
                  type="button"
                >
                  <Icon name="download" size={16} />
                  Download
                </button>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
