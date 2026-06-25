"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, MailCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";

export function AccountSettings({
  initialName,
  currentEmail,
}: {
  initialName: string;
  currentEmail: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Change-email is a two-step flow: request a code to the new address, then
  // confirm it. We keep the requested address around so the confirm step
  // knows which email the code belongs to.
  const [emailStep, setEmailStep] = useState<"request" | "confirm">("request");
  const [newEmail, setNewEmail] = useState("");
  const [requestedEmail, setRequestedEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setSavingName(false);
    if (error) {
      toast.error(error.message ?? "Couldn't update your name.");
      return;
    }
    toast.success("Name updated");
    router.refresh();
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message ?? "Couldn't change your password.");
      return;
    }
    toast.success("Password changed");
    setCurrentPassword("");
    setNewPassword("");
  };

  const requestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = newEmail.trim().toLowerCase();
    setEmailError(null);
    if (target === currentEmail.toLowerCase()) {
      setEmailError("That's already your email.");
      return;
    }
    setEmailBusy(true);
    const { error } = await authClient.emailOtp.requestEmailChange({
      newEmail: target,
    });
    setEmailBusy(false);
    if (error) {
      setEmailError(error.message ?? "Couldn't send a code to that address.");
      return;
    }
    // Better Auth returns success even when the address is already in use (it
    // won't say which), so we can't promise the code was sent — only that, if
    // the address is free, a code is on its way.
    setRequestedEmail(target);
    setEmailOtp("");
    setEmailStep("confirm");
  };

  const confirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailBusy(true);
    const { error } = await authClient.emailOtp.changeEmail({
      newEmail: requestedEmail,
      otp: emailOtp.trim(),
    });
    setEmailBusy(false);
    if (error) {
      // The one case worth calling out specifically: the address got taken
      // between request and confirm (or was never free). Everything else is a
      // bad/expired code.
      setEmailError(
        /in use/i.test(error.message ?? "")
          ? "That email is already linked to another account."
          : error.message ?? "That code didn't work. Request a new one."
      );
      return;
    }
    toast.success("Email updated");
    setEmailStep("request");
    setNewEmail("");
    setRequestedEmail("");
    setEmailOtp("");
    router.refresh();
  };

  const cancelEmailChange = () => {
    setEmailStep("request");
    setEmailOtp("");
    setEmailError(null);
  };

  return (
    <div className="space-y-6">
      <Card className="glass rounded-3xl">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Your details</CardTitle>
            <CardDescription>The name your doctor sees on your visits.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="flex flex-col gap-4 sm:max-w-lg">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                className="h-11 rounded-xl bg-background/80"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={savingName} className="self-start px-6">
              {savingName ? "Saving…" : "Save name"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass rounded-3xl">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <AtSign className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Email address</CardTitle>
            <CardDescription>
              Where you receive sign-in codes. Currently{" "}
              <span className="font-medium text-foreground">{currentEmail}</span>.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {emailStep === "request" ? (
            <form onSubmit={requestEmailChange} className="flex flex-col gap-4 sm:max-w-lg">
              <div className="space-y-1.5">
                <Label htmlFor="newEmail">New email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-11 rounded-xl bg-background/80"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll send a code to the new address to confirm it&apos;s yours.
                </p>
              </div>
              {emailError && (
                <p role="alert" className="text-sm text-destructive">
                  {emailError}
                </p>
              )}
              <Button type="submit" disabled={emailBusy} className="self-start px-6">
                {emailBusy ? "Sending…" : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={confirmEmailChange} className="flex flex-col gap-4 sm:max-w-lg">
              <div className="flex items-start gap-3 rounded-xl bg-accent/60 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
                  <MailCheck className="h-4 w-4" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Enter the code we sent to{" "}
                  <span className="font-medium text-foreground">{requestedEmail}</span>.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emailOtp">Verification code</Label>
                <Input
                  id="emailOtp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  className="h-12 rounded-xl bg-background/80 text-center text-lg font-medium tracking-[0.4em]"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  placeholder="······"
                />
              </div>
              {emailError && (
                <p role="alert" className="text-sm text-destructive">
                  {emailError}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={emailBusy} className="px-6">
                  {emailBusy ? "Confirming…" : "Confirm new email"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelEmailChange}
                  disabled={emailBusy}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="glass rounded-3xl">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              If you sign in with a one-time code only, you can set a password here for
              faster sign-ins.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="flex flex-col gap-4 sm:max-w-lg">
            <div className="space-y-1.5">
              <Label htmlFor="current">Current password</Label>
              <PasswordInput
                id="current"
                autoComplete="current-password"
                className="h-11 rounded-xl bg-background/80"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Leave blank if you've never set one"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <PasswordInput
                id="new"
                autoComplete="new-password"
                minLength={8}
                className="h-11 rounded-xl bg-background/80"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <Button type="submit" disabled={savingPassword} className="self-start px-6">
              {savingPassword ? "Saving…" : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
