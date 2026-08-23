"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * One-time notice, shown by web/app/(app)/patient/vault/layout.tsx once a
 * patient has an actual relationship with the app's doctor. Acknowledging it
 * grants that doctor standing, code-free vault access for consultation —
 * separate from and additive to Flow A's code-based share for any other
 * doctor, which still requires an explicit share every time.
 */
export function VaultDoctorConsentNotice() {
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  const acknowledge = async () => {
    setSaving(true);
    try {
      await fetch("/api/v1/patient/vault/doctor-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "web" }),
      });
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogTitle>Your doctor can see your vault</DialogTitle>
          <DialogDescription>
            Your MediFlow doctor can view this vault for better consultation — the same record
            they&apos;d otherwise ask you to bring in. You can still share your vault with anyone
            else, any time, from the Share page — that stays a separate, code-based share you
            control.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={acknowledge} disabled={saving}>
            {saving ? "Saving…" : "Got it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
