import type { DoseEvent, ISODate, ISODateTime } from "../types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 86_400_000;

function utcDayNumber(value: ISODate): number {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`Expected an ISO calendar date (YYYY-MM-DD), received "${value}".`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date "${value}".`);
  }

  return Math.trunc(timestamp / MILLISECONDS_PER_DAY);
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string") return false;

  try {
    utcDayNumber(value);
    return true;
  } catch {
    return false;
  }
}

export function isISODateTime(value: unknown): value is ISODateTime {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

export function datePart(value: ISODateTime): ISODate {
  const part = value.slice(0, 10);
  if (!isISODate(part)) {
    throw new RangeError(`Could not read a calendar date from "${value}".`);
  }
  return part;
}

export function compareISODates(left: ISODate, right: ISODate): number {
  return utcDayNumber(left) - utcDayNumber(right);
}

/**
 * Returns whole calendar boundaries, not elapsed 24-hour periods. Date-only
 * values are converted through UTC so daylight-saving changes cannot skew the
 * result.
 */
export function calendarDayDifference(later: ISODate, earlier: ISODate): number {
  return utcDayNumber(later) - utcDayNumber(earlier);
}

export function latestDoseOnOrBefore(
  doseEvents: readonly DoseEvent[],
  asOfDate: ISODate,
  medicationId?: string,
): DoseEvent | null {
  utcDayNumber(asOfDate);

  const eligible = doseEvents.filter(
    (event) =>
      event.status !== "skipped" &&
      (!medicationId || event.medicationId === medicationId) &&
      compareISODates(event.date, asOfDate) <= 0,
  );

  eligible.sort((left, right) => {
    const dateOrder = compareISODates(right.date, left.date);
    if (dateOrder !== 0) return dateOrder;

    const timeOrder = (right.time ?? "").localeCompare(left.time ?? "");
    if (timeOrder !== 0) return timeOrder;

    return right.id.localeCompare(left.id);
  });

  return eligible[0] ?? null;
}

export function daysSinceLastDose(
  doseEvents: readonly DoseEvent[],
  asOfDate: ISODate,
  medicationId?: string,
): number | null {
  const latest = latestDoseOnOrBefore(doseEvents, asOfDate, medicationId);
  return latest ? calendarDayDifference(asOfDate, latest.date) : null;
}
