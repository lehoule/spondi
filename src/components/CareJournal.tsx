"use client";

import { useEffect, useState } from "react";
import type {
  AppState,
  CareStepStatus,
  DailyLog,
  DoseEvent,
  Episode,
  MedicalProfile,
  Medication,
  TimelineEvent,
} from "../types";
import {
  STORAGE_KEY,
  clearStoredState,
  createEmptyState,
  loadState,
  recordDose,
  removeDoseEvent,
  removeEpisode,
  removeMedication,
  removeTimelineEvent,
  saveState,
  upsertDailyLog,
  upsertEpisode,
  upsertMedication,
  upsertTimelineEvent,
} from "../lib/storage";
import { downloadText, formatDate, localDate } from "../lib/browser";
import { ConsentGate } from "./ConsentGate";
import { EpisodesPanel } from "./EpisodesPanel";
import { Icon, type IconName } from "./Icons";
import { MedicationPanel } from "./MedicationPanel";
import { Modal } from "./Modal";
import { RegisterServiceWorker } from "./RegisterServiceWorker";
import { SafetyPanel } from "./SafetyPanel";
import { SettingsPanel } from "./SettingsPanel";
import { SummaryPanel } from "./SummaryPanel";
import { TodayPanel } from "./TodayPanel";

type View = "today" | "episodes" | "medication" | "summary" | "settings";

const NAV_ITEMS: Array<{
  id: View;
  label: string;
  icon: IconName;
}> = [
  { id: "today", label: "Today", icon: "home" },
  { id: "episodes", label: "Episodes", icon: "pulse" },
  { id: "medication", label: "Medication", icon: "medication" },
  { id: "summary", label: "Visit brief", icon: "document" },
  { id: "settings", label: "Profile & data", icon: "settings" },
];

export function CareJournal() {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<View>("today");
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState("");
  const [episodeSignal, setEpisodeSignal] = useState(0);

  useEffect(() => {
    const loaded = loadState();
    if (loaded.ok) setState(loaded.value);
    else setStorageError(loaded.error);
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const commit = (next: AppState, message?: string) => {
    const timestamped = {
      ...next,
      updatedAt: new Date().toISOString(),
    };
    const saved = saveState(timestamped);
    if (!saved.ok) {
      setStorageError(saved.error);
      return false;
    }
    setState(timestamped);
    if (message) notify(message);
    return true;
  };

  const acceptConsent = () => {
    if (!state) return;
    const now = new Date().toISOString();
    commit(
      {
        ...state,
        consent: {
          ...state.consent,
          dataOwnerConsented: true,
          consentedAt: now,
        },
      },
      "Private journal started",
    );
  };

  if (storageError && !state) {
    return (
      <main className="consent-page">
        <section className="consent-card">
          <span className="point-icon point-icon--amber">
            <Icon name="alert" />
          </span>
          <p className="eyebrow" style={{ marginTop: "1rem" }}>
            Local data needs attention
          </p>
          <h1>The saved journal could not be opened.</h1>
          <p className="consent-intro">
            {storageError} The app has not overwritten the unreadable data.
          </p>
          <div className="notice notice--amber">
            <Icon name="shield" />
            <div>
              <strong>Preserve before resetting</strong>
              <p>
                Download the raw file first if a developer or clinician may
                help recover it.
              </p>
            </div>
          </div>
          <div className="page-actions" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
            <button
              className="button"
              onClick={() => {
                const raw = window.localStorage.getItem(STORAGE_KEY);
                if (raw) {
                  downloadText(
                    raw,
                    `spondi-unreadable-${localDate()}.json`,
                    "application/json",
                  );
                }
              }}
              type="button"
            >
              <Icon name="download" />
              Download unreadable data
            </button>
            <button
              className="button button--danger"
              onClick={() => {
                if (
                  window.confirm(
                    "Start a new journal and permanently replace the unreadable local data?",
                  )
                ) {
                  const cleared = clearStoredState();
                  if (cleared.ok) {
                    setStorageError("");
                    setState(createEmptyState());
                  }
                }
              }}
              type="button"
            >
              Start a new journal
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="consent-page" aria-busy="true">
        <section className="consent-card" style={{ textAlign: "center" }}>
          <div className="brand-mark brand-mark--large" style={{ marginInline: "auto" }}>
            <span />
            <span />
          </div>
          <p className="muted">Opening the private journal…</p>
        </section>
      </main>
    );
  }

  if (!state.consent.dataOwnerConsented) {
    return <ConsentGate onAccept={acceptConsent} />;
  }

  const updateCareStep = (
    step: keyof AppState["careSteps"],
    status: CareStepStatus,
  ) => {
    commit(
      {
        ...state,
        careSteps: { ...state.careSteps, [step]: status },
      },
      "Next step updated",
    );
  };

  const saveMedicationRecord = (medication: Medication) => {
    let next = upsertMedication(state, medication);
    if (
      medication.labelVerified &&
      medication.name.trim() &&
      !/^unknown\b/i.test(medication.name)
    ) {
      next = {
        ...next,
        careSteps: { ...next.careSteps, identifyMedication: "done" },
      };
    }
    commit(next, "Medication saved on this device");
  };

  const renderView = () => {
    switch (view) {
      case "episodes":
        return (
          <EpisodesPanel
            episodes={state.episodes}
            onDelete={(id) =>
              commit(removeEpisode(state, id), "Episode deleted")
            }
            onSafety={() => setSafetyOpen(true)}
            onSave={(episode: Episode) =>
              commit(
                upsertEpisode(state, episode),
                "Episode saved on this device",
              )
            }
            startNewSignal={episodeSignal}
          />
        );
      case "medication":
        return (
          <MedicationPanel
            doseEvents={state.doseEvents}
            medications={state.medications}
            onDeleteDose={(id) =>
              commit(removeDoseEvent(state, id), "Medication event deleted")
            }
            onDeleteMedication={(id) =>
              commit(removeMedication(state, id), "Medication deleted")
            }
            onRecordDose={(dose: DoseEvent) =>
              commit(
                recordDose(state, dose),
                "Medication event saved on this device",
              )
            }
            onSaveMedication={saveMedicationRecord}
          />
        );
      case "summary":
        return <SummaryPanel state={state} />;
      case "settings":
        return (
          <SettingsPanel
            onClear={() => {
              const cleared = clearStoredState();
              if (!cleared.ok) {
                setStorageError(cleared.error);
                return;
              }
              setState(createEmptyState());
              setView("today");
            }}
            onDeleteTimeline={(id) =>
              commit(removeTimelineEvent(state, id), "Timeline event deleted")
            }
            onImport={(imported) => {
              if (commit(imported, "Backup restored")) setView("today");
            }}
            onSaveProfile={(profile: MedicalProfile) =>
              commit({ ...state, profile }, "Profile saved on this device")
            }
            onSaveTimeline={(event: TimelineEvent) =>
              commit(
                upsertTimelineEvent(state, event),
                "Timeline event saved",
              )
            }
            state={state}
          />
        );
      default:
        return (
          <TodayPanel
            onCareStep={updateCareStep}
            onNavigate={(destination) => setView(destination)}
            onNewEpisode={() => {
              setEpisodeSignal((value) => value + 1);
              setView("episodes");
            }}
            onSave={(log: DailyLog) =>
              commit(
                upsertDailyLog(state, log),
                "Check-in saved on this device",
              )
            }
            state={state}
          />
        );
    }
  };

  return (
    <>
      <RegisterServiceWorker />
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-mark" aria-hidden="true">
              <span />
              <span />
            </div>
            <div>
              <strong>Spondi</strong>
              <span>Private care journal</span>
            </div>
          </div>
          <nav aria-label="Primary navigation" className="nav-list">
            {NAV_ITEMS.map((item) => (
              <button
                aria-current={view === item.id ? "page" : undefined}
                className={`nav-button${view === item.id ? " nav-button--active" : ""}`}
                key={item.id}
                onClick={() => setView(item.id)}
                type="button"
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-privacy">
              <Icon name="lock" size={18} />
              <div>
                <strong>Local to this browser</strong>
                No account or data upload
              </div>
            </div>
          </div>
        </aside>

        <main className="app-main">
          <header className="topbar">
            <div className="topbar__date">
              {formatDate(localDate(), {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="topbar__actions">
              <button
                className="topbar__safety"
                onClick={() => setSafetyOpen(true)}
                type="button"
              >
                <Icon name="shield" size={18} />
                <span>Safety guide</span>
              </button>
              <button
                aria-label="Open profile and data controls"
                className="icon-button"
                onClick={() => setView("settings")}
                type="button"
              >
                <Icon name="settings" size={18} />
              </button>
            </div>
          </header>
          {renderView()}
        </main>

        <nav aria-label="Mobile navigation" className="mobile-nav">
          {NAV_ITEMS.map((item) => (
            <button
              aria-current={view === item.id ? "page" : undefined}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              <Icon name={item.icon} size={20} />
              {item.label === "Profile & data" ? "Data" : item.label}
            </button>
          ))}
        </nav>
      </div>

      {safetyOpen ? <SafetyPanel onClose={() => setSafetyOpen(false)} /> : null}
      {storageError && state ? (
        <Modal onClose={() => setStorageError("")} title="This change was not saved">
          <div className="notice notice--amber">
            <Icon name="alert" />
            <div>
              <strong>Browser storage is unavailable</strong>
              <p>{storageError}</p>
            </div>
          </div>
          <p style={{ marginTop: "1rem" }}>
            Keep this page open while checking browser privacy settings or
            available storage, then try the action again. The app will never
            claim a record was saved when it was not.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setStorageError("")} type="button">
              Close
            </button>
          </div>
        </Modal>
      ) : null}
      {toast ? (
        <div aria-live="polite" className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      ) : null}
    </>
  );
}
