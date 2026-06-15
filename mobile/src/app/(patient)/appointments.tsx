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
  SectionHeader,
} from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { FadeInView } from "@/components/motion";
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

  const isEmpty = !query.error && upcoming.length === 0 && past.length === 0;
  return (
    <AuroraScreen
      variant="patient"
      title="My appointments"
      subtitle="Upcoming and past consultations"
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon="calendar-blank-outline"
          title="No visits yet"
          message="Book your first consultation and it'll show up here."
          action={
            <Button
              label="Book a consultation"
              icon="calendar-plus"
              compact
              onPress={() => router.push("/(patient)/book")}
            />
          }
        />
      ) : null}

      {upcoming.length > 0 ? (
        <FadeInView index={0}>
          <SectionHeader title="Upcoming" />
          <View style={{ gap: 12 }}>
            {upcoming.map((row) => (
              <PatientAppointmentCard
                key={row.appointment.id}
                row={row}
                onPress={() => open(row.appointment.id)}
              />
            ))}
          </View>
        </FadeInView>
      ) : null}

      {past.length > 0 ? (
        <FadeInView index={1}>
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
        </FadeInView>
      ) : null}
    </AuroraScreen>
  );
}
