import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { db } from "@/db";
import { availabilityOverrides, availabilityRules } from "@/db/schema";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { ProfileForm } from "@/components/doctor/ProfileForm";
import { AvailabilityRulesEditor } from "@/components/doctor/AvailabilityRulesEditor";
import { OverridesEditor } from "@/components/doctor/OverridesEditor";
import { AccountSettings } from "@/components/account/AccountSettings";
import { LegalLinks } from "@/components/account/LegalLinks";

export default async function DoctorSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "doctor") {
    redirect("/patient");
  }

  const profile = await getOrCreateDoctorProfile(session.user.id);

  const [rules, overrides] = await Promise.all([
    db
      .select()
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profile.id))
      .orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime)),
    db
      .select()
      .from(availabilityOverrides)
      .where(eq(availabilityOverrides.doctorId, profile.id))
      .orderBy(asc(availabilityOverrides.date)),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <Link
        href="/doctor"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Profile & availability</h1>
        <p className="text-muted-foreground">
          What patients see about you, and when they can book.
        </p>
      </div>

      <ProfileForm
        initialProfile={{
          specialty: profile.specialty,
          bio: profile.bio,
          feeInPaise: profile.feeInPaise,
          carePlanPriceInPaise: profile.carePlanPriceInPaise,
          slotMinutes: profile.slotMinutes,
          timezone: profile.timezone,
        }}
      />

      <AvailabilityRulesEditor initialRules={rules} />

      <OverridesEditor initialOverrides={overrides} />

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Account & access</h2>
          <p className="text-sm text-muted-foreground">
            Your sign-in identity — separate from the clinic profile above.
          </p>
        </div>
        <AccountSettings
          initialName={session.user.name ?? ""}
          currentEmail={session.user.email}
        />
      </div>

      <LegalLinks />
    </div>
  );
}
