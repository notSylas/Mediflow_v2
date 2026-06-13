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

  const set = <K extends keyof PatientProfileValues>(key: K, value: string) =>
    setV((prev) => ({ ...prev, [key]: value || null }));

  const save = async () => {
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="dob">Date of birth</Label>
          <Input
            id="dob"
            type="date"
            value={v.dateOfBirth ?? ""}
            onChange={(e) => set("dateOfBirth", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            value={v.gender ?? ""}
            onChange={(e) => set("gender", e.target.value)}
          >
            <option value="">Select…</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="blood">Blood group</Label>
          <select
            id="blood"
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
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

      <div className="space-y-1.5">
        <Label htmlFor="allergies">Allergies</Label>
        <Textarea
          id="allergies"
          rows={2}
          placeholder="Medicines, foods, or other allergies — or write 'None'."
          value={v.allergies ?? ""}
          onChange={(e) => set("allergies", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="conditions">Ongoing / chronic conditions</Label>
        <Textarea
          id="conditions"
          rows={2}
          placeholder="e.g. diabetes, hypertension, asthma."
          value={v.chronicConditions ?? ""}
          onChange={(e) => set("chronicConditions", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meds">Current medications</Label>
        <Textarea
          id="meds"
          rows={2}
          placeholder="Anything you take regularly, with doses if you know them."
          value={v.currentMedications ?? ""}
          onChange={(e) => set("currentMedications", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ecname">Emergency contact name</Label>
          <Input
            id="ecname"
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
            value={v.emergencyContactPhone ?? ""}
            onChange={(e) => set("emergencyContactPhone", e.target.value)}
            placeholder="Phone number"
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}
