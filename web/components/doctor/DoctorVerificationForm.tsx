"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SystemOfMedicine = "allopathy" | "homeopathy" | "ayurveda";

interface Initial {
  registrationNo: string;
  stateMedicalCouncil: string;
  yearOfRegistration: number | null;
  systemOfMedicine: SystemOfMedicine;
  hprId: string;
}

const CURRENT_YEAR = new Date().getFullYear();

async function uploadDoc(file: File, kind: "identity" | "registration" | "hpr") {
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  const res = await fetch("/api/doctor/verification/documents", { method: "POST", body });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(typeof json?.error === "string" ? json.error : `Couldn't upload ${kind} document`);
  }
}

export function DoctorVerificationForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [registrationNo, setRegistrationNo] = useState(initial.registrationNo);
  const [stateMedicalCouncil, setStateMedicalCouncil] = useState(initial.stateMedicalCouncil);
  const [yearOfRegistration, setYearOfRegistration] = useState(
    initial.yearOfRegistration ? String(initial.yearOfRegistration) : ""
  );
  const [systemOfMedicine, setSystemOfMedicine] = useState<SystemOfMedicine>(
    initial.systemOfMedicine
  );
  const [hprId, setHprId] = useState(initial.hprId);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [hprFile, setHprFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const year = Number.parseInt(yearOfRegistration, 10);
    if (!Number.isFinite(year) || year < 1950 || year > CURRENT_YEAR) {
      setError("Enter a valid year of registration.");
      return;
    }
    if (!identityFile || !registrationFile) {
      setError("Upload both an ID proof and your council registration certificate.");
      return;
    }

    setIsSubmitting(true);
    try {
      await uploadDoc(identityFile, "identity");
      await uploadDoc(registrationFile, "registration");
      if (hprFile) await uploadDoc(hprFile, "hpr");

      const res = await fetch("/api/doctor/verification/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNo: registrationNo.trim(),
          stateMedicalCouncil: stateMedicalCouncil.trim(),
          yearOfRegistration: year,
          systemOfMedicine,
          hprId: hprId.trim() || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(typeof json?.error === "string" ? json.error : "Couldn't submit for review.");
        return;
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration details</CardTitle>
        <CardDescription>
          We manually cross-check this against NMC&apos;s public Indian Medical
          Register before approving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registrationNo">Medical registration number</Label>
            <Input
              id="registrationNo"
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stateMedicalCouncil">State medical council</Label>
            <Input
              id="stateMedicalCouncil"
              value={stateMedicalCouncil}
              onChange={(e) => setStateMedicalCouncil(e.target.value)}
              placeholder="e.g. Karnataka Medical Council"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearOfRegistration">Year of registration</Label>
            <Input
              id="yearOfRegistration"
              type="number"
              min={1950}
              max={CURRENT_YEAR}
              value={yearOfRegistration}
              onChange={(e) => setYearOfRegistration(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemOfMedicine">System of medicine</Label>
            <Select
              value={systemOfMedicine}
              onValueChange={(value) => setSystemOfMedicine(value as SystemOfMedicine)}
            >
              <SelectTrigger id="systemOfMedicine">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allopathy">Allopathy</SelectItem>
                <SelectItem value="homeopathy">Homeopathy</SelectItem>
                <SelectItem value="ayurveda">Ayurveda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hprId">HPR ID (optional)</Label>
            <Input
              id="hprId"
              value={hprId}
              onChange={(e) => setHprId(e.target.value)}
              placeholder="ABDM Healthcare Professionals Registry ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="identityFile">ID proof</Label>
            <input
              id="identityFile"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setIdentityFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationFile">Council registration certificate</Label>
            <input
              id="registrationFile"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setRegistrationFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hprFile">HPR screenshot (optional)</Label>
            <input
              id="hprFile"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setHprFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit for review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
