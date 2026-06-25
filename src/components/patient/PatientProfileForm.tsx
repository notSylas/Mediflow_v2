"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BLOOD_GROUPS, GENDERS } from "@/lib/patient-constants";

const GENDER_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export interface PatientProfileValues {
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  currentMedications: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

export function PatientProfileForm({ initial }: { initial: PatientProfileValues }) {
  const router = useRouter();
  const [v, setV] = useState<PatientProfileValues>(initial);
  const [saving, setSaving] = useState(false);
  const inputClass = "h-11 rounded-xl bg-background/80";
  const textareaClass = "min-h-24 rounded-xl bg-background/80";
  const selectClass =
    "h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const set = <K extends keyof PatientProfileValues>(key: K, value: string) =>
    setV((prev) => ({ ...prev, [key]: value || null }));

  const save = async () => {
    if (!v.name.trim()) {
      toast.error("Full name is required before booking.");
      return;
    }
    if (v.name.includes("@")) {
      toast.error("Use your real name, not your email address.");
      return;
    }
    if (!v.dateOfBirth) {
      toast.error("Date of birth is required before booking.");
      return;
    }
    if (!v.gender) {
      toast.error("Gender is required before booking.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/patient/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        toast.error("Couldn't save your profile. Check the fields and try again.");
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border bg-muted/20 p-4">
        <div>
          <h3 className="font-semibold">Basic details</h3>
          <p className="text-sm text-muted-foreground">
            Full name, date of birth, and gender are required before booking a video
            consultation.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              className={inputClass}
              value={v.name}
              onChange={(e) => setV((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Patient's legal or preferred full name"
              autoComplete="name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              className={inputClass}
              value={v.dateOfBirth ?? ""}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              className={selectClass}
              value={v.gender ?? ""}
              onChange={(e) => set("gender", e.target.value)}
              required
            >
              <option value="">Select…</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="blood">Blood group</Label>
            <select
              id="blood"
              className={selectClass}
              value={v.bloodGroup ?? ""}
              onChange={(e) => set("bloodGroup", e.target.value)}
            >
              <option value="">Unknown</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-muted/20 p-4">
        <div>
          <h3 className="font-semibold">Clinical safety</h3>
          <p className="text-sm text-muted-foreground">
            These are the most important fields for avoiding unsafe prescriptions.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="allergies">Allergies</Label>
          <Textarea
            id="allergies"
            rows={3}
            className={textareaClass}
            placeholder="Medicines, foods, or other allergies — or write 'None'."
            value={v.allergies ?? ""}
            onChange={(e) => set("allergies", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="conditions">Ongoing / chronic conditions</Label>
          <Textarea
            id="conditions"
            rows={3}
            className={textareaClass}
            placeholder="e.g. diabetes, hypertension, asthma."
            value={v.chronicConditions ?? ""}
            onChange={(e) => set("chronicConditions", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="meds">Current medications</Label>
          <Textarea
            id="meds"
            rows={3}
            className={textareaClass}
            placeholder="Anything you take regularly, with doses if you know them."
            value={v.currentMedications ?? ""}
            onChange={(e) => set("currentMedications", e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-muted/20 p-4">
        <div>
          <h3 className="font-semibold">Emergency contact</h3>
          <p className="text-sm text-muted-foreground">
            Used only if the clinic needs urgent support for your safety.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ecname">Emergency contact name</Label>
            <Input
              id="ecname"
              className={inputClass}
              value={v.emergencyContactName ?? ""}
              onChange={(e) => set("emergencyContactName", e.target.value)}
              placeholder="Who should we contact"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ecphone">Emergency contact phone</Label>
            <Input
              id="ecphone"
              type="tel"
              className={inputClass}
              value={v.emergencyContactPhone ?? ""}
              onChange={(e) => set("emergencyContactPhone", e.target.value)}
              placeholder="Phone number"
            />
          </div>
        </div>
      </section>

      <Button onClick={save} disabled={saving} size="lg" className="w-full sm:w-auto">
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}
