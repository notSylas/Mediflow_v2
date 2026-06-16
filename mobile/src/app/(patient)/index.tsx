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
import { AuroraHeader, auroraHeaderStyles } from "@/components/aurora-header";
import { FadeInView, PressableScale } from "@/components/motion";
import {
  Avatar,
  Body,
  Button,
  Card,
  ErrorState,
  Loading,
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
  { key: "morning", label: "Morning", icon: "weather-sunset-up" },
  { key: "afternoon", label: "Afternoon", icon: "weather-sunny" },
  { key: "evening", label: "Evening", icon: "weather-sunset-down" },
  { key: "night", label: "Night", icon: "weather-night" },
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
        <AuroraHeader
          variant="patient"
          eyebrow={dateLabel}
          title={`${greeting}${firstName ? `, ${firstName}` : ""}`}
          action={
            <Pressable
              accessibilityLabel="Open account settings"
              accessibilityRole="button"
              style={auroraHeaderStyles.headerAction}
              onPress={() => router.push("/(patient)/settings")}
            >
              <MaterialCommunityIcons name="cog-outline" size={22} color="#fff" />
            </Pressable>
          }
        >
          <View style={styles.heroPanel}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>
                {next
                  ? "YOUR NEXT VISIT"
                  : isReturning
                    ? "READY FOR A FOLLOW-UP?"
                    : "CARE, WHEN YOU NEED IT"}
              </Text>
              <Text style={styles.heroTitle}>
                {next
                  ? formatDateTime(next.appointment.startsAt)
                  : isReturning
                    ? "Book a follow-up visit"
                    : "Book a private video consultation"}
              </Text>
              <Text style={styles.heroMeta}>
                {next
                  ? `${doctorLabel} · ${countdown ?? relativeStart(next.appointment.startsAt)}`
                  : soonestSlot
                    ? `Next available: ${formatDateTime(soonestSlot)}`
                    : `${doctorLabel} · ${data.doctor?.slotMinutes ?? 20} minutes`}
              </Text>
            </View>
            <PressableScale
              accessibilityRole="button"
              style={styles.heroButton}
              onPress={openNext}
            >
              <Text style={styles.heroButtonText}>{heroCta}</Text>
              <MaterialCommunityIcons
                name={canJoin ? "video" : "arrow-right"}
                size={18}
                color={colors.primaryDark}
              />
            </PressableScale>
          </View>
        </AuroraHeader>

        <View style={styles.body}>
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
            <FadeInView index={0}>
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
            <FadeInView index={0}>
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
                      <MedSlotRow icon={slot.icon} label={slot.label} meds={meds} />
                    </View>
                  );
                })}
              </Card>
            </FadeInView>
          ) : null}

          <FadeInView index={0}>
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
                <Meta icon="cash" value={formatMoney(data.doctor?.feeInPaise)} label="per visit" />
                <View style={styles.metaDivider} />
                <Meta
                  icon="clock-outline"
                  value={`${data.doctor?.slotMinutes ?? 20} min`}
                  label="video consult"
                />
              </View>
            </Card>
          </FadeInView>

          {next?.appointment.status === "confirmed" ? (
            <FadeInView index={1}>
              <SectionHeader title="Get ready for your visit" />
              <Card>
                <PrepItem
                  done={data.profileCompleteness === 100}
                  label="Complete your medical profile"
                  onPress={() => router.push("/(patient)/profile")}
                />
                <View style={styles.prepDivider} />
                <PrepItem
                  done={Boolean(next.report)}
                  label="Upload a recent report (optional)"
                  onPress={() =>
                    router.push({
                      pathname: "/(patient)/appointments/[id]",
                      params: { id: next.appointment.id },
                    })
                  }
                />
                <View style={styles.prepDivider} />
                <PrepItem label="Test your camera and microphone" />
                <View style={styles.prepDivider} />
                <PrepItem label="Find a quiet, well-lit space" />
              </Card>
            </FadeInView>
          ) : null}

          {data.profileCompleteness < 100 ? (
            <FadeInView index={2}>
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
                  <Text style={styles.completion}>{data.profileCompleteness}%</Text>
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

          {data.recentPrescriptions.length > 0 ? (
            <FadeInView index={2}>
              <SectionHeader
                title="Recent prescriptions"
                action={
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/(patient)/prescriptions")}
                  >
                    <Text style={styles.sectionLink}>View all</Text>
                  </Pressable>
                }
              />
              <View style={styles.stack}>
                {data.recentPrescriptions.slice(0, 2).map((row) => (
                  <PressableScale
                    key={row.prescription.id}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/(patient)/appointments/[id]",
                        params: { id: row.appointment.id },
                      })
                    }
                  >
                    <Card>
                      <View style={styles.row}>
                        <View style={styles.rxIcon}>
                          <MaterialCommunityIcons name="pill" size={20} color={colors.doctor} />
                        </View>
                        <View style={styles.grow}>
                          <Body strong>{row.prescription.diagnosis || "Consultation"}</Body>
                          <Muted>
                            {row.medicines.length} medicine
                            {row.medicines.length === 1 ? "" : "s"}
                            {row.prescription.issuedAt
                              ? ` · ${formatDate(row.prescription.issuedAt)}`
                              : ""}
                          </Muted>
                        </View>
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={colors.textMuted}
                        />
                      </View>
                    </Card>
                  </PressableScale>
                ))}
              </View>
            </FadeInView>
          ) : completed === 0 && !next ? (
            <FadeInView index={3}>
              <SectionHeader title="How MediFlow works" />
              <Card>
                <CareStep
                  icon="calendar-check-outline"
                  title="Choose a time"
                  message="Pick an available slot and pay securely."
                />
                <View style={styles.stepDivider} />
                <CareStep
                  icon="video-outline"
                  title="Meet your doctor"
                  message="Join the private video consultation from the app."
                />
                <View style={styles.stepDivider} />
                <CareStep
                  icon="file-document-check-outline"
                  title="Keep your care record"
                  message="Review visit details and issued prescriptions anytime."
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
  icon,
  label,
  meds,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  meds: ActiveMedication[];
}) {
  return (
    <View style={styles.medSlot}>
      <View style={styles.medSlotIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.medSlotLabel}>{label}</Text>
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
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.meta}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      <View>
        <Text style={styles.metaValue}>{value}</Text>
        <Text style={styles.metaLabel}>{label}</Text>
      </View>
    </View>
  );
}

function CareStep({
  icon,
  title,
  message,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.grow}>
        <Body strong>{title}</Body>
        <Muted>{message}</Muted>
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
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
        </View>
      </Card>
    </PressableScale>
  );
}

function PrepItem({
  label,
  done,
  onPress,
}: {
  label: string;
  done?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.prepRow}>
      <MaterialCommunityIcons
        name={done ? "check-circle" : "circle-outline"}
        size={22}
        color={done ? colors.success : colors.textMuted}
      />
      <Text style={[styles.prepLabel, done && styles.prepLabelDone]}>{label}</Text>
      {onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
      ) : null}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => pressed && { opacity: 0.6 }}
      >
        {content}
      </Pressable>
    );
  }
  return content;
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
  heroPanel: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    padding: 14,
    gap: 13,
  },
  heroCopy: { gap: 3 },
  heroKicker: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#ffffff",
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 24,
  },
  heroMeta: {
    color: "rgba(255,255,255,0.88)",
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  heroButton: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroButtonText: {
    color: colors.primaryDark,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  grow: { flex: 1, gap: 2 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  continuityBadge: {
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  continuityText: {
    color: colors.success,
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
  },
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
  doctorPhoto: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
  },
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
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trustChipText: { color: colors.primaryDark, fontFamily: fonts.bodySemibold, fontSize: 11 },
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
    backgroundColor: colors.bg,
    padding: 12,
  },
  meta: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  metaDivider: { width: 1, height: 34, backgroundColor: colors.border, marginHorizontal: 10 },
  metaValue: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 13 },
  metaLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 10 },
  checkIcon: {
    width: 42,
    height: 42,
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
  progressLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
  },
  completion: {
    color: colors.primaryDark,
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  sectionLink: { color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 13 },
  stack: { gap: 11 },
  rxIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 54,
    marginVertical: 2,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  followUpIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  prepDivider: { height: 1, backgroundColor: colors.border, marginLeft: 34 },
  prepRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  prepLabel: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 14 },
  prepLabelDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  medDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  medSlot: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  medSlotIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  medSlotLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  medName: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 21 },
  emergency: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: "#f2caca",
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  emergencyText: { flex: 1, color: colors.danger, fontFamily: fonts.bodySemibold, fontSize: 12 },
});
