"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface Medicine {
  name: string;
  strength: string | null;
  route: string | null;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string | null;
  durationDays: number | null;
  instructions: string | null;
}

interface Prescription {
  id: string;
  diagnosis: string | null;
  advice: string | null;
  issuedAt: string | null;
  doctorName: string;
  medicines: Medicine[];
}

interface ConsultNote {
  date: string;
  doctorName: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
}

interface AddedRecord {
  recordType: string;
  date: string | null;
  sourceFacility: string | null;
  sourceDoctorName: string | null;
  diagnosis: string | null;
  advice: string | null;
  medicines: Medicine[];
}

interface RedeemedVault {
  patientName: string;
  scope: { from: string | null; to: string };
  expiresAt: string;
  prescriptions: Prescription[];
  consultNotes: ConsultNote[];
  addedRecords: AddedRecord[];
}

const RECORD_TYPE_LABEL: Record<string, string> = {
  prescription: "Prescription",
  lab: "Lab report",
  scan: "Scan",
  discharge_summary: "Discharge summary",
  vaccination: "Vaccination",
  other: "Record",
};

function timing(times: string[]): string {
  const labels = [
    times[0] && "Morning",
    times[1] && "Afternoon",
    times[2] && "Evening",
    times[3] && "Night",
  ].filter(Boolean);
  return labels.length ? labels.join(", ") : "As needed";
}

function countdown(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function VaultViewInner() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RedeemedVault | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const redeem = async (submittedCode: string) => {
    if (!submittedCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/vault/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: submittedCode.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Something went wrong. Please try again.");
        setData(null);
        return;
      }
      setData(body as RedeemedVault);
    } catch {
      setError("Couldn't reach MediFlow. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Deliberate one-shot auto-submit of the code carried in the URL. `redeem`
    // flips loading state synchronously, which costs exactly one extra render
    // on mount — not the cascading-render case the rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialCode) void redeem(initialCode);
    // Only auto-submit once, on the code carried in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (data) {
    const remaining = countdown(data.expiresAt);
    const isExpired = remaining === "expired";
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between rounded-2xl border bg-card px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>
              Shared by <span className="font-semibold">{data.patientName}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {isExpired ? "Expired" : `Expires in ${remaining}`}
          </div>
        </div>

        {isExpired ? (
          <Card className="p-6 text-center text-muted-foreground">
            This share just expired. Ask the patient for a new one.
          </Card>
        ) : (
          <div className="space-y-4">
            {data.prescriptions.length === 0 &&
            data.consultNotes.length === 0 &&
            data.addedRecords.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                Nothing in the shared window ({data.scope.from ? "recent" : "all time"} through today).
              </Card>
            ) : null}

            {data.addedRecords.map((rec, i) => (
              <Card key={`added-${i}`} className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {rec.diagnosis || RECORD_TYPE_LABEL[rec.recordType] || "Record"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[rec.sourceDoctorName, rec.sourceFacility].filter(Boolean).join(", ") ||
                        "Added by patient"}
                      {rec.date ? ` · ${new Date(rec.date).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {RECORD_TYPE_LABEL[rec.recordType] || "Record"}
                  </span>
                </div>
                {rec.medicines.length > 0 ? (
                  <div className="space-y-1.5">
                    {rec.medicines.map((m, mi) => (
                      <div key={mi} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="font-medium">{m.name}</span>
                        {m.strength ? <span className="text-muted-foreground"> {m.strength}</span> : null}
                        <div className="text-xs text-muted-foreground">
                          {timing([
                            m.morning ? "1" : "",
                            m.afternoon ? "1" : "",
                            m.evening ? "1" : "",
                            m.night ? "1" : "",
                          ])}
                          {m.foodRelation ? ` · ${m.foodRelation}` : ""}
                          {m.durationDays ? ` · ${m.durationDays} days` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {rec.advice ? <p className="text-sm text-muted-foreground">{rec.advice}</p> : null}
              </Card>
            ))}

            {data.prescriptions.map((rx) => (
              <Card key={rx.id} className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{rx.diagnosis || "Prescription"}</div>
                    <div className="text-xs text-muted-foreground">
                      {rx.doctorName} · {rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                </div>
                {rx.medicines.length > 0 ? (
                  <div className="space-y-1.5">
                    {rx.medicines.map((m, i) => (
                      <div key={i} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="font-medium">{m.name}</span>
                        {m.strength ? <span className="text-muted-foreground"> {m.strength}</span> : null}
                        <div className="text-xs text-muted-foreground">
                          {timing([
                            m.morning ? "1" : "",
                            m.afternoon ? "1" : "",
                            m.evening ? "1" : "",
                            m.night ? "1" : "",
                          ])}
                          {m.foodRelation ? ` · ${m.foodRelation}` : ""}
                          {m.durationDays ? ` · ${m.durationDays} days` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {rx.advice ? <p className="text-sm text-muted-foreground">{rx.advice}</p> : null}
              </Card>
            ))}

            {data.consultNotes.map((note, i) => (
              <Card key={i} className="space-y-2 p-5">
                <div className="text-xs text-muted-foreground">
                  {note.doctorName} · {new Date(note.date).toLocaleDateString()}
                </div>
                {note.assessment ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Assessment</div>
                    <p className="text-sm">{note.assessment}</p>
                  </div>
                ) : null}
                {note.plan ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Plan</div>
                    <p className="text-sm">{note.plan}</p>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Shared read-only from MediFlow · not a substitute for the patient&apos;s full records
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
        <h1 className="text-xl font-semibold">View a shared health record</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the code the patient gave you. No account needed.
        </p>
      </div>
      <Card className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="code">Share code</Label>
          <Input
            id="code"
            autoFocus
            autoCapitalize="characters"
            placeholder="e.g. 7K4M9QRT"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && redeem(code)}
            className="text-center font-mono text-lg tracking-widest"
          />
        </div>
        {error ? (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        <Button className="w-full" disabled={loading || !code.trim()} onClick={() => redeem(code)}>
          {loading ? "Checking…" : "View record"}
        </Button>
      </Card>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        This link is time-limited and controlled by the patient — it can be revoked at any time.
      </p>
    </div>
  );
}

export default function VaultViewPage() {
  return (
    <Suspense fallback={null}>
      <VaultViewInner />
    </Suspense>
  );
}
