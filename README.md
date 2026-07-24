# Spondi Care Journal

A private, local-first symptom journal for clearer medical appointments. It is
designed for progressive sensory symptoms and functional changes in the context
of ankylosing spondylitis, while deliberately avoiding diagnostic or causal
claims.

## What it includes

- A consent gate and persistent emergency-safety guide
- A roughly 60-second daily symptom and function check-in
- Structured episode logging with task, body area, side, practical impact, and recovery
- Exact medication reconciliation and factual dose-event timing
- A major medical and functional timeline
- A printable visit brief with up to five pinned or recent episodes
- Formula-safe CSV exports and a validated JSON backup/restore flow
- Explicit local-data deletion controls
- A service worker for repeat offline use after the app has loaded

## Privacy model

Journal data is kept in one namespaced browser `localStorage` record:
`spondi.health-tracker`. The application has no account, backend, analytics,
advertising, or automatic health-data upload.

Local browser storage is **not independently encrypted by the app**. Users
should use a private device profile, device passcode, and full-disk encryption,
and should export backups only to protected locations. Clearing browser data
can erase the journal.

External clinical source links are opened only when the user chooses them.

## Medical boundary

This software does not diagnose, monitor emergencies, recommend medication
changes, determine fitness to drive, or establish that medication timing caused
a symptom. Safety copy directs users away from logging when urgent assessment
may be needed and warns against driving or deliberately provoking symptoms.

## Local development

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Verification:

```bash
npm run typecheck
npm test
npm run build
```

The test suite covers versioned storage and backup validation, calendar-correct
dose timing, skipped-dose handling, deterministic appointment summaries, and
RFC 4180/formula-safe CSV output.
