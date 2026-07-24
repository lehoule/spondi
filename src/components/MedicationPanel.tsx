"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  DoseEvent,
  DoseStatus,
  Medication,
  MedicationRoute,
} from "../types";
import { daysSinceLastDose, latestDoseOnOrBefore } from "../lib/dates";
import {
  createId,
  formatDate,
  localDate,
  truncate,
} from "../lib/browser";
import { SegmentGroup } from "./FormControls";
import { Icon } from "./Icons";
import { Modal } from "./Modal";

type MedicationDraft = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  route: MedicationRoute;
  startDate: string;
  endDate: string;
  prescriber: string;
  active: boolean;
  labelVerified: boolean;
  notes: string;
  createdAt: string;
};

type DoseDraft = {
  id: string;
  medicationId: string;
  date: string;
  time: string;
  dose: string;
  status: DoseStatus;
  notes: string;
  createdAt: string;
};

function emptyMedication(): MedicationDraft {
  const now = new Date().toISOString();
  return {
    id: createId("medication"),
    name: "",
    dose: "",
    frequency: "",
    route: "injection",
    startDate: "",
    endDate: "",
    prescriber: "",
    active: true,
    labelVerified: false,
    notes: "",
    createdAt: now,
  };
}

function medicationDraft(medication: Medication): MedicationDraft {
  return {
    id: medication.id,
    name: medication.name,
    dose: medication.dose,
    frequency: medication.frequency,
    route: medication.route,
    startDate: medication.startDate ?? "",
    endDate: medication.endDate ?? "",
    prescriber: medication.prescriber,
    active: medication.active,
    labelVerified: medication.labelVerified,
    notes: medication.notes,
    createdAt: medication.createdAt,
  };
}

function emptyDose(medication: Medication): DoseDraft {
  const now = new Date();
  return {
    id: createId("dose"),
    medicationId: medication.id,
    date: localDate(now),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`,
    dose: medication.dose,
    status: "as-prescribed",
    notes: "",
    createdAt: now.toISOString(),
  };
}

function MedicationForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: MedicationDraft;
  onCancel: () => void;
  onSave: (medication: Medication) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");

  const setValue = <K extends keyof MedicationDraft>(
    key: K,
    value: MedicationDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Enter the name exactly as it appears on the label, or enter “Unknown”.");
      return;
    }
    const now = new Date().toISOString();
    onSave({
      id: draft.id,
      name: draft.name.trim(),
      dose: draft.dose.trim(),
      frequency: draft.frequency.trim(),
      route: draft.route,
      startDate: draft.startDate || null,
      endDate: draft.active ? null : draft.endDate || null,
      prescriber: draft.prescriber.trim(),
      active: draft.active,
      labelVerified: draft.labelVerified,
      notes: draft.notes.trim(),
      createdAt: draft.createdAt,
      updatedAt: now,
    });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-section">
        <div className="field-grid">
          <div className="field field--full">
            <label htmlFor="med-name">Exact label name</label>
            <input
              id="med-name"
              onChange={(event) => {
                setError("");
                setValue("name", event.target.value);
              }}
              placeholder="Brand or generic name; enter Unknown if not confirmed"
              value={draft.name}
            />
            <span className="field__hint">
              Do not infer the medicine from how often it is taken.
            </span>
          </div>
          <div className="field">
            <label htmlFor="med-dose">Dose as written</label>
            <input
              id="med-dose"
              onChange={(event) => setValue("dose", event.target.value)}
              placeholder="For example: 50 mg"
              value={draft.dose}
            />
          </div>
          <div className="field">
            <label htmlFor="med-frequency">Prescribed frequency</label>
            <input
              id="med-frequency"
              onChange={(event) => setValue("frequency", event.target.value)}
              placeholder="For example: once monthly"
              value={draft.frequency}
            />
          </div>
          <div className="field">
            <label htmlFor="med-route">Route</label>
            <select
              id="med-route"
              onChange={(event) =>
                setValue("route", event.target.value as MedicationRoute)
              }
              value={draft.route}
            >
              <option value="injection">Self-injection</option>
              <option value="infusion">Infusion</option>
              <option value="oral">Oral</option>
              <option value="topical">Topical</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="med-prescriber">Prescriber or clinic</label>
            <input
              id="med-prescriber"
              onChange={(event) => setValue("prescriber", event.target.value)}
              placeholder="Optional"
              value={draft.prescriber}
            />
          </div>
          <div className="field">
            <label htmlFor="med-start">Start date</label>
            <input
              id="med-start"
              onChange={(event) => setValue("startDate", event.target.value)}
              type="date"
              value={draft.startDate}
            />
          </div>
          {!draft.active ? (
            <div className="field">
              <label htmlFor="med-end">End date</label>
              <input
                id="med-end"
                min={draft.startDate || undefined}
                onChange={(event) => setValue("endDate", event.target.value)}
                type="date"
                value={draft.endDate}
              />
            </div>
          ) : null}
          <div className="field field--full">
            <label htmlFor="med-notes">Notes</label>
            <textarea
              id="med-notes"
              maxLength={600}
              onChange={(event) => setValue("notes", event.target.value)}
              placeholder="Previous versions, biosimilars, missed doses, or relevant observations"
              value={draft.notes}
            />
          </div>
        </div>
      </div>
      <div className="form-section">
        <label className="consent-check">
          <input
            checked={draft.labelVerified}
            onChange={(event) => setValue("labelVerified", event.target.checked)}
            type="checkbox"
          />
          <span>
            I copied the name and dose from the current label, pharmacy record,
            or prescription list.
          </span>
        </label>
        <label className="consent-check">
          <input
            checked={draft.active}
            onChange={(event) => setValue("active", event.target.checked)}
            type="checkbox"
          />
          <span>This is a current medication.</span>
        </label>
        <div className="notice notice--amber">
          <Icon name="alert" />
          <div>
            <strong>Record—do not adjust</strong>
            <p>
              Do not stop, delay, or change a biologic without the prescriber.
            </p>
          </div>
        </div>
        {error ? (
          <p aria-live="assertive" className="form-error">
            <Icon name="alert" size={17} />
            {error}
          </p>
        ) : null}
      </div>
      <footer className="form-actions">
        <button className="button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="button button--primary" type="submit">
          Save medication
          <Icon name="arrow" />
        </button>
      </footer>
    </form>
  );
}

function DoseForm({
  initial,
  medication,
  onCancel,
  onSave,
}: {
  initial: DoseDraft;
  medication: Medication;
  onCancel: () => void;
  onSave: (event: DoseEvent) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const setValue = <K extends keyof DoseDraft>(key: K, value: DoseDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    onSave({
      id: draft.id,
      medicationId: medication.id,
      date: draft.date,
      time: draft.time || null,
      dose: draft.status === "skipped" ? "" : draft.dose.trim(),
      status: draft.status,
      notes: draft.notes.trim(),
      createdAt: draft.createdAt,
      updatedAt: now,
    });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-section">
        <div className="field-grid">
          <div className="field">
            <label htmlFor="dose-date">Date</label>
            <input
              id="dose-date"
              onChange={(event) => setValue("date", event.target.value)}
              required
              type="date"
              value={draft.date}
            />
          </div>
          <div className="field">
            <label htmlFor="dose-time">Time</label>
            <input
              id="dose-time"
              onChange={(event) => setValue("time", event.target.value)}
              type="time"
              value={draft.time}
            />
          </div>
          {draft.status !== "skipped" ? (
            <div className="field field--full">
              <label htmlFor="dose-amount">Actual dose recorded</label>
              <input
                id="dose-amount"
                onChange={(event) => setValue("dose", event.target.value)}
                placeholder="Copy from the label or leave blank"
                value={draft.dose}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className="form-section">
        <SegmentGroup
          label="What happened?"
          name="dose-status"
          onChange={(value) => setValue("status", value as DoseStatus)}
          options={[
            { value: "as-prescribed", label: "As prescribed" },
            { value: "late", label: "Taken late" },
            { value: "skipped", label: "Skipped" },
            { value: "not-sure", label: "Unsure" },
          ]}
          value={draft.status}
        />
      </div>
      <div className="form-section">
        <div className="field">
          <label htmlFor="dose-note">Optional note</label>
          <textarea
            id="dose-note"
            maxLength={400}
            onChange={(event) => setValue("notes", event.target.value)}
            placeholder="For example: delayed while unwell, discussed with clinic"
            value={draft.notes}
          />
        </div>
        <p className="field__hint" style={{ marginTop: "0.55rem" }}>
          This records what happened. It does not calculate or recommend the
          next dose.
        </p>
      </div>
      <footer className="form-actions">
        <button className="button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="button button--primary" type="submit">
          Save medication event
          <Icon name="arrow" />
        </button>
      </footer>
    </form>
  );
}

function isGolimumab(name: string) {
  return /\b(simponi|golimumab)\b/i.test(name);
}

export function MedicationPanel({
  medications,
  doseEvents,
  onSaveMedication,
  onDeleteMedication,
  onRecordDose,
  onDeleteDose,
}: {
  medications: Medication[];
  doseEvents: DoseEvent[];
  onSaveMedication: (medication: Medication) => void;
  onDeleteMedication: (id: string) => void;
  onRecordDose: (event: DoseEvent) => void;
  onDeleteDose: (id: string) => void;
}) {
  const [editing, setEditing] = useState<MedicationDraft | null>(null);
  const [dosing, setDosing] = useState<{
    medication: Medication;
    draft: DoseDraft;
  } | null>(null);
  const [deleting, setDeleting] = useState<Medication | null>(null);
  const today = localDate();

  const sortedMedications = useMemo(
    () =>
      [...medications].sort(
        (a, b) =>
          Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
      ),
    [medications],
  );
  const recentDoses = useMemo(
    () =>
      [...doseEvents]
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            (b.time ?? "").localeCompare(a.time ?? ""),
        )
        .slice(0, 8),
    [doseEvents],
  );

  const saveMedication = (medication: Medication) => {
    onSaveMedication(medication);
    setEditing(null);
  };

  const saveDose = (event: DoseEvent) => {
    onRecordDose(event);
    setDosing(null);
  };

  return (
    <section className="page" aria-labelledby="medication-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Medication reconciliation</p>
          <h1 id="medication-title">Medication</h1>
          <p>
            Copy exact label details and factual dose dates. The journal never
            infers a medicine or dosing schedule.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="button button--primary"
            onClick={() => setEditing(emptyMedication())}
            type="button"
          >
            <Icon name="plus" />
            Add medication
          </button>
        </div>
      </header>

      <div className="medication-layout">
        <section className="card">
          <header className="card__header">
            <div>
              <h2>Medication list</h2>
              <p>Include current and previous biologics as separate records.</p>
            </div>
          </header>
          <div className="card__body">
            {sortedMedications.length ? (
              <div className="record-list">
                {sortedMedications.map((medication) => {
                  const lastDose = latestDoseOnOrBefore(
                    doseEvents,
                    today,
                    medication.id,
                  );
                  const days = daysSinceLastDose(
                    doseEvents,
                    today,
                    medication.id,
                  );
                  return (
                    <article className="medication-card card" key={medication.id}>
                      <div className="medication-card__head">
                        <div>
                          <div className="record-meta">
                            <span>
                              {medication.active ? "Current" : "Previous"}
                            </span>
                            <span>
                              {medication.labelVerified
                                ? "Label verified"
                                : "Not yet verified"}
                            </span>
                          </div>
                          <h3>{medication.name}</h3>
                          <p>
                            {[medication.dose, medication.frequency]
                              .filter(Boolean)
                              .join(" · ") || "Dose and frequency not recorded"}
                          </p>
                        </div>
                        <div className="record-actions">
                          <button
                            aria-label={`Edit ${medication.name}`}
                            className="icon-button"
                            onClick={() => setEditing(medicationDraft(medication))}
                            type="button"
                          >
                            <Icon name="edit" size={17} />
                          </button>
                          <button
                            aria-label={`Delete ${medication.name}`}
                            className="icon-button"
                            onClick={() => setDeleting(medication)}
                            type="button"
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </div>
                      <div className="medication-facts">
                        <div>
                          <span>Route</span>
                          <strong>{medication.route}</strong>
                        </div>
                        <div>
                          <span>Started</span>
                          <strong>
                            {medication.startDate
                              ? formatDate(medication.startDate)
                              : "Not recorded"}
                          </strong>
                        </div>
                        <div>
                          <span>Last recorded dose</span>
                          <strong>
                            {lastDose ? formatDate(lastDose.date) : "None yet"}
                          </strong>
                        </div>
                        <div>
                          <span>Days since recorded dose</span>
                          <strong>{days ?? "—"}</strong>
                        </div>
                      </div>
                      {medication.notes ? (
                        <p style={{ marginTop: "0.7rem" }}>
                          {truncate(medication.notes)}
                        </p>
                      ) : null}
                      <button
                        className="button button--soft button--small"
                        onClick={() =>
                          setDosing({
                            medication,
                            draft: emptyDose(medication),
                          })
                        }
                        style={{ marginTop: "0.8rem" }}
                        type="button"
                      >
                        <Icon name="plus" size={16} />
                        Record medication event
                      </button>
                      {isGolimumab(medication.name) ? (
                        <div className="notice notice--amber">
                          <Icon name="info" />
                          <div>
                            <strong>Official label information</strong>
                            <p>
                              The current Canadian monograph tells patients to
                              contact their doctor promptly for vision changes,
                              limb weakness, numbness, or tingling. This does
                              not establish that the medicine caused a symptom.
                            </p>
                            <a
                              href="https://pdf.hres.ca/dpd_pm/00084236.PDF"
                              rel="noreferrer"
                              target="_blank"
                            >
                              Health Canada monograph ↗
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state__icon">
                  <Icon name="medication" />
                </span>
                <h2>Exact medication still unknown</h2>
                <p>
                  Start with the pen or box label. A pharmacy or prescriber can
                  provide a medication record if the packaging is unavailable.
                </p>
                <button
                  className="button button--soft"
                  onClick={() => setEditing(emptyMedication())}
                  type="button"
                >
                  <Icon name="plus" />
                  Add label details
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="dashboard-side">
          <section className="card">
            <header className="card__header">
              <div>
                <h3>Recent medication events</h3>
                <p>Timing shown as recorded, not as a dosing recommendation.</p>
              </div>
            </header>
            <div className="card__body">
              {recentDoses.length ? (
                <div className="dose-list">
                  {recentDoses.map((event) => {
                    const medication = medications.find(
                      (item) => item.id === event.medicationId,
                    );
                    return (
                      <div className="dose-item" key={event.id}>
                        <span className="dose-item__dot">
                          <Icon name="medication" size={16} />
                        </span>
                        <div>
                          <strong>{medication?.name ?? "Unknown medication"}</strong>
                          <span>
                            {formatDate(event.date)} ·{" "}
                            {event.status.replaceAll("-", " ")}
                          </span>
                        </div>
                        <button
                          aria-label="Delete medication event"
                          className="icon-button"
                          onClick={() => onDeleteDose(event.id)}
                          type="button"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">No medication events recorded yet.</p>
              )}
            </div>
          </section>

          <section className="driving-card">
            <div className="driving-card__title">
              <Icon name="alert" />
              Do not change a biologic alone
            </div>
            <p>
              Unexplained neurological symptoms are a reason to contact the
              prescriber—not proof of an adverse effect and not an instruction
              to stop treatment.
            </p>
          </section>
        </aside>
      </div>

      {editing ? (
        <Modal
          eyebrow={
            medications.some((item) => item.id === editing.id)
              ? "Edit medication"
              : "Medication reconciliation"
          }
          onClose={() => setEditing(null)}
          title="Label details"
          wide
        >
          <MedicationForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={saveMedication}
          />
        </Modal>
      ) : null}

      {dosing ? (
        <Modal
          eyebrow="Factual medication record"
          onClose={() => setDosing(null)}
          title={dosing.medication.name}
        >
          <DoseForm
            initial={dosing.draft}
            medication={dosing.medication}
            onCancel={() => setDosing(null)}
            onSave={saveDose}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <Modal onClose={() => setDeleting(null)} title="Delete this medication?">
          <p>
            Deleting {deleting.name} will also delete its recorded medication
            events. Export a backup first if the history may be needed later.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setDeleting(null)} type="button">
              Keep medication
            </button>
            <button
              className="button button--danger"
              onClick={() => {
                onDeleteMedication(deleting.id);
                setDeleting(null);
              }}
              type="button"
            >
              Delete medication
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
