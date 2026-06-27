import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import {
  BackHeader,
  Body,
  Card,
  Divider,
  ErrorState,
  Loading,
  Mono,
  Muted,
  Screen,
  StatusBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Appointment, Payment } from "@/lib/types";

interface ReceiptData {
  appointment: Appointment;
  payment: Payment | null;
  doctor: { name: string } | null;
}

export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["patient", "appointment", id],
    queryFn: () => apiFetch<ReceiptData>(`/api/v1/patient/appointments/${id}`),
    enabled: Boolean(id),
  });
  if (query.isLoading) return <Loading />;
  if (!query.data?.payment) {
    return (
      <Screen>
        <BackHeader title="Receipt" onBack={() => router.back()} />
        <ErrorState message={query.error?.message || "No payment receipt is available."} />
      </Screen>
    );
  }
  const { appointment, payment, doctor } = query.data;
  return (
    <Screen>
      <BackHeader title="Payment receipt" onBack={() => router.back()} />
      <Card>
        <View style={styles.between}>
          <View>
            <Body strong>MediFlow consultation</Body>
            <Muted>Receipt #{payment.id.slice(0, 8).toUpperCase()}</Muted>
          </View>
          <StatusBadge status={payment.status === "paid" ? "issued" : payment.status} />
        </View>
        <Divider />
        <Row label="Doctor" value={`Dr. ${doctor?.name || "Your doctor"}`} />
        <Row label="Appointment" value={formatDateTime(appointment.startsAt)} />
        <Row label="Payment status" value={payment.status} />
        <Row label="Currency" value={payment.currency} />
        {payment.orderId ? <Row label="Order reference" value={payment.orderId} /> : null}
        {payment.paymentId ? <Row label="Payment reference" value={payment.paymentId} /> : null}
        <Divider />
        <View style={styles.between}>
          <Body strong>Total paid</Body>
          <Mono style={styles.total}>{formatMoney(payment.amountInPaise)}</Mono>
        </View>
      </Card>
      <Muted>
        This in-app receipt reflects the server payment record. Keep the payment
        reference for support queries.
      </Muted>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.between}>
      <Muted>{label}</Muted>
      <View style={{ maxWidth: "62%" }}>
        <Body strong>{value}</Body>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  total: { fontSize: 20, color: colors.primary },
});
