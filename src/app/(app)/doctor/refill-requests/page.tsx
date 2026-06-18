import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, CheckCircle2, FilePenLine, Pill, XCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrCreateDoctorProfile } from "@/lib/doctor";
import { listPendingRefillRequests } from "@/lib/refills";
import {
  declineRefillRequestAction,
  fulfillRefillRequestAction,
} from "@/app/(app)/doctor/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DoctorRefillRequestsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "doctor") redirect("/patient");

  const profile = await getOrCreateDoctorProfile(session.user.id);
  const requests = await listPendingRefillRequests(profile.id);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-4xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div>
        <Link
          href="/doctor/work-queue"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Work queue
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Refill requests</h1>
            <p className="mt-1 text-muted-foreground">
              Fulfil by opening an async consult, or decline if the patient needs a full visit.
            </p>
          </div>
          <Badge variant={requests.length > 0 ? "default" : "secondary"}>
            {requests.length} pending
          </Badge>
        </div>
      </div>

      {requests.length === 0 && (
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium">No refill requests pending</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Patient refill requests will appear here after they request one from an issued prescription.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="glass">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  <Pill className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">
                    {request.patientName || request.patientEmail}
                  </CardTitle>
                  <CardDescription>
                    {request.diagnosis ?? "Previous prescription"} · requested{" "}
                    {formatInTimeZone(request.createdAt, profile.timezone, "MMM d, h:mm a")}
                  </CardDescription>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/doctor/patients/${request.patientId}`}>Patient record</Link>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <form action={fulfillRefillRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <Button type="submit">
                  <FilePenLine className="mr-2 h-4 w-4" />
                  Open async consult
                </Button>
              </form>
              <form action={declineRefillRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <Button type="submit" variant="outline">
                  <XCircle className="mr-2 h-4 w-4" />
                  Decline request
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
