export const VISIT_REASON_VALUES = [
  "new-symptoms",
  "follow-up",
  "prescription-refill",
  "lab-review",
  "general-consultation",
] as const;

export type VisitReason = (typeof VISIT_REASON_VALUES)[number];

export const VISIT_REASONS: {
  value: VisitReason;
  label: string;
  description: string;
}[] = [
  {
    value: "new-symptoms",
    label: "New symptoms",
    description: "Something new is bothering you and you'd like it checked out.",
  },
  {
    value: "follow-up",
    label: "Follow-up",
    description: "Continuing care for something the doctor has already seen.",
  },
  {
    value: "prescription-refill",
    label: "Prescription refill",
    description: "You need a current prescription renewed.",
  },
  {
    value: "lab-review",
    label: "Lab review",
    description: "Discuss recent test or lab results.",
  },
  {
    value: "general-consultation",
    label: "General consultation",
    description: "General health questions or a routine check-in.",
  },
];

/** How long a pending_payment hold reserves a slot before it's released. */
export const HOLD_MINUTES = 10;

/**
 * Current telemedicine-consent version. Bump when the consent wording changes
 * so the exact terms each patient accepted remain auditable. The server, not
 * the client, decides the version recorded.
 */
export const CONSENT_VERSION = "2026-06-13";

export const CONSENT_SOURCES = ["web", "ios", "android"] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

/** How close to the appointment time a confirmed booking may still be cancelled. */
export const CANCELLATION_WINDOW_HOURS = 2;

export interface CancellableAppointment {
  status: string;
  startsAt: Date;
}

export function canCancelAppointment(
  appointment: CancellableAppointment,
  now: Date
): boolean {
  if (appointment.status === "pending_payment") return true;
  if (appointment.status !== "confirmed") return false;

  const hoursUntilStart =
    (appointment.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilStart >= CANCELLATION_WINDOW_HOURS;
}

export function formatIntakeNote(visitReason: VisitReason, symptoms: string): string {
  const reason = VISIT_REASONS.find((r) => r.value === visitReason);
  return `Visit reason: ${reason?.label ?? visitReason}\n\n${symptoms}`;
}
