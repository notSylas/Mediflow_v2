import { eq } from "drizzle-orm";
import { db } from "~backend/db";
import { vaultDoctorConsents } from "~backend/db/schema";
import { listDoctorPatients } from "~backend/booking/appointments";
import { getCanonicalDoctorProfile } from "~backend/people/doctor";
import { VAULT_DOCTOR_CONSENT_VERSION } from "./vault-share-policy";

/**
 * True once the patient has a real relationship with the app's doctor (at
 * least one non-cancelled appointment) — the same roster-membership check
 * used to gate the doctor's own patient-detail page. Nothing is authorized to
 * see this patient's vault until this is true, so the consent notice only
 * ever shows once it is.
 */
export async function isEligibleForDoctorConsent(patientId: string): Promise<boolean> {
  const doctor = await getCanonicalDoctorProfile();
  if (!doctor) return false;
  const roster = await listDoctorPatients(doctor.id);
  return roster.some(({ patient }) => patient.id === patientId);
}

export interface VaultDoctorConsent {
  consentedAt: string;
}

export async function getVaultDoctorConsent(
  patientId: string
): Promise<VaultDoctorConsent | null> {
  const [row] = await db
    .select({ consentedAt: vaultDoctorConsents.consentedAt })
    .from(vaultDoctorConsents)
    .where(eq(vaultDoctorConsents.patientId, patientId));
  return row ? { consentedAt: row.consentedAt.toISOString() } : null;
}

/** Idempotent: a second acknowledgement (e.g. a race between tabs) is a no-op. */
export async function recordVaultDoctorConsent(
  patientId: string,
  source: "web" | "ios" | "android"
): Promise<void> {
  await db
    .insert(vaultDoctorConsents)
    .values({
      patientId,
      consentVersion: VAULT_DOCTOR_CONSENT_VERSION,
      consentSource: source,
    })
    .onConflictDoNothing();
}
