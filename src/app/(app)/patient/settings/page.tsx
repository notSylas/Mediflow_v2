import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getDoctorProfile } from "@/lib/people/doctor";
import { getPatientCareStatus, toCareStatusDTO } from "@/lib/care/care-subscription";
import { AccountSettings } from "@/components/account/AccountSettings";
import { CareCard } from "@/components/patient/CareCard";
import { LegalLinks } from "@/components/account/LegalLinks";
import { LogoutButton } from "@/components/LogoutButton";
import {
  PatientHero,
  PatientPageShell,
  PatientSection,
  PatientSideCard,
  PatientStatCard,
} from "@/components/patient/PatientPortal";
import { Reveal } from "@/components/Reveal";

export default async function PatientSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [careStatus, profile] = await Promise.all([
    getPatientCareStatus(session.user.id),
    getDoctorProfile(),
  ]);
  const care = toCareStatusDTO(careStatus);

  return (
    <PatientPageShell>
      <Reveal>
        <PatientHero
          eyebrow="Account"
          icon={Settings}
          title="Manage identity and access"
          description={`Signed in as ${session.user.email}. Keep your display name accurate and secure your account with a password for faster sign-ins.`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-4 ring-1 ring-white/20">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-700">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{session.user.name || "Patient account"}</p>
                <p className="truncate text-sm text-teal-50/75">{session.user.email}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 text-sm text-teal-50/80 ring-1 ring-white/20">
              Your account controls login, legal access, and the name shown to your clinic.
            </div>
          </div>
        </PatientHero>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal>
          <PatientStatCard
            icon={UserRound}
            label="Identity"
            value={session.user.name ? "Named" : "Missing"}
            description="doctor-facing display name"
          />
        </Reveal>
        <Reveal delay={60}>
          <PatientStatCard
            icon={KeyRound}
            label="Password"
            value="Optional"
            description="useful with OTP sign-in"
          />
        </Reveal>
        <Reveal delay={120}>
          <PatientStatCard
            icon={ShieldCheck}
            label="Legal"
            value="Available"
            description="terms and privacy"
          />
        </Reveal>
      </div>

      <PatientSection
        title="MediFlow Care Plan"
        description="Your ongoing care subscription, benefits, and renewal."
      >
        <CareCard care={care} timezone={profile?.timezone ?? "Asia/Kolkata"} variant="full" />
      </PatientSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PatientSection
          title="Account controls"
          description="Update the details tied to your patient login."
        >
          <AccountSettings
            initialName={session.user.name ?? ""}
            currentEmail={session.user.email}
          />
        </PatientSection>

        <aside className="space-y-6">
          <PatientSideCard title="Security notes" description="Simple rules that matter">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-background/70 p-3">
                Never share one-time codes or account access with anyone.
              </div>
              <div className="rounded-2xl border bg-background/70 p-3">
                Use a password if you want faster sign-ins without waiting for an email code.
              </div>
              <div className="rounded-2xl border bg-background/70 p-3">
                Your medical profile is separate from account identity.
              </div>
            </div>
          </PatientSideCard>

          <PatientSideCard title="Legal and access">
            <LegalLinks />
          </PatientSideCard>

          <PatientSideCard title="Sign out" description="End this browser session">
            <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
              <LogOut className="h-4 w-4 shrink-0 text-destructive" />
              Use this on shared or public devices.
            </div>
            <LogoutButton />
          </PatientSideCard>
        </aside>
      </div>
    </PatientPageShell>
  );
}
