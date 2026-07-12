import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { patientProfiles, user as userTable } from "@/db/schema";
import { BLOOD_GROUPS, GENDERS } from "@/lib/people/patient-constants";

// Re-export the client-safe helpers so server modules can import everything
// from one place.
export {
  GENDERS,
  BLOOD_GROUPS,
  genderLabel,
  ageFromDob,
  isProfileMeaningful,
} from "@/lib/people/patient-constants";

export const patientProfileSchema = z.object({
  dateOfBirth: z.string().date().nullish(),
  gender: z.enum(GENDERS).nullish(),
  bloodGroup: z.enum(BLOOD_GROUPS).nullish(),
  allergies: z.string().trim().max(2000).nullish(),
  chronicConditions: z.string().trim().max(2000).nullish(),
  currentMedications: z.string().trim().max(2000).nullish(),
  emergencyContactName: z.string().trim().max(200).nullish(),
  emergencyContactPhone: z.string().trim().max(40).nullish(),
});

export type PatientProfileInput = z.infer<typeof patientProfileSchema>;

export const patientProfileUpdateSchema = patientProfileSchema.extend({
  name: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .refine((value) => !value.includes("@"), "Use the patient's name, not an email.")
    .optional(),
});

export type PatientProfileUpdateInput = z.infer<typeof patientProfileUpdateSchema>;

export async function getPatientProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, userId));
  return profile ?? null;
}

export async function upsertPatientProfile(userId: string, input: PatientProfileInput) {
  const [saved] = await db
    .insert(patientProfiles)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: patientProfiles.userId,
      set: { ...input, updatedAt: new Date() },
    })
    .returning();
  return saved;
}

export async function updatePatientIdentityAndProfile(
  userId: string,
  input: PatientProfileUpdateInput
) {
  const { name, ...profile } = input;

  const saved = await upsertPatientProfile(userId, profile);

  if (name) {
    await db
      .update(userTable)
      .set({ name, updatedAt: new Date() })
      .where(eq(userTable.id, userId));
  }

  return saved;
}
