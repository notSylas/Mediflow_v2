import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Switch, Text, View } from "react-native";
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

const STATUS_LABEL: Record<CareStatus["status"], string> = {
  active: "Active",
  manual_trial: "Trial",
  inactive: "Inactive",
  cancelled: "Cancelled",
  none: "Not started",
};

function useCareStatus() {
  return useQuery({
    queryKey: ["patient", "care"],
    queryFn: () => apiFetch<{ care: CareStatus }>("/api/v1/patient/care"),
    retry: false,
  });
}

/** Full plan-management block for the patient settings screen. */
export function CareSettingsCard() {
  const query = useCareStatus();

  if (query.isLoading || !query.data) return null;
  const care = query.data.care;

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="hand-heart" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Body strong>{CARE_PLAN_NAME}</Body>
            <View style={[styles.badge, care.active ? styles.badgeOn : styles.badgeOff]}>
              <Text style={[styles.badgeText, care.active ? styles.badgeTextOn : styles.badgeTextOff]}>
                {STATUS_LABEL[care.status]}
              </Text>
            </View>
          </View>
          <Muted>
            {care.active
              ? "Ongoing care between your visits."
              : "Start the plan to message anytime and get monthly follow-ups."}
          </Muted>
        </View>
      </View>

      {care.active && care.currentPeriodEnd ? (
        <View style={styles.renewRow}>
          <Text style={styles.renewLabel}>Renews monthly · next on</Text>
          <Mono style={styles.renewValue}>{formatDate(care.currentPeriodEnd)}</Mono>
        </View>
      ) : null}

      <View style={styles.benefits}>
        {CARE_BENEFITS.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <MaterialCommunityIcons name="check" size={14} color={colors.primary} />
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      {care.active ? (
        <Button
          label="Cancel care plan"
          tone="danger-outline"
          onPress={() => router.push("/(patient)/care/cancel")}
        />
      ) : (
        <Button
          label="Start care plan"
          icon="arrow-right"
          onPress={() => router.push("/(patient)/care/checkout")}
        />
      )}

      <Text style={styles.disclaimer}>
        {CARE_MESSAGING_DISCLAIMER} {CARE_REPLY_EXPECTATION}
      </Text>
    </Card>
  );
}

/** Reminder/digest preference toggles for the patient profile screen. */
export function CarePreferences() {
  const client = useQueryClient();
  const toast = useToast();
  const query = useCareStatus();

  const update = useMutation({
    mutationFn: (prefs: { digestEnabled?: boolean; medicineRemindersEnabled?: boolean }) =>
      apiFetch("/api/v1/patient/care", {
        method: "PATCH",
        body: JSON.stringify(prefs),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["patient", "care"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Preferences only apply to an existing plan.
  if (query.isLoading || !query.data || query.data.care.status === "none") return null;
  const care = query.data.care;

  return (
    <Card>
      <View style={styles.prefHeader}>
        <MaterialCommunityIcons name="bell-outline" size={18} color={colors.primary} />
        <Body strong>Care plan reminders</Body>
      </View>
      <PreferenceRow
        icon="pill"
        title="Medicine reminders"
        message="Reminders from your active prescriptions."
        value={care.medicineRemindersEnabled}
        onChange={(v) => update.mutate({ medicineRemindersEnabled: v })}
      />
      <View style={styles.prefDivider} />
      <PreferenceRow
        icon="email-newsletter"
        title="Weekly care digest"
        message="A Sunday summary of your care."
        value={care.digestEnabled}
        onChange={(v) => update.mutate({ digestEnabled: v })}
      />
    </Card>
  );
}

function PreferenceRow({
  icon,
  title,
  message,
  value,
  onChange,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.prefRow}>
      <View style={styles.prefIcon}>
        <MaterialCommunityIcons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Body strong>{title}</Body>
        <Muted>{message}</Muted>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 2 },
  badgeOn: { backgroundColor: colors.infoBg },
  badgeOff: { backgroundColor: colors.surfaceStrong },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 10.5 },
  badgeTextOn: { color: colors.info },
  badgeTextOff: { color: colors.textMuted },
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
  benefits: { gap: 7 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  benefitText: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13 },
  disclaimer: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
  prefHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  prefIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  prefDivider: { height: 1, backgroundColor: colors.border, marginLeft: 51 },
});
