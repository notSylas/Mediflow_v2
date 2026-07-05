import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { auroraHeaderStyles } from "@/components/aurora-header";
import { AuroraScreen } from "@/components/aurora-screen";
import { DoctorAppointmentCard } from "@/components/clinical";
import { ListSkeleton } from "@/components/skeleton";
import {
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Muted,
  SectionHeader,
} from "@/components/ui";
import { FadeInView, PressableScale } from "@/components/motion";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
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

interface CareFollowUpItem {
  id: string;
  createdAt: string;
  patientId: string;
  patientName: string | null;
  patientEmail: string;
  note: string | null;
}

interface WorkQueueResponse {
  needsPrescription: DoctorAppointmentRow[];
  triageFlagged: DoctorAppointmentRow[];
  unreadConversations: DoctorConversationRow[];
  followUps: FollowUpQueueItem[];
  refillRequests: RefillQueueItem[];
  careFollowUps: CareFollowUpItem[];
}

export default function DoctorWorkQueue() {
  const client = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["doctor", "work-queue"],
    queryFn: () => apiFetch<WorkQueueResponse>("/api/v1/doctor/work-queue"),
  });
  const careAction = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "fulfill" | "dismiss";
    }) =>
      apiFetch<{ appointmentId?: string; ok?: boolean }>(
        `/api/v1/doctor/care-follow-ups/${id}`,
        {
          method: "POST",
          body: JSON.stringify({ action }),
        }
      ),
    onSuccess: (result, variables) => {
      client.invalidateQueries({ queryKey: ["doctor", "work-queue"] });
      client.invalidateQueries({ queryKey: ["doctor", "home"] });
      if (variables.action === "fulfill" && result.appointmentId) {
        router.push({
          pathname: "/(doctor)/prescribe/[id]",
          params: { id: result.appointmentId },
        });
        return;
      }
      toast.success("Care follow-up dismissed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = query.data;
  const total =
    (data?.needsPrescription.length ?? 0) +
    (data?.triageFlagged.length ?? 0) +
    (data?.unreadConversations.length ?? 0) +
    (data?.followUps.length ?? 0) +
    (data?.refillRequests.length ?? 0) +
    (data?.careFollowUps?.length ?? 0);

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
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.doctor} />
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
            target="prescribe"
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

          {data.careFollowUps?.length > 0 ? (
            <QueueSection title="Care plan follow-ups" index={2}>
              {data.careFollowUps.map((item) => (
                <CareFollowUpCard
                  key={item.id}
                  item={item}
                  pending={careAction.isPending}
                  onFulfill={() => careAction.mutate({ id: item.id, action: "fulfill" })}
                  onDismiss={() => careAction.mutate({ id: item.id, action: "dismiss" })}
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

function CareFollowUpCard({
  item,
  pending,
  onFulfill,
  onDismiss,
}: {
  item: CareFollowUpItem;
  pending: boolean;
  onFulfill: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card>
      <View style={styles.queueRow}>
        <View style={[styles.queueIcon, { backgroundColor: colors.doctorBg }]}>
          <MaterialCommunityIcons name="hand-heart" size={20} color={colors.doctor} />
        </View>
        <View style={{ flex: 1 }}>
          <Body strong>{item.patientName || item.patientEmail}</Body>
          <Muted>
            Care member · requested {formatRelativeDay(item.createdAt)}
            {item.note ? ` · ${item.note}` : ""}
          </Muted>
        </View>
      </View>
      <View style={styles.careActions}>
        <View style={styles.careActionButton}>
          <Button
            label="Start consult"
            icon="file-document-edit-outline"
            compact
            loading={pending}
            onPress={onFulfill}
          />
        </View>
        <View style={styles.careActionButton}>
          <Button
            label="Dismiss"
            compact
            tone="ghost"
            disabled={pending}
            onPress={onDismiss}
          />
        </View>
      </View>
    </Card>
  );
}

function AppointmentQueueSection({
  title,
  rows,
  index,
  target = "encounter",
}: {
  title: string;
  rows: DoctorAppointmentRow[];
  index: number;
  target?: "encounter" | "prescribe";
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
                pathname:
                  target === "prescribe"
                    ? "/(doctor)/prescribe/[id]"
                    : "/(doctor)/encounter/[id]",
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
  careActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  careActionButton: { flex: 1 },
  queueIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
