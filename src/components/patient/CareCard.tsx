import { formatInTimeZone } from "date-fns-tz";
import { ArrowRight, Check, HandHeart, MessageCircle } from "lucide-react";
import Link from "next/link";
import {
  requestCareFollowUpAction,
  updateCarePrefsAction,
} from "@/app/(app)/patient/actions";
import type { CareStatusDTO } from "@/lib/care/care-subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  "Secure messaging with your doctor",
  "One monthly follow-up check-in",
  "Weekly care digest",
  "Medicine reminders from your prescriptions",
  "Easier prescription refill requests",
];

const DISCLAIMER =
  "Messaging is not for emergencies. Doctor usually replies within clinic hours.";

/**
 * MediFlow Care plan card. Quiet premium surface (soft blue/white), intentionally
 * not a loud sales banner. Variant "full" is used in settings (adds cancel);
 * "compact" is the dashboard card.
 */
export function CareCard({
  care,
  timezone,
  variant = "compact",
}: {
  care: CareStatusDTO;
  timezone: string;
  variant?: "compact" | "full";
}) {
  return (
    <Card className="rounded-2xl border-sky-200 bg-sky-50/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
            <HandHeart className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">MediFlow Care</p>
              {care.active && (
                <Badge className="border-sky-200 bg-sky-100 text-sky-700 hover:bg-sky-100">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {care.active
                ? "Your ongoing care plan is active."
                : "Stay connected between visits."}
            </p>
          </div>
        </div>

        {care.active ? (
          <>
            <ul className="space-y-1.5 text-sm">
              <Status on={care.followUpAvailable}>
                {care.followUpAvailable
                  ? "1 monthly follow-up available"
                  : "Follow-up used this period"}
              </Status>
              <Status on={care.digestEnabled}>
                {care.digestEnabled
                  ? "Weekly digest enabled"
                  : "Weekly digest paused"}
              </Status>
              <Status on={care.medicineRemindersEnabled}>
                {care.medicineRemindersEnabled
                  ? "Medicine reminders enabled"
                  : "Medicine reminders paused"}
              </Status>
              <Status on>Messaging enabled</Status>
            </ul>

            {care.currentPeriodEnd && (
              <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Renews</span>
                <span className="font-medium tabular-nums">
                  {formatInTimeZone(new Date(care.currentPeriodEnd), timezone, "MMM d, yyyy")}
                </span>
              </div>
            )}

            {variant === "full" && (
              <form
                action={updateCarePrefsAction}
                className="space-y-3 rounded-xl border border-sky-200 bg-white/70 p-3"
              >
                <p className="text-sm font-medium">Care preferences</p>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="digestEnabled"
                    defaultChecked={care.digestEnabled}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">Weekly care digest</span>
                    <span className="text-muted-foreground">
                      A Sunday summary of your appointments, prescriptions, and follow-ups.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="medicineRemindersEnabled"
                    defaultChecked={care.medicineRemindersEnabled}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">Medicine reminders</span>
                    <span className="text-muted-foreground">
                      Reminder preferences for medicines from active prescriptions.
                    </span>
                  </span>
                </label>
                <Button type="submit" variant="outline" size="sm">
                  Save preferences
                </Button>
              </form>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/messages">
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  Message doctor
                </Link>
              </Button>
              <form action={requestCareFollowUpAction}>
                <Button type="submit" size="sm" disabled={!care.followUpAvailable}>
                  Use monthly follow-up
                </Button>
              </form>
              {variant === "full" && (
                <Button asChild variant="ghost" size="sm" className="text-destructive">
                  <Link href="/patient/care/cancel">Cancel plan</Link>
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <ul className="space-y-1.5 text-sm">
              {BENEFITS.map((b) => (
                <Status key={b} on>
                  {b}
                </Status>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="sm">
                <Link href="/patient/care/checkout">
                  Start care plan
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">
                  ₹{(care.priceInPaise / 100).toFixed(0)}
                </span>{" "}
                / month
              </span>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
      </CardContent>
    </Card>
  );
}

function Status({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className={on ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground/50"} />
      <span className={on ? "" : "text-muted-foreground"}>{children}</span>
    </li>
  );
}
