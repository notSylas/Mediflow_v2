import { eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { appointments, doctorProfiles, user } from "@/db/schema";
import { emailLayout, sendEmail } from "@/lib/notifications/email";

/** Booking confirmation email. Loads everything it needs from the appointment. */
export async function sendBookingConfirmation(appointmentId: string): Promise<void> {
  const [row] = await db
    .select({
      startsAt: appointments.startsAt,
      patientName: user.name,
      patientEmail: user.email,
      timezone: doctorProfiles.timezone,
    })
    .from(appointments)
    .innerJoin(user, eq(user.id, appointments.patientId))
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, appointments.doctorId))
    .where(eq(appointments.id, appointmentId));

  if (!row) return;

  const when = formatInTimeZone(
    row.startsAt,
    row.timezone,
    "EEEE, MMM d 'at' h:mm a"
  );
  const firstName = row.patientName?.split(" ")[0] ?? "there";

  await sendEmail({
    to: row.patientEmail,
    subject: "Your consultation is confirmed",
    html: emailLayout(
      `<p>Hi ${firstName},</p>
       <p>Your video consultation is confirmed for:</p>
       <p style="font-size:16px;font-weight:600;color:#0f766e">${when}</p>
       <p>The room opens 10 minutes before your slot. Sign in to MediFlow and open
       your appointment to join, or to reschedule if your plans change.</p>`
    ),
  });
}

/** Appointment reminder email (called by a scheduled job near the slot time). */
export async function sendAppointmentReminder(appointmentId: string): Promise<void> {
  const [row] = await db
    .select({
      startsAt: appointments.startsAt,
      patientName: user.name,
      patientEmail: user.email,
      timezone: doctorProfiles.timezone,
    })
    .from(appointments)
    .innerJoin(user, eq(user.id, appointments.patientId))
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, appointments.doctorId))
    .where(eq(appointments.id, appointmentId));

  if (!row) return;

  const when = formatInTimeZone(row.startsAt, row.timezone, "h:mm a 'today'");
  const firstName = row.patientName?.split(" ")[0] ?? "there";

  await sendEmail({
    to: row.patientEmail,
    subject: "Your consultation is coming up",
    html: emailLayout(
      `<p>Hi ${firstName},</p>
       <p>This is a reminder that your video consultation is at <strong>${when}</strong>.</p>
       <p>Open MediFlow a few minutes early to check your camera and microphone.</p>`
    ),
  });
}
