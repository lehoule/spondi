import type { ISODate, ISODateTime } from "../types";

export function createId(prefix: string): string {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${value}`;
}

export function localDate(date = new Date()): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateTimeInput(date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${localDate(date)}T${hours}:${minutes}`;
}

export function inputToISODateTime(value: string): ISODateTime {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toISOString()
    : new Date().toISOString();
}

export function isoToDateTimeInput(value: ISODateTime): string {
  const date = new Date(value);
  return localDateTimeInput(date);
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Not recorded";
  const parts = value.split("-").map(Number);
  const date =
    parts.length === 3
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function dateBadge(value: string): { day: string; month: string } {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { day: "—", month: "" };
  return {
    day: new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date),
  };
}

export function downloadText(
  contents: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function truncate(value: string, maximum = 120): string {
  const compact = value.trim().replace(/\s+/g, " ");
  return compact.length <= maximum
    ? compact
    : `${compact.slice(0, maximum - 1).trimEnd()}…`;
}

export function mean(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (!present.length) return null;
  return Math.round(
    (present.reduce((sum, value) => sum + value, 0) / present.length) * 10,
  ) / 10;
}
