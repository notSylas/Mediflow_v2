import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getDoctorVerificationDetail } from "~backend/people/doctor-verification";
import { VerificationReviewActions } from "@/components/admin/VerificationReviewActions";

const DOC_LABEL: Record<string, string> = {
  identity: "ID proof",
  registration: "Council registration certificate",
  hpr: "HPR screenshot",
  degree: "Degree certificate",
};

export default async function AdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const { doctorId } = await params;
  const detail = await getDoctorVerificationDetail(doctorId);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          {detail.name ?? detail.email}
        </h1>
        <p className="text-muted-foreground">{detail.email}</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Registration number</dt>
            <dd className="font-medium">{detail.registrationNo ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">State medical council</dt>
            <dd className="font-medium">{detail.stateMedicalCouncil ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Year of registration</dt>
            <dd className="font-medium">{detail.yearOfRegistration ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">System of medicine</dt>
            <dd className="font-medium capitalize">{detail.systemOfMedicine}</dd>
          </div>
          {detail.hprId && (
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">HPR ID</dt>
              <dd className="font-medium">{detail.hprId}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Documents</h2>
        {detail.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {detail.documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={`/api/admin/verification-documents/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 text-sm transition-colors hover:bg-accent/40"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    {DOC_LABEL[doc.kind] ?? doc.kind}
                    <span className="ml-2 text-muted-foreground">{doc.filename}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <VerificationReviewActions doctorId={doctorId} />
    </div>
  );
}
