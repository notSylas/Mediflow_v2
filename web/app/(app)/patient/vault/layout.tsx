import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~backend/auth/auth";
import { getVaultDoctorConsent, isEligibleForDoctorConsent } from "~backend/vault/vault-doctor-consent";
import { VaultDoctorConsentNotice } from "@/components/patient/VaultDoctorConsentNotice";

/**
 * Shared across every /patient/vault/** page: shows the one-time "your
 * MediFlow doctor can see this for better consultation" notice once the
 * patient actually has a relationship with the doctor. Separate from Flow A's
 * code-based share, which stays opt-in and untouched.
 */
export default async function PatientVaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [eligible, consent] = await Promise.all([
    isEligibleForDoctorConsent(session.user.id),
    getVaultDoctorConsent(session.user.id),
  ]);

  return (
    <>
      {eligible && !consent ? <VaultDoctorConsentNotice /> : null}
      {children}
    </>
  );
}
