import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { authClient } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { Card, Field, GhostButton, Muted, PrimaryButton, Screen, Title } from "@/components/ui";

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: email ?? "",
        otp: code.trim(),
      });
      if (error) {
        setError(error.message ?? "Invalid code.");
        return;
      }
      router.replace("/");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Enter your code</Title>
      <Muted>We sent a 6-digit code to {email}.</Muted>
      <Card>
        <Field
          label="Verification code"
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={6}
        />
        {error && <Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text>}
        <PrimaryButton
          label="Verify & sign in"
          onPress={verify}
          loading={loading}
          disabled={code.trim().length < 6}
        />
        <GhostButton label="Use a different email" onPress={() => router.back()} />
      </Card>
    </Screen>
  );
}
