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

export function DoctorRegisterForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/doctor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        const message =
          response.status === 401
            ? "That code isn't right."
            : response.status === 503
              ? "Doctor registration isn't enabled right now."
              : typeof json?.error === "string"
                ? json.error
                : "Couldn't register. Please try again.";
        setError(message);
        return;
      }

      router.push("/doctor/settings");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register as a doctor</CardTitle>
        <CardDescription>
          Enter the registration code you were given to set up clinic access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Registration code</Label>
            <Input
              id="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter your code"
              autoComplete="off"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isSubmitting || !code.trim()}>
            {isSubmitting ? "Verifying…" : "Register"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
