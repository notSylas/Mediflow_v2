import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, HandHeart, Lock, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getPatientCareStatus } from "@/lib/care/care-subscription";
import { getPaymentProvider } from "@/lib/payments/payments";
import { payCarePlanAction } from "@/app/(app)/patient/actions";
import {
  PatientHero,
  PatientPageShell,
  PatientSection,
} from "@/components/patient/PatientPortal";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  "Secure messaging with your doctor",
  "One monthly follow-up check-in",
  "Weekly care digest",
  "Medicine reminders from your prescriptions",
  "Easier prescription refill requests",
];

export default async function CareCheckoutPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role === "doctor") redirect("/doctor");

  const status = await getPatientCareStatus(session.user.id);
  // Already a member — nothing to pay for.
  if (status.active) redirect("/patient/settings");

  const price = (status.priceInPaise / 100).toFixed(0);
  const isMock = getPaymentProvider() === "mock";

  return (
    <PatientPageShell>
      <Reveal>
        <PatientHero
          eyebrow="MediFlow Care"
          icon={HandHeart}
          title="Start your care plan"
          description="Ongoing care between visits — secure messaging, a monthly follow-up, reminders, and refill support."
        />
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PatientSection title="What's included" description="Everything in MediFlow Care">
          <Card className="rounded-2xl border-sky-200 bg-sky-50/60">
            <CardContent className="space-y-3 p-5">
              <ul className="space-y-2 text-sm">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Messaging is not for emergencies. Doctor usually replies within clinic
                hours. This plan does not replace paid video consultations.
              </p>
            </CardContent>
          </Card>
        </PatientSection>

        <aside>
          <Card className="rounded-2xl">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">MediFlow Care</span>
                <span className="text-sm text-muted-foreground">monthly</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums">₹{price}</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>

              <div className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Cancel anytime from settings.
                </p>
              </div>

              <form action={payCarePlanAction}>
                <Button type="submit" size="lg" className="w-full">
                  <Lock className="mr-2 h-4 w-4" />
                  Pay ₹{price} &amp; activate
                </Button>
              </form>

              {isMock && (
                <p className="text-center text-xs text-muted-foreground">
                  Test mode — no card is charged. Recurring billing is not yet enabled.
                </p>
              )}

              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/patient">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Not now
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PatientPageShell>
  );
}
