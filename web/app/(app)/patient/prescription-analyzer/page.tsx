import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Database, FileScan, ShieldCheck } from "lucide-react";
import { auth } from "~backend/auth/auth";
import { listAnalyses } from "~backend/prescriptions/analysis";
import { PrescriptionAnalyzer } from "@/components/patient/PrescriptionAnalyzer";
import { Reveal } from "@/components/effects/Reveal";
import { PatientHero, PatientPageShell, PatientSideCard } from "@/components/patient/PatientPortal";

export const metadata = { title: "Prescription Analyzer · MediFlow" };

export default async function PrescriptionAnalyzerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const analyses = await listAnalyses(session.user.id, 50);
  const succeeded = analyses.filter((a) => a.status === "succeeded");

  return (
    <PatientPageShell>
      <Reveal>
        <PatientHero
          eyebrow="Prescription Analyzer"
          icon={FileScan}
          title="Read any prescription, instantly"
          description="Upload a photo or PDF — from any doctor, handwritten or printed — and it's read into structured medicines, dosing, vitals, and lab findings. Save what's useful straight into your Health Vault."
        >
          <div className="space-y-1">
            <p className="text-sm text-primary-foreground/75">Read so far</p>
            <p className="font-mono text-4xl font-bold tabular-nums leading-none">
              {succeeded.length}
            </p>
            <p className="text-sm text-primary-foreground/75">
              prescription{succeeded.length === 1 ? "" : "s"} analysed
            </p>
            {succeeded[0]?.completedAt ? (
              <p className="pt-2 text-xs text-primary-foreground/60">
                Most recent · {new Date(succeeded[0].completedAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        </PatientHero>
      </Reveal>

      {/* Reading-flow content stays a comfortable line width even though the
          shell/hero above match every other patient page's full-bleed layout. */}
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Reveal>
            <PatientSideCard title="Where this goes">
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  The file and what we read from it are stored in your MediFlow account —
                  nothing else happens with it automatically. It&apos;s read by an AI vision
                  model (never a person), and stays here as its own entry unless you choose{" "}
                  <strong className="text-foreground">Save to Vault</strong>, which copies
                  it into your Health Vault for review.
                </p>
              </div>
            </PatientSideCard>
          </Reveal>
          <Reveal delay={60}>
            <PatientSideCard title="Before you rely on it">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  This is a reading aid, not a prescriber — always check what it read
                  against the original before acting on it. Anything uncertain is flagged
                  for you to verify.
                </p>
              </div>
            </PatientSideCard>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <PrescriptionAnalyzer />
        </Reveal>
      </div>
    </PatientPageShell>
  );
}
