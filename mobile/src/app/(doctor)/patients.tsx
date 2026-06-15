import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import {
  Avatar,
  Body,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Muted,
} from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { FadeInView, PressableScale } from "@/components/motion";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PatientIdentity } from "@/lib/types";

interface PatientRow {
  patient: PatientIdentity;
  visitCount: number;
  lastVisit: string;
}

interface Response {
  patients: PatientRow[];
  timezone: string;
}

export default function DoctorPatients() {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["doctor", "patients", search],
    queryFn: () =>
      apiFetch<Response>(
        `/api/v1/doctor/patients${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`
      ),
  });

  if (query.isLoading && !query.data) return <Loading />;
  return (
    <AuroraScreen
      variant="doctor"
      title="Patients"
      subtitle="Your roster and consultation history"
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      <Field
        label="Search patients"
        value={search}
        onChangeText={setSearch}
        placeholder="Name or email"
      />
      {query.error ? <ErrorState message={query.error.message} /> : null}
      {query.data?.patients.length === 0 ? (
        <EmptyState
          icon="account-search-outline"
          title={search ? "No patients match" : "No patients yet"}
          message={search ? "Try a different name or email." : "Patients appear after booking."}
        />
      ) : null}
      <View style={{ gap: 11 }}>
        {query.data?.patients.map(({ patient, visitCount, lastVisit }, i) => (
          <FadeInView key={patient.id} index={i}>
            <PressableScale
              onPress={() =>
                router.push({ pathname: "/(doctor)/patients/[id]", params: { id: patient.id } })
              }
            >
              <Card>
                <View style={styles.row}>
                  <Avatar name={patient.name || patient.email} doctor />
                  <View style={{ flex: 1 }}>
                    <Body strong>{patient.name || patient.email}</Body>
                    <Muted>{patient.email}</Muted>
                  </View>
                  <View style={styles.right}>
                    <Body strong>{visitCount} visits</Body>
                    <Muted>{formatDate(lastVisit)}</Muted>
                  </View>
                </View>
              </Card>
            </PressableScale>
          </FadeInView>
        ))}
      </View>
    </AuroraScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  right: { alignItems: "flex-end", gap: 2 },
});
