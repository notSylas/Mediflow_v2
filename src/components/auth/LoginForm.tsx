"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { cn } from "@/lib/utils";

type Method = "password" | "otp";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirectTo");
  const redirectTo =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/";

  const [method, setMethod] = useState<Method>("otp");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const succeed = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(error.message ?? "Wrong email or password.");
        return;
      }
      succeed();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
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

  const switchMethod = (next: Method) => {
    setMethod(next);
    setStep("email");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Method toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["password", "otp"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={method === m}
            onClick={() => switchMethod(m)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              method === m
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "password" ? "Password" : "Email code"}
          </button>
        ))}
      </div>

      {method === "password" ? (
        <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
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
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="h-11"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={isLoading} className="h-11">
            {isLoading ? "Signing in…" : "Sign in"}
            {!isLoading && (
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
            )}
          </Button>
        </form>
      ) : step === "email" ? (
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

      {googleEnabled && (
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

      <p className="text-center text-sm text-muted-foreground">
        New to MediFlow?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
