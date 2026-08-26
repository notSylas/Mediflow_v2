import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { listPendingDoctorVerifications } from "~backend/people/doctor-verification";

export default async function AdminQueuePage() {
  const pending = await listPendingDoctorVerifications();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Doctor verification queue
        </h1>
        <p className="text-muted-foreground">
          {pending.length === 0
            ? "Nothing waiting for review."
            : `${pending.length} submission${pending.length === 1 ? "" : "s"} waiting for review, oldest first.`}
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Inbox className="h-8 w-8" aria-hidden />
          <p className="text-sm">All caught up.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((row) => (
            <li key={row.doctorId}>
              <Link
                href={`/admin/verification/${row.doctorId}`}
                className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.name ?? row.email}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {row.registrationNo ?? "—"} · {row.stateMedicalCouncil ?? "—"} ·{" "}
                    {row.yearOfRegistration ?? "—"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
