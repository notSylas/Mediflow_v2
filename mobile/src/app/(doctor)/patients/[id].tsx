import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { MedicineCard } from "@/components/clinical";
import {
  Avatar,
  BackHeader,
  Body,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type {
  Appointment,
  ConsultNote,
  Medicine,
  PatientIdentity,
  PatientProfile,
  Prescription,
} from "@/lib/types";

interface HistoryRow {
  appointment: Appointment;
  note: ConsultNote | null;
  prescription: Prescription | null;
}

interface Response {
  patient: PatientIdentity;
  patientProfile: PatientProfile | null;
  history: HistoryRow[];
  medicineHistory: Array<{ medicine: Medicine; issuedAt: string | null }>;
  timezone: string;
}

export default function DoctorPatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["doctor", "patient", id],
    queryFn: () => apiFetch<Response>(`/api/v1/doctor/patients/${id}`),
    enabled: Boolean(id),
  });
  if (query.isLoading) return <Loading />;
  if (!query.data) {
    return (
      <Screen>
        <BackHeader title="Patient" onBack={() => router.back()} />
        <ErrorState message={query.error?.message} />
      </Screen>
    );
  }
  const data = query.data;
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <BackHeader title="Patient history" onBack={() => router.back()} />
      <Card>
        <View style={{ flexDirection: "row", gap: 11, alignItems: "center" }}>
          <Avatar name={data.patient.name || data.patient.email} doctor />
          <View style={{ flex: 1 }}>
            <Body strong>{data.patient.name || data.patient.email}</Body>
            <Muted>{data.patient.email}</Muted>
          </View>
        </View>
      </Card>
      <SectionHeader title="Medical snapshot" />
      <Card>
        {data.patientProfile ? (
          <>
            <Snapshot label="Allergies" value={data.patientProfile.allergies} />
            <Snapshot label="Conditions" value={data.patientProfile.chronicConditions} />
            <Snapshot label="Current medicines" value={data.patientProfile.currentMedications} />
            <Snapshot
              label="Emergency contact"
              value={[
                data.patientProfile.emergencyContactName,
                data.patientProfile.emergencyContactPhone,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </>
        ) : (
          <Muted>No medical profile has been completed.</Muted>
        )}
      </Card>
      <SectionHeader title="Consultation history" />
      {data.history.length === 0 ? (
        <EmptyState
          icon="history"
          title="No completed consultations"
          message="Completed encounters will appear here."
        />
      ) : (
        <View style={{ gap: 11 }}>
          {data.history.map(({ appointment, note, prescription }) => (
            <Pressable
              key={appointment.id}
              onPress={() =>
                router.push({
                  pathname: "/(doctor)/encounter/[id]",
                  params: { id: appointment.id },
                })
              }
            >
              <Card>
                <Body strong>{formatDate(appointment.startsAt)}</Body>
                {appointment.intakeNote ? <Muted>{appointment.intakeNote}</Muted> : null}
                {note?.assessment ? <Muted>Assessment: {note.assessment}</Muted> : null}
                {prescription?.medicines.length ? (
                  <Muted>
                    Prescribed: {prescription.medicines.map((medicine) => medicine.name).join(", ")}
                  </Muted>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </View>
      )}
      {data.medicineHistory.length > 0 ? (
        <>
          <SectionHeader title="Medicine history" />
          <Card>
            {data.medicineHistory.map(({ medicine }, index) => (
              <MedicineCard key={medicine.id ?? index} medicine={medicine} />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Snapshot({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View>
      <Body strong>{label}</Body>
      <Muted>{value}</Muted>
    </View>
  );
}
