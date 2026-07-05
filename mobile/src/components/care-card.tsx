import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Mono, Muted } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import {
  CARE_BENEFITS,
  CARE_MESSAGING_DISCLAIMER,
  CARE_PLAN_NAME,
  CARE_REPLY_EXPECTATION,
  type CareStatus,
} from "@/lib/care-types";

/**
 * MediFlow Care subscription card for the patient home. Quiet premium surface
 * (soft blue/white, subtle border) — intentionally not a loud sales banner, and
 * not the gradient hero treatment reserved for the visit pass above it.
 */
export function CareCard() {
  const client = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["patient", "care"],
    queryFn: () => apiFetch<{ care: CareStatus }>("/api/v1/patient/care"),
    retry: false,
  });

  const followUp = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/patient/care/follow-up", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["patient", "care"] });
      toast.success("Follow-up requested — your doctor will review it.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Stay quiet while loading or if the endpoint is unavailable — the home screen
  // shouldn't error out over an optional card.
  if (query.isLoading || !query.data) return null;
  const care = query.data.care;

  return (
    <Card tone="accent">
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialCommunityIcons
            name="hand-heart"
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.grow}>
          <View style={styles.titleRow}>
            <Body strong>{CARE_PLAN_NAME}</Body>
            {care.active ? (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            ) : null}
          </View>
          <Muted>
            {care.active
              ? "Your ongoing care plan is active."
              : "Stay connected between visits."}
          </Muted>
        </View>
      </View>

      {care.active ? (
        <ActiveBody care={care} onFollowUp={() => followUp.mutate()} pending={followUp.isPending} />
      ) : (
        <InactiveBody onStart={() => router.push("/(patient)/care/checkout")} />
      )}

      <Text style={styles.disclaimer}>
        {CARE_MESSAGING_DISCLAIMER} {CARE_REPLY_EXPECTATION}
      </Text>
    </Card>
  );
}

function InactiveBody({ onStart }: { onStart: () => void }) {
  return (
    <>
      <View style={styles.benefits}>
        {CARE_BENEFITS.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <MaterialCommunityIcons name="check" size={15} color={colors.primary} />
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>
      <Button label="Start care plan" icon="arrow-right" onPress={onStart} />
    </>
  );
}

function ActiveBody({
  care,
  onFollowUp,
  pending,
}: {
  care: CareStatus;
  onFollowUp: () => void;
  pending: boolean;
}) {
  return (
    <>
      <View style={styles.statusList}>
        <StatusRow
          icon="calendar-heart"
          label={
            care.followUpAvailable
              ? "1 monthly follow-up available"
              : "Follow-up used this period"
          }
          on={care.followUpAvailable}
        />
        <StatusRow icon="email-newsletter" label="Weekly digest ready every Sunday" on={care.digestEnabled} />
        <StatusRow icon="message-text-outline" label="Messaging enabled" on />
      </View>

      {care.currentPeriodEnd ? (
        <View style={styles.renewRow}>
          <Text style={styles.renewLabel}>Renews</Text>
          <Mono style={styles.renewValue}>{formatDate(care.currentPeriodEnd)}</Mono>
        </View>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.actionGrow}>
          <Button
            label="Message doctor"
            icon="message-text-outline"
            tone="secondary"
            onPress={() => router.push("/(patient)/messages")}
          />
        </View>
        <View style={styles.actionGrow}>
          <Button
            label="Use follow-up"
            icon="calendar-plus"
            loading={pending}
            disabled={!care.followUpAvailable}
            onPress={onFollowUp}
          />
        </View>
      </View>
    </>
  );
}

function StatusRow({
  icon,
  label,
  on,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  on: boolean;
}) {
  return (
    <View style={styles.statusRow}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={on ? colors.primary : colors.textFaint}
      />
      <Text style={[styles.statusText, !on && { color: colors.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  grow: { flex: 1, gap: 2 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeBadge: {
    borderRadius: radius.pill,
    backgroundColor: colors.infoBg,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  activeBadgeText: { color: colors.info, fontFamily: fonts.bodySemibold, fontSize: 10.5 },
  benefits: { gap: 8, marginTop: 4 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  benefitText: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13.5 },
  statusList: { gap: 9, marginTop: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  statusText: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13.5 },
  renewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  renewLabel: { color: colors.textMuted, fontFamily: fonts.bodySemibold, fontSize: 12 },
  renewValue: { color: colors.text, fontFamily: fonts.monoSemibold, fontSize: 13 },
  actions: { flexDirection: "row", gap: 10 },
  actionGrow: { flex: 1 },
  disclaimer: {
    color: colors.textFaint,
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 16,
  },
});
