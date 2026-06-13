import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getMedicineHistory, getPatientHistory } from "@/lib/consult";
import { describeMedicineSchedule } from "@/lib/medicines";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const { id } = await params;
  const profile = await getOrCreateDoctorProfile(session.user.id);

  const [patient] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, id));
  if (!patient) notFound();

  const [history, medicineHistory] = await Promise.all([
    getPatientHistory(patient.id, profile.id),
    getMedicineHistory(patient.id, profile.id),
  ]);

  // The roster only links to the doctor's own patients, but guard anyway:
  // no shared history with this doctor → nothing to show.
  const timezone = profile.timezone;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div>
        <Link
          href="/doctor/patients"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All patients
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-base font-medium uppercase text-accent-foreground">
            {(patient.name || patient.email).slice(0, 2)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {patient.name || patient.email}
            </h1>
            <p className="text-muted-foreground">{patient.email}</p>
          </div>
        </div>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Consultation history</CardTitle>
          {history.length === 0 && (
            <CardDescription>No completed consultations yet.</CardDescription>
          )}
        </CardHeader>
        {history.length > 0 && (
          <CardContent className="space-y-4">
            {history.map(({ appointment, note, prescription }) => (
              <div key={appointment.id} className="space-y-2 rounded-lg border bg-background/60 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {formatInTimeZone(appointment.startsAt, timezone, "MMMM d, yyyy")}
                  </p>
                  <Link
                    href={`/doctor/encounter/${appointment.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    open encounter
                  </Link>
                </div>
                {appointment.intakeNote && (
                  <p className="line-clamp-2 text-muted-foreground">
                    {appointment.intakeNote}
                  </p>
                )}
                {note?.assessment && (
                  <p>
                    <span className="text-muted-foreground">Assessment: </span>
                    {note.assessment}
                  </p>
                )}
                {prescription && prescription.medicines.length > 0 && (
                  <p className="text-muted-foreground">
                    Prescribed: {prescription.medicines.map((m) => m.name).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {medicineHistory.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Medicine history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {medicineHistory.map(({ medicine, issuedAt }) => (
              <div key={medicine.id} className="rounded-lg border bg-background/60 p-3">
                <p className="font-medium">
                  {medicine.name}
                  {medicine.strength && (
                    <span className="text-muted-foreground"> {medicine.strength}</span>
                  )}
                </p>
                <p className="text-muted-foreground">{describeMedicineSchedule(medicine)}</p>
                {issuedAt && (
                  <p className="text-xs text-muted-foreground">
                    Issued {formatInTimeZone(issuedAt, timezone, "MMM d, yyyy")}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
