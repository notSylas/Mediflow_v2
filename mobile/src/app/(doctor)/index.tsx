import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { DoctorAppointmentCard } from "@/components/clinical";
import {
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  PageHeader,
  Screen,
  SectionHeader,
  StatCard,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useSession } from "@/lib/auth";
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
      <Screen>
        <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
      </Screen>
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
  const completed = appointments.filter(
    ({ appointment }) => appointment.status === "completed"
  );
  const next = [...upcoming].sort(
    (a, b) =>
      new Date(a.appointment.startsAt).getTime() -
      new Date(b.appointment.startsAt).getTime()
  )[0];

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <PageHeader
        title={`Hello, Dr. ${session?.user.name?.split(" ")[0] || "Doctor"}`}
        subtitle="Your clinic at a glance."
        action={
          <Button
            label="Schedule"
            compact
            tone="secondary"
            onPress={() => router.push("/(doctor)/schedule")}
          />
        }
      />

      {!profile.specialty || !hasAvailability ? (
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
      ) : null}

      <View style={styles.stats}>
        <StatCard label="Today" value={today.length} icon="calendar-today" tone="info" />
        <StatCard label="Upcoming" value={upcoming.length} icon="calendar-clock" tone="doctor" />
        <StatCard label="Completed" value={completed.length} icon="check-decagram" />
        <StatCard
          label="Collected"
          value={formatMoney(revenueInPaise)}
          icon="currency-inr"
          tone="warning"
        />
      </View>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
});
