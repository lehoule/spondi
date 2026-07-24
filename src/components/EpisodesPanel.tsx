"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  BodySide,
  Episode,
  EpisodeBodyArea,
  EpisodeOnset,
  MovementImpact,
  RecoveryStatus,
} from "../types";
import {
  createId,
  dateBadge,
  formatDateTime,
  inputToISODateTime,
  isoToDateTimeInput,
  localDateTimeInput,
  truncate,
} from "../lib/browser";
import { ChipGroup, RangeField, SegmentGroup } from "./FormControls";
import { Icon } from "./Icons";
import { Modal } from "./Modal";

const SYMPTOMS = [
  "Tingling / numbness",
  "Cramp / spasm",
  "Pain",
  "Pulling / tightness",
  "Felt weak",
  "Coordination / balance issue",
  "Dizziness",
  "Vision change",
  "Breathing change",
  "Other",
];

const IMPACTS = [
  "Stopped the task",
  "Needed help",
  "Could not safely use pedals / drive",
  "Fall / near fall",
];

const BODY_AREAS = [
  "Head / face",
  "Neck",
  "Upper back",
  "Chest / ribs",
  "Arm / hand",
  "Lower back / hips",
  "Buttocks / pelvis",
  "Thigh",
  "Lower leg / foot",
  "Whole body",
];

const SIDE_OPTIONS: Array<{ value: BodySide; label: string }> = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "both", label: "Both" },
  { value: "midline", label: "Centre" },
  { value: "not-sure", label: "Unsure" },
];

type EpisodeDraft = {
  id: string;
  onsetAt: string;
  onsetPattern: EpisodeOnset;
  duration: string;
  severity: number;
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
  createdAt: string;
};

function emptyDraft(): EpisodeDraft {
  return {
    id: createId("episode"),
    onsetAt: localDateTimeInput(),
    onsetPattern: "not-sure",
    duration: "",
    severity: 0,
    taskOrPosture: "",
    bodyAreas: [],
    symptoms: [],
    impacts: [],
    movementImpact: "not-sure",
    recoveryStatus: "not-sure",
    recovery: "",
    helpedBy: "",
    drivingRelated: false,
    pinned: false,
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

function draftFromEpisode(episode: Episode): EpisodeDraft {
  return {
    id: episode.id,
    onsetAt: isoToDateTimeInput(episode.onsetAt),
    onsetPattern: episode.onsetPattern,
    duration:
      episode.durationMinutes === null ? "" : String(episode.durationMinutes),
    severity: episode.severity ?? 0,
    taskOrPosture: episode.taskOrPosture,
    bodyAreas: episode.bodyAreas,
    symptoms: episode.symptoms,
    impacts: episode.impacts,
    movementImpact: episode.movementImpact,
    recoveryStatus: episode.recoveryStatus,
    recovery: episode.recovery,
    helpedBy: episode.helpedBy,
    drivingRelated: episode.drivingRelated,
    pinned: episode.pinned,
    notes: episode.notes,
    createdAt: episode.createdAt,
  };
}

function EpisodeForm({
  initial,
  onCancel,
  onSave,
  onSafety,
}: {
  initial: EpisodeDraft;
  onCancel: () => void;
  onSave: (episode: Episode) => void;
  onSafety: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");

  const setValue = <K extends keyof EpisodeDraft>(
    key: K,
    value: EpisodeDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const addArea = (area: string) => {
    if (draft.bodyAreas.some((item) => item.area === area)) return;
    setValue("bodyAreas", [...draft.bodyAreas, { area, side: "both" }]);
  };

  const changeAreaSide = (area: string, side: BodySide) => {
    setValue(
      "bodyAreas",
      draft.bodyAreas.map((item) =>
        item.area === area ? { ...item, side } : item,
      ),
    );
  };

  const removeArea = (area: string) => {
    setValue(
      "bodyAreas",
      draft.bodyAreas.filter((item) => item.area !== area),
    );
  };

  const hasSafetyPrompt =
    draft.symptoms.some((item) =>
      ["Vision change", "Breathing change"].includes(item),
    ) || draft.impacts.includes("Fall / near fall");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.taskOrPosture.trim()) {
      setError("Describe the task or posture when the episode began.");
      return;
    }
    const now = new Date().toISOString();
    onSave({
      id: draft.id,
      onsetAt: inputToISODateTime(draft.onsetAt),
      onsetPattern: draft.onsetPattern,
      durationMinutes: draft.duration === "" ? null : Number(draft.duration),
      severity: draft.severity,
      taskOrPosture: draft.taskOrPosture.trim(),
      bodyAreas: draft.bodyAreas,
      symptoms: draft.symptoms,
      impacts: draft.impacts,
      movementImpact: draft.movementImpact,
      recoveryStatus: draft.recoveryStatus,
      recovery: draft.recovery.trim(),
      helpedBy: draft.helpedBy.trim(),
      drivingRelated:
        draft.drivingRelated ||
        draft.impacts.includes("Could not safely use pedals / drive"),
      pinned: draft.pinned,
      notes: draft.notes.trim(),
      createdAt: draft.createdAt,
      updatedAt: now,
    });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-section">
        <div className="field-grid field-grid--three">
          <div className="field">
            <label htmlFor="episode-onset">Started</label>
            <input
              id="episode-onset"
              onChange={(event) => setValue("onsetAt", event.target.value)}
              type="datetime-local"
              value={draft.onsetAt}
            />
          </div>
          <div className="field">
            <label htmlFor="episode-duration">Duration in minutes</label>
            <input
              id="episode-duration"
              min="0"
              onChange={(event) => setValue("duration", event.target.value)}
              placeholder="Leave blank if ongoing"
              type="number"
              value={draft.duration}
            />
          </div>
          <RangeField
            id="episode-severity"
            label="Maximum intensity"
            onChange={(value) => setValue("severity", value)}
            value={draft.severity}
          />
        </div>
      </div>

      <div className="form-section">
        <div className="field field--full">
          <label htmlFor="episode-task">Exact task or posture</label>
          <input
            id="episode-task"
            onChange={(event) => {
              setError("");
              setValue("taskOrPosture", event.target.value);
            }}
            placeholder="For example: holding the brake pedal while seated"
            value={draft.taskOrPosture}
          />
          <span className="field__hint">
            Describe what was happening, not what you think caused it.
          </span>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <SegmentGroup
            label="How did it begin?"
            name="episode-onset-pattern"
            onChange={(value) => setValue("onsetPattern", value as EpisodeOnset)}
            options={[
              { value: "sudden", label: "Sudden" },
              { value: "gradual", label: "Gradual" },
              { value: "not-sure", label: "Unsure" },
            ]}
            value={draft.onsetPattern}
          />
        </div>
      </div>

      <div className="form-section">
        <ChipGroup
          label="What did you notice?"
          onChange={(values) => setValue("symptoms", values)}
          options={SYMPTOMS}
          values={draft.symptoms}
        />
      </div>

      <div className="form-section">
        <div className="form-section__head">
          <div>
            <h3>Body areas</h3>
            <p>Select areas, then adjust the side if needed.</p>
          </div>
        </div>
        <div className="body-map-layout">
          <div className="body-map" aria-label="Body region selector">
            {BODY_AREAS.map((area) => {
              const selected = draft.bodyAreas.some(
                (item) => item.area === area,
              );
              return (
                <button
                  aria-pressed={selected}
                  className={selected ? "body-map__area body-map__area--selected" : "body-map__area"}
                  key={area}
                  onClick={() => (selected ? removeArea(area) : addArea(area))}
                  type="button"
                >
                  {area}
                </button>
              );
            })}
          </div>
          <div className="body-selections">
            {draft.bodyAreas.length ? (
              draft.bodyAreas.map((item) => (
                <div className="body-selection" key={item.area}>
                  <strong>{item.area}</strong>
                  <select
                    aria-label={`Side for ${item.area}`}
                    onChange={(event) =>
                      changeAreaSide(item.area, event.target.value as BodySide)
                    }
                    value={item.side}
                  >
                    {SIDE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    aria-label={`Remove ${item.area}`}
                    className="icon-button"
                    onClick={() => removeArea(item.area)}
                    type="button"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">No body areas selected yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <SegmentGroup
          label="What most limited the movement?"
          name="movement-impact"
          onChange={(value) =>
            setValue("movementImpact", value as MovementImpact)
          }
          options={[
            { value: "pain-limited", label: "Pain / tightness" },
            { value: "weakness", label: "Felt weak" },
            { value: "coordination", label: "Control / coordination" },
            { value: "mixed", label: "Combination" },
            { value: "not-sure", label: "Unsure" },
          ]}
          value={draft.movementImpact}
        />
        <p className="field__hint" style={{ marginTop: "0.5rem" }}>
          This is your description of the experience, not a diagnosis.
        </p>
      </div>

      <div className="form-section">
        <ChipGroup
          label="What was the practical impact?"
          onChange={(values) => setValue("impacts", values)}
          options={IMPACTS}
          values={draft.impacts}
        />

        {hasSafetyPrompt ? (
          <div className="notice notice--amber">
            <Icon name="alert" />
            <div>
              <strong>Pause and review the safety guide</strong>
              <p>
                If this symptom is new or suddenly worsening, logging it should
                not delay urgent assessment.
              </p>
              <button
                className="button button--small"
                onClick={onSafety}
                style={{ marginTop: "0.55rem" }}
                type="button"
              >
                Open safety guide
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="form-section">
        <div className="field-grid">
          <SegmentGroup
            label="Recovery so far"
            name="recovery-status"
            onChange={(value) =>
              setValue("recoveryStatus", value as RecoveryStatus)
            }
            options={[
              { value: "full", label: "Full" },
              { value: "partial", label: "Partial" },
              { value: "not-yet", label: "Not yet" },
              { value: "not-sure", label: "Unsure" },
            ]}
            value={draft.recoveryStatus}
          />
          <div className="field">
            <label htmlFor="episode-recovery">Time to recover or current state</label>
            <input
              id="episode-recovery"
              onChange={(event) => setValue("recovery", event.target.value)}
              placeholder="For example: mostly settled after 2 hours"
              value={draft.recovery}
            />
          </div>
          <div className="field">
            <label htmlFor="episode-helped">What helped, if anything?</label>
            <input
              id="episode-helped"
              onChange={(event) => setValue("helpedBy", event.target.value)}
              placeholder="Rest, position change, gentle massage…"
              value={draft.helpedBy}
            />
          </div>
          <div className="field">
            <label htmlFor="episode-notes">Optional note</label>
            <textarea
              id="episode-notes"
              maxLength={800}
              onChange={(event) => setValue("notes", event.target.value)}
              placeholder="Associated symptoms or observations from another person"
              value={draft.notes}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <label className="consent-check">
          <input
            checked={draft.pinned}
            onChange={(event) => setValue("pinned", event.target.checked)}
            type="checkbox"
          />
          <span>
            Pin this episode for the appointment brief. Up to five pinned or
            recent episodes are included.
          </span>
        </label>
        <div className="notice">
          <Icon name="shield" />
          <div>
            <strong>Record only what happened naturally</strong>
            <p>
              Never drive or deliberately provoke symptoms to complete this
              form.
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
          Save episode
          <Icon name="arrow" />
        </button>
      </footer>
    </form>
  );
}

export function EpisodesPanel({
  episodes,
  onSave,
  onDelete,
  onSafety,
  startNewSignal = 0,
}: {
  episodes: Episode[];
  onSave: (episode: Episode) => void;
  onDelete: (id: string) => void;
  onSafety: () => void;
  startNewSignal?: number;
}) {
  const [editing, setEditing] = useState<EpisodeDraft | null>(null);
  const [deleting, setDeleting] = useState<Episode | null>(null);
  const sorted = useMemo(
    () => [...episodes].sort((a, b) => b.onsetAt.localeCompare(a.onsetAt)),
    [episodes],
  );

  useEffect(() => {
    if (startNewSignal > 0) setEditing(emptyDraft());
  }, [startNewSignal]);

  const save = (episode: Episode) => {
    onSave(episode);
    setEditing(null);
  };

  const togglePinned = (episode: Episode) => {
    onSave({
      ...episode,
      pinned: !episode.pinned,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <section className="page" aria-labelledby="episodes-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Event record</p>
          <h1 id="episodes-title">Episodes</h1>
          <p>
            Capture the task, body areas, functional impact, and recovery—never
            a guessed cause.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="button button--primary"
            onClick={() => setEditing(emptyDraft())}
            type="button"
          >
            <Icon name="plus" />
            New episode
          </button>
        </div>
      </header>

      <div className="episode-layout">
        <section className="card">
          <header className="card__header">
            <div>
              <h2>Recorded episodes</h2>
              <p>{episodes.length} total · pin up to five for the visit brief</p>
            </div>
          </header>
          <div className="card__body">
            {sorted.length ? (
              <div className="record-list">
                {sorted.map((episode) => {
                  const badge = dateBadge(episode.onsetAt);
                  return (
                    <article className="record-card" key={episode.id}>
                      <div className="record-card__date">
                        <strong>{badge.day}</strong>
                        <span>{badge.month}</span>
                      </div>
                      <div className="record-card__content">
                        <h3>{episode.taskOrPosture}</h3>
                        <p>
                          {formatDateTime(episode.onsetAt)}
                          {episode.durationMinutes !== null
                            ? ` · ${episode.durationMinutes} min`
                            : " · duration not recorded"}
                        </p>
                        <div className="record-meta">
                          <span>Intensity {episode.severity ?? "—"}/10</span>
                          {episode.symptoms.slice(0, 3).map((symptom) => (
                            <span key={symptom}>{symptom}</span>
                          ))}
                          {episode.drivingRelated ? (
                            <span>Pedal / driving impact</span>
                          ) : null}
                          {episode.pinned ? <span>Pinned for brief</span> : null}
                        </div>
                        {episode.notes ? <p>{truncate(episode.notes)}</p> : null}
                      </div>
                      <div className="record-actions">
                        <button
                          aria-label={
                            episode.pinned
                              ? "Unpin from appointment brief"
                              : "Pin for appointment brief"
                          }
                          className="icon-button"
                          onClick={() => togglePinned(episode)}
                          title={
                            episode.pinned
                              ? "Unpin from brief"
                              : "Pin for brief"
                          }
                          type="button"
                        >
                          <Icon name={episode.pinned ? "check" : "document"} size={17} />
                        </button>
                        <button
                          aria-label="Edit episode"
                          className="icon-button"
                          onClick={() => setEditing(draftFromEpisode(episode))}
                          type="button"
                        >
                          <Icon name="edit" size={17} />
                        </button>
                        <button
                          aria-label="Delete episode"
                          className="icon-button"
                          onClick={() => setDeleting(episode)}
                          type="button"
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state__icon">
                  <Icon name="pulse" />
                </span>
                <h2>No episodes recorded</h2>
                <p>
                  If an episode occurs naturally, record it once you are safe
                  and settled. Do not test or reproduce it.
                </p>
                <button
                  className="button button--soft"
                  onClick={() => setEditing(emptyDraft())}
                  type="button"
                >
                  <Icon name="plus" />
                  Record an episode
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="card tip-card">
          <span className="tip-card__icon">
            <Icon name="document" />
          </span>
          <h3>What makes a useful record?</h3>
          <p>Specific observations are more useful than theories.</p>
          <ul>
            <li>Exact task and posture</li>
            <li>Where and on which side</li>
            <li>What stopped the movement</li>
            <li>How long recovery took</li>
            <li>What another person observed</li>
          </ul>
          <div className="source-links">
            <p>Important</p>
            <button className="button button--small button--full" onClick={onSafety} type="button">
              <Icon name="shield" />
              Open safety guide
            </button>
          </div>
        </aside>
      </div>

      {editing ? (
        <Modal
          eyebrow={episodes.some((item) => item.id === editing.id) ? "Edit record" : "New record"}
          onClose={() => setEditing(null)}
          title="Episode details"
          wide
        >
          <EpisodeForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSafety={onSafety}
            onSave={save}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <Modal onClose={() => setDeleting(null)} title="Delete this episode?">
          <p>
            The record from {formatDateTime(deleting.onsetAt)} will be removed
            from this browser and from future visit briefs.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setDeleting(null)} type="button">
              Keep record
            </button>
            <button
              className="button button--danger"
              onClick={() => {
                onDelete(deleting.id);
                setDeleting(null);
              }}
              type="button"
            >
              Delete episode
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
