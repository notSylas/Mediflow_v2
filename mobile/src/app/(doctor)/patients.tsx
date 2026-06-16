import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Body,
  Card,
  ChoiceChips,
  EmptyState,
  ErrorState,
  Field,
  Muted,
} from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { ListSkeleton } from "@/components/skeleton";
import { FadeInView, PressableScale } from "@/components/motion";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import type { PatientIdentity } from "@/lib/types";

interface PatientRow {
  patient: PatientIdentity;
  visitCount: number;
  lastVisit: string;
  upcomingCount: number;
  pendingRxCount: number;
  triageCount: number;
  pendingFollowUpCount: number;
  pendingRefillCount: number;
  reportCount: number;
  unreadMessageCount: number;
  hasRiskProfile: boolean;
}

interface Response {
  patients: PatientRow[];
  timezone: string;
}

export default function DoctorPatients() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const query = useQuery({
    queryKey: ["doctor", "patients", search],
    queryFn: () =>
      apiFetch<Response>(
        `/api/v1/doctor/patients${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`
      ),
  });
  const patients = useMemo(() => query.data?.patients ?? [], [query.data?.patients]);
  const visiblePatients = useMemo(
    () => patients.filter((row) => matchesFilter(row, filter)),
    [filter, patients]
  );

  if (query.isLoading && !query.data) {
    return (
      <AuroraScreen
        variant="doctor"
        title="Patients"
        subtitle="Your roster and consultation history"
      >
        <ListSkeleton />
      </AuroraScreen>
    );
  }
  const returningPatients = patients.filter((row) => row.visitCount > 1).length;
  const totalVisits = patients.reduce((sum, row) => sum + row.visitCount, 0);
  return (
    <AuroraScreen
      variant="doctor"
      title="Patients"
      subtitle="Your roster and consultation history"
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      <Field
        label="Search patients"
        value={search}
        onChangeText={setSearch}
        placeholder="Name or email"
      />
      <ChoiceChips
        options={[
          { label: "All", value: "all" },
          { label: "Risk", value: "risk" },
          { label: "Needs Rx", value: "needs_rx" },
          { label: "Follow-up", value: "follow_up" },
          { label: "Refills", value: "refills" },
          { label: "Unread", value: "unread" },
          { label: "Reports", value: "reports" },
          { label: "Upcoming", value: "upcoming" },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <Card tone="doctor">
        <View style={styles.rosterStats}>
          <RosterMetric icon="account-group-outline" label="Patients" value={patients.length} />
          <RosterMetric icon="history" label="Returning" value={returningPatients} />
          <RosterMetric icon="calendar-check-outline" label="Total visits" value={totalVisits} />
        </View>
      </Card>
      {query.error ? <ErrorState message={query.error.message} /> : null}
      {visiblePatients.length === 0 ? (
        <EmptyState
          icon="account-search-outline"
          title={search || filter !== "all" ? "No patients match" : "No patients yet"}
          message={
            search || filter !== "all"
              ? "Try another search or workflow filter."
              : "Patients appear after booking."
          }
        />
      ) : null}
      <View style={{ gap: 11 }}>
        {visiblePatients.map((row, i) => (
          <FadeInView key={row.patient.id} index={i}>
            <PressableScale
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: "/(doctor)/patients/[id]", params: { id: row.patient.id } })
              }
            >
              <Card>
                <View style={styles.row}>
                  <Avatar name={row.patient.name || row.patient.email} doctor />
                  <View style={{ flex: 1 }}>
                    <Body strong>{row.patient.name || row.patient.email}</Body>
                    <Muted>{row.patient.email}</Muted>
                    <View style={styles.tagRow}>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>
                          {row.visitCount > 1 ? "Returning patient" : "New patient"}
                        </Text>
                      </View>
                      {row.hasRiskProfile ? (
                        <WorkTag label="Risk profile" tone="danger" />
                      ) : null}
                      {row.pendingRxCount > 0 ? (
                        <WorkTag label={`${row.pendingRxCount} Rx`} tone="warning" />
                      ) : null}
                      {row.pendingFollowUpCount > 0 ? (
                        <WorkTag label={`${row.pendingFollowUpCount} follow-up`} tone="doctor" />
                      ) : null}
                      {row.pendingRefillCount > 0 ? (
                        <WorkTag label={`${row.pendingRefillCount} refill`} tone="warning" />
                      ) : null}
                      {row.unreadMessageCount > 0 ? (
                        <WorkTag label={`${row.unreadMessageCount} unread`} tone="info" />
                      ) : null}
                      {row.reportCount > 0 ? (
                        <WorkTag label={`${row.reportCount} reports`} tone="doctor" />
                      ) : null}
                      <Text style={styles.lastVisit}>Last visit {formatDate(row.lastVisit)}</Text>
                    </View>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.visitCount}>{row.visitCount}</Text>
                    <Text style={styles.visitLabel}>visits</Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={19}
                      color={colors.textMuted}
                    />
                  </View>
                </View>
              </Card>
            </PressableScale>
          </FadeInView>
        ))}
      </View>
    </AuroraScreen>
  );
}

function RosterMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.rosterMetric}>
      <MaterialCommunityIcons name={icon} size={17} color={colors.doctor} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function matchesFilter(row: PatientRow, filter: string) {
  if (filter === "all") return true;
  if (filter === "risk") return row.hasRiskProfile || row.triageCount > 0;
  if (filter === "needs_rx") return row.pendingRxCount > 0;
  if (filter === "follow_up") return row.pendingFollowUpCount > 0;
  if (filter === "refills") return row.pendingRefillCount > 0;
  if (filter === "unread") return row.unreadMessageCount > 0;
  if (filter === "reports") return row.reportCount > 0;
  if (filter === "upcoming") return row.upcomingCount > 0;
  return true;
}

function WorkTag({
  label,
  tone,
}: {
  label: string;
  tone: "doctor" | "warning" | "danger" | "info";
}) {
  const palette = {
    doctor: { bg: colors.doctorBg, fg: colors.doctor },
    warning: { bg: colors.warningBg, fg: colors.warning },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    info: { bg: colors.infoBg, fg: colors.info },
  }[tone];
  return (
    <View style={[styles.workTag, { backgroundColor: palette.bg }]}>
      <Text style={[styles.workTagText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  right: { alignItems: "flex-end", gap: 1 },
  rosterStats: { flexDirection: "row", gap: 9 },
  rosterMetric: {
    flex: 1,
    minHeight: 78,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(91,85,214,0.16)",
    padding: 10,
    gap: 3,
  },
  metricValue: { color: colors.text, fontFamily: fonts.display, fontSize: 19 },
  metricLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 },
  tagRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 7 },
  tag: {
    borderRadius: radius.pill,
    backgroundColor: colors.doctorBg,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagText: { color: colors.doctor, fontFamily: fonts.bodySemibold, fontSize: 11 },
  workTag: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  workTagText: { fontFamily: fonts.bodySemibold, fontSize: 11 },
  lastVisit: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 },
  visitCount: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  visitLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 10 },
});
