"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { describeMedicineSchedule } from "@/lib/medicines";

const TIMING_KEYS = ["morning", "afternoon", "evening", "night"] as const;
const FOOD_RELATIONS = ["Before food", "After food", "With food"];

interface MedicineDraft {
  key: number;
  name: string;
  strength: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string;
  durationDays: string;
  instructions: string;
}

export interface PrescriptionInitial {
  status: "draft" | "issued";
  diagnosis: string | null;
  advice: string | null;
  validUntil: string | null;
  issuedAt: Date | string | null;
  medicines: Array<{
    name: string;
    strength: string | null;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
    foodRelation: string | null;
    durationDays: number | null;
    instructions: string | null;
  }>;
}

interface PrescriptionComposerProps {
  appointmentId: string;
  initial: PrescriptionInitial | null;
}

let nextKey = 1;

function emptyMedicine(): MedicineDraft {
  return {
    key: nextKey++,
    name: "",
    strength: "",
    morning: false,
    afternoon: false,
    evening: false,
    night: false,
    foodRelation: "",
    durationDays: "",
    instructions: "",
  };
}

export function PrescriptionComposer({ appointmentId, initial }: PrescriptionComposerProps) {
  const [issued, setIssued] = useState(initial?.status === "issued");
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [advice, setAdvice] = useState(initial?.advice ?? "");
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [medicines, setMedicines] = useState<MedicineDraft[]>(() =>
    initial && initial.medicines.length > 0
      ? initial.medicines.map((m) => ({
          key: nextKey++,
          name: m.name,
          strength: m.strength ?? "",
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night,
          foodRelation: m.foodRelation ?? "",
          durationDays: m.durationDays ? String(m.durationDays) : "",
          instructions: m.instructions ?? "",
        }))
      : [emptyMedicine()]
  );
  const [state, setState] = useState<"idle" | "saving" | "saved" | "issuing">("idle");
  const [error, setError] = useState<string | null>(null);

  const updateMedicine = (key: number, patch: Partial<MedicineDraft>) => {
    setMedicines((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
    setState("idle");
  };

  const buildPayload = () => ({
    diagnosis: diagnosis.trim() || null,
    advice: advice.trim() || null,
    validUntil: validUntil || null,
    medicines: medicines
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        strength: m.strength.trim() || null,
        morning: m.morning,
        afternoon: m.afternoon,
        evening: m.evening,
        night: m.night,
        foodRelation: m.foodRelation || null,
        durationDays: m.durationDays ? Number(m.durationDays) : null,
        instructions: m.instructions.trim() || null,
      })),
  });

  const saveDraft = async (): Promise<boolean> => {
    setState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/prescription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(typeof body.error === "string" ? body.error : "Couldn't save the draft.");
        setState("idle");
        return false;
      }
      setState("saved");
      toast.success("Prescription draft saved");
      return true;
    } catch {
      setError("Couldn't reach the server.");
      setState("idle");
      return false;
    }
  };

  const issue = async () => {
    if (!window.confirm("Issue this prescription? It can't be edited afterwards.")) {
      return;
    }
    if (!(await saveDraft())) return;

    setState("issuing");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/prescription/issue`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        setError(typeof body.error === "string" ? body.error : "Couldn't issue.");
        setState("idle");
        return;
      }
      setIssued(true);
      toast.success("Prescription issued", {
        description: "It's now locked and visible to the patient.",
      });
    } catch {
      setError("Couldn't reach the server.");
      setState("idle");
    }
  };

  if (issued) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Prescription <Badge>Issued</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {diagnosis && (
            <p>
              <span className="text-muted-foreground">Diagnosis: </span>
              {diagnosis}
            </p>
          )}
          {medicines
            .filter((m) => m.name.trim())
            .map((m) => (
              <div key={m.key} className="rounded-md border p-3">
                <p className="font-medium">
                  {m.name} {m.strength && <span className="text-muted-foreground">{m.strength}</span>}
                </p>
                <p className="text-muted-foreground">
                  {describeMedicineSchedule({
                    morning: m.morning,
                    afternoon: m.afternoon,
                    evening: m.evening,
                    night: m.night,
                    foodRelation: m.foodRelation || null,
                    durationDays: m.durationDays ? Number(m.durationDays) : null,
                  })}
                </p>
                {m.instructions && <p className="text-muted-foreground">{m.instructions}</p>}
              </div>
            ))}
          {advice && (
            <p>
              <span className="text-muted-foreground">Advice: </span>
              {advice}
            </p>
          )}
          <p className="text-muted-foreground">
            Issued prescriptions are locked and can&apos;t be edited.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Prescription <Badge variant="secondary">Draft</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rx-diagnosis">Diagnosis</Label>
          <Textarea
            id="rx-diagnosis"
            rows={2}
            value={diagnosis}
            onChange={(e) => {
              setDiagnosis(e.target.value);
              setState("idle");
            }}
          />
        </div>

        <div className="space-y-3">
          <Label>Medicines</Label>
          {medicines.map((med, index) => (
            <div key={med.key} className="space-y-3 rounded-md border p-3">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <Input
                    aria-label={`Medicine ${index + 1} name`}
                    placeholder="Medicine name"
                    value={med.name}
                    onChange={(e) => updateMedicine(med.key, { name: e.target.value })}
                  />
                  <Input
                    aria-label={`Medicine ${index + 1} strength`}
                    placeholder="Strength (e.g. 500 mg)"
                    value={med.strength}
                    onChange={(e) => updateMedicine(med.key, { strength: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove medicine ${index + 1}`}
                  onClick={() =>
                    setMedicines((prev) =>
                      prev.length > 1 ? prev.filter((m) => m.key !== med.key) : prev
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {TIMING_KEYS.map((timing) => (
                  <label key={timing} className="flex items-center gap-1.5 capitalize">
                    <input
                      type="checkbox"
                      checked={med[timing]}
                      onChange={(e) => updateMedicine(med.key, { [timing]: e.target.checked })}
                    />
                    {timing}
                  </label>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  aria-label={`Medicine ${index + 1} food relation`}
                  className="h-9 rounded-md border bg-transparent px-3 text-sm"
                  value={med.foodRelation}
                  onChange={(e) => updateMedicine(med.key, { foodRelation: e.target.value })}
                >
                  <option value="">Food relation…</option>
                  {FOOD_RELATIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label={`Medicine ${index + 1} duration in days`}
                  type="number"
                  min={1}
                  placeholder="Duration (days)"
                  value={med.durationDays}
                  onChange={(e) => updateMedicine(med.key, { durationDays: e.target.value })}
                />
                <Input
                  aria-label={`Medicine ${index + 1} instructions`}
                  placeholder="Instructions"
                  value={med.instructions}
                  onChange={(e) => updateMedicine(med.key, { instructions: e.target.value })}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMedicines((prev) => [...prev, emptyMedicine()])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add medicine
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rx-valid-until">Valid until</Label>
            <Input
              id="rx-valid-until"
              type="date"
              value={validUntil}
              onChange={(e) => {
                setValidUntil(e.target.value);
                setState("idle");
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rx-advice">Advice</Label>
          <Textarea
            id="rx-advice"
            rows={2}
            placeholder="Lifestyle advice, follow-up guidance…"
            value={advice}
            onChange={(e) => {
              setAdvice(e.target.value);
              setState("idle");
            }}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Separator />

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={saveDraft} disabled={state !== "idle" && state !== "saved"}>
            {state === "saving" ? "Saving…" : "Save draft"}
          </Button>
          <Button onClick={issue} disabled={state === "saving" || state === "issuing"}>
            {state === "issuing" ? "Issuing…" : "Issue prescription"}
          </Button>
          {state === "saved" && <span className="text-sm text-muted-foreground">Draft saved</span>}
        </div>
      </CardContent>
    </Card>
  );
}
