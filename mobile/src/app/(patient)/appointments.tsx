import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";
import { PatientAppointmentCard } from "@/components/clinical";
import {
  Button,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { PatientAppointmentRow } from "@/lib/types";

export default function PatientAppointments() {
  const [now] = useState(() => Date.now());
  const query = useQuery({
    queryKey: ["patient", "appointments"],
    queryFn: () => apiFetch<PatientAppointmentRow[]>("/api/appointments"),
  });
  if (query.isLoading) return <Loading />;

  const rows = query.data ?? [];
  const upcoming = rows.filter(
    ({ appointment }) =>
      !["cancelled", "completed", "no_show"].includes(appointment.status) &&
      new Date(appointment.endsAt).getTime() > now
  );
  const past = rows.filter((row) => !upcoming.includes(row));
  const open = (id: string) =>
    router.push({ pathname: "/(patient)/appointments/[id]", params: { id } });

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <PageHeader title="My appointments" subtitle="Upcoming and past consultations." />
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : null}

      <SectionHeader title="Upcoming" />
      {upcoming.length === 0 ? (
        <EmptyState
          icon="calendar-blank-outline"
          title="No upcoming visits"
          message="Choose a time that works for you."
          action={
            <Button
              label="Book consultation"
              compact
              onPress={() => router.push("/(patient)/book")}
            />
          }
        />
      ) : (
        <View style={{ gap: 12 }}>
          {upcoming.map((row) => (
            <PatientAppointmentCard
              key={row.appointment.id}
              row={row}
              onPress={() => open(row.appointment.id)}
            />
          ))}
        </View>
      )}

      {past.length > 0 ? (
        <>
          <SectionHeader title="Past" />
          <View style={{ gap: 12 }}>
            {past.map((row) => (
              <PatientAppointmentCard
                key={row.appointment.id}
                row={row}
                onPress={() => open(row.appointment.id)}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
