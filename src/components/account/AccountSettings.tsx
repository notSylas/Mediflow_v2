"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserRound } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";

export function AccountSettings({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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
