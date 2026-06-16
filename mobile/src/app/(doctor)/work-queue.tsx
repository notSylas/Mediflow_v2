import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { auroraHeaderStyles } from "@/components/aurora-header";
import { AuroraScreen } from "@/components/aurora-screen";
import { DoctorAppointmentCard } from "@/components/clinical";
import { ListSkeleton } from "@/components/skeleton";
import {
  Body,
  Card,
  EmptyState,
  ErrorState,
  Muted,
  SectionHeader,
} from "@/components/ui";
import { FadeInView, PressableScale } from "@/components/motion";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatRelativeDay } from "@/lib/format-chat";
import { colors, fonts, radius } from "@/lib/theme";
import type { DoctorConversationRow } from "@/lib/chat-types";
import type { DoctorAppointmentRow } from "@/lib/types";

interface FollowUpQueueItem {
  id: string;
  patientId: string;
  patientName: string | null;
  patientEmail: string;
  sourceAppointmentId: string | null;
  dueAt: string;
  createdAt: string;
  status: "pending" | "booked" | "dismissed";
}

interface RefillQueueItem {
  id: string;
  createdAt: string;
  prescriptionId: string;
  patientId: string;
  patientName: string | null;
  patientEmail: string;
  diagnosis: string | null;
}

interface WorkQueueResponse {
  needsPrescription: DoctorAppointmentRow[];
  triageFlagged: DoctorAppointmentRow[];
  unreadConversations: DoctorConversationRow[];
  followUps: FollowUpQueueItem[];
  refillRequests: RefillQueueItem[];
}

export default function DoctorWorkQueue() {
  const query = useQuery({
    queryKey: ["doctor", "work-queue"],
    queryFn: () => apiFetch<WorkQueueResponse>("/api/v1/doctor/work-queue"),
  });

  const data = query.data;
  const total =
    (data?.needsPrescription.length ?? 0) +
    (data?.triageFlagged.length ?? 0) +
    (data?.unreadConversations.length ?? 0) +
    (data?.followUps.length ?? 0) +
    (data?.refillRequests.length ?? 0);

  return (
    <AuroraScreen
      variant="doctor"
      title="Work queue"
      subtitle="Clear pending clinical and patient tasks"
      leading={
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={auroraHeaderStyles.headerAction}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
      }
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      {query.isLoading ? <ListSkeleton /> : null}
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : null}
      {data ? (
        <>
          <Card tone={total ? "doctor" : "accent"}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons
                  name={total ? "clipboard-pulse-outline" : "shield-check-outline"}
                  size={23}
                  color={colors.doctor}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryValue}>{total}</Text>
                <Muted>
                  {total
                    ? "open item(s) need attention"
                    : "No pending doctor-side tasks right now"}
                </Muted>
              </View>
            </View>
          </Card>

          {total === 0 ? (
            <EmptyState
              icon="check-circle-outline"
              title="Queue is clear"
              message="New messages, refill requests, triage flags, and pending prescriptions will appear here."
            />
          ) : null}

          <AppointmentQueueSection
            title="Needs prescription"
            rows={data.needsPrescription}
            index={0}
          />
          <AppointmentQueueSection
            title="Triage-flagged visits"
            rows={data.triageFlagged}
            index={1}
          />

          {data.refillRequests.length > 0 ? (
            <QueueSection title="Refill requests" index={2}>
              {data.refillRequests.map((item) => (
                <QueueCard
                  key={item.id}
                  icon="pill"
                  tone="doctor"
                  title={item.patientName || item.patientEmail}
                  message={`${item.diagnosis || "Previous prescription"} · ${formatRelativeDay(item.createdAt)}`}
                  onPress={() => router.push("/(doctor)/refill-requests")}
                />
              ))}
            </QueueSection>
          ) : null}

          {data.unreadConversations.length > 0 ? (
            <QueueSection title="Unread messages" index={3}>
              {data.unreadConversations.map(({ conversation, patient }) => (
                <QueueCard
                  key={conversation.id}
                  icon="message-badge-outline"
                  tone="info"
                  title={patient.name || patient.email}
                  message={`${conversation.doctorUnread} unread · ${
                    conversation.lastMessagePreview || "Open conversation"
                  }`}
                  onPress={() =>
                    router.push({
                      pathname: "/(doctor)/messages/[id]",
                      params: { id: conversation.id, name: patient.name },
                    })
                  }
                />
              ))}
            </QueueSection>
          ) : null}

          {data.followUps.length > 0 ? (
            <QueueSection title="Follow-ups not booked" index={4}>
              {data.followUps.map((item) => (
                <QueueCard
                  key={item.id}
                  icon="calendar-heart"
                  tone="warning"
                  title={item.patientName || item.patientEmail}
                  message={`Due ${formatDate(item.dueAt)} · recommended ${formatDateTime(item.createdAt)}`}
                  onPress={() =>
                    router.push({
                      pathname: "/(doctor)/patients/[id]",
                      params: { id: item.patientId },
                    })
                  }
                />
              ))}
            </QueueSection>
          ) : null}
        </>
      ) : null}
    </AuroraScreen>
  );
}

function AppointmentQueueSection({
  title,
  rows,
  index,
}: {
  title: string;
  rows: DoctorAppointmentRow[];
  index: number;
}) {
  if (rows.length === 0) return null;
  return (
    <FadeInView index={index}>
      <SectionHeader title={title} />
      <View style={styles.stack}>
        {rows.map((row) => (
          <DoctorAppointmentCard
            key={row.appointment.id}
            row={row}
            onPress={() =>
              router.push({
                pathname: "/(doctor)/encounter/[id]",
                params: { id: row.appointment.id },
              })
            }
          />
        ))}
      </View>
    </FadeInView>
  );
}

function QueueSection({
  title,
  index,
  children,
}: {
  title: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <FadeInView index={index}>
      <SectionHeader title={title} />
      <View style={styles.stack}>{children}</View>
    </FadeInView>
  );
}

function QueueCard({
  icon,
  tone,
  title,
  message,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone: "doctor" | "warning" | "info";
  title: string;
  message: string;
  onPress: () => void;
}) {
  const palette = {
    doctor: { bg: colors.doctorBg, fg: colors.doctor },
    warning: { bg: colors.warningBg, fg: colors.warning },
    info: { bg: colors.infoBg, fg: colors.info },
  }[tone];
  return (
    <PressableScale accessibilityRole="button" onPress={onPress}>
      <Card>
        <View style={styles.queueRow}>
          <View style={[styles.queueIcon, { backgroundColor: palette.bg }]}>
            <MaterialCommunityIcons name={icon} size={20} color={palette.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Body strong>{title}</Body>
            <Muted>{message}</Muted>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
        </View>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 11 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: { color: colors.text, fontFamily: fonts.display, fontSize: 24 },
  queueRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  queueIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
