"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type {
  AppState,
  MedicalProfile,
  TimelineCategory,
  TimelineEvent,
} from "../types";
import {
  exportBackupJson,
  importBackupJson,
} from "../lib/storage";
import {
  createId,
  downloadText,
  formatDate,
  localDate,
  truncate,
} from "../lib/browser";
import { Icon } from "./Icons";
import { Modal } from "./Modal";

type TimelineDraft = {
  id: string;
  date: string;
  category: TimelineCategory;
  title: string;
  details: string;
  createdAt: string;
};

function emptyTimeline(): TimelineDraft {
  const now = new Date().toISOString();
  return {
    id: createId("timeline"),
    date: localDate(),
    category: "symptom",
    title: "",
    details: "",
    createdAt: now,
  };
}

function timelineDraft(event: TimelineEvent): TimelineDraft {
  return {
    id: event.id,
    date: event.date,
    category: event.category,
    title: event.title,
    details: event.details,
    createdAt: event.createdAt,
  };
}

function TimelineForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: TimelineDraft;
  onCancel: () => void;
  onSave: (event: TimelineEvent) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      setError("Add a short title for this timeline event.");
      return;
    }
    onSave({
      id: draft.id,
      date: draft.date,
      category: draft.category,
      title: draft.title.trim(),
      details: draft.details.trim(),
      createdAt: draft.createdAt,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-section">
        <div className="field-grid">
          <div className="field">
            <label htmlFor="timeline-date">Date</label>
            <input
              id="timeline-date"
              onChange={(event) =>
                setDraft((current) => ({ ...current, date: event.target.value }))
              }
              required
              type="date"
              value={draft.date}
            />
          </div>
          <div className="field">
            <label htmlFor="timeline-category">Category</label>
            <select
              id="timeline-category"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  category: event.target.value as TimelineCategory,
                }))
              }
              value={draft.category}
            >
              <option value="diagnosis">Diagnosis</option>
              <option value="medication">Medication</option>
              <option value="symptom">Symptom change</option>
              <option value="function">Function change</option>
              <option value="test">Test or imaging</option>
              <option value="treatment">Treatment or appointment</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field field--full">
            <label htmlFor="timeline-title">Short title</label>
            <input
              id="timeline-title"
              onChange={(event) => {
                setError("");
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }));
              }}
              placeholder="For example: First long-distance travel episode"
              value={draft.title}
            />
          </div>
          <div className="field field--full">
            <label htmlFor="timeline-details">Details</label>
            <textarea
              id="timeline-details"
              maxLength={700}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  details: event.target.value,
                }))
              }
              placeholder="What changed, what was observed, and any records that exist"
              value={draft.details}
            />
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
          Save timeline event
        </button>
      </footer>
    </form>
  );
}

export function SettingsPanel({
  state,
  onSaveProfile,
  onSaveTimeline,
  onDeleteTimeline,
  onImport,
  onClear,
}: {
  state: AppState;
  onSaveProfile: (profile: MedicalProfile) => void;
  onSaveTimeline: (event: TimelineEvent) => void;
  onDeleteTimeline: (id: string) => void;
  onImport: (state: AppState) => void;
  onClear: () => void;
}) {
  const [profile, setProfile] = useState(state.profile);
  const [clinicians, setClinicians] = useState(
    state.profile.clinicians.join(", "),
  );
  const [editingTimeline, setEditingTimeline] =
    useState<TimelineDraft | null>(null);
  const [deleteTimeline, setDeleteTimeline] =
    useState<TimelineEvent | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearText, setClearText] = useState("");
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [importError, setImportError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    onSaveProfile({
      ...profile,
      clinicians: clinicians
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    setProfileSaved(true);
  };

  const readBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError("");
    try {
      const parsed = importBackupJson(await file.text());
      if (!parsed.ok) {
        setImportError(parsed.error);
        return;
      }
      setPendingImport(parsed.value);
    } catch {
      setImportError("The selected file could not be read.");
    }
  };

  const sortedTimeline = [...state.timeline].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <section className="page" aria-labelledby="settings-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Context and privacy</p>
          <h1 id="settings-title">Profile & data</h1>
          <p>
            Add only the context that will improve care. Everything remains
            editable and under the data owner&apos;s control.
          </p>
        </div>
      </header>

      <div className="settings-grid">
        <form className="card settings-card" onSubmit={saveProfile}>
          <h2>Medical context</h2>
          <p>
            These details appear in the appointment brief. Leave anything
            unknown blank.
          </p>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="profile-name">Preferred name</label>
              <input
                id="profile-name"
                onChange={(event) => {
                  setProfileSaved(false);
                  setProfile((current) => ({
                    ...current,
                    preferredName: event.target.value,
                  }));
                }}
                value={profile.preferredName}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-diagnosis">Recorded diagnosis</label>
              <input
                id="profile-diagnosis"
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    diagnosis: event.target.value,
                  }))
                }
                value={profile.diagnosis}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-diagnosis-year">Diagnosis year</label>
              <input
                id="profile-diagnosis-year"
                max={new Date().getFullYear()}
                min="1900"
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    diagnosisYear: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                placeholder="Approximate is okay"
                type="number"
                value={profile.diagnosisYear ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-onset-year">Unusual symptom onset year</label>
              <input
                id="profile-onset-year"
                max={new Date().getFullYear()}
                min="1900"
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    symptomOnsetYear: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                placeholder="Approximate"
                type="number"
                value={profile.symptomOnsetYear ?? ""}
              />
            </div>
            <div className="field field--full">
              <label htmlFor="profile-clinicians">Clinicians or clinics</label>
              <input
                id="profile-clinicians"
                onChange={(event) => setClinicians(event.target.value)}
                placeholder="Separate names with commas"
                value={clinicians}
              />
            </div>
            <div className="field field--full">
              <label htmlFor="profile-function">Functional change over time</label>
              <textarea
                id="profile-function"
                maxLength={1200}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    functionalHistory: event.target.value,
                  }))
                }
                placeholder="For example: previously tolerated several-hour trips; now pedal use becomes limiting within about 30 minutes"
                value={profile.functionalHistory}
              />
            </div>
            <div className="field field--full">
              <label htmlFor="profile-goals">Goals for care</label>
              <textarea
                id="profile-goals"
                maxLength={700}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    goalsForCare: event.target.value,
                  }))
                }
                placeholder="What should the care team help clarify or restore?"
                value={profile.goalsForCare}
              />
            </div>
          </div>
          <div className="form-actions" style={{ paddingInline: 0, paddingBottom: 0 }}>
            {profileSaved ? (
              <span aria-live="polite" className="save-state">
                <Icon name="check" size={17} />
                Saved on this device
              </span>
            ) : null}
            <button className="button button--primary" type="submit">
              Save profile
            </button>
          </div>
        </form>

        <section className="card settings-card">
          <div className="card__header" style={{ padding: 0 }}>
            <div>
              <h2>Major timeline</h2>
              <p>Diagnosis, medication changes, tests, and functional milestones.</p>
            </div>
            <button
              className="button button--small"
              onClick={() => setEditingTimeline(emptyTimeline())}
              type="button"
            >
              <Icon name="plus" size={16} />
              Add
            </button>
          </div>
          <div className="record-list" style={{ marginTop: "1rem" }}>
            {sortedTimeline.length ? (
              sortedTimeline.slice(0, 8).map((event) => (
                <article className="record-card" key={event.id}>
                  <div className="record-card__date" style={{ width: 70 }}>
                    <span style={{ fontSize: "0.58rem" }}>
                      {formatDate(event.date, {
                        year: "2-digit",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="record-card__content">
                    <h3>{event.title}</h3>
                    <p>
                      {event.category} · {truncate(event.details || "No details", 100)}
                    </p>
                  </div>
                  <div className="record-actions">
                    <button
                      aria-label="Edit timeline event"
                      className="icon-button"
                      onClick={() => setEditingTimeline(timelineDraft(event))}
                      type="button"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      aria-label="Delete timeline event"
                      className="icon-button"
                      onClick={() => setDeleteTimeline(event)}
                      type="button"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <span className="empty-state__icon">
                  <Icon name="calendar" />
                </span>
                <h3>No timeline events yet</h3>
                <p>
                  Start with the diagnosis, the original travel episode, and
                  major medication changes.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="card settings-card">
          <h2>Data controls</h2>
          <p>
            Browser storage is convenient, but a backup is the only way to
            recover after browser data is cleared or the device is lost.
          </p>
          <div className="action-list">
            <div className="action-row">
              <div>
                <strong>Download private backup</strong>
                <span>All journal data in a validated JSON file</span>
              </div>
              <button
                className="button button--small"
                onClick={() =>
                  downloadText(
                    exportBackupJson(state),
                    `spondi-backup-${localDate()}.json`,
                    "application/json",
                  )
                }
                type="button"
              >
                <Icon name="download" size={16} />
                Backup
              </button>
            </div>
            <div className="action-row">
              <div>
                <strong>Restore a backup</strong>
                <span>Review before replacing this browser&apos;s data</span>
              </div>
              <button
                className="button button--small"
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                <Icon name="upload" size={16} />
                Restore
              </button>
              <input
                accept="application/json,.json"
                className="sr-only"
                onChange={readBackup}
                ref={fileRef}
                type="file"
              />
            </div>
            <div className="action-row">
              <div>
                <strong>Delete all local data</strong>
                <span>Irreversible unless a backup exists</span>
              </div>
              <button
                className="button button--small"
                onClick={() => setClearOpen(true)}
                type="button"
              >
                <Icon name="trash" size={16} />
                Delete
              </button>
            </div>
          </div>
          {importError ? (
            <p aria-live="assertive" className="form-error">
              <Icon name="alert" size={17} />
              {importError}
            </p>
          ) : null}
        </section>

        <section className="card settings-card">
          <h2>Privacy, without vague promises</h2>
          <p>The journal is designed to minimize exposure, not eliminate it.</p>
          <div className="privacy-facts">
            <div className="privacy-fact">
              <span>
                <Icon name="lock" size={17} />
              </span>
              <div>
                <strong>Local browser storage</strong>
                <p>
                  No account, backend, analytics, advertising, or health-data
                  upload. Data is not independently encrypted by the app.
                </p>
              </div>
            </div>
            <div className="privacy-fact">
              <span>
                <Icon name="shield" size={17} />
              </span>
              <div>
                <strong>Use a protected device</strong>
                <p>
                  A device passcode, private browser profile, and full-disk
                  encryption provide important protection.
                </p>
              </div>
            </div>
            <div className="privacy-fact">
              <span>
                <Icon name="document" size={17} />
              </span>
              <div>
                <strong>Consent before sharing</strong>
                <p>
                  Files belong to the data owner. Review exports and use a
                  secure clinical portal when available.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="card settings-card">
          <h2>Clinical context</h2>
          <p>
            Stress support can run alongside medical evaluation. It should
            never be used to dismiss progressive physical symptoms.
          </p>
          <div className="notice">
            <Icon name="heart" />
            <div>
              <strong>Functional symptoms are real</strong>
              <p>
                Functional neurological disorder should be diagnosed from
                positive specialist findings. It may coexist with another
                condition.
              </p>
            </div>
          </div>
          <div className="notice">
            <Icon name="pulse" />
            <div>
              <strong>Active rehabilitation</strong>
              <p>
                An independent specialist physiotherapist can establish an
                objective baseline. Avoid forceful spinal manipulation.
              </p>
            </div>
          </div>
          <div className="source-links">
            <p>Authoritative guidance</p>
            <a
              href="https://www.nice.org.uk/guidance/ng127/chapter/Recommendations-for-adults-aged-over-16"
              rel="noreferrer"
              target="_blank"
            >
              NICE neurological referral guidance <span>↗</span>
            </a>
            <a
              href="https://assets.contentstack.io/v3/assets/bltee37abb6b278ab2c/blt424f1e71604af245/axspa-guideline-summary-2026.pdf"
              rel="noreferrer"
              target="_blank"
            >
              2026 ACR axial-SpA guidance <span>↗</span>
            </a>
            <a
              href="https://www.asas-group.org/education/asas-app/"
              rel="noreferrer"
              target="_blank"
            >
              Official ASAS app and measures <span>↗</span>
            </a>
          </div>
        </section>
      </div>

      {editingTimeline ? (
        <Modal
          onClose={() => setEditingTimeline(null)}
          title="Medical timeline event"
        >
          <TimelineForm
            initial={editingTimeline}
            onCancel={() => setEditingTimeline(null)}
            onSave={(event) => {
              onSaveTimeline(event);
              setEditingTimeline(null);
            }}
          />
        </Modal>
      ) : null}

      {deleteTimeline ? (
        <Modal onClose={() => setDeleteTimeline(null)} title="Delete timeline event?">
          <p>
            “{deleteTimeline.title}” will be removed from future visit briefs.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setDeleteTimeline(null)} type="button">
              Keep event
            </button>
            <button
              className="button button--danger"
              onClick={() => {
                onDeleteTimeline(deleteTimeline.id);
                setDeleteTimeline(null);
              }}
              type="button"
            >
              Delete event
            </button>
          </div>
        </Modal>
      ) : null}

      {pendingImport ? (
        <Modal onClose={() => setPendingImport(null)} title="Replace local journal?">
          <p>
            This valid backup contains {pendingImport.dailyLogs.length} daily
            check-ins, {pendingImport.episodes.length} episodes, and{" "}
            {pendingImport.medications.length} medications. Restoring it will
            replace the current data in this browser.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setPendingImport(null)} type="button">
              Cancel
            </button>
            <button
              className="button button--primary"
              onClick={() => {
                onImport(pendingImport);
                setPendingImport(null);
              }}
              type="button"
            >
              Restore backup
            </button>
          </div>
        </Modal>
      ) : null}

      {clearOpen ? (
        <Modal onClose={() => setClearOpen(false)} title="Delete all journal data?">
          <p>
            This removes the profile, check-ins, episodes, medications, and
            timeline from this browser. It cannot be undone without a backup.
          </p>
          <div className="confirm-field">
            <label htmlFor="clear-confirm">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              autoComplete="off"
              id="clear-confirm"
              onChange={(event) => setClearText(event.target.value)}
              value={clearText}
            />
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setClearOpen(false)} type="button">
              Cancel
            </button>
            <button
              className="button button--danger"
              disabled={clearText !== "DELETE"}
              onClick={() => {
                onClear();
                setClearText("");
                setClearOpen(false);
              }}
              type="button"
            >
              Delete everything
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
