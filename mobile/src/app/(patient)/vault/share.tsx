import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuroraScreen } from "@/components/aurora-screen";
import { Button, Card, ChoiceChips, Field, Mono, Muted } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import {
  VAULT_SHARE_DURATION_OPTIONS,
  VAULT_SHARE_SCOPE_OPTIONS,
  type VaultShareScope,
} from "@/lib/vault-types";

type Step = "choose" | "otp" | "code";

export default function VaultShare() {
  const client = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState<Step>("choose");
  const [scope, setScope] = useState<VaultShareScope>("last_6_months");
  const [duration, setDuration] = useState("120");
  const [grantId, setGrantId] = useState<string | null>(null);
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otp, setOtp] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const start = useMutation({
    mutationFn: () =>
      apiFetch<{ grantId: string; otpSentTo: string }>("/api/v1/patient/vault/share", {
        method: "POST",
        body: JSON.stringify({ scope, durationMinutes: Number(duration) }),
      }),
    onSuccess: (data) => {
      setGrantId(data.grantId);
      setOtpSentTo(data.otpSentTo);
      setStep("otp");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirm = useMutation({
    mutationFn: () =>
      apiFetch<{ shareCode: string; qrPayload: string; expiresAt: string }>(
        "/api/v1/patient/vault/share/confirm",
        { method: "POST", body: JSON.stringify({ grantId, otp }) }
      ),
    onSuccess: (data) => {
      setShareCode(data.shareCode);
      setQrPayload(data.qrPayload);
      setExpiresAt(data.expiresAt);
      setStep("code");
      client.invalidateQueries({ queryKey: ["patient", "vault", "shares"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shareLink = async () => {
    try {
      await Share.share({ message: `View my MediFlow health record: ${qrPayload}` });
    } catch {
      // Native share sheet dismissed/cancelled — nothing to do.
    }
  };

  if (step === "code") {
    return (
      <AuroraScreen
        variant="patient"
        compactHeader
        title="Share ready"
        subtitle="Read this to your doctor, or share the link"
      >
        <Card>
          <View style={styles.codeWrap}>
            <MaterialCommunityIcons name="shield-check" size={30} color={colors.primary} />
            <Mono style={styles.code}>{shareCode}</Mono>
            <Muted>Expires {new Date(expiresAt).toLocaleString()}</Muted>
          </View>
          <Button label="Share link" icon="share-variant" onPress={shareLink} />
          <Button label="Done" tone="secondary" onPress={() => router.replace("/(patient)/vault")} />
        </Card>
        <Muted>
          This code works until it expires or you revoke it from your vault. No account is needed
          to view it.
        </Muted>
      </AuroraScreen>
    );
  }

  if (step === "otp") {
    return (
      <AuroraScreen variant="patient" compactHeader title="Confirm it's you" subtitle={`Code sent to ${otpSentTo}`}>
        <Card>
          <View style={{ gap: 14 }}>
            <Field
              label="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              placeholder="000000"
            />
            <Button
              label="Confirm"
              loading={confirm.isPending}
              disabled={otp.length !== 6}
              onPress={() => confirm.mutate()}
            />
          </View>
        </Card>
      </AuroraScreen>
    );
  }

  return (
    <AuroraScreen
      variant="patient"
      compactHeader
      title="Share my vault"
      subtitle="Choose what to share and for how long"
    >
      <Card>
        <View style={{ gap: 16 }}>
          <View>
            <Text style={styles.label}>What to share</Text>
            <ChoiceChips
              options={VAULT_SHARE_SCOPE_OPTIONS}
              value={scope}
              onChange={(v) => setScope(v as VaultShareScope)}
            />
          </View>
          <View>
            <Text style={styles.label}>For how long</Text>
            <ChoiceChips options={VAULT_SHARE_DURATION_OPTIONS} value={duration} onChange={setDuration} />
          </View>
          <Muted>
            You'll confirm with a one-time code sent to your email before the share is created.
          </Muted>
          <Button label="Send code" loading={start.isPending} onPress={() => start.mutate()} />
        </View>
      </Card>
    </AuroraScreen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  codeWrap: { alignItems: "center", gap: 10, paddingVertical: 8 },
  code: { fontSize: 32, letterSpacing: 6, color: colors.text },
});
