import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowRight, HandHeart, Users } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { listDoctorPatients } from "@/lib/booking/appointments";
import {
  listDoctorSubscribers,
  type DoctorSubscriberRow,
} from "@/lib/care/care-subscription";
import { getOrCreateDoctorProfile } from "@/lib/people/doctor";
import { setCareSubscriptionAction } from "@/app/(app)/doctor/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  manual_trial: "default",
  inactive: "secondary",
  cancelled: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  manual_trial: "Trial",
  inactive: "Inactive",
  cancelled: "Cancelled",
};

function ToggleButton({
  patientId,
  action,
  label,
  variant = "outline",
}: {
  patientId: string;
  action: string;
  label: string;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <form action={setCareSubscriptionAction}>
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" size="sm" variant={variant} className="h-8 px-2.5 text-xs">
        {label}
      </Button>
    </form>
  );
}

export default async function DoctorCarePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const profile = await getOrCreateDoctorProfile(session.user.id);
  const [subscribers, roster] = await Promise.all([
    listDoctorSubscribers(profile.id),
    listDoctorPatients(profile.id),
  ]);
  const timezone = profile.timezone;

  const activeCount = subscribers.filter((s) => s.active).length;
  const creditsAvailable = subscribers.filter((s) => s.followUpAvailable).length;

  // Roster patients who don't have a subscription row yet — can be granted access.
  const subscriberIds = new Set(subscribers.map((s) => s.patientId));
  const grantable = roster.filter((r) => !subscriberIds.has(r.patient.id));

  const stats = [
    { label: "Active members", value: activeCount, icon: HandHeart },
    { label: "Total records", value: subscribers.length, icon: Users },
    { label: "Follow-up credits free", value: creditsAvailable, icon: HandHeart },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-5xl space-y-8 px-4 py-10 duration-500 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MediFlow Care members</h1>
          <p className="mt-1 text-muted-foreground">
            Manage care-plan subscriptions. v1 billing is a manual toggle — no recurring
            charge yet.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/doctor/work-queue">
            Work queue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <stat.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subscribers</h2>
        {subscribers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No care-plan records yet. Grant a patient access below to get started.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {subscribers.map((sub) => (
                <SubscriberRow key={sub.patientId} sub={sub} timezone={timezone} />
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {grantable.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Grant access</h2>
          <p className="text-sm text-muted-foreground">
            Patients you&apos;ve seen who aren&apos;t on the care plan yet.
          </p>
          <Card>
            <CardContent className="divide-y p-0">
              {grantable.slice(0, 20).map((row) => (
                <div
                  key={row.patient.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/doctor/patients/${row.patient.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {row.patient.name || row.patient.email}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {row.patient.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <ToggleButton patientId={row.patient.id} action="trial" label="Grant trial" />
                    <ToggleButton
                      patientId={row.patient.id}
                      action="activate"
                      label="Activate"
                      variant="default"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function SubscriberRow({
  sub,
  timezone,
}: {
  sub: DoctorSubscriberRow;
  timezone: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/doctor/patients/${sub.patientId}`}
            className="truncate font-medium hover:underline"
          >
            {sub.patientName || sub.patientEmail}
          </Link>
          <Badge variant={STATUS_VARIANT[sub.status] ?? "outline"}>
            {STATUS_LABEL[sub.status] ?? sub.status}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {sub.active && sub.currentPeriodEnd
            ? `Renews ${formatInTimeZone(new Date(sub.currentPeriodEnd), timezone, "MMM d, yyyy")} · `
            : ""}
          {sub.followUpAvailable ? "follow-up available" : "follow-up used"}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {sub.active ? (
          <>
            <ToggleButton patientId={sub.patientId} action="reset-credit" label="Reset credit" />
            <ToggleButton patientId={sub.patientId} action="deactivate" label="Deactivate" />
          </>
        ) : (
          <ToggleButton
            patientId={sub.patientId}
            action="activate"
            label="Reactivate"
            variant="default"
          />
        )}
      </div>
    </div>
  );
}
