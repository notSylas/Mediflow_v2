import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowUpRight, FileText, Pill, Stethoscope } from "lucide-react";
import { auth } from "@/lib/auth";
import { listPatientPrescriptions } from "@/lib/consult";
import { describeMedicineSchedule } from "@/lib/medicines";
import { getDoctorProfile } from "@/lib/doctor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Reveal } from "@/components/Reveal";
import { Separator } from "@/components/ui/separator";

export default async function PatientPrescriptionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [rows, profile] = await Promise.all([
    listPatientPrescriptions(session.user.id),
    getDoctorProfile(),
  ]);
  const timezone = profile?.timezone ?? "Asia/Kolkata";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prescriptions</h1>
        <p className="mt-1 text-muted-foreground">
          Everything your doctor has prescribed, newest first.
        </p>
      </div>

      {rows.length === 0 && (
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <FileText className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium">No prescriptions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                They&apos;ll appear here after your consultations.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-2">
              <Link href="/patient/book">Book a consultation</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {rows.map(({ prescription, appointment, medicines }, i) => (
        <Reveal key={prescription.id} delay={i * 80}>
        <Card className="glass hover-lift overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Stethoscope className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">
                  {prescription.diagnosis ?? "Consultation"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {prescription.issuedAt &&
                    `Issued ${formatInTimeZone(prescription.issuedAt, timezone, "MMMM d, yyyy")}`}
                  {prescription.validUntil && ` · valid until ${prescription.validUntil}`}
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href={`/patient/appointments/${appointment.id}`}>
                view appointment
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {medicines.map((med) => (
              <div
                key={med.id}
                className="flex items-start gap-3 rounded-lg border bg-background/50 p-3"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Pill className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">
                    {med.name}
                    {med.strength && (
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        {med.strength}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {describeMedicineSchedule(med)}
                  </p>
                  {med.instructions && (
                    <p className="text-sm text-muted-foreground">{med.instructions}</p>
                  )}
                </div>
              </div>
            ))}

            {prescription.advice && (
              <>
                <Separator />
                <div className="text-sm">
                  <Badge variant="secondary" className="mb-1.5">
                    Doctor&apos;s advice
                  </Badge>
                  <p className="text-muted-foreground">{prescription.advice}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </Reveal>
      ))}
    </div>
  );
}
