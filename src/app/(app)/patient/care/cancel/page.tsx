import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getCancellationBreakdown,
  getPatientCareStatus,
} from "@/lib/care-subscription";
import { cancelCareAction } from "@/app/(app)/patient/actions";
import {
  PatientHero,
  PatientPageShell,
  PatientSection,
} from "@/components/patient/PatientPortal";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const rupees = (paise: number) => `₹${(paise / 100).toFixed(0)}`;

export default async function CareCancelPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role === "doctor") redirect("/doctor");

  const status = await getPatientCareStatus(session.user.id);
  if (!status.active) redirect("/patient/settings");

  const b = await getCancellationBreakdown(session.user.id);

  return (
    <PatientPageShell>
      <Reveal>
        <PatientHero
          eyebrow="MediFlow Care"
          icon={AlertTriangle}
          title="Cancel your care plan"
          description="Review what happens before you confirm. You can keep the plan if you change your mind."
        />
      </Reveal>

      <PatientSection
        title="Cancellation summary"
        description="Based on the days used in your current billing period."
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="rounded-2xl border-amber-200 bg-amber-50/60">
            <CardContent className="space-y-4 p-5">
              <p className="text-sm">
                If you cancel this plan now,{" "}
                <span className="font-semibold">{rupees(b.deductionPaise)}</span> will be
                deducted for the {b.usedDays} of {b.totalDays} day
                {b.totalDays === 1 ? "" : "s"} already used this period. Any eligible
                refund of <span className="font-semibold">{rupees(b.refundPaise)}</span>{" "}
                will be processed within {b.refundWorkingDays} working days.
              </p>

              <dl className="divide-y rounded-xl border bg-background/70 text-sm">
                <Row label="Plan price (monthly)" value={rupees(b.pricePaise)} />
                <Row
                  label={`Used this period (${b.usedDays}/${b.totalDays} days)`}
                  value={`− ${rupees(b.deductionPaise)}`}
                />
                <Row
                  label={`Refund (${b.remainingDays} days unused)`}
                  value={rupees(b.refundPaise)}
                  emphasis
                />
              </dl>

              <p className="text-xs text-muted-foreground">
                Messaging and follow-up access end when the plan is cancelled. v1 billing
                is in test mode — no real charge or refund is processed yet.
              </p>
            </CardContent>
          </Card>

          <aside>
            <Card className="rounded-2xl">
              <CardContent className="space-y-3 p-5">
                <form action={cancelCareAction}>
                  <Button type="submit" variant="destructive" className="w-full">
                    Confirm cancellation
                  </Button>
                </form>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/patient/settings">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Keep my plan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </PatientSection>
    </PatientPageShell>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={emphasis ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
