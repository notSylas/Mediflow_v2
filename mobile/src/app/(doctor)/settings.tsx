import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import {
  Body,
  Button,
  Card,
  ChoiceChips,
  ErrorState,
  Field,
  Loading,
  Muted,
  SectionHeader,
} from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { LegalLinks } from "@/components/legal-links";
import { apiFetch } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type {
  AvailabilityOverride,
  AvailabilityRule,
  DoctorProfile,
} from "@/lib/types";

const DAYS = [
  { label: "Sun", value: "0" },
  { label: "Mon", value: "1" },
  { label: "Tue", value: "2" },
  { label: "Wed", value: "3" },
  { label: "Thu", value: "4" },
  { label: "Fri", value: "5" },
  { label: "Sat", value: "6" },
];

export default function DoctorSettings() {
  const client = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["doctor", "profile"],
    queryFn: () => apiFetch<DoctorProfile>("/api/doctor/profile"),
  });
  const rulesQuery = useQuery({
    queryKey: ["doctor", "availability", "rules"],
    queryFn: () => apiFetch<AvailabilityRule[]>("/api/doctor/availability/rules"),
  });
  const overridesQuery = useQuery({
    queryKey: ["doctor", "availability", "overrides"],
    queryFn: () =>
      apiFetch<AvailabilityOverride[]>("/api/doctor/availability/overrides"),
  });
  const [profileEdits, setProfileEdits] = useState<
    Partial<{
      specialty: string;
      bio: string;
      fee: string;
      slotMinutes: string;
      timezone: string;
    }>
  >({});
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideKind, setOverrideKind] = useState("blocked");
  const [overrideStart, setOverrideStart] = useState("");
  const [overrideEnd, setOverrideEnd] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const profile = {
    specialty: profileQuery.data?.specialty ?? "",
    bio: profileQuery.data?.bio ?? "",
    fee: String((profileQuery.data?.feeInPaise ?? 50000) / 100),
    slotMinutes: String(profileQuery.data?.slotMinutes ?? 20),
    timezone: profileQuery.data?.timezone ?? "Asia/Kolkata",
    ...profileEdits,
  };

  const saveProfile = useMutation({
    mutationFn: () =>
      apiFetch<DoctorProfile>("/api/doctor/profile", {
        method: "PATCH",
        body: JSON.stringify({
          specialty: profile.specialty.trim() || null,
          bio: profile.bio.trim() || null,
          feeInPaise: Math.round(Number(profile.fee) * 100),
          slotMinutes: Number(profile.slotMinutes),
          timezone: profile.timezone.trim(),
        }),
      }),
    onSuccess: () => {
      setProfileEdits({});
      void client.invalidateQueries({ queryKey: ["doctor"] });
      Alert.alert("Saved", "Your clinic profile has been updated.");
    },
  });

  const addRule = useMutation({
    mutationFn: () =>
      apiFetch<AvailabilityRule>("/api/doctor/availability/rules", {
        method: "POST",
        body: JSON.stringify({
          weekday: Number(weekday),
          startTime,
          endTime,
        }),
      }),
    onSuccess: () => void rulesQuery.refetch(),
  });

  const addOverride = useMutation({
    mutationFn: () =>
      apiFetch<AvailabilityOverride>("/api/doctor/availability/overrides", {
        method: "POST",
        body: JSON.stringify({
          date: overrideDate,
          kind: overrideKind,
          startTime: overrideStart || null,
          endTime: overrideEnd || null,
          reason: overrideReason.trim() || null,
        }),
      }),
    onSuccess: () => {
      setOverrideDate("");
      setOverrideReason("");
      void overridesQuery.refetch();
    },
  });

  const remove = (path: string, refresh: () => unknown) =>
    Alert.alert("Delete this availability entry?", "Patients will no longer see this window.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await apiFetch(path, { method: "DELETE" });
          await refresh();
        },
      },
    ]);

  if (profileQuery.isLoading || rulesQuery.isLoading || overridesQuery.isLoading) {
    return <Loading />;
  }

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/(auth)/login");
  };

  return (
    <AuroraScreen
      variant="doctor"
      title="Clinic settings"
      subtitle="Profile, fees, and patient booking hours"
    >
      <SectionHeader title="Doctor profile" />
      <Card>
        <Field
          label="Specialty"
          value={profile.specialty}
          onChangeText={(value) =>
            setProfileEdits((current) => ({ ...current, specialty: value }))
          }
          placeholder="General physician"
        />
        <Field
          label="Bio"
          value={profile.bio}
          onChangeText={(value) =>
            setProfileEdits((current) => ({ ...current, bio: value }))
          }
          multiline
          placeholder="Short patient-facing introduction"
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Fee (INR)"
              value={profile.fee}
              onChangeText={(value) =>
                setProfileEdits((current) => ({ ...current, fee: value }))
              }
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Slot minutes"
              value={profile.slotMinutes}
              onChangeText={(value) =>
                setProfileEdits((current) => ({ ...current, slotMinutes: value }))
              }
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Field
          label="Timezone"
          value={profile.timezone}
          onChangeText={(value) =>
            setProfileEdits((current) => ({ ...current, timezone: value }))
          }
          autoCapitalize="none"
        />
        {saveProfile.error ? <ErrorState message={saveProfile.error.message} /> : null}
        <Button
          label="Save profile"
          loading={saveProfile.isPending}
          onPress={() => saveProfile.mutate()}
        />
      </Card>

      <SectionHeader title="Weekly availability" />
      <Card>
        <ChoiceChips options={DAYS} value={weekday} onChange={setWeekday} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Start" value={startTime} onChangeText={setStartTime} placeholder="09:00" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="End" value={endTime} onChangeText={setEndTime} placeholder="13:00" />
          </View>
        </View>
        {addRule.error ? <ErrorState message={addRule.error.message} /> : null}
        <Button
          label="Add weekly window"
          loading={addRule.isPending}
          onPress={() => addRule.mutate()}
        />
        {rulesQuery.data?.map((rule) => (
          <View key={rule.id} style={styles.entry}>
            <View style={{ flex: 1 }}>
              <Body strong>{DAYS.find((day) => day.value === String(rule.weekday))?.label}</Body>
              <Muted>
                {rule.startTime.slice(0, 5)} – {rule.endTime.slice(0, 5)}
              </Muted>
            </View>
            <Button
              label="Delete"
              compact
              tone="ghost"
              onPress={() =>
                remove(`/api/doctor/availability/rules/${rule.id}`, () => rulesQuery.refetch())
              }
            />
          </View>
        ))}
      </Card>

      <SectionHeader title="Date overrides" />
      <Card>
        <Field
          label="Date"
          value={overrideDate}
          onChangeText={setOverrideDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
        <ChoiceChips
          options={[
            { label: "Block time", value: "blocked" },
            { label: "Add extra time", value: "extra" },
          ]}
          value={overrideKind}
          onChange={setOverrideKind}
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Start (optional)"
              value={overrideStart}
              onChangeText={setOverrideStart}
              placeholder="14:00"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="End (optional)"
              value={overrideEnd}
              onChangeText={setOverrideEnd}
              placeholder="17:00"
            />
          </View>
        </View>
        <Field
          label="Reason"
          value={overrideReason}
          onChangeText={setOverrideReason}
          placeholder="Holiday, conference, extra clinic…"
        />
        <Muted>
          Full-day blocks leave both times empty. Extra sessions require start and end.
        </Muted>
        {addOverride.error ? <ErrorState message={addOverride.error.message} /> : null}
        <Button
          label="Add date override"
          loading={addOverride.isPending}
          disabled={!overrideDate}
          onPress={() => addOverride.mutate()}
        />
        {overridesQuery.data?.map((item) => (
          <View key={item.id} style={styles.entry}>
            <View style={{ flex: 1 }}>
              <Body strong>
                {item.date} · {item.kind}
              </Body>
              <Muted>
                {[item.startTime?.slice(0, 5), item.endTime?.slice(0, 5), item.reason]
                  .filter(Boolean)
                  .join(" – ") || "All day"}
              </Muted>
            </View>
            <Button
              label="Delete"
              compact
              tone="ghost"
              onPress={() =>
                remove(`/api/doctor/availability/overrides/${item.id}`, () =>
                  overridesQuery.refetch()
                )
              }
            />
          </View>
        ))}
      </Card>

      <SectionHeader title="Legal" />
      <LegalLinks />

      <Button label="Sign out" tone="danger" icon="logout" onPress={signOut} />
    </AuroraScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#dce4e6",
    paddingTop: 10,
  },
});
