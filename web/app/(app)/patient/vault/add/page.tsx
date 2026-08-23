"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSearch, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PatientPageShell } from "@/components/patient/PatientPortal";

const STEPS = [
  { icon: UploadCloud, label: "Upload", description: "A photo or PDF, any doctor" },
  { icon: FileSearch, label: "We read it", description: "Extracted into structured fields" },
  { icon: CheckCircle2, label: "You confirm", description: "Nothing saves without your review" },
];

export default function VaultAddRecordPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const onFileChosen = async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/v1/patient/vault/records", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Upload failed");
      router.push(`/patient/vault/records/${json.record.id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <PatientPageShell className="max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">Add an old record</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          From any doctor, any hospital — not just MediFlow.
        </p>
      </div>

      <ol className="flex items-start gap-2" aria-label="What happens next">
        {STEPS.map((step, index) => (
          <li key={step.label} className="flex flex-1 items-start gap-2 last:flex-none">
            <div className="flex flex-1 flex-col items-center gap-2 text-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <step.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium">{step.label}</p>
                <p className="text-[11px] text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <span className="mt-4 h-px flex-1 bg-border" aria-hidden />
            )}
          </li>
        ))}
      </ol>

      <Card className="rounded-3xl">
        <CardContent className="p-8 text-center">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!loading) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (loading) return;
              const file = e.dataTransfer.files?.[0];
              if (file) void onFileChosen(file);
            }}
            className={cn(
              "rounded-2xl border-2 border-dashed p-6 transition-all duration-300",
              dragging ? "scale-[1.02] border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
          >
            <UploadCloud
              className={cn(
                "mx-auto h-9 w-9 transition-colors",
                dragging ? "text-primary" : "text-muted-foreground"
              )}
            />
            <p className="mt-4 text-sm text-muted-foreground">
              Photograph or pick a PDF of a prescription, lab report, or discharge summary.
              You&apos;ll review and confirm every detail before it&apos;s saved.
            </p>
            {fileName ? <p className="mt-3 text-sm font-medium">{fileName}</p> : null}
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFileChosen(file);
              }}
            />
            <Button className="mt-5 w-full" disabled={loading} onClick={() => inputRef.current?.click()}>
              {loading ? "Reading document…" : "Choose a file"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PatientPageShell>
  );
}
