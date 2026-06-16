import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { DoctorAppointmentCard } from "@/components/clinical";
import {
  Card,
  ChoiceChips,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Muted,
  SectionHeader,
} from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { FadeInView } from "@/components/motion";
import { apiFetch } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";
import type { DoctorAppointmentRow } from "@/lib/types";

interface Response {
  appointments: DoctorAppointmentRow[];
  timezone: string;
}

export default function DoctorAppointments() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [now] = useState(() => Date.now());
  const [todayKey] = useState(() => new Date().toDateString());
  const query = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: () => apiFetch<Response>("/api/v1/doctor/appointments"),
  });
  const rows = useMemo(() => query.data?.appointments ?? [], [query.data?.appointments]);
  const queueCounts = useMemo(
    () => ({
      today: rows.filter((row) => isToday(row, todayKey)).length,
      upcoming: rows.filter((row) => isUpcoming(row, now, todayKey)).length,
      needsRx: rows.filter(needsPrescription).length,
      triage: rows.filter((row) => Boolean(row.appointment.triageFlaggedAt)).length,
    }),
    [now, rows, todayKey]
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const { appointment, patient } = row;
      if (!matchesQueue(row, filter, now, todayKey)) return false;
      if (!term) return true;
      return [patient.name, patient.email, appointment.intakeNote ?? "", appointment.visitReason ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [filter, now, rows, search, todayKey]);

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
      <Card tone="doctor">
        <View style={styles.summaryGrid}>
          <QueueMetric icon="calendar-today" label="Today" value={queueCounts.today} />
          <QueueMetric icon="calendar-arrow-right" label="Upcoming" value={queueCounts.upcoming} />
          <QueueMetric icon="file-document-edit-outline" label="Needs Rx" value={queueCounts.needsRx} />
          <QueueMetric icon="alert-octagon-outline" label="Triage" value={queueCounts.triage} />
        </View>
      </Card>
      <Field
        label="Search visits"
        value={search}
        onChangeText={setSearch}
        placeholder="Patient name, email, or symptoms"
      />
      <ChoiceChips
        options={[
          { label: "All", value: "all" },
          { label: "Today", value: "today" },
          { label: "Upcoming", value: "upcoming" },
          { label: "Needs Rx", value: "needs_rx" },
          { label: "Triage", value: "triage" },
          { label: "Completed", value: "completed" },
          { label: "Closed", value: "closed" },
        ]}
        value={filter}
        onChange={setFilter}
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

function isToday(row: DoctorAppointmentRow, todayKey: string) {
  return new Date(row.appointment.startsAt).toDateString() === todayKey;
}

function isUpcoming(row: DoctorAppointmentRow, now: number, todayKey: string) {
  return (
    new Date(row.appointment.startsAt).getTime() > now &&
    new Date(row.appointment.startsAt).toDateString() !== todayKey &&
    row.appointment.status === "confirmed"
  );
}

function needsPrescription(row: DoctorAppointmentRow) {
  return row.appointment.status === "completed" && row.prescriptionStatus !== "issued";
}

function matchesQueue(
  row: DoctorAppointmentRow,
  filter: string,
  now: number,
  todayKey: string
) {
  if (filter === "all") return true;
  if (filter === "today") return isToday(row, todayKey);
  if (filter === "upcoming") return isUpcoming(row, now, todayKey);
  if (filter === "needs_rx") return needsPrescription(row);
  if (filter === "triage") return Boolean(row.appointment.triageFlaggedAt);
  if (filter === "completed") return row.appointment.status === "completed";
  if (filter === "closed") {
    return ["cancelled", "no_show"].includes(row.appointment.status);
  }
  return row.appointment.status === filter;
}

function QueueMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.queueMetric}>
      <View style={styles.queueIcon}>
        <MaterialCommunityIcons name={icon} size={16} color={colors.doctor} />
      </View>
      <View>
        <Text style={styles.queueValue}>{value}</Text>
        <Muted>{label}</Muted>
      </View>
    </View>
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

const styles = StyleSheet.create({
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  queueMetric: {
    width: "48%",
    minHeight: 66,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(91,85,214,0.16)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  queueIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  queueValue: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
});
