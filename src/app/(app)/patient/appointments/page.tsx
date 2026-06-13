import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppointmentCard } from "@/components/patient/AppointmentCard";
import { Reveal } from "@/components/Reveal";
import { canCancelAppointment } from "@/lib/booking";
import { listPatientAppointments } from "@/lib/appointments";
import { getDoctorProfile } from "@/lib/doctor";

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

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <Reveal>
        <h1 className="text-2xl font-semibold tracking-tight">My appointments</h1>
        <p className="mt-1 text-muted-foreground">
          Your upcoming and past consultations.
        </p>
      </Reveal>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming appointments.{" "}
            <a href="/patient/book" className="text-primary underline">Book one now</a>.
          </p>
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
      </section>

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Past</h2>
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
        </section>
      )}
    </div>
  );
}
