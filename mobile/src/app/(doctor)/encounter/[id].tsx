import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { MedicineCard } from "@/components/clinical";
import { PrescriptionEditor, SoapEditor } from "@/components/doctor-editors";
import {
  Avatar,
  BackHeader,
  Body,
  Button,
  Card,
  ErrorState,
  Loading,
  Muted,
  Screen,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime, joinWindowOpen } from "@/lib/format";
import type {
  Appointment,
  ConsultNote,
  Medicine,
  PatientIdentity,
  PatientProfile,
  Prescription,
  Report,
} from "@/lib/types";

interface Encounter {
  appointment: Appointment;
  patient: PatientIdentity;
  note: ConsultNote | null;
  prescription: Prescription | null;
  reports: Report[];
}

interface HistoryRow {
  appointment: Appointment;
  note: ConsultNote | null;
  prescription: Prescription | null;
}

interface Response {
  encounter: Encounter;
  history: HistoryRow[];
  medicineHistory: Array<{ medicine: Medicine; issuedAt: string | null }>;
  patientProfile: PatientProfile | null;
  timezone: string;
}

export default function EncounterPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["doctor", "encounter", id],
    queryFn: () => apiFetch<Response>(`/api/v1/doctor/encounters/${id}`),
    enabled: Boolean(id),
  });
  const [hasNote, setHasNote] = useState(false);
  const [prescriptionIssued, setPrescriptionIssued] = useState(false);

  const outcome = useMutation({
    mutationFn: (status: "completed" | "no_show") =>
      apiFetch<Appointment>(`/api/appointments/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["doctor"] });
      void query.refetch();
    },
  });

  if (query.isLoading) return <Loading label="Opening encounter…" />;
  if (!query.data) {
    return (
      <Screen>
        <BackHeader title="Encounter" onBack={() => router.back()} />
        <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
      </Screen>
    );
  }

  const data = query.data;
  const { appointment, patient } = data.encounter;
  const noteExists =
    hasNote ||
    Boolean(
      data.encounter.note?.subjective ||
        data.encounter.note?.objective ||
        data.encounter.note?.assessment ||
        data.encounter.note?.plan
    );
  const canJoin =
    appointment.status === "confirmed" &&
    joinWindowOpen(appointment.startsAt, appointment.endsAt);

  const confirmOutcome = (status: "completed" | "no_show") => {
    const warning =
      status === "completed"
        ? [
            !noteExists && "No SOAP note has been saved.",
            data.encounter.prescription?.status === "draft" &&
              !prescriptionIssued &&
              "The prescription is still a draft.",
          ]
            .filter(Boolean)
            .join(" ")
        : "Use no-show only when the patient did not attend.";
    Alert.alert(
      status === "completed" ? "Complete consultation?" : "Mark patient no-show?",
      `${warning} This changes the appointment outcome.`,
      [
        { text: "Go back", style: "cancel" },
        {
          text: status === "completed" ? "Mark completed" : "Mark no-show",
          style: status === "no_show" ? "destructive" : "default",
          onPress: () => outcome.mutate(status),
        },
      ]
    );
  };

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <BackHeader title="Patient encounter" onBack={() => router.back()} />
      <Card tone="doctor">
        <View style={styles.patientHeader}>
          <Avatar name={patient.name || patient.email} doctor />
          <View style={{ flex: 1 }}>
            <Body strong>{patient.name || patient.email}</Body>
            <Muted>{formatDateTime(appointment.startsAt)}</Muted>
            <Muted>{patient.email}</Muted>
          </View>
          <StatusBadge status={appointment.status} />
        </View>
        {data.history.length > 0 ? <Muted>Returning patient · {data.history.length} prior visits</Muted> : null}
        {appointment.status === "confirmed" ? (
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Button
                label="Join call"
                icon="video-outline"
                disabled={!canJoin}
                onPress={() => router.push({ pathname: "/call/[id]", params: { id } })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Complete"
                tone="secondary"
                onPress={() => confirmOutcome("completed")}
              />
            </View>
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Patient snapshot" />
      <Card>
        {data.patientProfile ? (
          <>
            {data.patientProfile.allergies ? (
              <Card tone="danger">
                <Body strong>Allergies</Body>
                <Muted>{data.patientProfile.allergies}</Muted>
              </Card>
            ) : null}
            <Snapshot label="Blood group" value={data.patientProfile.bloodGroup} />
            <Snapshot label="Conditions" value={data.patientProfile.chronicConditions} />
            <Snapshot label="Current medications" value={data.patientProfile.currentMedications} />
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
          <Muted>The patient has not completed a medical profile.</Muted>
        )}
      </Card>

      <SectionHeader title="Intake" />
      <Card>
        <Muted>{appointment.intakeNote || "No intake details."}</Muted>
        {appointment.triageFlaggedAt ? (
          <Card tone="danger">
            <Body strong>Emergency phrase was detected at booking</Body>
            <Muted>This is an audit signal, not a diagnosis. Reassess urgency directly.</Muted>
          </Card>
        ) : null}
        {data.encounter.reports.map((report) => (
          <View key={report.id}>
            <Body strong>Attached report</Body>
            <Muted>{report.filename}</Muted>
          </View>
        ))}
      </Card>

      <SoapEditor appointmentId={appointment.id} initial={data.encounter.note} onSaved={setHasNote} />
      <PrescriptionEditor
        appointmentId={appointment.id}
        initial={data.encounter.prescription}
        onIssued={() => setPrescriptionIssued(true)}
      />

      {data.history.length > 0 ? (
        <>
          <SectionHeader title="Past consultations" />
          {data.history.map(({ appointment: past, note, prescription }) => (
            <Card key={past.id}>
              <Body strong>{formatDate(past.startsAt)}</Body>
              {past.intakeNote ? <Muted>{past.intakeNote}</Muted> : null}
              {note?.assessment ? <Muted>Assessment: {note.assessment}</Muted> : null}
              {prescription?.medicines.length ? (
                <Muted>
                  Prescribed: {prescription.medicines.map((medicine) => medicine.name).join(", ")}
                </Muted>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

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

      {appointment.status === "confirmed" ? (
        <Button
          label="Mark as no-show"
          tone="danger"
          loading={outcome.isPending}
          onPress={() => confirmOutcome("no_show")}
        />
      ) : null}
      {outcome.error ? <ErrorState message={outcome.error.message} /> : null}
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

const styles = StyleSheet.create({
  patientHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  twoCol: { flexDirection: "row", gap: 10 },
});
