import { ageFromDob } from "@/lib/patient-constants";
import { patientEditableName } from "@/lib/patient-identity";

export type BookingProfileUser = {
  name?: string | null;
  email: string;
};

export type BookingProfile = {
  dateOfBirth?: string | null;
  gender?: string | null;
} | null;

export function getBookingProfileMissing(
  user: BookingProfileUser,
  profile: BookingProfile
): string[] {
  const missing: string[] = [];

  if (!patientEditableName(user)) {
    missing.push("Full name");
  }

  if (!profile?.dateOfBirth || ageFromDob(profile.dateOfBirth) === null) {
    missing.push("Valid date of birth");
  }

  if (!profile?.gender) {
    missing.push("Gender");
  }

  return missing;
}

export function canBookVideoConsultation(
  user: BookingProfileUser,
  profile: BookingProfile
): boolean {
  return getBookingProfileMissing(user, profile).length === 0;
}
