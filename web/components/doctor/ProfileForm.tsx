"use client";

import { useRef, useState } from "react";
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

interface DoctorProfile {
  specialty: string | null;
  bio: string | null;
  qualifications: string | null;
  registrationNo: string | null;
  yearsExperience: number | null;
  languages: string | null;
  feeInPaise: number;
  carePlanPriceInPaise: number;
  slotMinutes: number;
  timezone: string;
}

export function ProfileForm({
  initialProfile,
  initialSignatureUrl,
}: {
  initialProfile: DoctorProfile;
  initialSignatureUrl?: string | null;
}) {
  const [specialty, setSpecialty] = useState(initialProfile.specialty ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [qualifications, setQualifications] = useState(initialProfile.qualifications ?? "");
  const [registrationNo, setRegistrationNo] = useState(initialProfile.registrationNo ?? "");
  const [yearsExperience, setYearsExperience] = useState(
    initialProfile.yearsExperience?.toString() ?? ""
  );
  const [languages, setLanguages] = useState(initialProfile.languages ?? "");
  const [feeInRupees, setFeeInRupees] = useState(
    (initialProfile.feeInPaise / 100).toString()
  );
  const [carePlanPriceInRupees, setCarePlanPriceInRupees] = useState(
    (initialProfile.carePlanPriceInPaise / 100).toString()
  );
  const [slotMinutes, setSlotMinutes] = useState(
    initialProfile.slotMinutes.toString()
  );
  const [timezone, setTimezone] = useState(initialProfile.timezone);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [signatureUrl, setSignatureUrl] = useState(initialSignatureUrl ?? null);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const uploadSignature = async (file: File) => {
    setSignatureUploading(true);
    setSignatureError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/doctor/signature", { method: "POST", body });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(typeof json?.error === "string" ? json.error : "Upload failed");
      }
      // The upload endpoint doesn't echo the file back — re-encode the same
      // bytes the browser already has for an instant preview, rather than
      // round-tripping to the server again just to redraw what was just sent.
      const reader = new FileReader();
      reader.onload = () => setSignatureUrl(reader.result as string);
      reader.readAsDataURL(file);
    } catch (e) {
      setSignatureError((e as Error).message);
    } finally {
      setSignatureUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const feeInPaise = Math.round(Number(feeInRupees) * 100);
    const carePlanPriceInPaise = Math.round(Number(carePlanPriceInRupees) * 100);
    const slotMinutesValue = Number(slotMinutes);

    if (!Number.isFinite(feeInPaise) || feeInPaise <= 0) {
      setError("Fee must be a positive number.");
      return;
    }

    if (!Number.isFinite(carePlanPriceInPaise) || carePlanPriceInPaise <= 0) {
      setError("Care plan price must be a positive number.");
      return;
    }

    if (!Number.isInteger(slotMinutesValue) || slotMinutesValue <= 0) {
      setError("Slot length must be a positive number of minutes.");
      return;
    }

    if (!timezone.trim()) {
      setError("Timezone is required.");
      return;
    }

    const yearsExperienceValue = yearsExperience.trim() ? Number(yearsExperience) : null;
    if (
      yearsExperienceValue !== null &&
      (!Number.isInteger(yearsExperienceValue) || yearsExperienceValue < 0 || yearsExperienceValue > 80)
    ) {
      setError("Years of experience must be a whole number between 0 and 80.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/doctor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialty: specialty.trim() || null,
          bio: bio.trim() || null,
          qualifications: qualifications.trim() || null,
          registrationNo: registrationNo.trim() || null,
          yearsExperience: yearsExperienceValue,
          languages: languages.trim() || null,
          feeInPaise,
          carePlanPriceInPaise,
          slotMinutes: slotMinutesValue,
          timezone: timezone.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      setSuccess(true);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Shown to patients when they book a consultation with you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Input
              id="specialty"
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              placeholder="e.g. General Physician"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="A short introduction for patients"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qualifications">Qualifications</Label>
            <Input
              id="qualifications"
              value={qualifications}
              onChange={(event) => setQualifications(event.target.value)}
              placeholder="e.g. MBBS, MD (Internal Medicine)"
            />
            <p className="text-xs text-muted-foreground">
              Shown on your profile and on every prescription you issue.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationNo">Medical registration number</Label>
            <Input
              id="registrationNo"
              value={registrationNo}
              onChange={(event) => setRegistrationNo(event.target.value)}
              placeholder="e.g. KMC-2026-1842"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <Input
                id="yearsExperience"
                type="number"
                min="0"
                max="80"
                step="1"
                value={yearsExperience}
                onChange={(event) => setYearsExperience(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="languages">Languages</Label>
              <Input
                id="languages"
                value={languages}
                onChange={(event) => setLanguages(event.target.value)}
                placeholder="e.g. English, Hindi"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Signature</Label>
            <p className="text-xs text-muted-foreground">
              Shown on every prescription you issue. PNG or JPG, up to 1 MB.
            </p>
            <div className="flex items-center gap-4">
              {signatureUrl ? (
                // A data: URI (uploaded bytes or a locally re-read file),
                // not an optimizable remote image.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureUrl}
                  alt="Your signature"
                  className="h-16 w-32 rounded-md border bg-white object-contain p-1"
                />
              ) : (
                <div className="flex h-16 w-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                  No signature yet
                </div>
              )}
              <div className="space-y-1">
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadSignature(file);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={signatureUploading}
                  onClick={() => signatureInputRef.current?.click()}
                >
                  {signatureUploading
                    ? "Uploading…"
                    : signatureUrl
                      ? "Replace signature"
                      : "Upload signature"}
                </Button>
                {signatureError && <p className="text-sm text-destructive">{signatureError}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fee">Consultation fee (INR)</Label>
              <Input
                id="fee"
                type="number"
                min="0"
                step="0.01"
                value={feeInRupees}
                onChange={(event) => setFeeInRupees(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slotMinutes">Slot length (minutes)</Label>
              <Input
                id="slotMinutes"
                type="number"
                min="5"
                step="5"
                value={slotMinutes}
                onChange={(event) => setSlotMinutes(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="carePlanPrice">MediFlow Care price (INR / month)</Label>
            <Input
              id="carePlanPrice"
              type="number"
              min="0"
              step="0.01"
              value={carePlanPriceInRupees}
              onChange={(event) => setCarePlanPriceInRupees(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Monthly subscription price shown to patients before they start the care plan.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Asia/Kolkata"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-muted-foreground">Profile saved.</p>
          )}

          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
