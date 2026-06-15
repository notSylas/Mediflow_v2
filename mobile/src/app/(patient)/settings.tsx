import { useState } from "react";
import { router } from "expo-router";
import {
  BackHeader,
  Body,
  Button,
  Card,
  ErrorState,
  Field,
  Muted,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { LegalLinks } from "@/components/legal-links";
import { authClient, useSession } from "@/lib/auth";

export default function PatientSettings() {
  const { data: session, refetch } = useSession();
  const [name, setName] = useState(session?.user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await authClient.updateUser({ name: name.trim() });
      if (updateError) throw new Error(updateError.message);
      await refetch();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Couldn't update your account.");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/(auth)/login");
  };

  return (
    <Screen>
      <BackHeader title="Account settings" onBack={() => router.back()} />
      <Card>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <Muted>{session?.user.email}</Muted>
        {error ? <ErrorState message={error} /> : null}
        <Button label="Save account" loading={saving} disabled={!name.trim()} onPress={save} />
      </Card>
      <SectionHeader title="Privacy and support" />
      <Card>
        <Body strong>Medical information</Body>
        <Muted>
          Medical details are visible only to your authenticated clinic participants.
          Do not share OTP codes or account access.
        </Muted>
        <Body strong>Account deletion</Body>
        <Muted>
          Account deletion and medical-record retention require clinic review. Contact
          MediFlow support from your registered email.
        </Muted>
      </Card>
      <SectionHeader title="Legal" />
      <LegalLinks />
      <Button label="Sign out" tone="danger" icon="logout" onPress={signOut} />
    </Screen>
  );
}
