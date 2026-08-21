import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { asc, eq } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "~backend/auth/auth";
import { db } from "~backend/db";
import { availabilityOverrides, availabilityRules } from "~backend/db/schema";
import { listDoctorAppointments } from "~backend/booking/appointments";
import { getOrCreateDoctorProfile } from "~backend/people/doctor";
import { statusLabel } from "~backend/booking/appointment-status";
import { Button } from "@/components/ui/button";
import { DayBlockToggle } from "@/components/doctor/DayBlockToggle";
import {
  ScheduleWeek,
  type ScheduleAppointment,
  type ScheduleBand,
  type ScheduleDay,
} from "@/components/doctor/ScheduleWeek";

/** "09:30:00" → minutes past midnight. */
function timeToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const DEFAULT_GRID_START = 8 * 60;
const DEFAULT_GRID_END = 20 * 60;
const MIN_GRID_SPAN = 8 * 60;

export default async function DoctorSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const { week } = await searchParams;
  const weekOffset = Number.parseInt(week ?? "0", 10) || 0;

  const profile = await getOrCreateDoctorProfile(session.user.id);
  const timezone = profile.timezone;

  const [rules, overrides, appointments] = await Promise.all([
    db
      .select()
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id))
      .orderBy(asc(availabilityRules.startTime)),
    db
      .select()
      .from(availabilityOverrides)
      .where(eq(availabilityOverrides.doctorId, profile.id)),
    listDoctorAppointments(profile.id),
  ]);

  // Monday of the requested week, in the doctor's timezone.
  const now = new Date();
  const isoDay = Number(formatInTimeZone(now, timezone, "i")); // 1 = Mon … 7 = Sun
  const monday = addDays(now, 1 - isoDay + weekOffset * 7);
  const todayKey = formatInTimeZone(now, timezone, "yyyy-MM-dd");

  const days: ScheduleDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dateKey = formatInTimeZone(date, timezone, "yyyy-MM-dd");
    const weekday = Number(formatInTimeZone(date, timezone, "i")) % 7; // 0 = Sun

    const dayOverrides = overrides.filter((o) => o.date === dateKey);
    const blockedOverride =
      dayOverrides.find((o) => o.kind === "blocked" && !o.startTime) ?? null;

    const bands: ScheduleBand[] = [
      ...rules
        .filter((r) => r.weekday === weekday)
        .map((r) => ({
          id: r.id,
          kind: "rule" as const,
          startMin: timeToMin(r.startTime),
          endMin: timeToMin(r.endTime),
        })),
      ...dayOverrides
        .filter((o) => o.kind === "extra" && o.startTime && o.endTime)
        .map((o) => ({
          id: o.id,
          kind: "extra" as const,
          startMin: timeToMin(o.startTime!),
          endMin: timeToMin(o.endTime!),
        })),
    ].sort((a, b) => a.startMin - b.startMin);

    const dayAppointments: ScheduleAppointment[] = appointments
      .filter(
        ({ appointment }) =>
          formatInTimeZone(appointment.startsAt, timezone, "yyyy-MM-dd") === dateKey &&
          ["confirmed", "completed"].includes(appointment.status)
      )
      .sort((a, b) => a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime())
      .map(({ appointment, patient }) => ({
        id: appointment.id,
        startMin: timeToMin(formatInTimeZone(appointment.startsAt, timezone, "HH:mm")),
        endMin: timeToMin(formatInTimeZone(appointment.endsAt, timezone, "HH:mm")),
        patient: patient.name || patient.email,
        time: formatInTimeZone(appointment.startsAt, timezone, "h:mm a"),
        status: appointment.status,
        statusLabel: statusLabel(appointment.status, "doctor"),
      }));

    return {
      dateKey,
      weekday,
      dowLabel: formatInTimeZone(date, timezone, "EEE"),
      dayLabel: formatInTimeZone(date, timezone, "d"),
      fullLabel: formatInTimeZone(date, timezone, "EEE, d MMM"),
      weekdayName: formatInTimeZone(date, timezone, "EEEE"),
      isToday: dateKey === todayKey,
      isPast: dateKey < todayKey,
      blocked: Boolean(blockedOverride),
      blockedOverrideId: blockedOverride?.id ?? null,
      bands,
      appointments: dayAppointments,
    };
  });

  // Only render the hours that actually contain something, so the doctor isn't
  // scrolling past an empty 2am. Padded to whole hours, minimum 8-hour span.
  const marks = days.flatMap((d) => [
    ...d.bands.flatMap((b) => [b.startMin, b.endMin]),
    ...d.appointments.flatMap((a) => [a.startMin, a.endMin]),
  ]);
  let gridStartMin = DEFAULT_GRID_START;
  let gridEndMin = DEFAULT_GRID_END;
  if (marks.length > 0) {
    gridStartMin = Math.floor(Math.min(...marks) / 60) * 60;
    gridEndMin = Math.ceil(Math.max(...marks) / 60) * 60;
    if (gridEndMin - gridStartMin < MIN_GRID_SPAN) {
      gridEndMin = Math.min(24 * 60, gridStartMin + MIN_GRID_SPAN);
      gridStartMin = Math.max(0, gridEndMin - MIN_GRID_SPAN);
    }
  }

  const rangeLabel = `${formatInTimeZone(monday, timezone, "MMM d")} – ${formatInTimeZone(
    addDays(monday, 6),
    timezone,
    "MMM d, yyyy"
  )}`;

  const weekBookedCount = days.reduce((sum, d) => sum + d.appointments.length, 0);
  const openDays = days.filter((d) => !d.blocked && d.bands.length > 0).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-7xl space-y-5 px-4 py-10 duration-500 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-muted-foreground">
            {weekBookedCount} booked this week · consulting on {openDays} of 7 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" aria-label="Previous week">
            <Link href={`/doctor/schedule?week=${weekOffset - 1}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="min-w-44 text-center text-sm font-medium tabular-nums">
            {rangeLabel}
          </span>
          <Button asChild variant="outline" size="sm" aria-label="Next week">
            <Link href={`/doctor/schedule?week=${weekOffset + 1}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          {weekOffset !== 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/doctor/schedule">This week</Link>
            </Button>
          )}
        </div>
      </div>

      <ScheduleWeek
        days={days}
        gridStartMin={gridStartMin}
        gridEndMin={gridEndMin}
        timezone={timezone}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-primary/25 bg-primary/10" />
            Consulting hours
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-dashed border-primary/40 bg-primary/5" />
            One-off extra
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-primary" />
            Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border bg-muted" />
            Completed
          </span>
          <span className="hidden lg:inline">
            Drag on a day to add hours · click your hours to remove them
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {days.map((day) => (
            <DayBlockToggle
              key={day.dateKey}
              date={day.dateKey}
              blockedOverrideId={day.blockedOverrideId}
              label={day.dowLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
