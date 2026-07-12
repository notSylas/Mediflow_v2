"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, MailCheck, ShieldAlert } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Variant = "patient" | "doctor";

/**
 * Email-OTP sign-in, the only public-facing method (passwords are an opt-in
 * convenience configured later in Account settings, never a primary option —
 * see docs/PRD.md and the 2026-06-25 auth-split plan).
 *
 * `variant` splits the two surfaces that share this form:
 * - "patient" (the /login page): Google is offered when configured.
 * - "doctor" (the /doctor/login page): Google is never offered — it can't be
 *   role-filtered pre-auth, so a patient clicking it would authenticate as a
 *   patient on the doctor surface. OTP-only removes that ambiguity. After a
 *   successful sign-in we also confirm the account is actually a doctor and,
 *   if not, show an explicit message instead of silently dropping them into
 *   the clinic UI they can't use.
 */
export function LoginForm({
  googleEnabled,
  variant = "patient",
}: {
  googleEnabled: boolean;
  variant?: Variant;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirectTo");
  const fallbackRedirect = variant === "doctor" ? "/doctor" : "/";
  const redirectTo =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : fallbackRedirect;

  // Google is only ever an option on the patient surface.
  const showGoogle = googleEnabled && variant === "patient";

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongRole, setWrongRole] = useState(false);

  const succeed = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });
      if (error) {
        setError(error.message ?? "Failed to send code.");
        return;
      }
      setStep("otp");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: otp.trim(),
      });
      if (error) {
        setError(error.message ?? "Invalid code.");
        return;
      }
      // On the doctor surface, confirm the freshly-signed-in account actually
      // has clinic access before sending them on. Better Auth has no pre-auth
      // role lookup, so this is necessarily a post-auth check.
      if (variant === "doctor") {
        const { data: session } = await authClient.getSession();
        if (session?.user?.role !== "doctor") {
          setWrongRole(true);
          return;
        }
      }
      succeed();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });
      if (error) {
        setError(error.message ?? "Google sign-in failed.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // A non-doctor signed in on the doctor surface. They now hold a valid
  // (patient) session, so we point them at their own portal rather than
  // auto-redirecting — the explicit message tells them why they're not in the
  // clinic UI.
  if (wrongRole) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="h-4.5 w-4.5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              This account isn&apos;t set up for clinic access
            </p>
            <p className="text-sm text-muted-foreground">
              You&apos;re signed in, but{" "}
              <span className="font-medium text-foreground">{email}</span> is a
              patient account. The clinic dashboard is for staff only.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="h-11">
          <Link href="/patient">Go to your patient portal</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {step === "email" ? (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={isLoading} className="h-11">
            {isLoading ? "Sending…" : "Send code"}
            {!isLoading && (
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-xl bg-accent/60 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
              <MailCheck className="h-4 w-4" />
            </span>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
          </div>
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="······"
            className="h-12 text-center text-lg font-medium tracking-[0.4em]"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={isLoading} className="h-11">
            {isLoading ? "Verifying…" : "Verify & sign in"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep("email")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Use a different email
          </Button>
        </form>
      )}

      {showGoogle && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            or
            <Separator className="flex-1" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="h-11"
          >
            Continue with Google
          </Button>
        </>
      )}
    </div>
  );
}
