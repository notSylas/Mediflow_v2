import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeroHeader, auroraHeaderStyles } from "@/components/aurora-header";
import { FadeInView, PressableScale } from "@/components/motion";
import { Button, Card, ErrorState, Loading, Muted, SectionHeader } from "@/components/ui";
import {
  DayRail,
  ExceptionSheet,
  HoursEditorSheet,
  type ExceptionPayload,
} from "@/components/schedule-editor";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { colors, fonts, radius, space } from "@/lib/theme";
import {
  WEEKDAY_LABELS,
  apptMinutes,
  bookableSlotsNext7Days,
  rulesToWindows,
  toHHMM,
  type Window,
} from "@/lib/availability";
import type {
  AvailabilityOverride,
  AvailabilityRule,
  DoctorAppointmentRow,
  DoctorProfile,
} from "@/lib/types";

interface ScheduleResponse {
  rules: AvailabilityRule[];
  overrides: AvailabilityOverride[];
  appointments: DoctorAppointmentRow[];
  timezone: string;
}

// Monday-first week order.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const TEMPLATES: Array<{ key: string; title: string; sub: string; days: number[]; windows: Window[] }> = [
  {
    key: "weekday",
    title: "Weekday clinic",
    sub: "Mon–Fri · 9 AM – 5 PM",
    days: [1, 2, 3, 4, 5],
    windows: [{ startMin: 540, endMin: 1020 }],
  },
  {
    key: "split",
    title: "Split shift",
    sub: "Mon–Fri · 9–1 & 5–8",
    days: [1, 2, 3, 4, 5],
    windows: [
      { startMin: 540, endMin: 780 },
      { startMin: 1020, endMin: 1200 },
    ],
  },
  {
    key: "mornings",
    title: "Mornings only",
    sub: "Mon–Sat · 9 AM – 12 PM",
    days: [1, 2, 3, 4, 5, 6],
    windows: [{ startMin: 540, endMin: 720 }],
  },
];

export default function DoctorSchedule() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["doctor", "schedule"],
    queryFn: () => apiFetch<ScheduleResponse>("/api/v1/doctor/schedule"),
  });
  const profileQuery = useQuery({
    queryKey: ["doctor", "profile"],
    queryFn: () => apiFetch<DoctorProfile>("/api/doctor/profile"),
  });
  const slotMinutes = profileQuery.data?.slotMinutes ?? 20;

  const [editorDay, setEditorDay] = useState<number | null>(null);
  const [exceptionMode, setExceptionMode] = useState<"off" | "extra" | null>(null);
  const [now] = useState(() => Date.now());

  const rules = useMemo(() => query.data?.rules ?? [], [query.data]);
  const overrides = useMemo(() => query.data?.overrides ?? [], [query.data]);
  const appointments = useMemo(() => query.data?.appointments ?? [], [query.data]);

  const refresh = () => {
    void query.refetch();
    void client.invalidateQueries({ queryKey: ["doctor", "home"] });
  };

  const applyHours = useMutation({
    mutationFn: async ({ days, windows }: { days: number[]; windows: Window[] }) => {
      for (const day of days) {
        const existing = rules.filter((r) => r.weekday === day);
        await Promise.all(
          existing.map((r) =>
            apiFetch(`/api/doctor/availability/rules/${r.id}`, { method: "DELETE" })
          )
        );
        await Promise.all(
          windows.map((w) =>
            apiFetch("/api/doctor/availability/rules", {
              method: "POST",
              body: JSON.stringify({
                weekday: day,
                startTime: toHHMM(w.startMin),
                endTime: toHHMM(w.endMin),
              }),
            })
          )
        );
      }
    },
    onSuccess: () => {
      setEditorDay(null);
      refresh();
    },
  });

  const addOverride = useMutation({
    mutationFn: (payload: ExceptionPayload) =>
      apiFetch("/api/doctor/availability/overrides", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setExceptionMode(null);
      refresh();
    },
  });

  const deleteOverride = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/doctor/availability/overrides/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });

  const slotsLine = useMemo(
    () => bookableSlotsNext7Days(rules, overrides, appointments, slotMinutes, new Date(now)),
    [rules, overrides, appointments, slotMinutes, now]
  );

  // Booked-visit dots per weekday over the next 7 days.
  const bookedByWeekday = useMemo(() => {
    const map: Record<number, number[]> = {};
    const horizon = now + 7 * 86400_000;
    for (const row of appointments) {
      if (!["confirmed", "pending_payment"].includes(row.appointment.status)) continue;
      const t = new Date(row.appointment.startsAt).getTime();
      if (t < now || t > horizon) continue;
      const wd = new Date(row.appointment.startsAt).getDay();
      (map[wd] ??= []).push(apptMinutes(row));
    }
    return map;
  }, [appointments, now]);

  const todayKey = useMemo(() => new Date(now).toISOString().slice(0, 10), [now]);
  const upcomingOverrides = useMemo(
    () =>
      [...overrides].filter((o) => o.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date)),
    [overrides, todayKey]
  );

  if (query.isLoading || profileQuery.isLoading) return <Loading label="Opening your schedule…" />;

  const hasRules = rules.length > 0;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={refresh} tintColor={colors.doctor} />
        }
      >
        <HeroHeader
          variant="doctor"
          eyebrow={`CLINIC SCHEDULE · ${query.data?.timezone ?? "Asia/Kolkata"}`}
          title="Your week"
          leading={
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              style={auroraHeaderStyles.glassAction}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
            </Pressable>
          }
        >
          <View style={styles.heroChip}>
            <MaterialCommunityIcons name="calendar-check" size={15} color="#fff" />
            <Text style={styles.heroChipText}>
              ~{slotsLine} bookable slot{slotsLine === 1 ? "" : "s"} · next 7 days
            </Text>
          </View>
        </HeroHeader>

        <View style={styles.body}>
          {query.error ? <ErrorState message={query.error.message} onRetry={refresh} /> : null}

          {!hasRules ? (
            <FadeInView>
              <SectionHeader title="Set up your week" />
              <Card>
                <Muted>Pick a starting point — you can fine-tune any day afterwards.</Muted>
                <View style={styles.templateList}>
                  {TEMPLATES.map((t) => (
                    <PressableScale
                      key={t.key}
                      onPress={() => applyHours.mutate({ days: t.days, windows: t.windows })}
                      style={styles.template}
                    >
                      <View style={styles.templateIcon}>
                        <MaterialCommunityIcons name="calendar-text" size={20} color={colors.doctor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.templateTitle}>{t.title}</Text>
                        <Text style={styles.templateSub}>{t.sub}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textFaint} />
                    </PressableScale>
                  ))}
                </View>
                <Button
                  label="Start from scratch"
                  tone="secondary"
                  icon="plus"
                  onPress={() => setEditorDay(1)}
                />
              </Card>
            </FadeInView>
          ) : (
            <FadeInView>
              <SectionHeader title="Weekly pattern" />
              <Card style={{ gap: 0 }}>
                {WEEK_ORDER.map((wd, i) => {
                  const windows = rulesToWindows(rules, wd);
                  return (
                    <PressableScale
                      key={wd}
                      haptic="light"
                      scaleTo={0.99}
                      onPress={() => setEditorDay(wd)}
                      style={[styles.dayRow, i > 0 && styles.dayRowBorder]}
                    >
                      <Text style={styles.dayName}>{WEEKDAY_LABELS[wd]}</Text>
                      <View style={{ flex: 1, gap: 4 }}>
                        <DayRail
                          windows={windows}
                          bookedMinutes={bookedByWeekday[wd]}
                          height={30}
                        />
                        {windows.length === 0 ? (
                          <Text style={styles.closed}>Closed</Text>
                        ) : null}
                      </View>
                      <MaterialCommunityIcons name="pencil-outline" size={17} color={colors.textFaint} />
                    </PressableScale>
                  );
                })}
              </Card>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={styles.legendBar} />
                  <Text style={styles.legendText}>Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>Booked visit</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Time off"
                    tone="secondary"
                    icon="calendar-remove-outline"
                    onPress={() => setExceptionMode("off")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Add hours" icon="plus" onPress={() => setEditorDay(1)} />
                </View>
              </View>
            </FadeInView>
          )}

          {hasRules ? (
            <FadeInView index={1}>
              <SectionHeader
                title="Time off & extra clinics"
                action={
                  <Pressable accessibilityRole="button" onPress={() => setExceptionMode("extra")}>
                    <Text style={styles.link}>＋ One-off clinic</Text>
                  </Pressable>
                }
              />
              {upcomingOverrides.length === 0 ? (
                <Card>
                  <Muted>No exceptions coming up. Your weekly pattern applies as-is.</Muted>
                </Card>
              ) : (
                <Card style={{ gap: 0 }}>
                  {upcomingOverrides.map((o, i) => (
                    <View key={o.id} style={[styles.exceptionRow, i > 0 && styles.dayRowBorder]}>
                      <View
                        style={[
                          styles.exceptionIcon,
                          { backgroundColor: o.kind === "blocked" ? colors.dangerBg : colors.doctorBg },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={o.kind === "blocked" ? "calendar-remove" : "calendar-plus"}
                          size={18}
                          color={o.kind === "blocked" ? colors.danger : colors.doctor}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exceptionTitle}>{formatDate(`${o.date}T12:00:00`)}</Text>
                        <Text style={styles.exceptionSub}>
                          {o.kind === "blocked"
                            ? o.startTime
                              ? `Off ${o.startTime.slice(0, 5)}–${o.endTime?.slice(0, 5)}`
                              : "Off all day"
                            : `Extra ${o.startTime?.slice(0, 5)}–${o.endTime?.slice(0, 5)}`}
                          {o.reason ? ` · ${o.reason}` : ""}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityLabel="Remove"
                        hitSlop={8}
                        onPress={() => deleteOverride.mutate(o.id)}
                      >
                        <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </Card>
              )}
            </FadeInView>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(doctor)/settings")}
            style={styles.slotNote}
          >
            <MaterialCommunityIcons name="timer-outline" size={17} color={colors.textMuted} />
            <Text style={styles.slotNoteText}>
              {slotMinutes}-minute consultations · change in Settings
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textFaint} />
          </Pressable>
        </View>
      </ScrollView>

      <HoursEditorSheet
        key={`hours-${editorDay}`}
        visible={editorDay !== null}
        slotMinutes={slotMinutes}
        rules={rules}
        appointments={appointments}
        initialWeekday={editorDay ?? 1}
        initialWindows={editorDay !== null ? rulesToWindows(rules, editorDay) : []}
        onClose={() => setEditorDay(null)}
        onApply={(days, windows) => applyHours.mutate({ days, windows })}
      />
      <ExceptionSheet
        key={`exc-${exceptionMode}`}
        visible={exceptionMode !== null}
        mode={exceptionMode ?? "off"}
        appointments={appointments}
        onClose={() => setExceptionMode(null)}
        onApply={(payload) => addOverride.mutate(payload)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 40 },
  body: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: space.md + 2,
    paddingTop: 16,
    gap: 16,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  heroChipText: { color: "#fff", fontFamily: fonts.bodySemibold, fontSize: 12.5 },
  templateList: { gap: 10, marginVertical: 4 },
  template: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: 13,
    backgroundColor: colors.surface,
  },
  templateIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  templateTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  templateSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  dayRowBorder: { borderTopWidth: 1, borderTopColor: colors.hairline },
  dayName: { width: 34, fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text },
  closed: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textFaint },
  legend: { flexDirection: "row", gap: 20, paddingHorizontal: 4, marginTop: -2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendBar: { width: 22, height: 13, borderRadius: 4, backgroundColor: colors.doctor },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.doctorDark,
  },
  legendText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  actionRow: { flexDirection: "row", gap: 10 },
  link: { color: colors.doctor, fontFamily: fonts.bodySemibold, fontSize: 13 },
  exceptionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  exceptionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  exceptionTitle: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
  exceptionSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  slotNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  slotNoteText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
});
