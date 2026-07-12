"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { VISIT_REASONS, type VisitReason } from "@/lib/booking/booking";
import { hasEmergencyRedFlag } from "@/lib/consult/triage";

export interface ReportRef {
  id: string;
  filename: string;
}

interface IntakeStepProps {
  visitReason: VisitReason;
  onVisitReasonChange: (reason: VisitReason) => void;
  symptoms: string;
  onSymptomsChange: (symptoms: string) => void;
  report: ReportRef | null;
  onReportChange: (report: ReportRef | null) => void;
  consented: boolean;
  onConsentedChange: (consented: boolean) => void;
  onContinue: () => void;
}

export function IntakeStep({
  visitReason,
  onVisitReasonChange,
  symptoms,
  onSymptomsChange,
  report,
  onReportChange,
  consented,
  onConsentedChange,
  onContinue,
}: IntakeStepProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const emergency = hasEmergencyRedFlag(symptoms);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/reports", { method: "POST", body: formData });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Upload failed");
      }

      onReportChange(body as ReportRef);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <Label className="text-base">What&apos;s this visit about?</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            This helps the doctor prepare before the consultation.
          </p>
        </div>
        <RadioGroup
          value={visitReason}
          onValueChange={(value) => onVisitReasonChange(value as VisitReason)}
          className="grid gap-3 md:grid-cols-2"
        >
          {VISIT_REASONS.map((reason) => (
            <label
              key={reason.value}
              htmlFor={`visit-reason-${reason.value}`}
              className={
                visitReason === reason.value
                  ? "flex cursor-pointer items-start gap-3 rounded-2xl border border-primary bg-teal-50 p-4 shadow-sm transition-colors"
                  : "flex cursor-pointer items-start gap-3 rounded-2xl border bg-background/70 p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
              }
            >
              <RadioGroupItem
                value={reason.value}
                id={`visit-reason-${reason.value}`}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">{reason.label}</span>
                <span className="block text-sm text-muted-foreground">
                  {reason.description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="symptoms">Tell us more</Label>
        <Textarea
          id="symptoms"
          placeholder="Describe the issue, how long it's been going on, and anything else the doctor should know."
          value={symptoms}
          onChange={(event) => onSymptomsChange(event.target.value)}
          rows={5}
          className="rounded-2xl bg-background/80"
        />
      </div>

      {emergency && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">
              This may be a medical emergency
            </p>
            <p className="mt-1 text-muted-foreground">
              A scheduled video consultation isn&apos;t the right place for this. Please
              call your local emergency number or go to the nearest emergency room now.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="report">Attach a report (optional)</Label>
        <label
          htmlFor="report"
          className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed bg-background/70 p-6 text-center transition-colors hover:border-primary/40 hover:bg-accent/30"
        >
          <span className="text-sm font-medium">
            {uploading ? "Uploading…" : report ? report.filename : "Click to upload"}
          </span>
          <span className="text-xs text-muted-foreground">
            Lab report or earlier prescription — PDF, JPG or PNG
          </span>
        </label>
        <input
          id="report"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={handleFileChange}
          disabled={uploading}
          className="sr-only"
        />
        {report && (
          <p className="text-sm text-muted-foreground">Attached: {report.filename}</p>
        )}
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => onConsentedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          I understand this is a video consultation, not a substitute for emergency
          care, and I agree to the{" "}
          <a href="/terms" target="_blank" className="text-primary underline">
            terms
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" className="text-primary underline">
            privacy policy
          </a>
          .
        </span>
      </label>

      <Button
        type="button"
        onClick={onContinue}
        disabled={symptoms.trim().length === 0 || uploading || !consented}
        size="lg"
        className="w-full sm:w-auto"
      >
        Continue to pick a time
      </Button>
    </div>
  );
}
