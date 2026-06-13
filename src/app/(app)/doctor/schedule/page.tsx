import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { asc, eq } from "drizzle-orm";
import { Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { availabilityOverrides, availabilityRules } from "@/db/schema";
import { listDoctorAppointments } from "@/lib/appointments";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { Button } from "@/components/ui/button";

function trimTime(time: string): string {
  return time.slice(0, 5);
}

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

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dateKey = formatInTimeZone(date, timezone, "yyyy-MM-dd");
    const weekday = Number(formatInTimeZone(date, timezone, "i")) % 7; // 0 = Sun

    const dayOverrides = overrides.filter((o) => o.date === dateKey);
    const blocked = dayOverrides.some((o) => o.kind === "blocked");
    const extras = dayOverrides.filter((o) => o.kind === "extra");

    const windows = blocked
      ? []
      : [
          ...rules
            .filter((r) => r.weekday === weekday)
            .map((r) => `${trimTime(r.startTime)}–${trimTime(r.endTime)}`),
          ...extras.map(
            (o) =>
              `${o.startTime ? trimTime(o.startTime) : "all day"}${
                o.endTime ? `–${trimTime(o.endTime)}` : ""
              }`
          ),
        ];

    const booked = appointments
      .filter(
        ({ appointment }) =>
          formatInTimeZone(appointment.startsAt, timezone, "yyyy-MM-dd") === dateKey &&
          ["confirmed", "completed"].includes(appointment.status)
      )
      .sort((a, b) => a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime());

    return { date, dateKey, blocked, windows, booked, isToday: dateKey === todayKey };
  });

  const rangeLabel = `${formatInTimeZone(monday, timezone, "MMM d")} – ${formatInTimeZone(
    addDays(monday, 6),
    timezone,
    "MMM d, yyyy"
  )}`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-6xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-muted-foreground">
            Your availability and bookings, week by week.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" aria-label="Previous week">
            <Link href={`/doctor/schedule?week=${weekOffset - 1}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="min-w-44 text-center text-sm font-medium">{rangeLabel}</span>
          <Button asChild variant="outline" size="sm" aria-label="Next week">
            <Link href={`/doctor/schedule?week=${weekOffset + 1}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          {weekOffset !== 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/doctor/schedule">Today</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => (
          <div
            key={day.dateKey}
            className={
              day.isToday
                ? "glass rounded-xl border-primary/50 p-3 ring-2 ring-primary/15"
                : "glass rounded-xl p-3"
            }
          >
            <p className="text-sm font-semibold">
              {formatInTimeZone(day.date, timezone, "EEE")}
              <span className="ml-1.5 font-normal text-muted-foreground">
                {formatInTimeZone(day.date, timezone, "d MMM")}
              </span>
            </p>

            <div className="mt-2 space-y-1.5">
              {day.blocked && (
                <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                  <Ban className="h-3 w-3" /> Blocked
                </p>
              )}
              {!day.blocked && day.windows.length === 0 && (
                <p className="text-xs text-muted-foreground">Not available</p>
              )}
              {day.windows.map((window) => (
                <p
                  key={window}
                  className="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground"
                >
                  {window}
                </p>
              ))}
            </div>

            {day.booked.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t pt-2">
                {day.booked.map(({ appointment, patient }) => (
                  <Link
                    key={appointment.id}
                    href={`/doctor/encounter/${appointment.id}`}
                    className={
                      appointment.status === "completed"
                        ? "block truncate rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/70"
                        : "block truncate rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-85"
                    }
                  >
                    {formatInTimeZone(appointment.startsAt, timezone, "h:mm a")} ·{" "}
                    {patient.name || patient.email}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Edit your weekly hours and date overrides in{" "}
        <Link href="/doctor/settings" className="underline">
          Profile &amp; availability
        </Link>
        .
      </p>
    </div>
  );
}
