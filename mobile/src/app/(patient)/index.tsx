import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  PageHeader,
  ProgressBar,
  Screen,
  SectionHeader,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatMoney, relativeStart } from "@/lib/format";
import { useSession } from "@/lib/auth";
import { colors, radius } from "@/lib/theme";
import type { PatientHomeData } from "@/lib/types";

export default function PatientHome() {
  const { data: session } = useSession();
  const [now] = useState(() => Date.now());
  const query = useQuery({
    queryKey: ["patient", "home"],
    queryFn: () => apiFetch<PatientHomeData>("/api/v1/patient/home"),
  });

  if (query.isLoading) return <Loading />;
  if (!query.data) {
    return (
      <Screen>
        <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
      </Screen>
    );
  }

  const data = query.data;
  const next = data.appointments
    .filter(
      ({ appointment }) =>
        ["pending_payment", "confirmed"].includes(appointment.status) &&
        new Date(appointment.endsAt).getTime() > now
    )
    .sort(
      (a, b) =>
        new Date(a.appointment.startsAt).getTime() -
        new Date(b.appointment.startsAt).getTime()
    )[0];
  const upcoming = data.appointments.filter(
    ({ appointment }) =>
      appointment.status === "confirmed" &&
      new Date(appointment.endsAt).getTime() > now
  ).length;
  const completed = data.appointments.filter(
    ({ appointment }) => appointment.status === "completed"
  ).length;
  const firstName = session?.user.name?.split(" ")[0];

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <PageHeader
        title={`Welcome${firstName ? `, ${firstName}` : ""}`}
        subtitle={new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date())}
        action={
          <Pressable style={styles.settings} onPress={() => router.push("/(patient)/settings")}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={colors.text} />
          </Pressable>
        }
      />

      <Button
        label="Book a consultation"
        icon="calendar-plus"
        onPress={() => router.push("/(patient)/book")}
      />

      <View style={styles.stats}>
        <StatCard label="Upcoming" value={upcoming} icon="calendar-clock" tone="info" />
        <StatCard label="Consultations" value={completed} icon="check-decagram" />
        <StatCard
          label="Prescriptions"
          value={data.prescriptionCount}
          icon="file-document-outline"
          tone="doctor"
        />
        <StatCard
          label="Profile"
          value={`${data.profileCompleteness}%`}
          icon="account-heart"
          tone="warning"
        />
      </View>

      <SectionHeader title="Next appointment" />
      {next ? (
        <Card tone={next.appointment.status === "pending_payment" ? "warning" : "default"}>
          <View style={styles.between}>
            <View style={styles.row}>
              <Avatar name={data.doctor?.name || "Doctor"} />
              <View style={{ flex: 1, gap: 3 }}>
                <Body strong>{formatDateTime(next.appointment.startsAt)}</Body>
                <Muted>
                  Dr. {data.doctor?.name || "Your doctor"} ·{" "}
                  {relativeStart(next.appointment.startsAt)}
                </Muted>
              </View>
            </View>
            <StatusBadge status={next.appointment.status} audience="patient" />
          </View>
          <Button
            label={
              next.appointment.status === "pending_payment"
                ? "Continue payment"
                : "View appointment"
            }
            icon={next.appointment.status === "pending_payment" ? "credit-card-outline" : "arrow-right"}
            onPress={() =>
              router.push({
                pathname: "/(patient)/appointments/[id]",
                params: { id: next.appointment.id },
              })
            }
          />
        </Card>
      ) : (
        <EmptyState
          icon="calendar-blank-outline"
          title="No upcoming appointments"
          message="Book a consultation and your next visit will appear here."
        />
      )}

      <SectionHeader title="Your doctor" />
      <Card>
        <View style={styles.row}>
          <Avatar name={data.doctor?.name || "Doctor"} />
          <View style={{ flex: 1 }}>
            <Body strong>Dr. {data.doctor?.name || "Your doctor"}</Body>
            <Muted>{data.doctor?.specialty || "General physician"}</Muted>
          </View>
        </View>
        <View style={styles.doctorMeta}>
          <Text style={styles.metaText}>
            {formatMoney(data.doctor?.feeInPaise)} consultation
          </Text>
          <Text style={styles.metaText}>{data.doctor?.slotMinutes ?? 20} minutes</Text>
        </View>
      </Card>

      {data.profileCompleteness < 100 ? (
        <>
          <SectionHeader title="Medical profile" />
          <Card tone="accent">
            <View style={styles.between}>
              <Body strong>Help your doctor treat you safely</Body>
              <Body strong>{data.profileCompleteness}%</Body>
            </View>
            <ProgressBar value={data.profileCompleteness} />
            <Button
              label="Complete profile"
              tone="secondary"
              onPress={() => router.push("/(patient)/profile")}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  settings: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 11,
  },
  metaText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
});
