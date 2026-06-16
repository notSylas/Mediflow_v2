import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { DoctorAppointmentCard } from "@/components/clinical";
import { AuroraHeader, auroraHeaderStyles } from "@/components/aurora-header";
import { CountUp, FadeInView, PressableScale } from "@/components/motion";
import {
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  ProgressBar,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatMoney, formatTime, joinWindowOpen, relativeStart } from "@/lib/format";
import { useSession } from "@/lib/auth";
import { colors, fonts, radius, space } from "@/lib/theme";
import type { DoctorConversationRow } from "@/lib/chat-types";
import type { DoctorAppointmentRow, DoctorHomeData } from "@/lib/types";

export default function DoctorHome() {
  const { data: session } = useSession();
  const query = useQuery({
    queryKey: ["doctor", "home"],
    queryFn: () => apiFetch<DoctorHomeData>("/api/v1/doctor/home"),
  });
  const conversationsQuery = useQuery({
    queryKey: ["doctor", "conversations"],
    queryFn: () =>
      apiFetch<{ conversations: DoctorConversationRow[] }>("/api/v1/conversations"),
    retry: false,
  });
  const unread = (conversationsQuery.data?.conversations ?? []).reduce(
    (sum, row) => sum + (row.conversation.doctorUnread ?? 0),
    0
  );
  if (query.isLoading) return <Loading label="Opening your clinic…" />;
  if (!query.data) {
    return (
      <View style={styles.fallback}>
        <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
      </View>
    );
  }

  const {
    appointments,
    profile,
    revenueInPaise,
    earnings,
    paymentStats,
    hasAvailability,
    awaitingPrescription,
    pendingFollowUps,
    pendingRefills,
  } = query.data;
  const now = new Date();
  const todayKey = now.toDateString();
  const today = appointments.filter(
    ({ appointment }) =>
      new Date(appointment.startsAt).toDateString() === todayKey &&
      ["confirmed", "completed"].includes(appointment.status)
  );
  const upcoming = appointments.filter(
    ({ appointment }) =>
      appointment.status === "confirmed" &&
      new Date(appointment.endsAt).getTime() > now.getTime()
  );
  const next = [...upcoming].sort(
    (a, b) =>
      new Date(a.appointment.startsAt).getTime() -
      new Date(b.appointment.startsAt).getTime()
  )[0];
  const sortedToday = [...today].sort(
    (a, b) =>
      new Date(a.appointment.startsAt).getTime() -
      new Date(b.appointment.startsAt).getTime()
  );
  const canJoinNext =
    next && joinWindowOpen(next.appointment.startsAt, next.appointment.endsAt);
  const todayCompleted = today.filter(
    ({ appointment }) => appointment.status === "completed"
  ).length;
  const completionRate = today.length ? Math.round((todayCompleted / today.length) * 100) : 0;
  const pendingVideoVisits = upcoming.filter(
    ({ appointment }) => appointment.mode === "video"
  ).length;
  const asyncConsults = appointments.filter(
    ({ appointment }) => appointment.mode === "async"
  ).length;
  const triageFlags = appointments.filter(
    ({ appointment }) =>
      appointment.triageFlaggedAt &&
      ["confirmed", "completed"].includes(appointment.status)
  ).length;
  const setupIncomplete = !profile.specialty || !hasAvailability;
  const workQueueTotal =
    awaitingPrescription + unread + pendingRefills + pendingFollowUps + triageFlags;
  const heroName = doctorHeroName(session?.user.name);
  const focusTitle = next
    ? next.patient.name || next.patient.email
    : workQueueTotal
      ? `${workQueueTotal} item${workQueueTotal === 1 ? "" : "s"} need review`
      : "Clinic is under control";
  const focusSubtitle = next
    ? `${formatTime(next.appointment.startsAt)} · ${relativeStart(next.appointment.startsAt)} · ${
        next.appointment.visitReason?.replace(/-/g, " ") ?? "video consultation"
      }`
    : workQueueTotal
      ? "Clear the work queue before the next patient session."
      : "No urgent clinical work is waiting right now.";
  const openFocus = () => {
    if (next) {
      router.push({
        pathname: canJoinNext ? "/call/[id]" : "/(doctor)/encounter/[id]",
        params: { id: next.appointment.id },
      });
      return;
    }
    if (workQueueTotal) {
      router.push("/(doctor)/work-queue");
      return;
    }
    router.push("/(doctor)/schedule");
  };
  const focusCta = canJoinNext
    ? "Join call"
    : next
      ? "Open visit"
      : workQueueTotal
        ? "Open queue"
        : "Plan schedule";

  const attention: Array<{
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    tone: "doctor" | "warning" | "danger" | "info";
    title: string;
    message: string;
    onPress: () => void;
  }> = [];
  if (awaitingPrescription > 0) {
    attention.push({
      icon: "file-document-edit-outline",
      tone: "warning",
      title: `${awaitingPrescription} visit${awaitingPrescription === 1 ? "" : "s"} awaiting a prescription`,
      message: "Complete the notes and issue the prescription.",
      onPress: () => router.push("/(doctor)/appointments"),
    });
  }
  if (unread > 0) {
    attention.push({
      icon: "message-badge-outline",
      tone: "info",
      title: `${unread} unread message${unread === 1 ? "" : "s"}`,
      message: "Patients are waiting on a reply.",
      onPress: () => router.push("/(doctor)/messages"),
    });
  }
  if (pendingRefills > 0) {
    attention.push({
      icon: "pill",
      tone: "doctor",
      title: `${pendingRefills} refill request${pendingRefills === 1 ? "" : "s"}`,
      message: "Patients are waiting for a refill decision.",
      onPress: () => router.push("/(doctor)/refill-requests"),
    });
  }
  if (pendingFollowUps > 0) {
    attention.push({
      icon: "calendar-heart",
      tone: "doctor",
      title: `${pendingFollowUps} follow-up${pendingFollowUps === 1 ? "" : "s"} recommended`,
      message: "Patients haven't booked their follow-up yet.",
      onPress: () => router.push("/(doctor)/appointments"),
    });
  }
  if (triageFlags > 0) {
    attention.push({
      icon: "alert-octagon-outline",
      tone: "danger",
      title: `${triageFlags} triage-flagged visit${triageFlags === 1 ? "" : "s"}`,
      message: "Review urgency carefully before or during the consultation.",
      onPress: () => router.push("/(doctor)/appointments"),
    });
  }

  const quickActions: Array<{
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    message: string;
    value?: number;
    onPress: () => void;
  }> = [
    {
      icon: "clipboard-pulse-outline",
      title: "Queue",
      message: workQueueTotal ? "Review work" : "Clear",
      value: workQueueTotal,
      onPress: () => router.push("/(doctor)/work-queue"),
    },
    {
      icon: "calendar-clock",
      title: "Visits",
      message: `${today.length} today`,
      value: today.length,
      onPress: () => router.push("/(doctor)/appointments"),
    },
    {
      icon: "chat-outline",
      title: "Messages",
      message: unread ? "Reply now" : "Inbox clear",
      value: unread,
      onPress: () => router.push("/(doctor)/messages"),
    },
    {
      icon: "account-group-outline",
      title: "Patients",
      message: "History",
      onPress: () => router.push("/(doctor)/patients"),
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.doctor}
          />
        }
      >
        <AuroraHeader
          variant="doctor"
          eyebrow="Your clinic at a glance"
          title={`${timeGreeting()},\n${heroName}`}
          action={
            <Pressable
              style={auroraHeaderStyles.headerAction}
              onPress={() => router.push("/(doctor)/schedule")}
            >
              <MaterialCommunityIcons name="calendar-month-outline" size={22} color="#fff" />
            </Pressable>
          }
        >
          <View style={styles.heroStats}>
            <HeroStat label="Today" value={today.length} />
            <HeroStat label="Upcoming" value={upcoming.length} />
            <HeroStat label="Collected" text={formatMoney(revenueInPaise)} />
          </View>
        </AuroraHeader>

        <View style={styles.body}>
          {setupIncomplete ? (
            <FadeInView index={0}>
              <Card tone="doctor">
                <Body strong>Finish clinic setup</Body>
                <Muted>
                  {!profile.specialty ? "Add your specialty and profile. " : ""}
                  {!hasAvailability ? "Add weekly availability so patients can book." : ""}
                </Muted>
                <Button
                  label="Open settings"
                  compact
                  tone="secondary"
                  onPress={() => router.push("/(doctor)/settings")}
                />
              </Card>
            </FadeInView>
          ) : null}

          <FadeInView index={1}>
            <SectionHeader title="Today's focus" />
            <Card style={styles.focusCard}>
              <View style={styles.focusTop}>
                <View style={styles.focusIcon}>
                  <MaterialCommunityIcons
                    name={next ? "account-clock-outline" : workQueueTotal ? "clipboard-pulse-outline" : "shield-check-outline"}
                    size={24}
                    color={colors.doctor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.focusKicker}>
                    {next ? "NEXT PATIENT" : workQueueTotal ? "WORK QUEUE" : "ALL CLEAR"}
                  </Text>
                  <Text style={styles.focusTitle} numberOfLines={1}>
                    {focusTitle}
                  </Text>
                  <Text style={styles.focusSubtitle} numberOfLines={2}>
                    {focusSubtitle}
                  </Text>
                </View>
              </View>
              <View style={styles.focusPills}>
                <FocusPill label={`${awaitingPrescription} Rx`} tone={awaitingPrescription ? "warning" : "success"} />
                <FocusPill label={`${pendingRefills} refills`} tone={pendingRefills ? "doctor" : "success"} />
                <FocusPill label={`${unread} messages`} tone={unread ? "info" : "success"} />
              </View>
              <Button
                label={focusCta}
                icon={canJoinNext ? "video" : next ? "arrow-right" : "clipboard-check-outline"}
                compact
                onPress={openFocus}
              />
            </Card>
          </FadeInView>

          {attention.length > 0 ? (
            <FadeInView index={2}>
              <SectionHeader title="Needs your attention" />
              <View style={{ gap: 11 }}>
                {attention.map((item) => (
                  <Pressable
                    key={item.title}
                    accessibilityRole="button"
                    onPress={item.onPress}
                  >
                    <Card>
                      <View style={styles.attentionRow}>
                        <View
                          style={[
                            styles.attentionIcon,
                            { backgroundColor: toneColor(item.tone).bg },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={item.icon}
                            size={20}
                            color={toneColor(item.tone).fg}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Body strong>{item.title}</Body>
                          <Muted>{item.message}</Muted>
                        </View>
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={colors.textMuted}
                        />
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            </FadeInView>
          ) : null}

          <FadeInView index={3}>
            <SectionHeader title="Quick actions" />
            <View style={styles.quickGrid}>
              {quickActions.map((action) => (
                <ActionCard key={action.title} {...action} />
              ))}
            </View>
          </FadeInView>

          <FadeInView index={4}>
            <SectionHeader title="Clinic pulse" />
            <Card>
              <View style={styles.pulseGrid}>
                <PulseMetric
                  icon="check-circle-outline"
                  label="Completed today"
                  value={`${todayCompleted}/${today.length}`}
                  tone="success"
                />
                <PulseMetric
                  icon="video-outline"
                  label="Video queue"
                  value={pendingVideoVisits}
                  tone="info"
                />
                <PulseMetric
                  icon="file-document-edit-outline"
                  label="Needs Rx"
                  value={awaitingPrescription}
                  tone={awaitingPrescription ? "warning" : "success"}
                />
                <PulseMetric
                  icon="file-document-outline"
                  label="Async consults"
                  value={asyncConsults}
                  tone="doctor"
                />
              </View>
              {today.length > 0 ? (
                <>
                  <View style={styles.progressHeader}>
                    <Muted>Today’s completion rate</Muted>
                    <Text style={styles.progressCount}>{completionRate}%</Text>
                  </View>
                  <ProgressBar value={completionRate} />
                </>
              ) : null}
            </Card>
          </FadeInView>

          <FadeInView index={5}>
            <SectionHeader
              title="Next patient"
              action={
                <Pressable onPress={() => router.push("/(doctor)/appointments")}>
                  <Muted>View all</Muted>
                </Pressable>
              }
            />
            {next ? (
              <View style={{ gap: 11 }}>
                <DoctorAppointmentCard
                  row={next}
                  onPress={() =>
                    router.push({
                      pathname: "/(doctor)/encounter/[id]",
                      params: { id: next.appointment.id },
                    })
                  }
                />
                {canJoinNext ? (
                  <Button
                    label="Join video now"
                    icon="video"
                    tone="primary"
                    onPress={() =>
                      router.push({
                        pathname: "/call/[id]",
                        params: { id: next.appointment.id },
                      })
                    }
                  />
                ) : null}
              </View>
            ) : (
              <EmptyState
                icon="calendar-check-outline"
                title="No confirmed visits ahead"
                message="New patient bookings will appear here."
              />
            )}
          </FadeInView>

          <FadeInView index={6}>
            <SectionHeader title="Earnings" />
            <Card>
              <View style={styles.earningsRow}>
                <EarningStat label="Today" value={formatMoney(earnings.today)} />
                <View style={styles.earningsDivider} />
                <EarningStat label="This week" value={formatMoney(earnings.week)} />
                <View style={styles.earningsDivider} />
                <EarningStat label="This month" value={formatMoney(earnings.month)} />
              </View>
              <View style={styles.paymentStats}>
                <PaymentStat label="Paid visits" value={paymentStats.paidCount} />
                <PaymentStat label="Pending" value={paymentStats.pendingCount} />
                <PaymentStat label="Refunds" value={paymentStats.refundedCount} />
              </View>
              {paymentStats.pendingCount > 0 ? (
                <Card tone="warning">
                  <Body strong>Pending payment holds</Body>
                  <Muted>
                    {paymentStats.pendingCount} appointment
                    {paymentStats.pendingCount === 1 ? "" : "s"} worth{" "}
                    {formatMoney(paymentStats.pendingAmountInPaise)} still need payment confirmation.
                  </Muted>
                </Card>
              ) : null}
            </Card>
          </FadeInView>

          <FadeInView index={7}>
            <SectionHeader title="Today's agenda" />
            {today.length === 0 ? (
              <Card>
                <Muted>Nothing is scheduled today.</Muted>
              </Card>
            ) : (
              <View style={{ gap: 11 }}>
                <Card>
                  <View style={styles.progressHeader}>
                    <Muted>Visits completed</Muted>
                    <Text style={styles.progressCount}>
                      {todayCompleted} of {today.length}
                    </Text>
                  </View>
                  <ProgressBar value={completionRate} />
                </Card>
                {sortedToday.map((row) => (
                  <AgendaItem
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
            )}
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}

function EarningStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.earningStat}>
      <Text style={styles.earningValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.earningLabel}>{label}</Text>
    </View>
  );
}

function PaymentStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.paymentStat}>
      <Text style={styles.paymentValue}>{value}</Text>
      <Text style={styles.paymentLabel}>{label}</Text>
    </View>
  );
}

function HeroStat({
  label,
  value,
  text,
}: {
  label: string;
  value?: number;
  text?: string;
}) {
  return (
    <View style={styles.heroStat}>
      {text !== undefined ? (
        <Text style={styles.heroStatValue} numberOfLines={1}>
          {text}
        </Text>
      ) : (
        <CountUp value={value ?? 0} style={styles.heroStatValue} />
      )}
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  message,
  value,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
  value?: number;
  onPress: () => void;
}) {
  return (
    <View style={styles.actionCell}>
      <PressableScale accessibilityRole="button" onPress={onPress} style={styles.actionCard}>
        <View style={styles.actionTop}>
          <View style={styles.actionIcon}>
            <MaterialCommunityIcons name={icon} size={20} color={colors.doctor} />
          </View>
          {value && value > 0 ? (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>{value}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.actionTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.actionMessage} numberOfLines={1}>
          {message}
        </Text>
      </PressableScale>
    </View>
  );
}

function FocusPill({
  label,
  tone,
}: {
  label: string;
  tone: "doctor" | "warning" | "danger" | "info" | "success";
}) {
  const palette = toneColor(tone);
  return (
    <View style={[styles.focusPill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.focusPillText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

function AgendaItem({
  row,
  onPress,
}: {
  row: DoctorAppointmentRow;
  onPress: () => void;
}) {
  const patientName = row.patient.name || row.patient.email;
  const active = row.appointment.status === "confirmed";
  const needsRx =
    row.appointment.status === "completed" && row.prescriptionStatus !== "issued";
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.agendaItem}>
      <View style={styles.agendaTimeRail}>
        <Text style={styles.agendaTime}>{formatTime(row.appointment.startsAt)}</Text>
        <View
          style={[
            styles.agendaDot,
            {
              backgroundColor: active
                ? colors.doctor
                : needsRx
                  ? colors.warning
                  : colors.success,
            },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.agendaName} numberOfLines={1}>
          {patientName}
        </Text>
        <Text style={styles.agendaMeta} numberOfLines={1}>
          {row.appointment.mode === "async" ? "Async consult" : "Video consult"}
          {row.appointment.visitReason ? ` · ${row.appointment.visitReason.replace(/-/g, " ")}` : ""}
        </Text>
        {needsRx ? (
          <Text style={styles.agendaWarning}>Prescription pending</Text>
        ) : null}
      </View>
      <StatusBadge status={row.appointment.status} />
    </PressableScale>
  );
}

function PulseMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string | number;
  tone: "doctor" | "warning" | "danger" | "info" | "success";
}) {
  const palette = toneColor(tone);
  return (
    <View style={styles.pulseMetric}>
      <View style={[styles.pulseIcon, { backgroundColor: palette.bg }]}>
        <MaterialCommunityIcons name={icon} size={17} color={palette.fg} />
      </View>
      <Text style={styles.pulseValue}>{value}</Text>
      <Text style={styles.pulseLabel}>{label}</Text>
    </View>
  );
}

function toneColor(tone: "doctor" | "warning" | "danger" | "info" | "success") {
  return {
    doctor: { bg: colors.doctorBg, fg: colors.doctor },
    warning: { bg: colors.warningBg, fg: colors.warning },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    info: { bg: colors.infoBg, fg: colors.info },
    success: { bg: colors.successBg, fg: colors.success },
  }[tone];
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function doctorHeroName(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "Doctor";
  const withoutPrefix = trimmed.replace(/^dr\.?\s+/i, "").trim();
  const first = withoutPrefix.split(/\s+/)[0];
  if (!first || /^doctor$/i.test(first)) return "Doctor";
  return `Dr. ${first}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fallback: { flex: 1, justifyContent: "center", padding: space.md },
  scroll: { paddingBottom: 120 },
  body: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: space.md,
    paddingTop: space.md,
    gap: space.md,
  },
  heroStats: { flexDirection: "row", gap: 10 },
  heroStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 13,
    gap: 1,
  },
  heroStatValue: { fontFamily: fonts.display, fontSize: 21, color: "#ffffff" },
  heroStatLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
  },
  attentionRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  attentionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  focusCard: {
    borderColor: "rgba(91,85,214,0.22)",
    backgroundColor: "#f6f5ff",
  },
  focusTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  focusIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  focusKicker: {
    color: colors.doctor,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  focusTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: -0.2,
    marginTop: 1,
  },
  focusSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  focusPills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  focusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  focusPillText: { fontFamily: fonts.bodySemibold, fontSize: 11 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  actionCell: { width: "48%" },
  actionCard: {
    width: "100%",
    minHeight: 118,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 13,
    gap: 8,
  },
  actionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBadgeText: { color: "#fff", fontFamily: fonts.bodySemibold, fontSize: 11 },
  actionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 15 },
  actionMessage: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  pulseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pulseMetric: {
    width: "48%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: 12,
    gap: 5,
  },
  pulseIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseValue: { color: colors.text, fontFamily: fonts.display, fontSize: 19 },
  pulseLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 15,
  },
  earningsRow: { flexDirection: "row", alignItems: "center" },
  earningStat: { flex: 1, alignItems: "center", gap: 2 },
  earningValue: { color: colors.text, fontFamily: fonts.display, fontSize: 17 },
  earningLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 },
  earningsDivider: { width: 1, height: 34, backgroundColor: colors.border },
  paymentStats: { flexDirection: "row", gap: 9 },
  paymentStat: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  paymentValue: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  paymentLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 },
  agendaItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 13,
  },
  agendaTimeRail: { width: 54, alignItems: "center", gap: 6 },
  agendaTime: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 12 },
  agendaDot: { width: 11, height: 11, borderRadius: 6 },
  agendaName: { color: colors.text, fontFamily: fonts.heading, fontSize: 15 },
  agendaMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  agendaWarning: {
    color: colors.warning,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressCount: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 13 },
});
