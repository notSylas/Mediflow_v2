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
  SectionHeader,
} from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { FadeInView } from "@/components/motion";
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
    <AuroraScreen
      variant="doctor"
      title="Appointments"
      subtitle="Search and run every consultation"
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
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
      <AppointmentSection title="Today" rows={today} onOpen={open} index={0} />
      <AppointmentSection title="Upcoming" rows={upcoming} onOpen={open} index={1} />
      <AppointmentSection title="Past" rows={past} onOpen={open} index={2} />
    </AuroraScreen>
  );
}

function AppointmentSection({
  title,
  rows,
  onOpen,
  index,
}: {
  title: string;
  rows: DoctorAppointmentRow[];
  onOpen: (id: string) => void;
  index: number;
}) {
  if (rows.length === 0) return null;
  return (
    <FadeInView index={index}>
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
    </FadeInView>
  );
}
