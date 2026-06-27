import type {
  AvailabilityOverride,
  AvailabilityRule,
  DoctorAppointmentRow,
} from "@/lib/types";

/**
 * Availability math for the doctor schedule editor.
 *
 * Times are minutes-from-midnight in the doctor's local day. We follow the
 * rest of the mobile app and read appointment timestamps with device-local
 * Date methods (the doctor's device is assumed to be in clinic time).
 */

// The visible rail spans the clinic day. Anything outside is clamped.
export const RAIL_START_MIN = 6 * 60; // 6:00 AM
export const RAIL_END_MIN = 22 * 60; // 10:00 PM
export const RAIL_SPAN_MIN = RAIL_END_MIN - RAIL_START_MIN; // 960
export const RAIL_TICKS = ["6a", "10a", "2p", "6p", "10p"];

// Snap fine-tuning to 5-minute steps.
export const SNAP_MIN = 5;

export interface Window {
  startMin: number;
  endMin: number;
}

export const PRESETS: Array<{
  key: string;
  label: string;
  sublabel: string;
  startMin: number;
  endMin: number;
}> = [
  { key: "morning", label: "Morning", sublabel: "9–12", startMin: 540, endMin: 720 },
  { key: "afternoon", label: "Afternoon", sublabel: "12–4", startMin: 720, endMin: 960 },
  { key: "evening", label: "Evening", sublabel: "5–8", startMin: 1020, endMin: 1200 },
];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function toHHMM(min: number): string {
  const m = clamp(Math.round(min), 0, 24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function to12h(min: number): string {
  const m = clamp(Math.round(min), 0, 24 * 60);
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return mm === 0 ? `${h} ${period}` : `${h}:${String(mm).padStart(2, "0")} ${period}`;
}

export function windowLabel(w: Window): string {
  return `${to12h(w.startMin)} – ${to12h(w.endMin)}`;
}

/** 0..1 horizontal position of a minute value on the rail. */
export function railFraction(min: number): number {
  return clamp((min - RAIL_START_MIN) / RAIL_SPAN_MIN, 0, 1);
}

export function snap(min: number): number {
  return Math.round(min / SNAP_MIN) * SNAP_MIN;
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/** Sort + merge overlapping or touching windows. */
export function mergeWindows(windows: Window[]): Window[] {
  const sorted = [...windows]
    .filter((w) => w.endMin > w.startMin)
    .sort((a, b) => a.startMin - b.startMin);
  const out: Window[] = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && w.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, w.endMin);
    } else {
      out.push({ ...w });
    }
  }
  return out;
}

/** Remove a range from a set of windows (for partial blocks). */
export function subtractWindow(windows: Window[], range: Window): Window[] {
  const out: Window[] = [];
  for (const w of windows) {
    if (range.endMin <= w.startMin || range.startMin >= w.endMin) {
      out.push(w);
      continue;
    }
    if (range.startMin > w.startMin) out.push({ startMin: w.startMin, endMin: range.startMin });
    if (range.endMin < w.endMin) out.push({ startMin: range.endMin, endMin: w.endMin });
  }
  return out;
}

export function isCovered(windows: Window[], min: number): boolean {
  return windows.some((w) => min >= w.startMin && min < w.endMin);
}

export function slotCount(windows: Window[], slotMinutes: number): number {
  if (slotMinutes <= 0) return 0;
  return mergeWindows(windows).reduce(
    (sum, w) => sum + Math.floor((w.endMin - w.startMin) / slotMinutes),
    0
  );
}

export function rulesToWindows(rules: AvailabilityRule[], weekday: number): Window[] {
  return mergeWindows(
    rules
      .filter((r) => r.weekday === weekday)
      .map((r) => ({ startMin: toMinutes(r.startTime), endMin: toMinutes(r.endTime) }))
  );
}

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Resolve the effective windows for one calendar date (rules ± overrides). */
export function windowsForDate(
  rules: AvailabilityRule[],
  overrides: AvailabilityOverride[],
  date: Date
): Window[] {
  const key = localDateKey(date);
  const onDate = overrides.filter((o) => o.date === key);
  const fullBlock = onDate.some((o) => o.kind === "blocked" && !o.startTime);
  if (fullBlock) return [];

  let windows = rulesToWindows(rules, date.getDay());
  for (const o of onDate) {
    if (o.kind === "blocked" && o.startTime && o.endTime) {
      windows = subtractWindow(windows, {
        startMin: toMinutes(o.startTime),
        endMin: toMinutes(o.endTime),
      });
    }
  }
  for (const o of onDate) {
    if (o.kind === "extra" && o.startTime && o.endTime) {
      windows.push({ startMin: toMinutes(o.startTime), endMin: toMinutes(o.endTime) });
    }
  }
  return mergeWindows(windows);
}

// --- Appointment helpers (device-local, matching the rest of the app) ---

export function apptStart(row: DoctorAppointmentRow): Date {
  return new Date(row.appointment.startsAt);
}
export function apptMinutes(row: DoctorAppointmentRow): number {
  const d = apptStart(row);
  return d.getHours() * 60 + d.getMinutes();
}
function isUpcomingBooked(row: DoctorAppointmentRow, from: Date): boolean {
  return (
    ["confirmed", "pending_payment"].includes(row.appointment.status) &&
    new Date(row.appointment.endsAt).getTime() > from.getTime()
  );
}

/** Booked visits that already sit inside the next 7 days, for the live count. */
export function bookableSlotsNext7Days(
  rules: AvailabilityRule[],
  overrides: AvailabilityOverride[],
  appointments: DoctorAppointmentRow[],
  slotMinutes: number,
  from = new Date()
): number {
  let capacity = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(from);
    date.setDate(from.getDate() + i);
    capacity += slotCount(windowsForDate(rules, overrides, date), slotMinutes);
  }
  const horizon = new Date(from);
  horizon.setDate(from.getDate() + 7);
  const booked = appointments.filter(
    (row) =>
      isUpcomingBooked(row, from) &&
      apptStart(row).getTime() < horizon.getTime()
  ).length;
  return Math.max(0, capacity - booked);
}

/**
 * Upcoming booked visits that would be stranded if a recurring window is
 * removed/shrunk on `weekday`. `removed` is the time range being taken away.
 */
export function ruleRemovalConflicts(
  appointments: DoctorAppointmentRow[],
  weekday: number,
  removed: Window,
  from = new Date()
): DoctorAppointmentRow[] {
  return appointments.filter((row) => {
    if (!isUpcomingBooked(row, from)) return false;
    if (apptStart(row).getDay() !== weekday) return false;
    const m = apptMinutes(row);
    return m >= removed.startMin && m < removed.endMin;
  });
}

/**
 * When the editor replaces the windows for `days` with `newWindows`, which
 * upcoming booked visits lose the slot they were holding?
 */
export function conflictsForReplace(
  rules: AvailabilityRule[],
  appointments: DoctorAppointmentRow[],
  days: number[],
  newWindows: Window[],
  from = new Date()
): DoctorAppointmentRow[] {
  const seen = new Set<string>();
  const out: DoctorAppointmentRow[] = [];
  for (const weekday of days) {
    const prev = rulesToWindows(rules, weekday);
    for (const row of appointments) {
      if (!isUpcomingBooked(row, from)) continue;
      if (apptStart(row).getDay() !== weekday) continue;
      const m = apptMinutes(row);
      if (isCovered(prev, m) && !isCovered(newWindows, m) && !seen.has(row.appointment.id)) {
        seen.add(row.appointment.id);
        out.push(row);
      }
    }
  }
  return out;
}

/** Upcoming booked visits on a date (optionally only within a time range). */
export function dateBlockConflicts(
  appointments: DoctorAppointmentRow[],
  dateKey: string,
  range?: Window,
  from = new Date()
): DoctorAppointmentRow[] {
  return appointments.filter((row) => {
    if (!isUpcomingBooked(row, from)) return false;
    if (localDateKey(apptStart(row)) !== dateKey) return false;
    if (!range) return true;
    const m = apptMinutes(row);
    return m >= range.startMin && m < range.endMin;
  });
}
