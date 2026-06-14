import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";
import { DoctorAppointmentCard } from "@/components/clinical";
import {
  ChoiceChips,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  PageHeader,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { DoctorAppointmentRow } from "@/lib/types";

interface Response {
  appointments: DoctorAppointmentRow[];
  timezone: string;
}

export default function DoctorAppointments() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [now] = useState(() => Date.now());
  const [todayKey] = useState(() => new Date().toDateString());
  const query = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: () => apiFetch<Response>("/api/v1/doctor/appointments"),
  });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data?.appointments ?? []).filter(({ appointment, patient }) => {
      if (status !== "all" && appointment.status !== status) return false;
      if (!term) return true;
      return [patient.name, patient.email, appointment.intakeNote ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [query.data, search, status]);

  if (query.isLoading) return <Loading />;
  const today = filtered.filter(
    ({ appointment }) => new Date(appointment.startsAt).toDateString() === todayKey
  );
  const upcoming = filtered.filter(
    ({ appointment }) =>
      new Date(appointment.startsAt).getTime() > now &&
      new Date(appointment.startsAt).toDateString() !== todayKey
  );
  const past = filtered.filter((row) => !today.includes(row) && !upcoming.includes(row));
  const open = (id: string) =>
    router.push({ pathname: "/(doctor)/encounter/[id]", params: { id } });

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <PageHeader title="Appointments" subtitle="Search and run every consultation." />
      <Field
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Patient name, email, or symptoms"
      />
      <ChoiceChips
        options={[
          { label: "All", value: "all" },
          { label: "Confirmed", value: "confirmed" },
          { label: "Completed", value: "completed" },
          { label: "Cancelled", value: "cancelled" },
          { label: "No-show", value: "no_show" },
        ]}
        value={status}
        onChange={setStatus}
      />
      {query.error ? <ErrorState message={query.error.message} /> : null}
      {filtered.length === 0 ? (
        <EmptyState
          icon="calendar-search"
          title="No matching appointments"
          message="Adjust the search or status filter."
        />
      ) : null}
      <AppointmentSection title="Today" rows={today} onOpen={open} />
      <AppointmentSection title="Upcoming" rows={upcoming} onOpen={open} />
      <AppointmentSection title="Past" rows={past} onOpen={open} />
    </Screen>
  );
}

function AppointmentSection({
  title,
  rows,
  onOpen,
}: {
  title: string;
  rows: DoctorAppointmentRow[];
  onOpen: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <SectionHeader title={title} />
      <View style={{ gap: 11 }}>
        {rows.map((row) => (
          <DoctorAppointmentCard
            key={row.appointment.id}
            row={row}
            onPress={() => onOpen(row.appointment.id)}
          />
        ))}
      </View>
    </>
  );
}
