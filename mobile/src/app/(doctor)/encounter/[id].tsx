import { useCallback, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { MedicineCard } from "@/components/clinical";
import { SoapEditor } from "@/components/doctor-editors";
import { ReportCard } from "@/components/report-card";
import {
  Avatar,
  BackHeader,
  Body,
  Button,
  Card,
  ChoiceChips,
  ErrorState,
  Loading,
  Muted,
  Screen,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime, joinWindowOpen } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
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
  const [rxSkipped, setRxSkipped] = useState(false);
  const [followUpDays, setFollowUpDays] = useState("7");
  const [followUpDecision, setFollowUpDecision] = useState<
    "undecided" | "recommended" | "not_needed"
  >("undecided");
  const [redFlagReviewed, setRedFlagReviewed] = useState(false);
  const toast = useToast();

  // Refresh when returning from the prescription workspace so status stays live.
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const followUp = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/follow-ups", {
        method: "POST",
        body: JSON.stringify({ appointmentId: id, inDays: Number(followUpDays) }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["doctor"] });
      setFollowUpDecision("recommended");
      toast.success("Follow-up recommended to the patient");
    },
    onError: () => toast.error("Couldn't set the follow-up. Try again."),
  });

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
  const cancelVisit = useMutation({
    mutationFn: () =>
      apiFetch<Appointment>(`/api/appointments/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["doctor"] });
      void query.refetch();
      toast.success("Visit cancelled. Review payment/refund manually.");
    },
    onError: () => toast.error("Couldn't cancel this visit. Please try again."),
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
  const prescriptionReady = data.encounter.prescription?.status === "issued";
  const prescriptionDraft = data.encounter.prescription?.status === "draft";
  const rxDecisionDone = prescriptionReady || rxSkipped;
  const followUpDone = followUpDecision !== "undecided";
  const redFlagDone = !appointment.triageFlaggedAt || redFlagReviewed;
  const profileCompleteness = profileScore(data.patientProfile);
  const canJoin =
    appointment.status === "confirmed" &&
    joinWindowOpen(appointment.startsAt, appointment.endsAt);

  const confirmOutcome = (status: "completed" | "no_show") => {
    const warning =
      status === "completed"
        ? [
            !noteExists && "No SOAP note has been saved.",
            !rxDecisionDone && "No prescription decision has been made.",
            !followUpDone && "No follow-up decision has been made.",
            !redFlagDone && "The red-flag triage warning has not been reviewed.",
          ]
            .filter(Boolean)
            .join(" ")
        : "Use no-show only when the patient did not attend.";
    Alert.alert(
      status === "completed" ? "Complete consultation?" : "Mark patient no-show?",
      warning
        ? `${warning} This changes the appointment outcome.`
        : "This changes the appointment outcome.",
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
  const confirmCancel = () =>
    Alert.alert(
      "Cancel this visit?",
      "This removes the slot from the doctor's schedule. If the patient has already paid, the refund still needs manual review in Razorpay/clinic operations.",
      [
        { text: "Keep visit", style: "cancel" },
        {
          text: "Cancel visit",
          style: "destructive",
          onPress: () => cancelVisit.mutate(),
        },
      ]
    );

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

      <SectionHeader title="Consult command center" />
      <Card tone="doctor">
        <View style={styles.commandGrid}>
          <CommandMetric
            icon={appointment.mode === "async" ? "file-document-edit-outline" : "video-outline"}
            label="Mode"
            value={appointment.mode === "async" ? "Async" : "Video"}
          />
          <CommandMetric
            icon="history"
            label="Prior visits"
            value={data.history.length}
          />
          <CommandMetric
            icon="account-heart-outline"
            label="Profile"
            value={`${profileCompleteness}%`}
          />
          <CommandMetric
            icon="file-upload-outline"
            label="Reports"
            value={data.encounter.reports.length}
          />
        </View>
        <View style={styles.workflowList}>
          <WorkflowStep
            done={Boolean(data.patientProfile)}
            title="Review patient snapshot"
            message={
              data.patientProfile
                ? "Medical profile is available."
                : "Patient profile is not complete."
            }
          />
          <WorkflowStep
            done={noteExists}
            title="Save SOAP note"
            message={noteExists ? "Clinical note has content." : "Document the consultation."}
          />
          <WorkflowStep
            done={rxDecisionDone}
            title="Prescription decision"
            message={
              prescriptionReady
                ? "Prescription is issued."
                : rxSkipped
                  ? "Marked as no prescription needed."
                : data.encounter.prescription?.status === "draft"
                  ? "Draft prescription needs issuing."
                  : "Issue a prescription or explicitly skip."
            }
          />
          <WorkflowStep
            done={followUpDone}
            title="Follow-up decision"
            message={
              followUpDecision === "recommended"
                ? "Follow-up recommended to the patient."
                : followUpDecision === "not_needed"
                  ? "Marked as no follow-up needed."
                  : "Recommend a follow-up or mark not needed."
            }
          />
          {appointment.triageFlaggedAt ? (
            <WorkflowStep
              done={redFlagDone}
              title="Red-flag reviewed"
              message={
                redFlagReviewed
                  ? "Urgency warning reviewed."
                  : "Review the triage warning before closing."
              }
            />
          ) : null}
        </View>
        <View style={styles.commandActions}>
          {!prescriptionReady ? (
            <Button
              label={rxSkipped ? "No Rx needed" : "No Rx needed"}
              icon={rxSkipped ? "check" : "file-cancel-outline"}
              tone="secondary"
              compact
              disabled={rxSkipped}
              onPress={() => setRxSkipped(true)}
            />
          ) : null}
          {appointment.triageFlaggedAt ? (
            <Button
              label={redFlagReviewed ? "Red flag reviewed" : "Mark red flag reviewed"}
              icon={redFlagReviewed ? "check" : "alert-octagon-outline"}
              tone="secondary"
              compact
              disabled={redFlagReviewed}
              onPress={() => setRedFlagReviewed(true)}
            />
          ) : null}
        </View>
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
          <ReportCard key={report.id} report={report} compact />
        ))}
      </Card>

      <SoapEditor appointmentId={appointment.id} initial={data.encounter.note} onSaved={setHasNote} />

      <SectionHeader title="Prescription" />
      <Card tone="doctor">
        <View style={styles.patientHeader}>
          <View style={styles.rxIcon}>
            <MaterialCommunityIcons
              name="file-document-edit-outline"
              size={22}
              color={colors.doctor}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Body strong>
              {prescriptionReady
                ? "Prescription issued"
                : prescriptionDraft
                  ? "Draft in progress"
                  : "No prescription yet"}
            </Body>
            <Muted>
              {prescriptionReady
                ? data.encounter.prescription?.medicines
                    .map((m) => m.name)
                    .filter(Boolean)
                    .join(", ") || "Locked and visible to the patient."
                : "Write and issue the prescription in a dedicated workspace."}
            </Muted>
          </View>
          {data.encounter.prescription ? (
            <StatusBadge status={data.encounter.prescription.status} />
          ) : null}
        </View>
        <Button
          label={
            prescriptionReady
              ? "View prescription"
              : prescriptionDraft
                ? "Continue prescription"
                : "Write prescription"
          }
          icon="file-document-edit-outline"
          onPress={() =>
            router.push({ pathname: "/(doctor)/prescribe/[id]", params: { id } })
          }
        />
      </Card>

      <SectionHeader title="Follow-up" />
      <Card>
        <Muted>Recommend a follow-up visit; the patient sees it on their home screen.</Muted>
        <ChoiceChips
          options={[
            { label: "In 1 week", value: "7" },
            { label: "In 2 weeks", value: "14" },
            { label: "In 1 month", value: "30" },
          ]}
          value={followUpDays}
          onChange={setFollowUpDays}
        />
        <Button
          label="Recommend follow-up"
          icon="calendar-refresh"
          tone="secondary"
          loading={followUp.isPending}
          onPress={() => followUp.mutate()}
        />
        <Button
          label={
            followUpDecision === "not_needed" ? "No follow-up needed" : "No follow-up needed"
          }
          icon={followUpDecision === "not_needed" ? "check" : "calendar-remove-outline"}
          tone="secondary"
          disabled={followUpDecision === "not_needed"}
          onPress={() => setFollowUpDecision("not_needed")}
        />
      </Card>

      {appointment.status === "completed" ? (
        <>
          <SectionHeader title="Post-consult tasks" />
          <Card tone={noteExists && rxDecisionDone && followUpDone ? "accent" : "warning"}>
            <Body strong>
              {noteExists && rxDecisionDone && followUpDone
                ? "Consultation wrap-up complete"
                : "Finish the remaining wrap-up items"}
            </Body>
            <Muted>
              {[
                !noteExists && "SOAP note",
                !rxDecisionDone && "prescription decision",
                !followUpDone && "follow-up decision",
              ]
                .filter(Boolean)
                .join(", ") || "The patient record is ready."}
            </Muted>
            <Button
              label="Open work queue"
              icon="clipboard-pulse-outline"
              tone="secondary"
              compact
              onPress={() => router.push("/(doctor)/work-queue")}
            />
          </Card>
        </>
      ) : null}

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
        <>
          <SectionHeader title="Visit operations" />
          <Card tone="warning">
            <Body strong>Schedule and attendance controls</Body>
            <Muted>
              Use no-show only after the patient misses the consultation. Cancel only
              when the clinic is intentionally removing the visit; paid cancellations
              still need refund review.
            </Muted>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Button
                  label="No-show"
                  tone="secondary"
                  loading={outcome.isPending}
                  onPress={() => confirmOutcome("no_show")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel visit"
                  tone="danger"
                  loading={cancelVisit.isPending}
                  onPress={confirmCancel}
                />
              </View>
            </View>
          </Card>
        </>
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

function CommandMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.commandMetric}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.doctor} />
      <Text style={styles.commandValue}>{value}</Text>
      <Text style={styles.commandLabel}>{label}</Text>
    </View>
  );
}

function WorkflowStep({
  done,
  title,
  message,
}: {
  done: boolean;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.workflowRow}>
      <View
        style={[
          styles.workflowIcon,
          { backgroundColor: done ? colors.successBg : colors.warningBg },
        ]}
      >
        <MaterialCommunityIcons
          name={done ? "check" : "clock-outline"}
          size={16}
          color={done ? colors.success : colors.warning}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.workflowTitle}>{title}</Text>
        <Text style={styles.workflowMessage}>{message}</Text>
      </View>
    </View>
  );
}

function profileScore(profile: PatientProfile | null) {
  if (!profile) return 0;
  const values = [
    profile.dateOfBirth,
    profile.gender,
    profile.bloodGroup,
    profile.allergies,
    profile.chronicConditions,
    profile.currentMedications,
    profile.emergencyContactName,
  ];
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}

const styles = StyleSheet.create({
  patientHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  rxIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  twoCol: { flexDirection: "row", gap: 10 },
  commandGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  commandMetric: {
    width: "48%",
    minHeight: 76,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(91,85,214,0.16)",
    padding: 10,
    gap: 3,
  },
  commandValue: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  commandLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 },
  workflowList: { gap: 10, marginTop: 4 },
  commandActions: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 4 },
  workflowRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  workflowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  workflowTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 14 },
  workflowMessage: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
});
