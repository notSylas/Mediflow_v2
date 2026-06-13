import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Search, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { listDoctorPatients } from "@/lib/appointments";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const { q } = await searchParams;
  const profile = await getOrCreateDoctorProfile(session.user.id);
  const patients = await listDoctorPatients(profile.id, q);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <p className="mt-1 text-muted-foreground">
          Everyone you&apos;ve consulted, most recent first.
        </p>
      </div>

      <form method="GET" className="flex gap-2" role="search">
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
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {patients.length === 0 && (
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium">
                {q ? `No patients match “${q}”` : "No patients yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {q
                  ? "Try a different name or email."
                  : "Patients appear here after their first booking."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {patients.map(({ patient, visitCount, lastVisit }) => (
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
                <p className="truncate font-medium">{patient.name || patient.email}</p>
                <p className="truncate text-sm text-muted-foreground">{patient.email}</p>
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
        ))}
      </div>
    </div>
  );
}
