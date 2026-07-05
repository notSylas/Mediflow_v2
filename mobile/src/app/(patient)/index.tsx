import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { HeroHeader, auroraHeaderStyles } from "@/components/aurora-header";
import { CareCard } from "@/components/care-card";
import { FadeInView, PressableScale } from "@/components/motion";
import {
  Avatar,
  Body,
  Button,
  Card,
  ErrorState,
  Loading,
  Mono,
  Muted,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  joinWindowOpen,
  relativeStart,
} from "@/lib/format";
import { useSession } from "@/lib/auth";
import { colors, fonts, radius, space } from "@/lib/theme";
import type { Conversation } from "@/lib/chat-types";
import type { ActiveMedication, PatientHomeData } from "@/lib/types";

const SLOT_OF_DAY = [
  { key: "morning", label: "Morning", icon: "weather-sunset-up", bg: "#fff1dd", fg: "#b9760f" },
  { key: "afternoon", label: "Afternoon", icon: "weather-sunny", bg: "#fff1dd", fg: "#b9760f" },
  { key: "evening", label: "Evening", icon: "weather-sunset-down", bg: "#eaf0ff", fg: "#2a4cc7" },
  { key: "night", label: "Night", icon: "weather-night", bg: "#efe9fc", fg: "#6d3bd4" },
] as const;

export default function PatientHome() {
  const { data: session } = useSession();
  const client = useQueryClient();
  const [now] = useState(() => Date.now());
  const query = useQuery({
    queryKey: ["patient", "home"],
    queryFn: () => apiFetch<PatientHomeData>("/api/v1/patient/home"),
  });
  const resolveFollowUp = useMutation({
    mutationFn: (args: { id: string; status: "booked" | "dismissed" }) =>
      apiFetch(`/api/v1/follow-ups/${args.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: args.status }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["patient", "home"] }),
  });
  const unreadQuery = useQuery({
    queryKey: ["patient", "conversation"],
    queryFn: () =>
      apiFetch<{ conversation: Conversation }>("/api/v1/conversations"),
    retry: false,
  });
  const unread = unreadQuery.data?.conversation?.patientUnread ?? 0;
  const slotsQuery = useQuery({
    queryKey: ["slots"],
    queryFn: () => apiFetch<{ slots: string[] }>("/api/slots"),
    retry: false,
  });
  // Ticks every minute so the visit countdown stays live.
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (query.isLoading) return <Loading />;
  if (!query.data) {
    return (
      <View style={styles.fallback}>
        <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
      </View>
    );
  }

  const data = query.data;
  const next = data.appointments
    .filter(
      ({ appointment }) =>
        ["pending_payment", "confirmed"].includes(appointment.status) &&
        new Date(appointment.endsAt).getTime() > now
    )
    .sort(
      (a, b) =>
        new Date(a.appointment.startsAt).getTime() -
        new Date(b.appointment.startsAt).getTime()
    )[0];
  const completed = data.appointments.filter(
    ({ appointment }) => appointment.status === "completed"
  ).length;
  const firstName = session?.user.name?.trim().split(/\s+/)[0];
  const doctorName = data.doctor?.name?.trim();
  const doctorLabel = doctorName
    ? /^(dr\.?\s)/i.test(doctorName)
      ? doctorName
      : `Dr. ${doctorName}`
    : "Your clinic doctor";
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const greeting = getGreeting();
  const isReturning = completed > 0;
  const soonestSlot = !next ? (slotsQuery.data?.slots?.[0] ?? null) : null;
  const canJoin =
    next?.appointment.status === "confirmed" &&
    joinWindowOpen(next.appointment.startsAt, next.appointment.endsAt);
  const countdown =
    next?.appointment.status === "confirmed"
      ? countdownLabel(next.appointment.startsAt, tick)
      : null;
  const heroCta = canJoin
    ? "Join now"
    : next?.appointment.status === "pending_payment"
      ? "Continue payment"
      : next
        ? "View visit"
        : isReturning
          ? "Book follow-up"
          : "Find a time";

  const openNext = () => {
    if (!next) {
      router.push("/(patient)/book");
      return;
    }
    if (canJoin) {
      router.push({ pathname: "/call/[id]", params: { id: next.appointment.id } });
      return;
    }
    router.push({
      pathname: "/(patient)/appointments/[id]",
      params: { id: next.appointment.id },
    });
  };

  const reminders: ReminderItem[] = [];
  if (next?.appointment.status === "pending_payment") {
    reminders.push({
      icon: "credit-card-clock-outline",
      tone: "warning",
      title: "Complete your payment",
      message: "Finish payment to confirm your upcoming visit.",
      onPress: () =>
        router.push({
          pathname: "/(patient)/appointments/[id]",
          params: { id: next.appointment.id },
        }),
    });
  }
  if (unread > 0) {
    reminders.push({
      icon: "message-badge-outline",
      tone: "info",
      title: `${unread} new message${unread === 1 ? "" : "s"}`,
      message: "Your doctor sent you a message.",
      onPress: () => router.push("/(patient)/messages"),
    });
  }

  const kicker = next
    ? "YOUR NEXT VISIT"
    : isReturning
      ? "READY FOR A FOLLOW-UP?"
      : "CARE, WHEN YOU NEED IT";
  const passTitle = next
    ? formatDateTime(next.appointment.startsAt)
    : isReturning
      ? "Book a follow-up visit"
      : "Book a private consultation";
  const passMeta = next
    ? `${doctorLabel} · ${countdown ?? relativeStart(next.appointment.startsAt)}`
    : soonestSlot
      ? `Next available: ${formatDateTime(soonestSlot)}`
      : `${doctorLabel} · ${data.doctor?.slotMinutes ?? 20} minutes`;

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
            tintColor={colors.primary}
          />
        }
      >
        <HeroHeader
          variant="patient"
          eyebrow={dateLabel}
          title={`${greeting}${firstName ? `, ${firstName}` : ""}`}
          action={
            <Pressable
              accessibilityLabel="Open account settings"
              accessibilityRole="button"
              style={auroraHeaderStyles.glassAction}
              onPress={() => router.push("/(patient)/settings")}
            >
              <MaterialCommunityIcons name="cog-outline" size={22} color="#fff" />
            </Pressable>
          }
        >
          <View style={styles.pass}>
            <Text style={styles.passKicker}>{kicker}</Text>
            <Text style={styles.passTitle}>
              {next ? <Mono style={styles.passTitleMono}>{passTitle}</Mono> : passTitle}
            </Text>
            <Text style={styles.passMeta}>{passMeta}</Text>
            <View style={styles.passActions}>
              <PressableScale
                accessibilityRole="button"
                style={styles.passCta}
                onPress={openNext}
              >
                {canJoin ? (
                  <MaterialCommunityIcons name="video" size={19} color={colors.primaryDark} />
                ) : null}
                <Text style={styles.passCtaText}>{heroCta}</Text>
                {!canJoin ? (
                  <MaterialCommunityIcons name="arrow-right" size={18} color={colors.primaryDark} />
                ) : null}
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Messages"
                style={styles.passGhost}
                onPress={() => router.push("/(patient)/messages")}
              >
                <MaterialCommunityIcons name="message-text-outline" size={20} color="#fff" />
                {unread > 0 ? <View style={styles.passDot} /> : null}
              </PressableScale>
            </View>
          </View>
        </HeroHeader>

        <View style={styles.body}>
          <FadeInView index={0}>
            <CareCard />
          </FadeInView>

          {data.followUp ? (
            <FadeInView index={0}>
              <Card tone="accent">
                <View style={styles.row}>
                  <View style={styles.followUpIcon}>
                    <MaterialCommunityIcons
                      name="calendar-heart"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Body strong>Your doctor recommends a follow-up</Body>
                    <Muted>Suggested by {formatDate(data.followUp.dueAt)}</Muted>
                  </View>
                  <Pressable
                    accessibilityLabel="Dismiss follow-up"
                    accessibilityRole="button"
                    onPress={() =>
                      resolveFollowUp.mutate({ id: data.followUp!.id, status: "dismissed" })
                    }
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
                <Button
                  label="Book follow-up"
                  icon="calendar-plus"
                  onPress={() => {
                    router.push({
                      pathname: "/(patient)/book",
                      params: { followUpId: data.followUp!.id },
                    });
                  }}
                />
              </Card>
            </FadeInView>
          ) : null}

          {reminders.length > 0 ? (
            <FadeInView index={1}>
              <SectionHeader title="Needs your attention" />
              <View style={styles.stack}>
                {reminders.map((item) => (
                  <ReminderRow key={item.title} item={item} />
                ))}
              </View>
            </FadeInView>
          ) : null}

          {data.activeMedications.some(
            (m) => m.morning || m.afternoon || m.evening || m.night
          ) ? (
            <FadeInView index={2}>
              <SectionHeader
                title="Medications today"
                action={
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/(patient)/prescriptions")}
                  >
                    <Text style={styles.sectionLink}>View all</Text>
                  </Pressable>
                }
              />
              <Card>
                {SLOT_OF_DAY.map((slot, i) => {
                  const meds = data.activeMedications.filter((m) => m[slot.key]);
                  if (meds.length === 0) return null;
                  return (
                    <View key={slot.key}>
                      {i > 0 ? <View style={styles.medDivider} /> : null}
                      <MedSlotRow slot={slot} meds={meds} />
                    </View>
                  );
                })}
              </Card>
            </FadeInView>
          ) : null}

          <FadeInView index={3}>
            <SectionHeader title="Your care team" />
            <Card>
              <View style={styles.row}>
                <DoctorAvatar name={doctorName || "Doctor"} photoUrl={data.doctor?.photoUrl} />
                <View style={styles.grow}>
                  <View style={styles.nameRow}>
                    <Body strong>{doctorLabel}</Body>
                    {data.doctor?.registrationNo ? (
                      <View style={styles.verifiedBadge}>
                        <MaterialCommunityIcons
                          name="check-decagram"
                          size={12}
                          color={colors.success}
                        />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    ) : null}
                  </View>
                  <Muted>{data.doctor?.specialty || "General physician"}</Muted>
                  {data.doctor?.qualifications ? (
                    <Text style={styles.qualifications}>{data.doctor.qualifications}</Text>
                  ) : null}
                </View>
              </View>

              {data.doctor?.yearsExperience || data.doctor?.languages ? (
                <View style={styles.trustRow}>
                  {data.doctor?.yearsExperience ? (
                    <TrustChip
                      icon="medal-outline"
                      label={`${data.doctor.yearsExperience}+ yrs exp`}
                    />
                  ) : null}
                  {data.doctor?.languages ? (
                    <TrustChip icon="translate" label={data.doctor.languages} />
                  ) : null}
                </View>
              ) : null}

              {data.doctor?.bio ? (
                <Text style={styles.doctorBio} numberOfLines={3}>
                  {data.doctor.bio}
                </Text>
              ) : null}
              <View style={styles.doctorMeta}>
                <Meta
                  icon="cash"
                  value={formatMoney(data.doctor?.feeInPaise)}
                  label="per visit"
                  mono
                />
                <View style={styles.metaDivider} />
                <Meta
                  icon="clock-outline"
                  value={`${data.doctor?.slotMinutes ?? 20} min`}
                  label="video consult"
                />
              </View>
            </Card>
          </FadeInView>

          {data.profileCompleteness < 100 ? (
            <FadeInView index={4}>
              <SectionHeader title="Before your next visit" />
              <Card tone="accent">
                <View style={[styles.row, styles.profilePrompt]}>
                  <View style={styles.checkIcon}>
                    <MaterialCommunityIcons
                      name="heart-pulse"
                      size={21}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Body strong>Complete your medical profile</Body>
                    <Muted>Help your doctor prepare and prescribe safely.</Muted>
                  </View>
                </View>
                <View style={styles.profileProgressRow}>
                  <Text style={styles.progressLabel}>Profile completion</Text>
                  <Mono style={styles.completion}>{data.profileCompleteness}%</Mono>
                </View>
                <ProgressBar value={data.profileCompleteness} />
                <Button
                  label="Continue profile"
                  tone="secondary"
                  onPress={() => router.push("/(patient)/profile")}
                />
              </Card>
            </FadeInView>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Emergency information"
            onPress={() => Linking.openURL("tel:112")}
            style={({ pressed }) => [styles.emergency, pressed && { opacity: 0.7 }]}
          >
            <MaterialCommunityIcons name="phone-alert" size={18} color={colors.danger} />
            <Text style={styles.emergencyText}>
              Not for emergencies — tap to call emergency services
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Live countdown for a soon (<24h) visit; null otherwise so callers fall back. */
function countdownLabel(startsAt: string, now: number): string | null {
  const diff = new Date(startsAt).getTime() - now;
  if (diff <= 0) return "Starting now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `Starts in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Starts in ${hours}h ${mins % 60}m`;
  return null;
}

function MedSlotRow({
  slot,
  meds,
}: {
  slot: (typeof SLOT_OF_DAY)[number];
  meds: ActiveMedication[];
}) {
  return (
    <View style={styles.medSlot}>
      <View style={[styles.medSlotIcon, { backgroundColor: slot.bg }]}>
        <MaterialCommunityIcons name={slot.icon} size={18} color={slot.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.medSlotLabel}>{slot.label.toUpperCase()}</Text>
        {meds.map((m, i) => (
          <Text key={`${m.name}-${i}`} style={styles.medName}>
            {m.name}
            {m.strength ? ` ${m.strength}` : ""}
            {m.foodRelation ? ` · ${m.foodRelation}` : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

function DoctorAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return (
      <Image
        alt={`Photo of ${name}`}
        accessibilityLabel={`Photo of ${name}`}
        source={{ uri: photoUrl }}
        style={styles.doctorPhoto}
      />
    );
  }
  return <Avatar name={name} />;
}

function TrustChip({
  icon,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.trustChip}>
      <MaterialCommunityIcons name={icon} size={13} color={colors.primary} />
      <Text style={styles.trustChipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Meta({
  icon,
  value,
  label,
  mono,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  label: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.meta}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      <View>
        <Text style={[styles.metaValue, mono && { fontFamily: fonts.monoSemibold }]}>
          {value}
        </Text>
        <Text style={styles.metaLabel}>{label}</Text>
      </View>
    </View>
  );
}

interface ReminderItem {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone: "warning" | "info";
  title: string;
  message: string;
  onPress: () => void;
}

function ReminderRow({ item }: { item: ReminderItem }) {
  const palette =
    item.tone === "warning"
      ? { bg: colors.warningBg, fg: colors.warning }
      : { bg: colors.infoBg, fg: colors.info };
  return (
    <PressableScale accessibilityRole="button" onPress={item.onPress}>
      <Card>
        <View style={styles.row}>
          <View style={[styles.reminderIcon, { backgroundColor: palette.bg }]}>
            <MaterialCommunityIcons name={item.icon} size={20} color={palette.fg} />
          </View>
          <View style={styles.grow}>
            <Body strong>{item.title}</Body>
            <Muted>{item.message}</Muted>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textFaint} />
        </View>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fallback: { flex: 1, justifyContent: "center", padding: space.md },
  scroll: { paddingBottom: 126 },
  body: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: space.md + 2,
    paddingTop: 18,
    gap: 16,
  },
  // Glass "wallet pass" on the gradient hero.
  pass: {
    borderRadius: radius.xl,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 18,
    gap: 5,
  },
  passKicker: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  passTitle: {
    color: "#fff",
    fontFamily: fonts.heading,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.4,
    marginTop: 6,
  },
  passTitleMono: {
    color: "#fff",
    fontFamily: fonts.monoSemibold,
    fontSize: 20,
  },
  passMeta: {
    color: "rgba(255,255,255,0.86)",
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  passActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  passCta: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  passCtaText: {
    color: colors.primaryDark,
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  passGhost: {
    width: 52,
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  passDot: {
    position: "absolute",
    top: 11,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  grow: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: { color: colors.success, fontFamily: fonts.bodySemibold, fontSize: 10 },
  doctorPhoto: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent },
  qualifications: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: 1,
  },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  trustChipText: { color: colors.accentFg, fontFamily: fonts.bodySemibold, fontSize: 11 },
  doctorBio: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  doctorMeta: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
  },
  meta: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  metaDivider: { width: 1, height: 34, backgroundColor: colors.border, marginHorizontal: 10 },
  metaValue: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 14 },
  metaLabel: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 10.5, marginTop: 1 },
  checkIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePrompt: { flex: 1, minWidth: 0 },
  profileProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: { color: colors.textMuted, fontFamily: fonts.bodySemibold, fontSize: 11.5 },
  completion: { color: colors.primaryDark, fontFamily: fonts.monoSemibold, fontSize: 14 },
  sectionLink: { color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 13 },
  stack: { gap: 11 },
  reminderIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  followUpIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  medDivider: { height: 1, backgroundColor: colors.border, marginVertical: 11 },
  medSlot: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  medSlotIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  medSlotLabel: {
    color: colors.textFaint,
    fontFamily: fonts.bodySemibold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  medName: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 21 },
  emergency: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#f3cfcf",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emergencyText: { flex: 1, color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 12 },
});
