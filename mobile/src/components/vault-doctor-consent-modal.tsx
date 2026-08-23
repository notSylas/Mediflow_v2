import { useState } from "react";
import { Modal, Platform, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Body, Button, Muted } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { colors, radius } from "@/lib/theme";
import type { VaultTimelineItem } from "@/lib/vault-types";

interface VaultResponse {
  items: VaultTimelineItem[];
  doctorConsent: { eligible: boolean; consented: boolean; consentedAt: string | null };
}

/**
 * One-time notice: your MediFlow doctor can see this vault for better
 * consultation. Dropped into each patient vault screen (index/add/share) —
 * shares the same query cache key as the vault timeline fetch, so it adds no
 * extra network round trip when the timeline is already loaded. Separate
 * from and additive to Flow A's code-based share, which stays untouched.
 */
export function VaultDoctorConsentModal() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["patient", "vault"],
    queryFn: () => apiFetch<VaultResponse>("/api/v1/patient/vault"),
  });
  const [dismissed, setDismissed] = useState(false);

  const acknowledge = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/patient/vault/doctor-consent", {
        method: "POST",
        body: JSON.stringify({ source: Platform.OS === "ios" ? "ios" : "android" }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["patient", "vault"] }),
  });

  const consent = query.data?.doctorConsent;
  const visible = Boolean(consent?.eligible && !consent?.consented && !dismissed);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="shield-check" size={22} color={colors.primary} />
          </View>
          <Body strong>Your doctor can see your vault</Body>
          <Muted>
            Your MediFlow doctor can view this vault for better consultation — the same record
            they&apos;d otherwise ask you to bring in. You can still share your vault with anyone
            else, any time — that stays a separate, code-based share you control.
          </Muted>
          <Button
            label="Got it"
            loading={acknowledge.isPending}
            onPress={() => {
              setDismissed(true);
              acknowledge.mutate();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 20,
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "rgba(42,76,199,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
