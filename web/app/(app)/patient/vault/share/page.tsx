"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PatientPageShell } from "@/components/patient/PatientPortal";

type Scope = "everything" | "last_6_months";
type Step = "choose" | "otp" | "code";

const DURATIONS = [
  { label: "2 hours", value: 120 },
  { label: "24 hours", value: 1440 },
  { label: "7 days", value: 10080 },
];

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Something went wrong");
  return json as T;
}

export default function VaultSharePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [scope, setScope] = useState<Scope>("last_6_months");
  const [duration, setDuration] = useState(120);
  const [grantId, setGrantId] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otp, setOtp] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await postJSON<{ grantId: string; otpSentTo: string }>(
        "/api/v1/patient/vault/share",
        { scope, durationMinutes: duration }
      );
      setGrantId(data.grantId);
      setOtpSentTo(data.otpSentTo);
      setStep("otp");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await postJSON<{ shareCode: string; expiresAt: string }>(
        "/api/v1/patient/vault/share/confirm",
        { grantId, otp }
      );
      setShareCode(data.shareCode);
      setExpiresAt(data.expiresAt);
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "code") {
    return (
      <PatientPageShell className="max-w-lg">
        <Card className="glass rounded-3xl">
          <CardContent className="space-y-4 p-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-teal-700" />
            <h1 className="text-xl font-semibold">Share ready</h1>
            <p className="text-sm text-muted-foreground">
              Read this to your doctor, or let them scan/type it at{" "}
              <span className="font-mono">mediflow.app/vault/view</span>
            </p>
            <p className="rounded-2xl bg-teal-50 py-4 font-mono text-3xl font-bold tracking-[0.3em] text-teal-900">
              {shareCode}
            </p>
            <p className="text-sm text-muted-foreground">
              Expires {new Date(expiresAt).toLocaleString()}
            </p>
            <Button className="w-full" onClick={() => router.push("/patient/vault")}>
              Done
            </Button>
          </CardContent>
        </Card>
      </PatientPageShell>
    );
  }

  if (step === "otp") {
    return (
      <PatientPageShell className="max-w-lg">
        <Card className="glass rounded-3xl">
          <CardContent className="space-y-4 p-8">
            <h1 className="text-xl font-semibold">Confirm it&apos;s you</h1>
            <p className="text-sm text-muted-foreground">Code sent to {otpSentTo}</p>
            <div className="space-y-1.5">
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp"
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="text-center font-mono text-lg tracking-widest"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={loading || otp.length !== 6} onClick={confirm}>
              {loading ? "Confirming…" : "Confirm"}
            </Button>
          </CardContent>
        </Card>
      </PatientPageShell>
    );
  }

  return (
    <PatientPageShell className="max-w-lg">
      <Card className="glass rounded-3xl">
        <CardContent className="space-y-6 p-8">
          <div>
            <h1 className="text-xl font-semibold">Share my vault</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose what to share and for how long.
            </p>
          </div>

          <div className="space-y-2">
            <Label>What to share</Label>
            <div className="flex gap-2">
              {(["everything", "last_6_months"] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={scope === s ? "default" : "outline"}
                  onClick={() => setScope(s)}
                >
                  {s === "everything" ? "Everything" : "Last 6 months"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>For how long</Label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <Button
                  key={d.value}
                  type="button"
                  variant={duration === d.value ? "default" : "outline"}
                  onClick={() => setDuration(d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            You&apos;ll confirm with a one-time code sent to your email before the share is created.
          </p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={loading} onClick={start}>
            {loading ? "Sending code…" : "Send code"}
          </Button>
        </CardContent>
      </Card>
    </PatientPageShell>
  );
}
