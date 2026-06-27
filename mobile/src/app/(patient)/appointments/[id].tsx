import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, StyleSheet, Text, View } from "react-native";
import { MedicineCard } from "@/components/clinical";
import {
  BackHeader,
  Body,
  Button,
  Caption,
  Card,
  Divider,
  ErrorState,
  Loading,
  Mono,
  Muted,
  Screen,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";
import { SlotPicker } from "@/components/slot-picker";
import { apiFetch } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";
import { formatDateTime, formatMoney, joinWindowOpen } from "@/lib/format";
import type {
  Appointment,
  Payment,
  Prescription,
  Report,
} from "@/lib/types";

interface Detail {
  appointment: Appointment;
  payment: Payment | null;
  report: Report | null;
  prescription: Prescription | null;
  doctor: {
    name: string;
    specialty: string | null;
    feeInPaise: number;
  } | null;
  timezone: string;
  canCancel: boolean;
}

interface SlotsResponse {
  slots: string[];
  timezone: string;
}

export default function PatientAppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const [now] = useState(() => Date.now());
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["patient", "appointment", id],
    queryFn: () => apiFetch<Detail>(`/api/v1/patient/appointments/${id}`),
    enabled: Boolean(id),
  });
  const slots = useQuery({
    queryKey: ["slots", "reschedule"],
    queryFn: () => apiFetch<SlotsResponse>("/api/slots"),
    enabled: rescheduling,
  });
  const cancel = useMutation({
    mutationFn: () =>
      apiFetch<Appointment>(`/api/appointments/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["patient"] });
      void query.refetch();
    },
  });
  const reschedule = useMutation({
    mutationFn: () =>
      apiFetch<{ appointment: Appointment }>(`/api/appointments/${id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ startsAt: slot }),
      }),
    onSuccess: () => {
      setRescheduling(false);
      setSlot(null);
      void client.invalidateQueries({ queryKey: ["patient"] });
      void query.refetch();
    },
  });
  const payment = useMutation({
    mutationFn: () =>
      apiFetch<{ provider: "mock" | "razorpay"; appointment?: Appointment }>(
        `/api/appointments/${id}/payment`,
        { method: "POST" }
      ),
    onSuccess: (value) => {
      if (value.provider === "razorpay") {
        Alert.alert(
          "Development build required",
          "Real Razorpay checkout does not run in Expo Go. Install the MediFlow development build to continue."
        );
      }
      void client.invalidateQueries({ queryKey: ["patient"] });
      void query.refetch();
    },
  });

  if (query.isLoading) return <Loading />;
  if (!query.data) {
    return (
      <Screen>
        <BackHeader title="Appointment" onBack={() => router.back()} />
        <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
      </Screen>
    );
  }
  const data = query.data;
  const { appointment } = data;
  const canJoin =
    appointment.status === "confirmed" &&
    joinWindowOpen(appointment.startsAt, appointment.endsAt);

  // Refund breakdown — free cancellation up to 2 hours before the visit,
  // otherwise the consultation fee is non-refundable per clinic policy.
  const paidPaise =
    data.payment?.status === "paid" ? data.payment.amountInPaise : 0;
  const hoursUntil = (new Date(appointment.startsAt).getTime() - now) / 3_600_000;
  const freeCancellation = hoursUntil >= 2;
  const cancellationCharge = freeCancellation ? 0 : paidPaise;
  const refundAmount = paidPaise - cancellationCharge;

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <BackHeader title="Appointment details" onBack={() => router.back()} />
      <Card>
        <View style={styles.between}>
          <View style={{ flex: 1 }}>
            <Body strong>{formatDateTime(appointment.startsAt)}</Body>
            <Muted>Dr. {data.doctor?.name || "Your doctor"}</Muted>
          </View>
          <StatusBadge status={appointment.status} audience="patient" />
        </View>
        {appointment.status === "confirmed" ? (
          <Button
            label={canJoin ? "Join video consultation" : "Call room opens 10 min before"}
            icon="video-outline"
            disabled={!canJoin}
            onPress={() => router.push({ pathname: "/call/[id]", params: { id } })}
          />
        ) : null}
        {appointment.status === "pending_payment" ? (
          <Button
            label="Continue payment"
            icon="credit-card-outline"
            loading={payment.isPending}
            onPress={() => payment.mutate()}
          />
        ) : null}
      </Card>

      <SectionHeader title="Visit information" />
      <Card>
        <Body strong>What you told the doctor</Body>
        <Muted>{appointment.intakeNote || "No intake details."}</Muted>
        {data.report ? (
          <>
            <Divider />
            <Body strong>Attached report</Body>
            <Muted>{data.report.filename}</Muted>
          </>
        ) : null}
        {data.payment ? (
          <>
            <Divider />
            <View style={styles.between}>
              <Muted>Payment</Muted>
              <Body strong>
                {formatMoney(data.payment.amountInPaise)} · {data.payment.status}
              </Body>
            </View>
            {data.payment.status === "paid" ? (
              <Button
                label="View receipt"
                tone="secondary"
                icon="receipt-text-outline"
                onPress={() =>
                  router.push({ pathname: "/(patient)/receipt/[id]", params: { id } })
                }
              />
            ) : null}
          </>
        ) : null}
      </Card>

      {data.prescription ? (
        <>
          <SectionHeader title="Prescription" />
          <Card>
            <View style={styles.between}>
              <Body strong>{data.prescription.diagnosis || "Consultation"}</Body>
              <StatusBadge status="issued" audience="patient" />
            </View>
            {data.prescription.medicines.map((medicine, index) => (
              <MedicineCard
                key={medicine.id ?? `${data.prescription?.id}-${index}`}
                medicine={medicine}
              />
            ))}
            {data.prescription.advice ? (
              <Muted>Doctor&apos;s advice: {data.prescription.advice}</Muted>
            ) : null}
          </Card>
        </>
      ) : null}

      {appointment.status === "confirmed" ? (
        rescheduling ? (
          <Card>
            <SectionHeader title="Reschedule appointment" />
            <View style={styles.currentRow}>
              <View style={styles.currentIcon}>
                <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Caption>CURRENT APPOINTMENT</Caption>
                <Body strong>{formatDateTime(appointment.startsAt)}</Body>
              </View>
            </View>
            <Divider />
            <Body strong>Pick a new day and time</Body>
            {slots.isLoading ? (
              <Muted>Loading available times…</Muted>
            ) : (
              <SlotPicker slots={slots.data?.slots ?? []} value={slot} onChange={setSlot} />
            )}
            {slot ? (
              <Card tone="accent">
                <View style={styles.between}>
                  <Muted>New time</Muted>
                  <Body strong>{formatDateTime(slot)}</Body>
                </View>
              </Card>
            ) : null}
            {reschedule.error ? <ErrorState message={reschedule.error.message} /> : null}
            <Button
              label={slot ? "Confirm reschedule" : "Pick a new time above"}
              icon="check"
              disabled={!slot}
              loading={reschedule.isPending}
              onPress={() => reschedule.mutate()}
            />
            <Button
              label="Keep current appointment"
              tone="secondary"
              onPress={() => {
                setRescheduling(false);
                setSlot(null);
              }}
            />
          </Card>
        ) : cancelling ? (
          <Card tone="danger">
            <SectionHeader title="Cancel appointment" />
            <View style={styles.warnRow}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={colors.danger} />
              <Body strong>This can&apos;t be undone</Body>
            </View>
            <Muted>Your booked slot is released and made available to other patients.</Muted>

            <View style={styles.breakdown}>
              <BreakdownRow label="Appointment" value={formatDateTime(appointment.startsAt)} />
              <BreakdownRow
                label="Consultation fee paid"
                value={paidPaise > 0 ? formatMoney(paidPaise) : "Not paid yet"}
                mono={paidPaise > 0}
              />
              <BreakdownRow
                label="Cancellation charge"
                value={cancellationCharge > 0 ? `– ${formatMoney(cancellationCharge)}` : "₹0.00"}
                mono
              />
              <Divider />
              <BreakdownRow label="Refund amount" value={formatMoney(refundAmount)} mono strong />
              <BreakdownRow label="Refund method" value="Original payment method" />
              <BreakdownRow label="Expected refund" value="5–7 business days" />
            </View>

            <Muted>
              {freeCancellation
                ? "Free cancellation — you're more than 2 hours before your visit. Refunds are processed by the clinic to your original payment method."
                : "You're within 2 hours of your visit, so the consultation fee is non-refundable per clinic policy."}
            </Muted>
            {cancel.error ? <ErrorState message={cancel.error.message} /> : null}
            <Button
              label="Confirm cancellation"
              tone="danger"
              icon="close-circle-outline"
              loading={cancel.isPending}
              onPress={() => cancel.mutate()}
            />
            <Button
              label="Keep appointment"
              tone="secondary"
              onPress={() => setCancelling(false)}
            />
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            <Button
              label="Reschedule"
              tone="secondary"
              icon="calendar-refresh"
              onPress={() => setRescheduling(true)}
            />
            {data.canCancel ? (
              <Button
                label="Cancel appointment"
                tone="danger-outline"
                icon="close-circle-outline"
                onPress={() => setCancelling(true)}
              />
            ) : null}
          </View>
        )
      ) : null}
    </Screen>
  );
}

function BreakdownRow({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownLabel, strong && styles.breakdownLabelStrong]}>{label}</Text>
      {mono ? (
        <Mono style={[styles.breakdownValueMono, strong && styles.breakdownValueStrong]}>
          {value}
        </Mono>
      ) : (
        <Text style={[styles.breakdownValue, strong && styles.breakdownValueStrong]}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  warnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdown: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#f3cfcf",
    padding: 14,
    gap: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  breakdownLabel: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.textMuted },
  breakdownLabelStrong: { fontFamily: fonts.bodySemibold, color: colors.text },
  breakdownValue: { fontFamily: fonts.bodySemibold, fontSize: 13.5, color: colors.text, maxWidth: "60%", textAlign: "right" },
  breakdownValueMono: { fontFamily: fonts.monoSemibold, fontSize: 14, color: colors.text },
  breakdownValueStrong: { fontSize: 16, color: colors.text },
  currentRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  currentIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
