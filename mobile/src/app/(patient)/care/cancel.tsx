import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { auroraHeaderStyles } from "@/components/aurora-header";
import { AuroraScreen } from "@/components/aurora-screen";
import { Body, Button, Card, ErrorState, Loading, Muted } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";

interface Breakdown {
  pricePaise: number;
  usedDays: number;
  totalDays: number;
  remainingDays: number;
  deductionPaise: number;
  refundPaise: number;
  refundWorkingDays: number;
}

const rupees = (paise: number) => `₹${Math.round(paise / 100)}`;

export default function CareCancel() {
  const client = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: ["patient", "care", "cancellation"],
    queryFn: () => apiFetch<{ breakdown: Breakdown }>("/api/v1/patient/care/cancellation"),
    retry: false,
  });

  const cancel = useMutation({
    mutationFn: () => apiFetch("/api/v1/patient/care", { method: "DELETE" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["patient", "care"] });
      client.invalidateQueries({ queryKey: ["patient", "conversation"] });
      toast.success("Care plan cancelled.");
      router.replace("/(patient)/settings");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const b = query.data?.breakdown;

  return (
    <AuroraScreen
      variant="patient"
      compactHeader
      title="Cancel care plan"
      subtitle="Review before you confirm"
      leading={
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={auroraHeaderStyles.headerAction}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
      }
    >
      {query.isLoading ? <Loading /> : null}
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : null}

      {b ? (
        <>
          <Card tone="warning">
            <View style={styles.head}>
              <MaterialCommunityIcons name="alert-outline" size={20} color={colors.warning} />
              <Body strong>What happens if you cancel</Body>
            </View>
            <Muted>
              If you cancel this plan now, {rupees(b.deductionPaise)} will be deducted for the{" "}
              {b.usedDays} of {b.totalDays} day{b.totalDays === 1 ? "" : "s"} already used this
              period. Any eligible refund of {rupees(b.refundPaise)} will be processed within{" "}
              {b.refundWorkingDays} working days.
            </Muted>
          </Card>

          <Card>
            <Row label="Plan price (monthly)" value={rupees(b.pricePaise)} />
            <View style={styles.divider} />
            <Row
              label={`Used (${b.usedDays}/${b.totalDays} days)`}
              value={`− ${rupees(b.deductionPaise)}`}
            />
            <View style={styles.divider} />
            <Row label={`Refund (${b.remainingDays} days unused)`} value={rupees(b.refundPaise)} emphasis />
          </Card>

          <Text style={styles.note}>
            Messaging and follow-up access end when the plan is cancelled. v1 billing is in test
            mode — no real charge or refund is processed yet.
          </Text>

          <Button
            label="Confirm cancellation"
            tone="danger"
            loading={cancel.isPending}
            onPress={() => cancel.mutate()}
          />
          <Button label="Keep my plan" tone="secondary" onPress={() => router.back()} />
        </>
      ) : null}
    </AuroraScreen>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  divider: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  rowLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13.5 },
  rowValue: { color: colors.text, fontFamily: fonts.monoSemibold, fontSize: 14 },
  rowValueStrong: { color: colors.primaryDark },
  note: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
});
