import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { MedicineCard } from "@/components/clinical";
import {
  BackHeader,
  Body,
  Button,
  Card,
  ChoiceChips,
  Divider,
  ErrorState,
  Loading,
  Muted,
  Screen,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
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
  const [rescheduling, setRescheduling] = useState(false);
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

  const confirmCancel = () =>
    Alert.alert(
      "Cancel appointment?",
      "This action cannot be undone. Refund behavior depends on clinic policy.",
      [
        { text: "Keep appointment", style: "cancel" },
        { text: "Cancel appointment", style: "destructive", onPress: () => cancel.mutate() },
      ]
    );

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

      {rescheduling ? (
        <Card>
          <SectionHeader title="Choose a new time" />
          {slots.isLoading ? <Loading label="Loading slots…" /> : null}
          <ChoiceChips
            options={(slots.data?.slots ?? []).slice(0, 20).map((value) => ({
              value,
              label: formatDateTime(value),
            }))}
            value={slot}
            onChange={setSlot}
          />
          {reschedule.error ? <ErrorState message={reschedule.error.message} /> : null}
          <Button
            label="Confirm new time"
            disabled={!slot}
            loading={reschedule.isPending}
            onPress={() => reschedule.mutate()}
          />
          <Button label="Never mind" tone="ghost" onPress={() => setRescheduling(false)} />
        </Card>
      ) : null}

      {appointment.status === "confirmed" ? (
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
              tone="ghost"
              loading={cancel.isPending}
              onPress={confirmCancel}
            />
          ) : null}
        </View>
      ) : null}
      {cancel.error ? <ErrorState message={cancel.error.message} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
});
