import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MedicineCard } from "@/components/clinical";
import { ReportCard } from "@/components/report-card";
import { auroraHeaderStyles } from "@/components/aurora-header";
import { AuroraScreen } from "@/components/aurora-screen";
import {
  Avatar,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  SectionHeader,
} from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
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
  followUps: Array<{
    id: string;
    dueAt: string;
    status: "pending" | "booked" | "dismissed";
    createdAt: string;
    sourceAppointmentId: string | null;
  }>;
  refillRequests: Array<{
    id: string;
    prescriptionId: string;
    status: "pending" | "fulfilled" | "declined";
    createdAt: string;
  }>;
  reports: Report[];
  conversation: {
    id: string;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    doctorUnread: number;
  } | null;
  timezone: string;
}

export default function DoctorPatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["doctor", "patient", id],
    queryFn: () => apiFetch<Response>(`/api/v1/doctor/patients/${id}`),
    enabled: Boolean(id),
  });
  const startConsult = useMutation({
    mutationFn: () =>
      apiFetch<{ appointmentId: string }>("/api/v1/doctor/async-consult", {
        method: "POST",
        body: JSON.stringify({ patientId: id }),
      }),
    onSuccess: ({ appointmentId }) =>
      router.push({ pathname: "/(doctor)/encounter/[id]", params: { id: appointmentId } }),
    onError: () => toast.error("Couldn't start the consult. Please try again."),
  });
  if (query.isLoading) return <Loading />;
  if (!query.data) {
    return (
      <AuroraScreen
        variant="doctor"
        title="Patient"
        subtitle="Clinical record"
        leading={<BackButton />}
      >
        <ErrorState message={query.error?.message} />
      </AuroraScreen>
    );
  }
  const data = query.data;
  const profileCompleteness = profileScore(data.patientProfile);
  const latestVisit = data.history[0]?.appointment.startsAt ?? data.medicineHistory[0]?.issuedAt;
  const timeline = buildTimeline(data);
  const hasRiskProfile = Boolean(
    data.patientProfile?.allergies ||
      data.patientProfile?.chronicConditions ||
      data.patientProfile?.currentMedications
  );
  return (
    <AuroraScreen
      variant="doctor"
      title={data.patient.name || "Patient"}
      subtitle="Clinical timeline and follow-up care"
      leading={<BackButton />}
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      <Card>
        <View style={{ flexDirection: "row", gap: 11, alignItems: "center" }}>
          <Avatar name={data.patient.name || data.patient.email} doctor />
          <View style={{ flex: 1 }}>
            <Body strong>{data.patient.name || data.patient.email}</Body>
            <Muted>{data.patient.email}</Muted>
          </View>
        </View>
        <Button
          label="Start follow-up / prescription"
          icon="file-document-edit-outline"
          loading={startConsult.isPending}
          onPress={() => startConsult.mutate()}
        />
      </Card>

      <SectionHeader title="Care summary" />
      <Card tone="doctor">
        <View style={styles.summaryGrid}>
          <SummaryMetric icon="calendar-check-outline" label="Visits" value={data.history.length} />
          <SummaryMetric
            icon="pill"
            label="Medicines"
            value={data.medicineHistory.length}
          />
          <SummaryMetric
            icon="account-heart-outline"
            label="Profile"
            value={`${profileCompleteness}%`}
          />
        </View>
        <Muted>
          {latestVisit ? `Latest clinical touchpoint: ${formatDate(latestVisit)}` : "No prior clinical touchpoints yet."}
        </Muted>
      </Card>

      <SectionHeader title="Clinical timeline" />
      {timeline.length === 0 ? (
        <EmptyState
          icon="timeline-clock-outline"
          title="No timeline yet"
          message="Consultations, prescriptions, reports, messages, refill requests, and follow-ups will appear here."
        />
      ) : (
        <Card>
          {timeline.slice(0, 8).map((item, index) => (
            <TimelineRow key={item.id} item={item} last={index === Math.min(timeline.length, 8) - 1} />
          ))}
        </Card>
      )}

      {data.reports.length > 0 ? (
        <>
          <SectionHeader title="Reports and attachments" />
          <View style={{ gap: 10 }}>
            {data.reports.map((report) => (
              <ReportCard key={report.id} report={report} compact />
            ))}
          </View>
        </>
      ) : null}

      {hasRiskProfile ? (
        <>
          <SectionHeader title="Clinical flags" />
          <View style={{ gap: 10 }}>
            {data.patientProfile?.allergies ? (
              <ClinicalFlag
                tone="danger"
                icon="alert-octagon-outline"
                title="Allergies"
                message={data.patientProfile.allergies}
              />
            ) : null}
            {data.patientProfile?.chronicConditions ? (
              <ClinicalFlag
                tone="warning"
                icon="heart-pulse"
                title="Chronic conditions"
                message={data.patientProfile.chronicConditions}
              />
            ) : null}
            {data.patientProfile?.currentMedications ? (
              <ClinicalFlag
                tone="doctor"
                icon="pill"
                title="Current medications"
                message={data.patientProfile.currentMedications}
              />
            ) : null}
          </View>
        </>
      ) : null}

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
    </AuroraScreen>
  );
}

interface TimelineItem {
  id: string;
  at: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone: "doctor" | "warning" | "danger" | "info" | "success";
  title: string;
  message: string;
  appointmentId?: string;
  conversationId?: string;
}

function buildTimeline(data: Response): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const row of data.history) {
    items.push({
      id: `visit-${row.appointment.id}`,
      at: row.appointment.startsAt,
      icon: row.appointment.mode === "async" ? "file-document-edit-outline" : "video-outline",
      tone: row.appointment.triageFlaggedAt ? "danger" : "doctor",
      title: row.appointment.mode === "async" ? "Async consult completed" : "Video consult completed",
      message: row.note?.assessment || row.appointment.intakeNote?.split("\n")[0] || "Consultation completed.",
      appointmentId: row.appointment.id,
    });
    if (row.prescription?.issuedAt) {
      items.push({
        id: `rx-${row.prescription.id}`,
        at: row.prescription.issuedAt,
        icon: "pill",
        tone: "success",
        title: "Prescription issued",
        message:
          row.prescription.medicines.map((medicine) => medicine.name).join(", ") ||
          row.prescription.diagnosis ||
          "Prescription issued.",
        appointmentId: row.appointment.id,
      });
    }
  }
  for (const report of data.reports) {
    if (!report.createdAt) continue;
    items.push({
      id: `report-${report.id}`,
      at: report.createdAt,
      icon: "file-upload-outline",
      tone: "info",
      title: "Report uploaded",
      message: report.filename,
    });
  }
  for (const followUp of data.followUps) {
    items.push({
      id: `follow-${followUp.id}`,
      at: followUp.createdAt,
      icon: "calendar-heart",
      tone: followUp.status === "pending" ? "warning" : "success",
      title: `Follow-up ${followUp.status}`,
      message: `Due ${formatDate(followUp.dueAt)}`,
      appointmentId: followUp.sourceAppointmentId ?? undefined,
    });
  }
  for (const refill of data.refillRequests) {
    items.push({
      id: `refill-${refill.id}`,
      at: refill.createdAt,
      icon: "refresh",
      tone: refill.status === "pending" ? "warning" : "doctor",
      title: `Refill request ${refill.status}`,
      message: "Patient requested a prescription refill.",
    });
  }
  if (data.conversation?.lastMessageAt) {
    items.push({
      id: `message-${data.conversation.id}`,
      at: data.conversation.lastMessageAt,
      icon: "message-text-outline",
      tone: data.conversation.doctorUnread ? "info" : "doctor",
      title: data.conversation.doctorUnread ? "Unread message" : "Latest message",
      message: data.conversation.lastMessagePreview || "Open conversation",
      conversationId: data.conversation.id,
    });
  }
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function TimelineRow({ item, last }: { item: TimelineItem; last: boolean }) {
  const palette = {
    doctor: { bg: colors.doctorBg, fg: colors.doctor },
    warning: { bg: colors.warningBg, fg: colors.warning },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    info: { bg: colors.infoBg, fg: colors.info },
    success: { bg: colors.successBg, fg: colors.success },
  }[item.tone];
  const open = () => {
    if (item.appointmentId) {
      router.push({ pathname: "/(doctor)/encounter/[id]", params: { id: item.appointmentId } });
      return;
    }
    if (item.conversationId) {
      router.push({ pathname: "/(doctor)/messages/[id]", params: { id: item.conversationId } });
    }
  };
  const content = (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineIcon, { backgroundColor: palette.bg }]}>
          <MaterialCommunityIcons name={item.icon} size={17} color={palette.fg} />
        </View>
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.timelineTitle}>{item.title}</Text>
        <Text style={styles.timelineMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.timelineDate}>{formatDateTime(item.at)}</Text>
      </View>
    </View>
  );
  if (!item.appointmentId && !item.conversationId) return content;
  return (
    <Pressable accessibilityRole="button" onPress={open}>
      {content}
    </Pressable>
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

function BackButton() {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      style={auroraHeaderStyles.headerAction}
      onPress={() => router.back()}
    >
      <MaterialCommunityIcons name="arrow-left" size={22} color={colors.doctor} />
    </Pressable>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.summaryMetric}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.doctor} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ClinicalFlag({
  tone,
  icon,
  title,
  message,
}: {
  tone: "doctor" | "warning" | "danger";
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
}) {
  const palette = {
    doctor: { bg: colors.doctorBg, fg: colors.doctor },
    warning: { bg: colors.warningBg, fg: colors.warning },
    danger: { bg: colors.dangerBg, fg: colors.danger },
  }[tone];
  return (
    <Card style={{ backgroundColor: palette.bg, borderColor: palette.bg }}>
      <View style={styles.flagRow}>
        <MaterialCommunityIcons name={icon} size={20} color={palette.fg} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.flagTitle, { color: palette.fg }]}>{title}</Text>
          <Text style={styles.flagMessage}>{message}</Text>
        </View>
      </View>
    </Card>
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
  summaryGrid: { flexDirection: "row", gap: 9 },
  summaryMetric: {
    flex: 1,
    minHeight: 82,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(91,85,214,0.16)",
    padding: 10,
    gap: 3,
  },
  summaryValue: { color: colors.text, fontFamily: fonts.display, fontSize: 19 },
  summaryLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 },
  flagRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  flagTitle: { fontFamily: fonts.heading, fontSize: 14 },
  flagMessage: { color: colors.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  timelineRow: { flexDirection: "row", gap: 11, paddingBottom: 12 },
  timelineRail: { alignItems: "center", width: 34 },
  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: { flex: 1, width: 1, backgroundColor: colors.border, marginTop: 5 },
  timelineTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 14 },
  timelineMessage: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  timelineDate: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
});
