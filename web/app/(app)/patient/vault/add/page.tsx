"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PatientPageShell } from "@/components/patient/PatientPortal";

export default function VaultAddRecordPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <Card className="glass rounded-3xl">
        <CardContent className="space-y-5 p-8 text-center">
          <UploadCloud className="mx-auto h-9 w-9 text-teal-700" />
          <div>
            <h1 className="text-xl font-semibold">Add an old record</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              From any doctor, any hospital — not just MediFlow.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Photograph or pick a PDF of a prescription, lab report, or discharge summary. You&apos;ll
            review and confirm every detail before it&apos;s saved — nothing is added automatically.
          </p>
          {fileName ? <p className="text-sm font-medium">{fileName}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
          <Button className="w-full" disabled={loading} onClick={() => inputRef.current?.click()}>
            {loading ? "Reading document…" : "Choose a file"}
          </Button>
        </CardContent>
      </Card>
    </PatientPageShell>
  );
}
