"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { PatientPageShell } from "@/components/patient/PatientPortal";

type RecordType = "prescription" | "lab" | "scan" | "discharge_summary" | "vaccination" | "other";

const RECORD_TYPES: Array<{ label: string; value: RecordType }> = [
  { label: "Prescription", value: "prescription" },
  { label: "Lab report", value: "lab" },
  { label: "Scan", value: "scan" },
  { label: "Discharge summary", value: "discharge_summary" },
  { label: "Vaccination", value: "vaccination" },
  { label: "Other", value: "other" },
];

interface Medicine {
  name: string;
  strength: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string;
  durationDaysText: string;
  instructions: string;
}

interface VaultRecord {
  id: string;
  recordType: RecordType;
  recordDate: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  advice: string | null;
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
  extractionConfidence: "high" | "medium" | "low" | null;
}

function blankMedicine(): Medicine {
  return {
    name: "",
    strength: "",
    morning: false,
    afternoon: false,
    evening: false,
    night: false,
    foodRelation: "",
    durationDaysText: "",
    instructions: "",
  };
}

export default function VaultRecordReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lowConfidence, setLowConfidence] = useState(true);

  const [recordType, setRecordType] = useState<RecordType>("prescription");
  const [recordDate, setRecordDate] = useState("");
  const [sourceFacility, setSourceFacility] = useState("");
  const [sourceDoctorName, setSourceDoctorName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([blankMedicine()]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/v1/patient/vault/records/${id}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Couldn't load this record.");
        setLoading(false);
        return;
      }
      const record = json.record as VaultRecord;
      setRecordType(record.recordType);
      setRecordDate(record.recordDate ?? "");
      setSourceFacility(record.sourceFacility ?? "");
      setSourceDoctorName(record.sourceDoctorName ?? "");
      setDiagnosis(record.diagnosis ?? "");
      setAdvice(record.advice ?? "");
      setLowConfidence(!record.extractionConfidence || record.extractionConfidence === "low");
      if (record.medicines.length) {
        setMedicines(
          record.medicines.map((m) => ({
            name: m.name,
            strength: m.strength ?? "",
            morning: m.morning,
            afternoon: m.afternoon,
            evening: m.evening,
            night: m.night,
            foodRelation: m.foodRelation ?? "",
            durationDaysText: m.durationDays ? String(m.durationDays) : "",
            instructions: m.instructions ?? "",
          }))
        );
      }
      setLoading(false);
    })();
  }, [id]);

  const updateMedicine = (index: number, patch: Partial<Medicine>) =>
    setMedicines((current) => current.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/patient/vault/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType,
          recordDate: recordDate.trim() || null,
          sourceFacility: sourceFacility.trim() || null,
          sourceDoctorName: sourceDoctorName.trim() || null,
          diagnosis: diagnosis.trim() || null,
          advice: advice.trim() || null,
          medicines: medicines
            .filter((m) => m.name.trim())
            .map((m) => ({
              name: m.name.trim(),
              strength: m.strength.trim() || null,
              route: null,
              morning: m.morning,
              afternoon: m.afternoon,
              evening: m.evening,
              night: m.night,
              foodRelation: m.foodRelation.trim() || null,
              instructions: m.instructions.trim() || null,
              durationDays: m.durationDaysText ? Number(m.durationDaysText) : null,
            })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Couldn't save");
      router.push("/patient/vault");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    if (!confirm("Discard this upload? The photo and anything you've entered will be deleted.")) return;
    await fetch(`/api/v1/patient/vault/records/${id}`, { method: "DELETE" });
    router.push("/patient/vault");
  };

  if (loading) {
    return (
      <PatientPageShell className="max-w-2xl">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PatientPageShell>
    );
  }

  return (
    <PatientPageShell className="max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review before saving</h1>
        <p className="mt-1 text-sm text-muted-foreground">Confirm what&apos;s on the document.</p>
      </div>

      {lowConfidence ? (
        <Card className="glass rounded-2xl border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p>
              We couldn&apos;t read this document automatically — fill in the details below yourself.
              Nothing is saved until you confirm.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="glass rounded-2xl">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label>Type of record</Label>
            <div className="flex flex-wrap gap-2">
              {RECORD_TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  size="sm"
                  variant={recordType === t.value ? "default" : "outline"}
                  onClick={() => setRecordType(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date on the document</Label>
              <Input id="date" type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facility">Hospital / clinic</Label>
              <Input
                id="facility"
                value={sourceFacility}
                onChange={(e) => setSourceFacility(e.target.value)}
                placeholder="e.g. Apollo Clinic, Koramangala"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doctor">Doctor&apos;s name</Label>
            <Input
              id="doctor"
              value={sourceDoctorName}
              onChange={(e) => setSourceDoctorName(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="What the document says was diagnosed"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass rounded-2xl">
        <CardContent className="space-y-4 p-6">
          <h2 className="font-semibold">Medicines</h2>
          {medicines.map((medicine, index) => (
            <div key={index} className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Medicine {index + 1}</p>
                {medicines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMedicines((c) => c.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Medicine name"
                  value={medicine.name}
                  onChange={(e) => updateMedicine(index, { name: e.target.value })}
                />
                <Input
                  placeholder="Strength, e.g. 500 mg"
                  value={medicine.strength}
                  onChange={(e) => updateMedicine(index, { strength: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["morning", "afternoon", "evening", "night"] as const).map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    size="sm"
                    variant={medicine[slot] ? "default" : "outline"}
                    onClick={() => updateMedicine(index, { [slot]: !medicine[slot] })}
                  >
                    {slot[0].toUpperCase() + slot.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Food relation, e.g. After food"
                  value={medicine.foodRelation}
                  onChange={(e) => updateMedicine(index, { foodRelation: e.target.value })}
                />
                <Input
                  placeholder="Duration in days"
                  inputMode="numeric"
                  value={medicine.durationDaysText}
                  onChange={(e) => updateMedicine(index, { durationDaysText: e.target.value })}
                />
              </div>
              <Input
                placeholder="Instructions (optional)"
                value={medicine.instructions}
                onChange={(e) => updateMedicine(index, { instructions: e.target.value })}
              />
            </div>
          ))}
          <Separator />
          <Button
            type="button"
            variant="outline"
            onClick={() => setMedicines((c) => [...c, blankMedicine()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add another medicine
          </Button>
        </CardContent>
      </Card>

      <Card className="glass rounded-2xl">
        <CardContent className="space-y-1.5 p-6">
          <Label htmlFor="advice">Doctor&apos;s advice</Label>
          <Textarea id="advice" value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Optional" />
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save to vault"}
        </Button>
        <Button type="button" variant="outline" onClick={discard}>
          Discard
        </Button>
      </div>
    </PatientPageShell>
  );
}
