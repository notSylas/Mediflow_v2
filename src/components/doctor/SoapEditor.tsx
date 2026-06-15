"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SECTIONS = [
  { key: "subjective", label: "Subjective", hint: "Patient's description of symptoms" },
  { key: "objective", label: "Objective", hint: "Clinical observations & vitals" },
  { key: "assessment", label: "Assessment", hint: "Diagnosis" },
  { key: "plan", label: "Plan", hint: "Treatment, medication and next steps" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];
type SoapValues = Record<SectionKey, string>;

const AUTOSAVE_DELAY_MS = 1500;

interface SoapEditorProps {
  appointmentId: string;
  initialNote: Partial<Record<SectionKey, string | null>> | null;
}

export function SoapEditor({ appointmentId, initialNote }: SoapEditorProps) {
  const [values, setValues] = useState<SoapValues>(() => ({
    subjective: initialNote?.subjective ?? "",
    objective: initialNote?.objective ?? "",
    assessment: initialNote?.assessment ?? "",
    plan: initialNote?.plan ?? "",
  }));
  const [status, setStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">(
    "idle"
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(values);
  // Keep the ref in sync after render (assigning during render is disallowed).
  useEffect(() => {
    latest.current = values;
  });

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/consult-note`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latest.current),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch {
      setStatus("error");
      toast.error("Couldn't save the consult note", {
        description: "Your text is still here — we'll retry when you keep typing.",
      });
    }
  }, [appointmentId]);

  // Debounced autosave: a doctor mid-consult should never click "save".
  const handleChange = (key: SectionKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, AUTOSAVE_DELAY_MS);
  };

  // Flush on unmount / tab hide so nothing is lost.
  useEffect(() => {
    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void save();
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, [save]);

  const statusText = {
    idle: "Autosaves as you type",
    pending: "Typing…",
    saving: "Saving…",
    saved: "Saved",
    error: "Couldn't save — keep typing to retry",
  }[status];

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Consultation note (SOAP)</CardTitle>
        <span
          aria-live="polite"
          className={
            status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {statusText}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.key} className="space-y-1.5">
            <Label htmlFor={`soap-${section.key}`}>{section.label}</Label>
            <Textarea
              id={`soap-${section.key}`}
              placeholder={section.hint}
              rows={3}
              value={values[section.key]}
              onChange={(e) => handleChange(section.key, e.target.value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
