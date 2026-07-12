import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import { ArrowRight, HandHeart, MessageCircle, RotateCcw, Search, Users } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { db } from "@/db";
import { conversations, followUps, refillRequests } from "@/db/schema";
import { listDoctorPatients } from "@/lib/appointments";
import { getActiveSubscriberIds } from "@/lib/care-subscription";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const { q, filter } = await searchParams;
  const profile = await getOrCreateDoctorProfile(session.user.id);
  const [patients, pendingFollowUps, pendingRefills, unreadConversations, subscriberIds] =
    await Promise.all([
      listDoctorPatients(profile.id, q),
      db
        .select({ patientId: followUps.patientId, id: followUps.id })
        .from(followUps)
        .where(and(eq(followUps.doctorId, profile.id), eq(followUps.status, "pending"))),
      db
        .select({ patientId: refillRequests.patientId, id: refillRequests.id })
        .from(refillRequests)
        .where(and(eq(refillRequests.doctorId, profile.id), eq(refillRequests.status, "pending"))),
      db
        .select({
          patientId: conversations.patientId,
          unread: conversations.doctorUnread,
        })
        .from(conversations)
        .where(eq(conversations.doctorId, profile.id)),
      getActiveSubscriberIds(profile.id),
    ]);

  const countByPatient = (rows: { patientId: string }[]) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.patientId, (counts.get(row.patientId) ?? 0) + 1);
    }
    return counts;
  };

  const followUpCounts = countByPatient(pendingFollowUps);
  const refillCounts = countByPatient(pendingRefills);
  const unreadCounts = new Map(
    unreadConversations
      .filter((row) => row.unread > 0)
      .map((row) => [row.patientId, row.unread])
  );
  const patientsWithAttention = patients.filter(
    ({ patient }) =>
      (followUpCounts.get(patient.id) ?? 0) > 0 ||
      (refillCounts.get(patient.id) ?? 0) > 0 ||
      (unreadCounts.get(patient.id) ?? 0) > 0
  );
  const visiblePatients =
    filter === "attention"
      ? patientsWithAttention
      : filter === "members"
        ? patients.filter(({ patient }) => subscriberIds.has(patient.id))
        : patients;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-5xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="mt-1 text-muted-foreground">
            Everyone you&apos;ve consulted, with active care signals surfaced.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/doctor/work-queue">
            Work queue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Patients", value: patients.length, icon: Users },
          { label: "Care members", value: subscriberIds.size, icon: HandHeart },
          { label: "Need attention", value: patientsWithAttention.length, icon: RotateCcw },
          { label: "Unread messages", value: unreadCounts.size, icon: MessageCircle },
        ].map((stat) => (
          <Card key={stat.label} className="glass">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <stat.icon className="h-4.5 w-4.5" />
              </span>
              <span>
                <span className="block text-xl font-semibold tabular-nums">
                  {stat.value}
                </span>
                <span className="block text-xs text-muted-foreground">{stat.label}</span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <form method="GET" className="flex flex-wrap gap-2" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name or email…"
            className="pl-9"
            aria-label="Search patients"
          />
        </div>
        <select
          name="filter"
          defaultValue={filter ?? ""}
          className="h-9 rounded-lg border bg-transparent px-3 text-sm"
          aria-label="Filter patients"
        >
          <option value="">All patients</option>
          <option value="members">Care members</option>
          <option value="attention">Needs attention</option>
        </select>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {(q || filter) && (
          <Button asChild variant="ghost">
            <Link href="/doctor/patients">Clear</Link>
          </Button>
        )}
      </form>

      {visiblePatients.length === 0 && (
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium">
                {q || filter ? "No patients match your filters" : "No patients yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {q || filter
                  ? "Try a different search or clear the care filter."
                  : "Patients appear here after their first booking."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {visiblePatients.map(({ patient, visitCount, lastVisit }) => {
          const followUps = followUpCounts.get(patient.id) ?? 0;
          const refills = refillCounts.get(patient.id) ?? 0;
          const unread = unreadCounts.get(patient.id) ?? 0;
          const isMember = subscriberIds.has(patient.id);

          return (
            <Link
              key={patient.id}
              href={`/doctor/patients/${patient.id}`}
              className="glass hover-lift flex items-center justify-between gap-4 rounded-lg p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium uppercase text-accent-foreground">
                  {(patient.name || patient.email).slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{patient.name || patient.email}</p>
                    {isMember && (
                      <Badge className="border-sky-200 bg-sky-100 text-sky-700 hover:bg-sky-100">
                        <HandHeart className="mr-1 h-3 w-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{patient.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {unread > 0 && <Badge>{unread} unread</Badge>}
                    {followUps > 0 && <Badge variant="outline">{followUps} follow-up</Badge>}
                    {refills > 0 && <Badge variant="secondary">{refills} refill</Badge>}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right text-sm">
                <p className="font-medium">
                  {visitCount} visit{Number(visitCount) === 1 ? "" : "s"}
                </p>
                <p className="text-muted-foreground">
                  Last:{" "}
                  {formatInTimeZone(new Date(lastVisit), profile.timezone, "MMM d, yyyy")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
