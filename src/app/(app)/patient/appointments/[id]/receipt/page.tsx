import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { HeartPulse } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAppointmentForPatient } from "@/lib/appointments";
import { getDoctorProfile } from "@/lib/doctor";
import { PrintButton } from "@/components/patient/PrintButton";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;
  const row = await getAppointmentForPatient(id, session.user.id);
  if (!row || !row.payment || row.payment.status !== "paid") notFound();

  const { appointment, payment } = row;
  const profile = await getDoctorProfile();
  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const amount = `₹${(payment.amountInPaise / 100).toFixed(2)}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/patient/appointments/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to appointment
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border bg-card p-8">
        <div className="flex items-center justify-between border-b pb-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulse className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">MediFlow</span>
          </div>
          <div className="text-right">
            <p className="font-semibold">Receipt</p>
            <p className="text-sm text-muted-foreground">
              {formatInTimeZone(payment.createdAt, timezone, "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Billed to</dt>
            <dd className="text-right font-medium">{session.user.name || session.user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Service</dt>
            <dd className="text-right">Video consultation</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Appointment</dt>
            <dd className="text-right">
              {formatInTimeZone(appointment.startsAt, timezone, "EEE, MMM d 'at' h:mm a")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Payment ref</dt>
            <dd className="text-right font-mono text-xs">
              {payment.paymentId ?? payment.orderId ?? payment.id.slice(0, 12)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex items-center justify-between border-t pt-5">
          <span className="font-medium">Total paid</span>
          <span className="text-xl font-semibold">{amount}</span>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Thank you. This is a computer-generated receipt for a consultation booked
          through MediFlow.
        </p>
      </div>
    </div>
  );
}
