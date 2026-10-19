// src/lib/formatDate.ts
// Locale-aware date/time formatting helpers (Indonesian locale by default).

const IDN = "id-ID";
export const APP_TIME_ZONE = "Asia/Jakarta";

const DATE_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  const parts = DATE_PARTS_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(IDN, {
    weekday: "short", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
}

export function formatDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }
): string {
  return new Date(iso).toLocaleDateString(IDN, {
    ...options,
    timeZone: APP_TIME_ZONE,
  });
}

export function getDateKey(date: Date): string | null {
  return dateKey(date);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(IDN, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
}

/** Returns true when the meeting date is in the future. */
export function isUpcoming(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() > now.getTime();
}

/** Returns true when a meeting is currently live (within 90 min of start). */
export function isLive(iso: string, now: Date = new Date()): boolean {
  const start = new Date(iso).getTime();
  const nowMs = now.getTime();
  return nowMs >= start && nowMs <= start + 90 * 60 * 1000;
}

/** How many minutes until meeting starts (negative if already started). */
export function minutesUntil(iso: string, now: Date = new Date()): number {
  return Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
}

/** Returns true when the meeting date is today. */
export function isToday(iso: string, now: Date = new Date()): boolean {
  const meetingDay = dateKey(new Date(iso));
  return meetingDay !== null && meetingDay === dateKey(now);
}

/** Returns true when the meeting date is tomorrow. */
export function isTomorrow(iso: string, now: Date = new Date()): boolean {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const meetingDay = dateKey(new Date(iso));
  return meetingDay !== null && meetingDay === dateKey(tomorrow);
}
