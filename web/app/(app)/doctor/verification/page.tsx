import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertTriangle, BadgeCheck, Clock3 } from "lucide-react";
import { auth } from "~backend/auth/auth";
import { getOrCreateDoctorProfile } from "~backend/people/doctor";
import { DoctorVerificationForm } from "@/components/doctor/DoctorVerificationForm";

export default async function DoctorVerificationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const profile = await getOrCreateDoctorProfile(session.user.id);

  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-12">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Doctor verification
        </h1>
        <p className="text-muted-foreground">
          Submit your medical registration details and documents for review.
        </p>
      </div>

      {profile.verificationStatus === "verified" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 p-4 text-sm text-emerald-900">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>Your registration has been verified.</p>
        </div>
      )}

      {profile.verificationStatus === "pending" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            Your submission is under review. We&apos;ll update your status once an
            admin has checked it.
          </p>
        </div>
      )}

      {profile.verificationStatus === "suspended" && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>Your verification has been suspended. Contact support for details.</p>
        </div>
      )}

      {(profile.verificationStatus === "unverified" ||
        profile.verificationStatus === "rejected") && (
        <>
          {profile.verificationStatus === "rejected" && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">Your last submission was rejected.</p>
                {profile.verificationNotes && (
                  <p className="mt-1 text-destructive/90">{profile.verificationNotes}</p>
                )}
                <p className="mt-1">Fix the issue above and resubmit below.</p>
              </div>
            </div>
          )}
          <DoctorVerificationForm
            initial={{
              registrationNo: profile.registrationNo ?? "",
              stateMedicalCouncil: profile.stateMedicalCouncil ?? "",
              yearOfRegistration: profile.yearOfRegistration,
              systemOfMedicine: profile.systemOfMedicine,
              hprId: profile.hprId ?? "",
            }}
          />
        </>
      )}
    </div>
  );
}
