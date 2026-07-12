import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  Clock3,
  Video,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { AppointmentCard } from "@/components/patient/AppointmentCard";
import { Reveal } from "@/components/Reveal";
import { canCancelAppointment } from "@/lib/booking/booking";
import { listPatientAppointments } from "@/lib/booking/appointments";
import { getDoctorProfile } from "@/lib/doctor";
import {
  PatientEmptyState,
  PatientHero,
  PatientPageShell,
  PatientSection,
  PatientSideCard,
  PatientStatCard,
} from "@/components/patient/PatientPortal";
import { CountUp } from "@/components/CountUp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function PatientAppointmentsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const [rows, profile] = await Promise.all([
    listPatientAppointments(session.user.id),
    getDoctorProfile(),
  ]);

  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const now = new Date();

  const upcoming = rows.filter(
    ({ appointment }) =>
      !["cancelled", "completed", "no_show"].includes(appointment.status) &&
      appointment.startsAt > now
  );
  const past = rows.filter((row) => !upcoming.includes(row));
  const completed = rows.filter(({ appointment }) => appointment.status === "completed").length;
  const cancelled = rows.filter(({ appointment }) => appointment.status === "cancelled").length;
  const next = upcoming
    .slice()
    .sort((a, b) => a.appointment.startsAt.getTime() - b.appointment.startsAt.getTime())[0];
  const totalPaid = rows.reduce(
    (sum, { payment }) => sum + (payment?.amountInPaise ?? 0),
    0
  );

  return (
    <PatientPageShell>
      <Reveal>
        <PatientHero
          eyebrow="Visit history"
          icon={CalendarClock}
          title="Your consultations, in one place"
          description="Track upcoming video visits, past consultation notes, uploaded reports, payments, and cancellation actions from one clean timeline."
          actions={
            <Button asChild size="lg" className="bg-white text-teal-900 hover:bg-teal-50">
              <Link href="/patient/book">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Book another visit
              </Link>
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-teal-50/80">Next appointment</p>
                <p className="mt-1 text-xl font-semibold">
                  {next
                    ? formatInTimeZone(next.appointment.startsAt, timezone, "EEE, MMM d")
                    : "Nothing booked"}
                </p>
                <p className="text-sm text-teal-50/75">
                  {next
                    ? formatInTimeZone(next.appointment.startsAt, timezone, "h:mm a")
                    : "Book a time when you need care."}
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Video className="h-6 w-6" />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
                <p className="text-2xl font-semibold">{upcoming.length}</p>
                <p className="text-xs text-teal-50/75">upcoming</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
                <p className="text-2xl font-semibold">{completed}</p>
                <p className="text-xs text-teal-50/75">completed</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
                <p className="text-2xl font-semibold">₹{(totalPaid / 100).toFixed(0)}</p>
                <p className="text-xs text-teal-50/75">paid</p>
              </div>
            </div>
          </div>
        </PatientHero>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal>
          <PatientStatCard
            icon={CalendarCheck2}
            label="Upcoming"
            value={<CountUp value={upcoming.length} />}
            description="future visits"
          />
        </Reveal>
        <Reveal delay={60}>
          <PatientStatCard
            icon={CheckCircle2}
            label="Completed"
            value={<CountUp value={completed} />}
            description="consultations done"
          />
        </Reveal>
        <Reveal delay={120}>
          <PatientStatCard
            icon={CalendarX2}
            label="Cancelled"
            value={<CountUp value={cancelled} />}
            description="cancelled visits"
          />
        </Reveal>
        <Reveal delay={180}>
          <PatientStatCard
            icon={Clock3}
            label="Clinic timezone"
            value={timezone.replace("_", " ")}
            description="visit times shown here"
          />
        </Reveal>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <PatientSection
            title="Upcoming visits"
            description="Confirmed and pending visits that still need your attention."
          >
            {upcoming.length === 0 ? (
              <PatientEmptyState
                icon={CalendarPlus}
                title="No upcoming appointments"
                description="Book a consultation and it will appear here with the video join button, cancellation window, and visit notes."
                action={
                  <Button asChild>
                    <Link href="/patient/book">Book a consultation</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {upcoming.map(({ appointment, payment, report }, i) => (
                  <Reveal key={appointment.id} delay={i * 80}>
                    <AppointmentCard
                      id={appointment.id}
                      startsAt={appointment.startsAt.toISOString()}
                      endsAt={appointment.endsAt.toISOString()}
                      status={appointment.status}
                      intakeNote={appointment.intakeNote}
                      amountInPaise={payment?.amountInPaise ?? null}
                      reportId={report?.id ?? null}
                      reportFilename={report?.filename ?? null}
                      timezone={timezone}
                      canCancel={canCancelAppointment(appointment, now)}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </PatientSection>

          <PatientSection
            title="Past consultations"
            description="Completed, cancelled, and older appointments."
          >
            {past.length === 0 ? (
              <PatientEmptyState
                icon={CalendarClock}
                title="No past consultations yet"
                description="Your completed visits will build into a care history that is easy to review later."
              />
            ) : (
              <div className="space-y-4">
                {past.map(({ appointment, payment, report }, i) => (
                  <Reveal key={appointment.id} delay={i * 60}>
                    <AppointmentCard
                      id={appointment.id}
                      startsAt={appointment.startsAt.toISOString()}
                      endsAt={appointment.endsAt.toISOString()}
                      status={appointment.status}
                      intakeNote={appointment.intakeNote}
                      amountInPaise={payment?.amountInPaise ?? null}
                      reportId={report?.id ?? null}
                      reportFilename={report?.filename ?? null}
                      timezone={timezone}
                      canCancel={false}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </PatientSection>
        </div>

        <aside className="space-y-6">
          <PatientSideCard title="Visit readiness" description="Before a video consultation">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-background/70 p-3">
                Join opens 10 minutes before a confirmed appointment.
              </div>
              <div className="rounded-2xl border bg-background/70 p-3">
                Keep reports ready. Uploaded reports appear on the visit card.
              </div>
              <div className="rounded-2xl border bg-background/70 p-3">
                Complete your medical profile so prescriptions are safer.
              </div>
            </div>
          </PatientSideCard>

          <PatientSideCard title="Status guide">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/70 p-3 text-sm">
                <span>Confirmed</span>
                <Badge>Ready</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/70 p-3 text-sm">
                <span>Pending payment</span>
                <Badge variant="outline">Action needed</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/70 p-3 text-sm">
                <span>Completed</span>
                <Badge variant="secondary">History</Badge>
              </div>
            </div>
          </PatientSideCard>
        </aside>
      </div>
    </PatientPageShell>
  );
}
