import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuroraScreen } from "@/components/aurora-screen";
import { VaultDoctorConsentModal } from "@/components/vault-doctor-consent-modal";
import { Button, Card, ChoiceChips, Mono, Muted } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import {
  VAULT_SHARE_SCOPE_OPTIONS,
  type VaultShareScope,
  type VaultShareSummary,
} from "@/lib/vault-types";

type Step = "choose" | "code";

interface PreviewCounts {
  prescriptions: number;
  consultNotes: number;
  addedRecords: number;
}

export default function VaultShare() {
  const client = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState<Step>("choose");
  const [scope, setScope] = useState<VaultShareScope>("last_6_months");
  const [shareCode, setShareCode] = useState("");
  const [qrPayload, setQrPayload] = useState("");

  // Recomputed from the same query createShare would actually run — so this
  // never drifts from what a share genuinely includes.
  const preview = useQuery({
    queryKey: ["patient", "vault", "share", "preview", scope],
    queryFn: () => apiFetch<PreviewCounts>(`/api/v1/patient/vault/share/preview?scope=${scope}`),
  });

  // So the patient sees the "this replaces your existing code" consequence
  // before they commit to creating a new one, not after.
  const existingShares = useQuery({
    queryKey: ["patient", "vault", "shares"],
    queryFn: () => apiFetch<{ grants: VaultShareSummary[] }>("/api/v1/patient/vault/share"),
  });
  const hasActiveShare = existingShares.data?.grants.some((g) => g.status === "active") ?? false;

  const start = useMutation({
    mutationFn: () =>
      apiFetch<{ shareCode: string; qrPayload: string }>("/api/v1/patient/vault/share", {
        method: "POST",
        body: JSON.stringify({ scope }),
      }),
    onSuccess: (data) => {
      setShareCode(data.shareCode);
      setQrPayload(data.qrPayload);
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

  const copyLink = async () => {
    await Clipboard.setStringAsync(qrPayload);
    toast.success("Link copied.");
  };

  if (step === "code") {
    return (
      <AuroraScreen
        variant="patient"
        compactHeader
        title="Share ready"
        subtitle="Read this to your doctor, or send them the link"
      >
        <Card tone="accent">
          <View style={styles.codeWrap}>
            <MaterialCommunityIcons name="shield-check" size={30} color={colors.primary} />
            <Mono style={styles.code}>{shareCode}</Mono>
          </View>
          <Button label="Share link" icon="share-variant" onPress={shareLink} />
          <Button label="Copy link" icon="content-copy" tone="secondary" onPress={copyLink} />
          <Button label="Done" tone="secondary" onPress={() => router.replace("/(patient)/vault")} />
        </Card>
        <Muted>
          This code works until you create a new one or revoke it from your vault. No account is
          needed to view it.
        </Muted>
      </AuroraScreen>
    );
  }

  return (
    <>
      <VaultDoctorConsentModal />
      <AuroraScreen
        variant="patient"
        compactHeader
        title="Share my vault"
        subtitle="Choose what to share"
      >
      {hasActiveShare ? (
        <Card tone="accent">
          <Muted>
            You have an active share. Creating a new one will immediately stop the old code from
            working.
          </Muted>
        </Card>
      ) : null}
      <Card>
        <View style={{ gap: 16 }}>
          <View>
            <Text style={styles.label}>What to share</Text>
            <ChoiceChips
              options={VAULT_SHARE_SCOPE_OPTIONS}
              value={scope}
              onChange={(v) => setScope(v as VaultShareScope)}
            />
            <Muted>{previewText(preview.data, preview.isLoading)}</Muted>
          </View>
          <Button label="Create share code" loading={start.isPending} onPress={() => start.mutate()} />
        </View>
      </Card>
      </AuroraScreen>
    </>
  );
}

function previewText(counts: PreviewCounts | undefined, loading: boolean): string {
  if (loading || !counts) return "Checking what this includes…";
  const parts = [
    counts.prescriptions > 0 && `${counts.prescriptions} prescription${counts.prescriptions === 1 ? "" : "s"}`,
    counts.consultNotes > 0 && `${counts.consultNotes} note${counts.consultNotes === 1 ? "" : "s"}`,
    counts.addedRecords > 0 && `${counts.addedRecords} added record${counts.addedRecords === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return `This includes ${parts.length ? parts.join(", ") : "nothing yet"}.`;
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
