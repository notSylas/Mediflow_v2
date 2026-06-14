import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import {
  BackHeader,
  Body,
  Button,
  Card,
  ErrorState,
  Loading,
  Muted,
  Screen,
  StatusBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import { colors, radius } from "@/lib/theme";
import type {
  AvailabilityOverride,
  AvailabilityRule,
  DoctorAppointmentRow,
} from "@/lib/types";

interface Response {
  rules: AvailabilityRule[];
  overrides: AvailabilityOverride[];
  appointments: DoctorAppointmentRow[];
  timezone: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DoctorSchedule() {
  const [week, setWeek] = useState(0);
  const query = useQuery({
    queryKey: ["doctor", "schedule"],
    queryFn: () => apiFetch<Response>("/api/v1/doctor/schedule"),
  });
  const days = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + week * 7);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      const weekday = date.getDay();
      const overrides = query.data?.overrides.filter((item) => item.date === key) ?? [];
      const blocked = overrides.some((item) => item.kind === "blocked");
      const rules = blocked
        ? []
        : query.data?.rules.filter((item) => item.weekday === weekday) ?? [];
      const appointments =
        query.data?.appointments
          .filter(
            ({ appointment }) =>
              new Date(appointment.startsAt).toDateString() === date.toDateString() &&
              ["confirmed", "completed"].includes(appointment.status)
          )
          .sort(
            (a, b) =>
              new Date(a.appointment.startsAt).getTime() -
              new Date(b.appointment.startsAt).getTime()
          ) ?? [];
      return { date, key, blocked, rules, overrides, appointments };
    });
  }, [query.data, week]);

  if (query.isLoading) return <Loading />;
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <BackHeader
        title="Clinic schedule"
        subtitle={`Timezone: ${query.data?.timezone ?? "Asia/Kolkata"}`}
        onBack={() => router.back()}
      />
      <View style={styles.weekNav}>
        <Button label="Previous" compact tone="secondary" onPress={() => setWeek((value) => value - 1)} />
        <Button label="This week" compact tone="ghost" onPress={() => setWeek(0)} />
        <Button label="Next" compact tone="secondary" onPress={() => setWeek((value) => value + 1)} />
      </View>
      {query.error ? <ErrorState message={query.error.message} /> : null}
      {days.map((day) => (
        <Card key={day.key} tone={day.blocked ? "danger" : "default"}>
          <View style={styles.between}>
            <View>
              <Body strong>{DAY_NAMES[day.date.getDay()]}</Body>
              <Muted>{formatDate(day.date)}</Muted>
            </View>
            {day.blocked ? <StatusBadge status="cancelled" /> : null}
          </View>
          {!day.blocked && day.rules.length === 0 ? <Muted>Not available</Muted> : null}
          {day.rules.map((rule) => (
            <View key={rule.id} style={styles.window}>
              <Body strong>
                {rule.startTime.slice(0, 5)} – {rule.endTime.slice(0, 5)}
              </Body>
            </View>
          ))}
          {day.overrides
            .filter((item) => item.kind === "extra")
            .map((item) => (
              <View key={item.id} style={[styles.window, { backgroundColor: colors.doctorBg }]}>
                <Body strong>
                  Extra: {item.startTime?.slice(0, 5)} – {item.endTime?.slice(0, 5)}
                </Body>
              </View>
            ))}
          {day.appointments.map((row) => (
            <Pressable
              key={row.appointment.id}
              style={styles.appointment}
              onPress={() =>
                router.push({
                  pathname: "/(doctor)/encounter/[id]",
                  params: { id: row.appointment.id },
                })
              }
            >
              <Body strong>{formatTime(row.appointment.startsAt)}</Body>
              <Muted>{row.patient.name || row.patient.email}</Muted>
              <StatusBadge status={row.appointment.status} />
            </Pressable>
          ))}
        </Card>
      ))}
      <Button
        label="Edit availability"
        onPress={() => router.replace("/(doctor)/settings")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  window: {
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  appointment: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
    gap: 4,
    backgroundColor: colors.bg,
  },
});
