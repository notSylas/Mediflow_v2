import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export interface AvailabilityRule {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** "HH:MM" or "HH:MM:SS", local to the doctor's timezone */
  startTime: string;
  /** "HH:MM" or "HH:MM:SS", local to the doctor's timezone */
  endTime: string;
}

export interface AvailabilityOverride {
  /** "YYYY-MM-DD" */
  date: string;
  kind: "blocked" | "extra";
  /** Required for "extra"; omitted/null for a full-day "blocked" override */
  startTime?: string | null;
  /** Required for "extra"; omitted/null for a full-day "blocked" override */
  endTime?: string | null;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface ComputeAvailableSlotsParams {
  rules: AvailabilityRule[];
  overrides: AvailabilityOverride[];
  /** Non-cancelled appointments + non-expired holds, as UTC instants */
  busy: BusyInterval[];
  slotMinutes: number;
  /** IANA timezone the rules/overrides are expressed in, e.g. "Asia/Kolkata" */
  timezone: string;
  /** Inclusive lower bound, UTC instant */
  from: Date;
  /** Exclusive upper bound, UTC instant */
  to: Date;
}

interface MinuteInterval {
  start: number;
  end: number;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}:00`;
}

function subtractInterval(
  intervals: MinuteInterval[],
  block: MinuteInterval,
): MinuteInterval[] {
  const result: MinuteInterval[] = [];

  for (const interval of intervals) {
    if (block.end <= interval.start || block.start >= interval.end) {
      result.push(interval);
      continue;
    }

    if (block.start > interval.start) {
      result.push({ start: interval.start, end: block.start });
    }

    if (block.end < interval.end) {
      result.push({ start: block.end, end: interval.end });
    }
  }

  return result.filter((interval) => interval.end > interval.start);
}

function weekdayOfDateString(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function intervalsOverlap(a: BusyInterval, b: BusyInterval): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Computes available appointment slots (as UTC instants) for the window
 * [from, to), by combining weekly availability rules with date-specific
 * overrides and removing anything that collides with a busy interval.
 */
export function computeAvailableSlots(
  params: ComputeAvailableSlotsParams,
): Date[] {
  const { rules, overrides, busy, slotMinutes, timezone, from, to } = params;

  const slots: Date[] = [];

  let dateStr = formatInTimeZone(from, timezone, "yyyy-MM-dd");
  let dayStart = fromZonedTime(`${dateStr}T00:00:00`, timezone);

  while (dayStart < to) {
    const weekday = weekdayOfDateString(dateStr);

    let intervals: MinuteInterval[] = rules
      .filter((rule) => rule.weekday === weekday)
      .map((rule) => ({
        start: parseTimeToMinutes(rule.startTime),
        end: parseTimeToMinutes(rule.endTime),
      }));

    const extraIntervals: MinuteInterval[] = [];

    for (const override of overrides) {
      if (override.date !== dateStr) continue;

      if (override.kind === "blocked") {
        if (!override.startTime || !override.endTime) {
          intervals = [];
        } else {
          intervals = subtractInterval(intervals, {
            start: parseTimeToMinutes(override.startTime),
            end: parseTimeToMinutes(override.endTime),
          });
        }
      } else if (override.kind === "extra") {
        if (override.startTime && override.endTime) {
          extraIntervals.push({
            start: parseTimeToMinutes(override.startTime),
            end: parseTimeToMinutes(override.endTime),
          });
        }
      }
    }

    for (const interval of [...intervals, ...extraIntervals]) {
      for (
        let slotStartMinutes = interval.start;
        slotStartMinutes + slotMinutes <= interval.end;
        slotStartMinutes += slotMinutes
      ) {
        const slotEndMinutes = slotStartMinutes + slotMinutes;

        const slotStart = fromZonedTime(
          `${dateStr}T${minutesToTimeString(slotStartMinutes)}`,
          timezone,
        );
        const slotEnd = fromZonedTime(
          `${dateStr}T${minutesToTimeString(slotEndMinutes)}`,
          timezone,
        );

        if (slotStart < from || slotStart >= to) continue;

        const slot = { start: slotStart, end: slotEnd };
        if (busy.some((busyInterval) => intervalsOverlap(slot, busyInterval))) {
          continue;
        }

        slots.push(slotStart);
      }
    }

    dateStr = formatInTimeZone(addDays(dayStart, 1), timezone, "yyyy-MM-dd");
    dayStart = fromZonedTime(`${dateStr}T00:00:00`, timezone);
  }

  // Overlapping availability rules (or a rule overlapping an "extra" override)
  // can generate the same instant more than once — dedupe so each slot is
  // offered exactly once.
  const seen = new Set<number>();
  const unique: Date[] = [];
  for (const slot of slots) {
    const t = slot.getTime();
    if (!seen.has(t)) {
      seen.add(t);
      unique.push(slot);
    }
  }

  unique.sort((a, b) => a.getTime() - b.getTime());
  return unique;
}
