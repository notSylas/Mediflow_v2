import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth/auth";
import { listDoctorAppointments } from "@/lib/appointments";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppointmentQuickActions } from "@/components/doctor/AppointmentQuickActions";
import { statusLabel, statusVariant } from "@/lib/appointment-status";

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; count?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const { q, status: statusFilter, count } = await searchParams;
  const visibleCount = Math.max(Number.parseInt(count ?? "20", 10) || 20, 20);

  const profile = await getOrCreateDoctorProfile(session.user.id);
  const rows = await listDoctorAppointments(profile.id);
  const timezone = profile.timezone;

  const now = new Date();
  const todayKey = formatInTimeZone(now, timezone, "yyyy-MM-dd");

  // Text search applies everywhere (Today/Upcoming/Past) — finding a patient
  // shouldn't depend on remembering which bucket their visit fell into. The
  // status dropdown stays Past-only: Today/Upcoming are already scoped to
  // confirmed/completed by definition, so "cancelled"/"no-show" filters only
  // make sense as a history lookup.
  const matchesSearch = ({ patient, appointment }: (typeof rows)[number]) => {
    if (!q?.trim()) return true;
    const term = q.trim().toLowerCase();
    const haystack = [patient.name, patient.email, appointment.intakeNote ?? ""]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  };

  const today = rows.filter(
    (row) =>
      formatInTimeZone(row.appointment.startsAt, timezone, "yyyy-MM-dd") === todayKey &&
      ["confirmed", "completed"].includes(row.appointment.status) &&
      matchesSearch(row)
  );
  const upcoming = rows.filter(
    (row) =>
      row.appointment.startsAt > now &&
      formatInTimeZone(row.appointment.startsAt, timezone, "yyyy-MM-dd") !== todayKey &&
      row.appointment.status === "confirmed" &&
      matchesSearch(row)
  );
  const past = rows.filter((row) => {
    if (row.appointment.startsAt > now) return false;
    if (formatInTimeZone(row.appointment.startsAt, timezone, "yyyy-MM-dd") === todayKey)
      return false;
    if (statusFilter && row.appointment.status !== statusFilter) return false;
    return matchesSearch(row);
  });
  const hasActiveFilters = Boolean(q?.trim() || statusFilter);

  const renderRow = ({ appointment, patient }: (typeof rows)[number]) => (
    <div
      key={appointment.id}
      className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/40"
    >
      <Link
        href={`/doctor/encounter/${appointment.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium uppercase text-accent-foreground">
          {(patient.name || patient.email).slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{patient.name || patient.email}</p>
          <p className="text-sm text-muted-foreground">
            {formatInTimeZone(appointment.startsAt, timezone, "EEE, MMM d 'at' h:mm a")}
          </p>
          {appointment.intakeNote && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {appointment.intakeNote.split("\n")[0]}
            </p>
          )}
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <AppointmentQuickActions
          appointmentId={appointment.id}
          status={appointment.status}
          startsAt={appointment.startsAt.toISOString()}
        />
        <Badge variant={statusVariant(appointment.status)}>
          {statusLabel(appointment.status, "doctor")}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-6 px-6 py-12 duration-500">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Appointments</h1>
        <p className="text-muted-foreground">
          {today.length} today · {upcoming.length} upcoming · {past.length} past
        </p>
      </div>

      <form method="GET" className="flex flex-wrap gap-2" role="search">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search patient or symptoms — searches today, upcoming, and past…"
            className="pl-9"
            aria-label="Search appointments"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          aria-label="Filter past appointments by status"
          className="h-9 rounded-lg border bg-transparent px-3 text-sm"
        >
          <option value="">All statuses (past)</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No-show</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {hasActiveFilters && (
          <Button asChild variant="ghost">
            <Link href="/doctor/appointments">Clear</Link>
          </Button>
        )}
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
          {today.length === 0 && (
            <CardDescription>
              {hasActiveFilters ? "No matches today." : "No consultations scheduled today."}
            </CardDescription>
          )}
        </CardHeader>
        {today.length > 0 && <CardContent className="space-y-3">{today.map(renderRow)}</CardContent>}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
          {upcoming.length === 0 && (
            <CardDescription>
              {hasActiveFilters ? "No upcoming matches." : "No upcoming confirmed appointments."}
            </CardDescription>
          )}
        </CardHeader>
        {upcoming.length > 0 && (
          <CardContent className="space-y-3">{upcoming.map(renderRow)}</CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past</CardTitle>
          {past.length === 0 && (
            <CardDescription>
              {hasActiveFilters ? "No appointments match your filters." : "Nothing here yet."}
            </CardDescription>
          )}
        </CardHeader>
        {past.length > 0 && (
          <CardContent className="space-y-3">
            {past.slice(0, visibleCount).map(renderRow)}

            {past.length > visibleCount && (
              <Button asChild variant="outline" className="w-full">
                <Link
                  href={`/doctor/appointments?count=${visibleCount + 20}${
                    q ? `&q=${encodeURIComponent(q)}` : ""
                  }${statusFilter ? `&status=${statusFilter}` : ""}`}
                >
                  Show more ({past.length - visibleCount} remaining)
                </Link>
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
