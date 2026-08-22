import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~backend/auth/auth";
import { PrescriptionAnalyzer } from "@/components/patient/PrescriptionAnalyzer";

export const metadata = { title: "Prescription Analyzer · MediFlow" };

export default async function PrescriptionAnalyzerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prescription Analyzer</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a prescription — from any doctor, handwritten or printed — and
          we&apos;ll read it into structured medicines, vitals, and lab findings.
        </p>
      </div>

      <PrescriptionAnalyzer />
    </div>
  );
}
