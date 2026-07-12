// Pure medicine display helpers, shared by server pages and client
// components — keep this file free of server-only imports.

export interface MedicineTimingLike {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string | null;
  durationDays: number | null;
}

/** "Morning, Night · After food · 5 days" */
export function describeMedicineSchedule(med: MedicineTimingLike): string {
  const timings = [
    med.morning && "Morning",
    med.afternoon && "Afternoon",
    med.evening && "Evening",
    med.night && "Night",
  ].filter(Boolean);

  const parts = [
    timings.length > 0 ? timings.join(", ") : null,
    med.foodRelation,
    med.durationDays ? `${med.durationDays} day${med.durationDays === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return parts.join(" · ");
}
