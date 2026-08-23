"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Share2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PatientPageShell } from "@/components/patient/PatientPortal";

type Scope = "everything" | "last_6_months";
type Step = "choose" | "code";

interface PreviewCounts {
  prescriptions: number;
  consultNotes: number;
  addedRecords: number;
}

interface ShareSummary {
  id: string;
  status: string;
}

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
  const [shareCode, setShareCode] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [preview, setPreview] = useState<PreviewCounts | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [hasActiveShare, setHasActiveShare] = useState(false);

  // One-time check so a patient about to create a new code sees the
  // "this replaces your existing one" consequence before they commit to it,
  // not after — regenerating immediately revokes whatever code is out there.
  useEffect(() => {
    fetch("/api/v1/patient/vault/share")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { grants: ShareSummary[] } | null) => {
        setHasActiveShare(Boolean(data?.grants.some((g) => g.status === "active")));
      })
      .catch(() => {});
  }, []);

  // Recomputed from the same query createShare would actually run — so this
  // never drifts from what a share genuinely includes.
  useEffect(() => {
    let cancelled = false;
    // Signals a new fetch just started for the new scope — can't be derived
    // in render since it depends on the async request's lifecycle itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewLoading(true);
    fetch(`/api/v1/patient/vault/share/preview?scope=${scope}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PreviewCounts | null) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await postJSON<{ shareCode: string; qrPayload: string }>(
        "/api/v1/patient/vault/share",
        { scope }
      );
      setShareCode(data.shareCode);
      setQrPayload(data.qrPayload);
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "code") {
    const copy = async (value: string, which: "code" | "link") => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(which);
        setTimeout(() => setCopied((c) => (c === which ? null : c)), 2000);
      } catch {
        // Clipboard permission denied or unavailable — the value is still
        // visible/selectable on screen, so this fails quietly.
      }
    };
    const shareLink = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "MediFlow health record",
            text: `View my MediFlow health record: ${qrPayload}`,
            url: qrPayload,
          });
        } catch {
          // User cancelled the share sheet — nothing to do.
        }
      } else {
        void copy(qrPayload, "link");
      }
    };

    return (
      <PatientPageShell className="max-w-lg">
        {/* The one genuine "result" moment in this flow — a successful,
            time-bound credential — so it gets the gradient hero treatment
            Design.md scopes to result/status surfaces (same technique as
            the Prescription Analyzer's result panel). */}
        <div className="animate-in fade-in zoom-in-95 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-transparent p-8 text-center shadow-sm duration-500">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">Share ready</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read this to your doctor, or send them the link.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <p className="flex-1 rounded-2xl bg-background/80 py-4 font-mono text-2xl font-bold tracking-[0.2em] text-primary sm:text-3xl">
              {shareCode}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              onClick={() => copy(shareCode, "code")}
              aria-label="Copy code"
            >
              {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => copy(qrPayload, "link")}>
              {copied === "link" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied === "link" ? "Link copied" : "Copy link"}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={shareLink}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            This code works until you create a new one or revoke it.
          </p>
          <Button className="mt-5 w-full" onClick={() => router.push("/patient/vault")}>
            Done
          </Button>
        </div>
      </PatientPageShell>
    );
  }

  return (
    <PatientPageShell className="max-w-lg">
      <Card className="rounded-3xl">
        <CardContent className="space-y-6 p-8">
          <div>
            <h1 className="text-xl font-semibold">Share my vault</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose what to share.
            </p>
          </div>

          {hasActiveShare ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-700 dark:text-amber-400">
              You have an active share. Creating a new one will immediately stop the old code from
              working.
            </div>
          ) : null}

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
            <div className="flex min-h-5 items-center gap-1.5 text-sm text-muted-foreground">
              {previewLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : preview ? (
                <span>
                  This includes{" "}
                  {[
                    preview.prescriptions > 0 &&
                      `${preview.prescriptions} prescription${preview.prescriptions === 1 ? "" : "s"}`,
                    preview.consultNotes > 0 &&
                      `${preview.consultNotes} note${preview.consultNotes === 1 ? "" : "s"}`,
                    preview.addedRecords > 0 &&
                      `${preview.addedRecords} added record${preview.addedRecords === 1 ? "" : "s"}`,
                  ]
                    .filter(Boolean)
                    .join(", ") || "nothing yet"}
                  .
                </span>
              ) : null}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={loading} onClick={start}>
            {loading ? "Creating share…" : "Create share code"}
          </Button>
        </CardContent>
      </Card>
    </PatientPageShell>
  );
}
