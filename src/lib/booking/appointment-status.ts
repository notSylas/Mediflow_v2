// Single source of truth for appointment status presentation. The plan calls
// out that "no-show" should read differently to the two audiences: patients
// see the softer "Missed", the doctor sees the operational "No-show".

export type AppointmentStatusValue =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const LABELS: Record<AppointmentStatusValue, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const VARIANTS: Record<AppointmentStatusValue, BadgeVariant> = {
  pending_payment: "outline",
  confirmed: "default",
  completed: "secondary",
  cancelled: "outline",
  no_show: "destructive",
};

export function statusLabel(
  status: string,
  audience: "patient" | "doctor" = "doctor"
): string {
  if (status === "no_show" && audience === "patient") return "Missed";
  return LABELS[status as AppointmentStatusValue] ?? status;
}

export function statusVariant(status: string): BadgeVariant {
  return VARIANTS[status as AppointmentStatusValue] ?? "outline";
}
