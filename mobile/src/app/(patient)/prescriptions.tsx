import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { MedicineCard } from "@/components/clinical";
import {
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  PageHeader,
  Screen,
  StatusBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PrescriptionRow } from "@/lib/types";

interface Response {
  prescriptions: PrescriptionRow[];
  timezone: string;
}

export default function PatientPrescriptions() {
  const query = useQuery({
    queryKey: ["patient", "prescriptions"],
    queryFn: () => apiFetch<Response>("/api/v1/patient/prescriptions"),
  });
  if (query.isLoading) return <Loading />;

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <PageHeader
        title="Prescriptions"
        subtitle="Issued by your doctor, newest first."
      />
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : null}
      {query.data?.prescriptions.length === 0 ? (
        <EmptyState
          icon="file-document-outline"
          title="No prescriptions yet"
          message="Issued prescriptions will appear after your consultations."
          action={
            <Button
              label="Book consultation"
              compact
              onPress={() => router.push("/(patient)/book")}
            />
          }
        />
      ) : null}
      <View style={{ gap: 14 }}>
        {query.data?.prescriptions.map(({ prescription, appointment, medicines }) => (
          <Pressable
            key={prescription.id}
            onPress={() =>
              router.push({
                pathname: "/(patient)/appointments/[id]",
                params: { id: appointment.id },
              })
            }
          >
            <Card>
              <View style={styles.between}>
                <View style={{ flex: 1 }}>
                  <Body strong>{prescription.diagnosis || "Consultation"}</Body>
                  <Muted>
                    {prescription.issuedAt
                      ? `Issued ${formatDate(prescription.issuedAt)}`
                      : "Issued prescription"}
                  </Muted>
                </View>
                <StatusBadge status="issued" audience="patient" />
              </View>
              {medicines.map((medicine, index) => (
                <MedicineCard key={medicine.id ?? `${prescription.id}-${index}`} medicine={medicine} />
              ))}
              {prescription.advice ? <Muted>Advice: {prescription.advice}</Muted> : null}
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
});
