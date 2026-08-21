// Pure call-window logic, shared by the server token route and client
// components — keep this file free of server-only imports.

/** How early before the slot either party may join the call. */
export const JOIN_EARLY_MINUTES = 10;
/** How long after the scheduled end the room stays joinable (consults run over). */
export const JOIN_LATE_MINUTES = 30;

export interface JoinableAppointment {
  status: string;
  startsAt: Date;
  endsAt: Date;
}

export type JoinDenial = "not_confirmed" | "too_early" | "too_late" | null;

/** Returns null when joining is allowed, otherwise the reason it isn't. */
export function getJoinDenial(
  appointment: JoinableAppointment,
  now: Date
): JoinDenial {
  if (appointment.status !== "confirmed") return "not_confirmed";

  const opensAt = new Date(
    appointment.startsAt.getTime() - JOIN_EARLY_MINUTES * 60 * 1000
  );
  const closesAt = new Date(
    appointment.endsAt.getTime() + JOIN_LATE_MINUTES * 60 * 1000
  );

  if (now < opensAt) return "too_early";
  if (now > closesAt) return "too_late";
  return null;
}

export function roomNameFor(appointmentId: string): string {
  return `appt_${appointmentId}`;
}
