// Pure patient-profile constants and helpers — safe to import from client
// components (no DB/server-only imports). Keep this free of `@/db`.

export const GENDERS = ["female", "male", "other", "prefer_not_to_say"] as const;
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const GENDER_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export function genderLabel(gender: string | null): string | null {
  return gender ? (GENDER_LABELS[gender] ?? gender) : null;
}

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

/** Whether the patient has filled enough of their profile to be useful. */
export function isProfileMeaningful(
  profile: { dateOfBirth: string | null; gender: string | null } | null
): boolean {
  return Boolean(profile?.dateOfBirth && profile?.gender);
}
