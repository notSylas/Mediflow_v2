import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  Download,
  FileText,
  HeartPulse,
  Pill,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { listPatientPrescriptions } from "@/lib/consult/consult";
import { describeMedicineSchedule } from "@/lib/consult/medicines";
import { getDoctorProfile } from "@/lib/people/doctor";
import { listPatientRefillRequests } from "@/lib/care/refills";
import { requestRefillAction } from "@/app/(app)/patient/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Reveal } from "@/components/Reveal";
import { Separator } from "@/components/ui/separator";
import {
  PatientEmptyState,
  PatientHero,
  PatientPageShell,
  PatientSection,
  PatientSideCard,
  PatientStatCard,
} from "@/components/patient/PatientPortal";
import { CountUp } from "@/components/CountUp";

export default async function PatientPrescriptionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [rows, profile, refillRequests] = await Promise.all([
    listPatientPrescriptions(session.user.id),
    getDoctorProfile(),
    listPatientRefillRequests(session.user.id),
  ]);
  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const refillStatusByPrescription = new Map(
    refillRequests.map((request) => [request.prescriptionId, request.status])
  );
  const now = new Date();
  const DAY_MS = 86_400_000;
  const activeMedicineCount = rows
    .filter((row) => row.prescription.issuedAt)
    .flatMap((row) => {
      const issuedAt = row.prescription.issuedAt;
      if (!issuedAt) return [];
      return row.medicines.filter((medicine) => {
        if (medicine.durationDays == null) return true;
        return issuedAt.getTime() + medicine.durationDays * DAY_MS >= now.getTime();
      });
    }).length;
  const pendingRefills = refillRequests.filter((request) => request.status === "pending").length;
  const latestIssuedAt = rows[0]?.prescription.issuedAt ?? null;

  return (
    <PatientPageShell>
      <Reveal>
        <PatientHero
          eyebrow="Prescription library"
          icon={Pill}
          title="Your medicines, clearly organized"
          description="Review every issued prescription, current medicines, doctor advice, and refill requests without digging through appointment history."
          actions={
            <Button asChild size="lg" className="bg-white text-teal-900 hover:bg-teal-50">
              <Link href="/patient/book">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Book a follow-up
              </Link>
            </Button>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-teal-50/80">Latest issue</p>
              <p className="mt-1 text-xl font-semibold">
                {latestIssuedAt
                  ? formatInTimeZone(latestIssuedAt, timezone, "MMMM d, yyyy")
                  : "No prescription yet"}
              </p>
              <p className="text-sm text-teal-50/75">
                Prescriptions stay available after every consultation.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
                <p className="text-2xl font-semibold">{rows.length}</p>
                <p className="text-xs text-teal-50/75">Rx</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
                <p className="text-2xl font-semibold">{activeMedicineCount}</p>
                <p className="text-xs text-teal-50/75">active meds</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
                <p className="text-2xl font-semibold">{pendingRefills}</p>
                <p className="text-xs text-teal-50/75">refills</p>
              </div>
            </div>
          </div>
        </PatientHero>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal>
          <PatientStatCard
            icon={FileText}
            label="Prescriptions"
            value={<CountUp value={rows.length} />}
            description="issued by your clinic"
          />
        </Reveal>
        <Reveal delay={60}>
          <PatientStatCard
            icon={HeartPulse}
            label="Active medicines"
            value={<CountUp value={activeMedicineCount} />}
            description="based on duration"
          />
        </Reveal>
        <Reveal delay={120}>
          <PatientStatCard
            icon={RotateCcw}
            label="Pending refills"
            value={<CountUp value={pendingRefills} />}
            description="waiting for doctor review"
          />
        </Reveal>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PatientSection
          title="Prescription history"
          description="Newest prescriptions appear first with medicine schedule and refill action."
        >
          {rows.length === 0 ? (
            <PatientEmptyState
              icon={FileText}
              title="No prescriptions yet"
              description="Once your doctor completes a consultation and issues medicines, the prescription will appear here."
              action={
                <Button asChild>
                  <Link href="/patient/book">Book a consultation</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {rows.map(({ prescription, appointment, medicines }, i) => {
                const refillStatus = refillStatusByPrescription.get(prescription.id);

                return (
                  <Reveal key={prescription.id} delay={i * 80}>
                    <Card className="glass hover-lift overflow-hidden rounded-3xl">
                      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-teal-400 to-emerald-400" />
                      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-5 sm:p-6">
                        <div className="flex min-w-0 items-start gap-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                            <Stethoscope className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold tracking-tight">
                                {prescription.diagnosis ?? "Consultation prescription"}
                              </p>
                              {refillStatus === "pending" && (
                                <Badge variant="secondary">Refill requested</Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {prescription.issuedAt &&
                                `Issued ${formatInTimeZone(
                                  prescription.issuedAt,
                                  timezone,
                                  "MMMM d, yyyy"
                                )}`}
                              {prescription.validUntil && ` · valid until ${prescription.validUntil}`}
                            </p>
                          </div>
                        </div>
                        <Button asChild>
                          <Link href={`/patient/prescriptions/${prescription.id}`}>
                            <Download className="mr-2 h-4 w-4" />
                            Download prescription
                          </Link>
                        </Button>
                      </CardHeader>

                      <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                        <div className="grid gap-3">
                          {medicines.map((med) => (
                            <div
                              key={med.id}
                              className="flex items-start gap-3 rounded-2xl border bg-background/70 p-4"
                            >
                              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                                <Pill className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold">
                                  {med.name}
                                  {med.strength && (
                                    <span className="ml-1.5 font-normal text-muted-foreground">
                                      {med.strength}
                                    </span>
                                  )}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {describeMedicineSchedule(med)}
                                </p>
                                {med.instructions && (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {med.instructions}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {prescription.advice && (
                          <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-sm">
                            <Badge variant="secondary" className="mb-2">
                              Doctor&apos;s advice
                            </Badge>
                            <p className="text-muted-foreground">{prescription.advice}</p>
                          </div>
                        )}

                        <Separator />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="max-w-xl text-sm text-muted-foreground">
                            Need to continue this medicine? Send a refill request instead of
                            self-extending a prescription.
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button asChild variant="outline">
                              <Link href={`/patient/appointments/${appointment.id}`}>
                                View appointment
                                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            {refillStatus === "pending" ? (
                              <Button disabled variant="outline">
                                Refill request pending
                              </Button>
                            ) : (
                              <form action={requestRefillAction}>
                                <input
                                  type="hidden"
                                  name="prescriptionId"
                                  value={prescription.id}
                                />
                                <Button type="submit" variant="outline">
                                  Request refill
                                </Button>
                              </form>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Reveal>
                );
              })}
            </div>
          )}
        </PatientSection>

        <aside className="space-y-6">
          <PatientSideCard title="Medication safety" description="Use prescriptions responsibly">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3 rounded-2xl border bg-background/70 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <p>Follow the exact schedule and duration written by your doctor.</p>
              </div>
              <div className="flex gap-3 rounded-2xl border bg-background/70 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <p>Request a refill when medicines run out. Do not reuse old antibiotics.</p>
              </div>
              <div className="flex gap-3 rounded-2xl border bg-background/70 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <p>Tell your doctor about allergies and current medicines before every visit.</p>
              </div>
            </div>
          </PatientSideCard>

          <PatientSideCard title="Need a review?">
            <p className="text-sm text-muted-foreground">
              If symptoms continue or you need a refill, book a follow-up so the doctor can review
              the current prescription safely.
            </p>
            <Button asChild className="w-full">
              <Link href="/patient/book">
                Book follow-up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </PatientSideCard>
        </aside>
      </div>
    </PatientPageShell>
  );
}
