import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AuroraHeader, auroraHeaderStyles } from "@/components/aurora-header";
import { CountUp, FadeInView, PressableScale } from "@/components/motion";
import {
  Avatar,
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
import { formatDate, formatDateTime, formatMoney, relativeStart } from "@/lib/format";
import { useSession } from "@/lib/auth";
import { colors, fonts, radius, space } from "@/lib/theme";
import type { PatientHomeData } from "@/lib/types";

export default function PatientHome() {
  const { data: session } = useSession();
  const [now] = useState(() => Date.now());
  const query = useQuery({
    queryKey: ["patient", "home"],
    queryFn: () => apiFetch<PatientHomeData>("/api/v1/patient/home"),
  });

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
  const upcoming = data.appointments.filter(
    ({ appointment }) =>
      appointment.status === "confirmed" &&
      new Date(appointment.endsAt).getTime() > now
  ).length;
  const completed = data.appointments.filter(
    ({ appointment }) => appointment.status === "completed"
  ).length;
  const firstName = session?.user.name?.split(" ")[0];
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
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
          title={`Welcome${firstName ? `,\n${firstName}` : ""}`}
          action={
            <Pressable
              style={auroraHeaderStyles.headerAction}
              onPress={() => router.push("/(patient)/settings")}
            >
              <MaterialCommunityIcons name="cog-outline" size={22} color="#fff" />
            </Pressable>
          }
        >
          <View style={styles.heroStats}>
            <HeroStat label="Upcoming" value={upcoming} />
            <HeroStat label="Consults" value={completed} />
            <HeroStat label="Prescriptions" value={data.prescriptionCount} />
          </View>
        </AuroraHeader>

        <View style={styles.body}>
          <FadeInView index={0}>
            <Card>
              <View style={styles.quickRow}>
                <QuickAction
                  icon="calendar-plus"
                  label="Book"
                  tint={colors.accent}
                  fg={colors.primary}
                  onPress={() => router.push("/(patient)/book")}
                />
                <QuickAction
                  icon="chat-outline"
                  label="Messages"
                  tint={colors.infoBg}
                  fg={colors.info}
                  onPress={() => router.push("/(patient)/messages")}
                />
                <QuickAction
                  icon="pill"
                  label="Rx"
                  tint={colors.doctorBg}
                  fg={colors.doctor}
                  onPress={() => router.push("/(patient)/prescriptions")}
                />
                <QuickAction
                  icon="account-heart-outline"
                  label="Profile"
                  tint={colors.warningBg}
                  fg={colors.warning}
                  onPress={() => router.push("/(patient)/profile")}
                />
              </View>
            </Card>
          </FadeInView>

          <FadeInView index={1}>
            <SectionHeader title="Next appointment" />
            {next ? (
              <PressableScale
                onPress={() =>
                  router.push({
                    pathname: "/(patient)/appointments/[id]",
                    params: { id: next.appointment.id },
                  })
                }
              >
                <Card
                  tone={next.appointment.status === "pending_payment" ? "warning" : "default"}
                >
                  <View style={styles.between}>
                    <View style={styles.row}>
                      <Avatar name={data.doctor?.name || "Doctor"} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Body strong>{formatDateTime(next.appointment.startsAt)}</Body>
                        <Muted>
                          Dr. {data.doctor?.name || "Your doctor"} ·{" "}
                          {relativeStart(next.appointment.startsAt)}
                        </Muted>
                      </View>
                    </View>
                    <StatusBadge status={next.appointment.status} audience="patient" />
                  </View>
                  <View style={styles.cardCta}>
                    <Text style={styles.cardCtaText}>
                      {next.appointment.status === "pending_payment"
                        ? "Continue payment"
                        : "View appointment"}
                    </Text>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                </Card>
              </PressableScale>
            ) : (
              <EmptyState
                icon="calendar-blank-outline"
                title="No upcoming appointments"
                message="Book your first consultation and it'll show up right here."
                action={
                  <Button
                    label="Book a consultation"
                    icon="calendar-plus"
                    compact
                    onPress={() => router.push("/(patient)/book")}
                  />
                }
              />
            )}
          </FadeInView>

          {data.recentPrescriptions.length > 0 ? (
            <FadeInView index={2}>
              <SectionHeader
                title="Recent prescriptions"
                action={
                  <Pressable onPress={() => router.push("/(patient)/prescriptions")}>
                    <Muted>View all</Muted>
                  </Pressable>
                }
              />
              <View style={{ gap: 11 }}>
                {data.recentPrescriptions.slice(0, 2).map((row) => (
                  <PressableScale
                    key={row.prescription.id}
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
                        <View style={{ flex: 1 }}>
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
          ) : null}

          <FadeInView index={3}>
            <SectionHeader title="Your doctor" />
            <Card>
              <View style={styles.row}>
                <Avatar name={data.doctor?.name || "Doctor"} />
                <View style={{ flex: 1 }}>
                  <Body strong>Dr. {data.doctor?.name || "Your doctor"}</Body>
                  <Muted>{data.doctor?.specialty || "General physician"}</Muted>
                </View>
              </View>
              <View style={styles.doctorMeta}>
                <Text style={styles.metaText}>
                  {formatMoney(data.doctor?.feeInPaise)} consultation
                </Text>
                <Text style={styles.metaText}>
                  {data.doctor?.slotMinutes ?? 20} minutes
                </Text>
              </View>
            </Card>
          </FadeInView>

          {data.profileCompleteness < 100 ? (
            <FadeInView index={4}>
              <SectionHeader title="Medical profile" />
              <Card tone="accent">
                <View style={styles.between}>
                  <Body strong>Help your doctor treat you safely</Body>
                  <Body strong>{data.profileCompleteness}%</Body>
                </View>
                <ProgressBar value={data.profileCompleteness} />
                <Button
                  label="Complete profile"
                  tone="secondary"
                  onPress={() => router.push("/(patient)/profile")}
                />
              </Card>
            </FadeInView>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.heroStat}>
      <CountUp value={value} style={styles.heroStatValue} />
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  tint,
  fg,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  tint: string;
  fg: string;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.qa} onPress={onPress} haptic="light">
      <View style={[styles.qaIcon, { backgroundColor: tint }]}>
        <MaterialCommunityIcons name={icon} size={24} color={fg} />
      </View>
      <Text style={styles.qaLabel} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fallback: { flex: 1, justifyContent: "center", padding: space.md },
  scroll: { paddingBottom: 120 },
  body: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.md },
  heroStats: { flexDirection: "row", gap: 10 },
  heroStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 13,
    gap: 1,
  },
  heroStatValue: { fontFamily: fonts.display, fontSize: 23, color: "#ffffff" },
  heroStatLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
  },
  quickRow: { flexDirection: "row", justifyContent: "space-between" },
  qa: { flex: 1, alignItems: "center", gap: 8 },
  qaIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  qaLabel: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.text },
  rxIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 11,
  },
  cardCtaText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  doctorMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 11,
  },
  metaText: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.bodySemibold },
});
