import { describe, expect, it } from "vitest";
import type { DailyLog } from "../types";
import {
  STORAGE_KEY,
  createEmptyState,
  exportBackupJson,
  importBackupJson,
  loadState,
  saveState,
  type StorageLike,
  upsertDailyLog,
  validateState,
} from "./storage";

const NOW = "2026-07-23T12:00:00.000Z";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function dailyLog(date: string, pain: number): DailyLog {
  return {
    date,
    pain,
    tingling: null,
    cramping: null,
    fatigue: null,
    activityLimitation: null,
    sleepHours: null,
    sleepQuality: null,
    stress: null,
    activities: [],
    treatments: [],
    notes: "",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("versioned local storage", () => {
  it("round-trips a valid state", () => {
    const storage = new MemoryStorage();
    const state = upsertDailyLog(
      createEmptyState(NOW),
      dailyLog("2026-07-23", 4),
    );

    expect(saveState(state, storage)).toEqual({ ok: true, value: undefined });
    expect(storage.getItem(STORAGE_KEY)).toContain('"schemaVersion":1');
    expect(loadState(storage)).toEqual({ ok: true, value: state });
  });

  it("returns an empty state when no saved value exists", () => {
    const loaded = loadState(new MemoryStorage());
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.schemaVersion).toBe(1);
      expect(loaded.value.dailyLogs).toEqual([]);
    }
  });

  it("reports storage failures without throwing", () => {
    const broken: StorageLike = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("full");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };

    expect(loadState(broken)).toMatchObject({ ok: false });
    expect(saveState(createEmptyState(NOW), broken)).toMatchObject({ ok: false });
  });
});

describe("daily logs and backup validation", () => {
  it("keeps exactly one daily log per date", () => {
    const initial = createEmptyState(NOW);
    const once = upsertDailyLog(initial, dailyLog("2026-07-23", 2));
    const twice = upsertDailyLog(once, dailyLog("2026-07-23", 8));

    expect(twice.dailyLogs).toHaveLength(1);
    expect(twice.dailyLogs[0].pain).toBe(8);
  });

  it("exports and imports a validated JSON backup", () => {
    const state = createEmptyState(NOW);
    const backup = exportBackupJson(state);

    expect(backup.endsWith("\n")).toBe(true);
    expect(importBackupJson(backup)).toEqual({ ok: true, value: state });
  });

  it("rejects malformed, unsupported, or internally inconsistent backups", () => {
    expect(importBackupJson("{")).toMatchObject({ ok: false });

    const futureVersion = { ...createEmptyState(NOW), schemaVersion: 99 };
    expect(validateState(futureVersion)).toMatchObject({
      ok: false,
      error: expect.stringContaining("Unsupported backup version"),
    });

    const duplicateDate = dailyLog("2026-07-23", 3);
    const duplicates = {
      ...createEmptyState(NOW),
      dailyLogs: [duplicateDate, { ...duplicateDate, pain: 7 }],
    };
    expect(validateState(duplicates)).toMatchObject({
      ok: false,
      error: expect.stringContaining("more than one daily log"),
    });

    const unknownMedication = {
      ...createEmptyState(NOW),
      doseEvents: [
        {
          id: "dose-1",
          medicationId: "missing",
          date: "2026-07-23",
          time: null,
          dose: "",
          status: "as-prescribed",
          notes: "",
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    };
    expect(validateState(unknownMedication)).toMatchObject({
      ok: false,
      error: expect.stringContaining("unknown medication"),
    });
  });
});
