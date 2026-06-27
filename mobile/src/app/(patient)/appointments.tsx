import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { auroraHeaderStyles } from "@/components/aurora-header";
import { AuroraScreen } from "@/components/aurora-screen";
import { PatientAppointmentCard } from "@/components/clinical";
import { FadeInView } from "@/components/motion";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Muted,
  SegmentedControl,
} from "@/components/ui";
import { ListSkeleton } from "@/components/skeleton";
import { apiFetch } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";
import type { PatientAppointmentRow } from "@/lib/types";

type VisitTab = "upcoming" | "past";

export default function PatientAppointments() {
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<VisitTab>("upcoming");
  const query = useQuery({
    queryKey: ["patient", "appointments"],
    queryFn: () => apiFetch<PatientAppointmentRow[]>("/api/appointments"),
  });
  if (query.isLoading) {
    return (
      <AuroraScreen
        variant="patient"
        compactHeader
        title="Visits"
        subtitle="Your consultations, in one place"
      >
        <ListSkeleton />
      </AuroraScreen>
    );
  }

  const rows = query.data ?? [];
  const upcoming = rows
    .filter(
      ({ appointment }) =>
        !["cancelled", "completed", "no_show"].includes(appointment.status) &&
        new Date(appointment.endsAt).getTime() > now
    )
    .sort(
      (a, b) =>
        new Date(a.appointment.startsAt).getTime() -
        new Date(b.appointment.startsAt).getTime()
    );
  const past = rows
    .filter((row) => !upcoming.includes(row))
    .sort(
      (a, b) =>
        new Date(b.appointment.startsAt).getTime() -
        new Date(a.appointment.startsAt).getTime()
    );
  const selected = tab === "upcoming" ? upcoming : past;
  const open = (id: string) =>
    router.push({ pathname: "/(patient)/appointments/[id]", params: { id } });

  return (
    <AuroraScreen
      variant="patient"
      compactHeader
      title="Visits"
      subtitle="Your consultations, in one place"
      action={
        <Pressable
          accessibilityLabel="Book a consultation"
          accessibilityRole="button"
          style={auroraHeaderStyles.headerAction}
          onPress={() => router.push("/(patient)/book")}
        >
          <MaterialCommunityIcons name="calendar-plus" size={21} color={colors.primary} />
        </Pressable>
      }
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : null}

      <SegmentedControl
        value={tab}
        onChange={(value) => setTab(value as VisitTab)}
        options={[
          { label: "Upcoming", value: "upcoming", count: upcoming.length },
          { label: "Past", value: "past", count: past.length },
        ]}
      />

      {selected.length > 0 ? (
        <View style={styles.list}>
          {selected.map((row, index) => (
            <FadeInView key={row.appointment.id} index={index}>
              <PatientAppointmentCard
                row={row}
                onPress={() => open(row.appointment.id)}
              />
            </FadeInView>
          ))}
        </View>
      ) : (
        <EmptyState
          compact
          icon={tab === "upcoming" ? "calendar-blank-outline" : "history"}
          title={tab === "upcoming" ? "No upcoming visits" : "No past visits"}
          message={
            tab === "upcoming"
              ? "Choose a convenient time for your next video consultation."
              : "Completed and cancelled consultations will appear here."
          }
          action={
            tab === "upcoming" ? (
              <Button
                label="Book a consultation"
                icon="calendar-plus"
                compact
                onPress={() => router.push("/(patient)/book")}
              />
            ) : undefined
          }
        />
      )}

      {rows.length === 0 ? (
        <Card tone="accent">
          <View style={styles.tipRow}>
            <View style={styles.tipIcon}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.tipCopy}>
              <Text style={styles.tipTitle}>What happens after booking?</Text>
              <Muted>
                You can review payment, intake notes, reports, and the join link from the
                visit details screen.
              </Muted>
            </View>
          </View>
        </Card>
      ) : null}
    </AuroraScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  tipCopy: { flex: 1, gap: 3 },
  tipTitle: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 14 },
});
