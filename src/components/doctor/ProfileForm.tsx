"use client";

import { useState } from "react";
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
  feeInPaise: number;
  slotMinutes: number;
  timezone: string;
}

export function ProfileForm({
  initialProfile,
}: {
  initialProfile: DoctorProfile;
}) {
  const [specialty, setSpecialty] = useState(initialProfile.specialty ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [feeInRupees, setFeeInRupees] = useState(
    (initialProfile.feeInPaise / 100).toString()
  );
  const [slotMinutes, setSlotMinutes] = useState(
    initialProfile.slotMinutes.toString()
  );
  const [timezone, setTimezone] = useState(initialProfile.timezone);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const feeInPaise = Math.round(Number(feeInRupees) * 100);
    const slotMinutesValue = Number(slotMinutes);

    if (!Number.isFinite(feeInPaise) || feeInPaise <= 0) {
      setError("Fee must be a positive number.");
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

    setIsSaving(true);

    try {
      const response = await fetch("/api/doctor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialty: specialty.trim() || null,
          bio: bio.trim() || null,
          feeInPaise,
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
