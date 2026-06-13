import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPatientProfile } from "@/lib/patient";
import {
  PatientProfileForm,
  type PatientProfileValues,
} from "@/components/patient/PatientProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PatientProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const profile = await getPatientProfile(session.user.id);

  const initial: PatientProfileValues = {
    dateOfBirth: profile?.dateOfBirth ?? null,
    gender: profile?.gender ?? null,
    bloodGroup: profile?.bloodGroup ?? null,
    allergies: profile?.allergies ?? null,
    chronicConditions: profile?.chronicConditions ?? null,
    currentMedications: profile?.currentMedications ?? null,
    emergencyContactName: profile?.emergencyContactName ?? null,
    emergencyContactPhone: profile?.emergencyContactPhone ?? null,
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-2xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Medical profile</h1>
        <p className="mt-1 text-muted-foreground">
          Your doctor sees this before every consultation, so they&apos;re never
          working blind.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        Private to you and your doctor. Used only for your care.
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>About you</CardTitle>
          <CardDescription>
            Even a few fields help. You can update this any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientProfileForm initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
