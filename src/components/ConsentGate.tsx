"use client";

import { useState } from "react";
import { Icon } from "./Icons";

export function ConsentGate({ onAccept }: { onAccept: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <main className="consent-page">
      <section className="consent-card">
        <div className="brand-mark brand-mark--large" aria-hidden="true">
          <span />
          <span />
        </div>
        <p className="eyebrow">Private symptom journal</p>
        <h1>A clearer story for better appointments.</h1>
        <p className="consent-intro">
          Spondi helps organize what happened, when it happened, and what
          changed—without trying to diagnose the cause.
        </p>

        <div className="consent-points">
          <div>
            <span className="point-icon">
              <Icon name="lock" />
            </span>
            <div>
              <h2>Stored on this device</h2>
              <p>
                There is no account or health-data upload. Browser storage is
                local, but it is not independently encrypted.
              </p>
            </div>
          </div>
          <div>
            <span className="point-icon">
              <Icon name="document" />
            </span>
            <div>
              <h2>Built for the appointment</h2>
              <p>
                Create a concise visit brief, then print it or export the
                structured records you choose to share.
              </p>
            </div>
          </div>
          <div>
            <span className="point-icon point-icon--amber">
              <Icon name="shield" />
            </span>
            <div>
              <h2>Not an emergency service</h2>
              <p>
                This app cannot monitor symptoms, contact a clinician, or tell
                anyone when urgent care is needed.
              </p>
            </div>
          </div>
        </div>

        <label className="consent-check">
          <input
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span>
            I am recording my own information, or I have the person&apos;s
            explicit permission to record it.
          </span>
        </label>

        <button
          className="button button--primary button--full"
          disabled={!confirmed}
          onClick={onAccept}
          type="button"
        >
          Begin private journal
          <Icon name="arrow" />
        </button>

        <p className="consent-footnote">
          Use a private device with a passcode. Clearing browser data can erase
          this journal unless you export a backup.
        </p>
      </section>
    </main>
  );
}
