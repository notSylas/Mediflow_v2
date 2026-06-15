import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { DoctorAppointmentCard } from "@/components/clinical";
import { AuroraHeader, auroraHeaderStyles } from "@/components/aurora-header";
import { CountUp, FadeInView } from "@/components/motion";
import {
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  SectionHeader,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useSession } from "@/lib/auth";
import { colors, fonts, radius, space } from "@/lib/theme";
import type { DoctorHomeData } from "@/lib/types";

export default function DoctorHome() {
  const { data: session } = useSession();
  const query = useQuery({
    queryKey: ["doctor", "home"],
    queryFn: () => apiFetch<DoctorHomeData>("/api/v1/doctor/home"),
  });
  if (query.isLoading) return <Loading label="Opening your clinic…" />;
  if (!query.data) {
    return (
      <View style={styles.fallback}>
        <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
      </View>
    );
  }

  const { appointments, profile, revenueInPaise, hasAvailability } = query.data;
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
  const setupIncomplete = !profile.specialty || !hasAvailability;

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
            tintColor={colors.doctor}
          />
        }
      >
        <AuroraHeader
          variant="doctor"
          eyebrow="Your clinic at a glance"
          title={`Hello,\nDr. ${session?.user.name?.split(" ")[0] || "Doctor"}`}
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
            <SectionHeader
              title="Next patient"
              action={
                <Pressable onPress={() => router.push("/(doctor)/appointments")}>
                  <Muted>View all</Muted>
                </Pressable>
              }
            />
            {next ? (
              <DoctorAppointmentCard
                row={next}
                onPress={() =>
                  router.push({
                    pathname: "/(doctor)/encounter/[id]",
                    params: { id: next.appointment.id },
                  })
                }
              />
            ) : (
              <EmptyState
                icon="calendar-check-outline"
                title="No confirmed visits ahead"
                message="New patient bookings will appear here."
              />
            )}
          </FadeInView>

          <FadeInView index={2}>
            <SectionHeader title="Today's schedule" />
            {today.length === 0 ? (
              <Card>
                <Muted>Nothing is scheduled today.</Muted>
              </Card>
            ) : (
              <View style={{ gap: 11 }}>
                {today.map((row) => (
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
            )}
          </FadeInView>
        </View>
      </ScrollView>
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
  heroStatValue: { fontFamily: fonts.display, fontSize: 21, color: "#ffffff" },
  heroStatLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
  },
});
