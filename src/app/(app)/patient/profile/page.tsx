import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  HeartPulse,
  Phone,
  Pill,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getPatientProfile } from "@/lib/patient";
import { patientEditableName } from "@/lib/patient-identity";
import {
  PatientProfileForm,
  type PatientProfileValues,
} from "@/components/patient/PatientProfileForm";
import {
  PatientHero,
  PatientPageShell,
  PatientSection,
  PatientSideCard,
  PatientStatCard,
} from "@/components/patient/PatientPortal";
import { ProgressBar } from "@/components/ProgressBar";
import { Reveal } from "@/components/Reveal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PatientProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const profile = await getPatientProfile(session.user.id);
  const editableName = patientEditableName(session.user);

  const initial: PatientProfileValues = {
    name: editableName,
    dateOfBirth: profile?.dateOfBirth ?? null,
    gender: profile?.gender ?? null,
    bloodGroup: profile?.bloodGroup ?? null,
    allergies: profile?.allergies ?? null,
    chronicConditions: profile?.chronicConditions ?? null,
    currentMedications: profile?.currentMedications ?? null,
    emergencyContactName: profile?.emergencyContactName ?? null,
    emergencyContactPhone: profile?.emergencyContactPhone ?? null,
  };
  const profileFields = [
    initial.name,
    initial.dateOfBirth,
    initial.gender,
    initial.bloodGroup,
    initial.allergies,
    initial.chronicConditions,
    initial.currentMedications,
    initial.emergencyContactName,
    initial.emergencyContactPhone,
  ];
  const completion = Math.round(
    (profileFields.filter(Boolean).length / profileFields.length) * 100
  );
  const safetyItems = [
    {
      icon: UserRoundCheck,
      title: "Booking identity",
      value: initial.name && initial.dateOfBirth && initial.gender ? "Ready" : "Required",
      ready: Boolean(initial.name && initial.dateOfBirth && initial.gender),
    },
    {
      icon: AlertTriangle,
      title: "Allergies",
      value: initial.allergies ? "Added" : "Missing",
      ready: Boolean(initial.allergies),
    },
    {
      icon: Pill,
      title: "Current medicines",
      value: initial.currentMedications ? "Added" : "Missing",
      ready: Boolean(initial.currentMedications),
    },
    {
      icon: Phone,
      title: "Emergency contact",
      value: initial.emergencyContactPhone ? "Added" : "Missing",
      ready: Boolean(initial.emergencyContactPhone),
    },
  ];

  return (
    <PatientPageShell>
      <Reveal>
        <PatientHero
          eyebrow="Medical profile"
          icon={HeartPulse}
          title="Help your doctor treat you safely"
          description="Full name, date of birth, and gender are required before booking. The rest helps the doctor prescribe more safely."
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-teal-50/80">Profile completeness</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight">{completion}%</p>
              </div>
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
                Private
              </Badge>
            </div>
            <div className="rounded-full bg-white/20 p-1">
              <ProgressBar value={completion} />
            </div>
            <p className="text-sm text-teal-50/80">
              Even partial information is useful. Update it whenever your medicines or conditions
              change. Basic identity must be complete before a video consultation can be booked.
            </p>
          </div>
        </PatientHero>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-3">
        {safetyItems.map((item, index) => (
          <Reveal key={item.title} delay={index * 60}>
            <PatientStatCard
              icon={item.icon}
              label={item.title}
              value={item.value}
              description={item.ready ? "ready for doctor review" : "add before your next visit"}
              className={item.ready ? "border-teal-200/80" : "border-amber-200/80"}
            />
          </Reveal>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PatientSection
          title="About you"
          description="Keep this current so the doctor is not working from memory."
        >
          <Card className="glass rounded-3xl">
            <CardHeader>
              <CardTitle>Health background</CardTitle>
              <CardDescription>
                These fields are optional, but they directly affect prescription safety.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatientProfileForm initial={initial} />
            </CardContent>
          </Card>
        </PatientSection>

        <aside className="space-y-6">
          <PatientSideCard title="Privacy and safety" description="Visible only to care participants">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3 rounded-2xl border bg-background/70 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <p>Your doctor can review this before and during consultations.</p>
              </div>
              <div className="flex gap-3 rounded-2xl border bg-background/70 p-3">
                <UserRoundCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <p>Emergency contact is used only if clinical safety requires it.</p>
              </div>
              <div className="flex gap-3 rounded-2xl border bg-background/70 p-3">
                <Pill className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <p>Current medicines help prevent unsafe combinations and duplicates.</p>
              </div>
            </div>
          </PatientSideCard>

          <PatientSideCard title="High-priority fields">
            <div className="space-y-3">
              {safetyItems.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-background/70 p-3 text-sm"
                >
                  <span>{item.title}</span>
                  <Badge variant={item.ready ? "secondary" : "outline"}>
                    {item.ready ? "Added" : "Missing"}
                  </Badge>
                </div>
              ))}
            </div>
          </PatientSideCard>
        </aside>
      </div>
    </PatientPageShell>
  );
}
