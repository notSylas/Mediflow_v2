import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { listDoctorAppointments } from "@/lib/appointments";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  confirmed: "default",
  completed: "secondary",
  cancelled: "outline",
  no_show: "destructive",
  pending_payment: "outline",
};

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

  const today = rows.filter(
    ({ appointment }) =>
      formatInTimeZone(appointment.startsAt, timezone, "yyyy-MM-dd") === todayKey &&
      ["confirmed", "completed"].includes(appointment.status)
  );
  const upcoming = rows.filter(
    ({ appointment }) =>
      appointment.startsAt > now &&
      formatInTimeZone(appointment.startsAt, timezone, "yyyy-MM-dd") !== todayKey &&
      appointment.status === "confirmed"
  );
  const matchesFilters = ({ appointment, patient }: (typeof rows)[number]) => {
    if (statusFilter && appointment.status !== statusFilter) return false;
    if (q?.trim()) {
      const term = q.trim().toLowerCase();
      const haystack = [patient.name, patient.email, appointment.intakeNote ?? ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  };

  const past = rows.filter(
    (row) =>
      row.appointment.startsAt <= now &&
      formatInTimeZone(row.appointment.startsAt, timezone, "yyyy-MM-dd") !== todayKey &&
      matchesFilters(row)
  );
  const hasActiveFilters = Boolean(q?.trim() || statusFilter);

  const renderRow = ({
    appointment,
    patient,
  }: (typeof rows)[number]) => (
    <Link
      key={appointment.id}
      href={`/doctor/encounter/${appointment.id}`}
      className="glass hover-lift flex items-center justify-between gap-4 rounded-lg p-4"
    >
      <div className="flex min-w-0 items-center gap-3">
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
      </div>
      <Badge variant={STATUS_VARIANTS[appointment.status] ?? "outline"}>
        {STATUS_LABELS[appointment.status] ?? appointment.status}
      </Badge>
    </Link>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-8 px-6 py-12 duration-500">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Appointments</h1>
        <p className="text-muted-foreground">
          Open an appointment to run the consultation and write the prescription.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
          {today.length === 0 && (
            <CardDescription>No consultations scheduled today.</CardDescription>
          )}
        </CardHeader>
        {today.length > 0 && <CardContent className="space-y-3">{today.map(renderRow)}</CardContent>}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
          {upcoming.length === 0 && (
            <CardDescription>No upcoming confirmed appointments.</CardDescription>
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
        <CardContent className="space-y-3">
          <form method="GET" className="flex flex-wrap gap-2" role="search">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search patient or symptoms…"
                className="pl-9"
                aria-label="Search past appointments"
              />
            </div>
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              aria-label="Filter by status"
              className="h-9 rounded-lg border bg-transparent px-3 text-sm"
            >
              <option value="">All statuses</option>
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
      </Card>
    </div>
  );
}
