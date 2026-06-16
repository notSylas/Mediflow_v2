import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Avatar,
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
import { DateField, TimeField } from "@/components/pickers";
import { apiFetch } from "@/lib/api";
import { authClient, useSession } from "@/lib/auth";
import { colors, fonts, radius } from "@/lib/theme";
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
  const { data: session, refetch: refetchSession } = useSession();
  const [name, setName] = useState(session?.user.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const saveName = async () => {
    setSavingName(true);
    setNameSaved(false);
    setNameError(null);
    try {
      const { error } = await authClient.updateUser({ name: name.trim() });
      if (error) throw new Error(error.message);
      await refetchSession();
      setNameSaved(true);
    } catch (value) {
      setNameError(value instanceof Error ? value.message : "Couldn't update your name.");
    } finally {
      setSavingName(false);
    }
  };

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
      photoUrl: string;
      qualifications: string;
      registrationNo: string;
      yearsExperience: string;
      languages: string;
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
    photoUrl: profileQuery.data?.photoUrl ?? "",
    qualifications: profileQuery.data?.qualifications ?? "",
    registrationNo: profileQuery.data?.registrationNo ?? "",
    yearsExperience:
      profileQuery.data?.yearsExperience != null
        ? String(profileQuery.data.yearsExperience)
        : "",
    languages: profileQuery.data?.languages ?? "",
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
          photoUrl: profile.photoUrl.trim() || null,
          qualifications: profile.qualifications.trim() || null,
          registrationNo: profile.registrationNo.trim() || null,
          yearsExperience: profile.yearsExperience.trim()
            ? Number(profile.yearsExperience)
            : null,
          languages: profile.languages.trim() || null,
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

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const diagnostics = [
    `MediFlow ${appVersion}`,
    `Platform: ${Platform.OS} ${Device.osVersion ?? ""}`.trim(),
    `Device: ${Device.modelName ?? "unknown"}`,
    `Account: ${session?.user.email ?? "—"}`,
  ].join("\n");
  const copyDiagnostics = async () => {
    await Clipboard.setStringAsync(diagnostics);
    Alert.alert("Copied", "Diagnostics copied to your clipboard.");
  };
  const requestDeletion = () => {
    Alert.alert(
      "Delete account?",
      "Deleting a doctor account affects patient records and bookings, so it requires review. We'll start the request from your registered email.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request deletion",
          style: "destructive",
          onPress: () =>
            Linking.openURL(
              `mailto:support@mediflow.app?subject=${encodeURIComponent(
                "Doctor account deletion request"
              )}&body=${encodeURIComponent(
                `Please delete my MediFlow doctor account (${session?.user.email ?? ""}).`
              )}`
            ),
        },
      ]
    );
  };

  return (
    <AuroraScreen
      variant="doctor"
      title="Clinic settings"
      subtitle="Profile, fees, and patient booking hours"
    >
      <Card>
        <View style={styles.summaryRow}>
          <Avatar name={session?.user.name || session?.user.email || "Doctor"} doctor />
          <View style={{ flex: 1 }}>
            <Body strong>
              {session?.user.name ? `Dr. ${session.user.name}` : "Add your name"}
            </Body>
            <Muted>{session?.user.email}</Muted>
          </View>
        </View>
      </Card>

      <SectionHeader title="Account" />
      <Card>
        <Field
          label="Display name"
          value={name}
          onChangeText={(value) => {
            setNameSaved(false);
            setName(value);
          }}
          placeholder="Your name"
          autoComplete="name"
        />
        {nameError ? <ErrorState message={nameError} /> : null}
        {nameSaved ? <Text style={styles.savedText}>Name updated.</Text> : null}
        <Button
          label="Save name"
          loading={savingName}
          disabled={!name.trim() || name.trim() === (session?.user.name ?? "").trim()}
          onPress={saveName}
        />
      </Card>

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
        <View style={styles.photoRow}>
          {profile.photoUrl ? (
            <Image
              alt="Profile photo preview"
              accessibilityLabel="Profile photo preview"
              source={{ uri: profile.photoUrl }}
              style={styles.photoPreview}
            />
          ) : (
            <View style={[styles.photoPreview, styles.photoPlaceholder]}>
              <MaterialCommunityIcons name="account" size={26} color={colors.textMuted} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Field
              label="Photo URL"
              value={profile.photoUrl}
              onChangeText={(value) =>
                setProfileEdits((current) => ({ ...current, photoUrl: value }))
              }
              placeholder="https://…/photo.jpg"
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.photoHint}>Shown on the patient&apos;s booking screen.</Text>
          </View>
        </View>
        <Field
          label="Qualifications"
          value={profile.qualifications}
          onChangeText={(value) =>
            setProfileEdits((current) => ({ ...current, qualifications: value }))
          }
          placeholder="MBBS, MD (Internal Medicine)"
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Years of experience"
              value={profile.yearsExperience}
              onChangeText={(value) =>
                setProfileEdits((current) => ({ ...current, yearsExperience: value }))
              }
              keyboardType="number-pad"
              placeholder="10"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Languages"
              value={profile.languages}
              onChangeText={(value) =>
                setProfileEdits((current) => ({ ...current, languages: value }))
              }
              placeholder="English, Hindi"
            />
          </View>
        </View>
        <Field
          label="Medical registration no."
          value={profile.registrationNo}
          onChangeText={(value) =>
            setProfileEdits((current) => ({ ...current, registrationNo: value }))
          }
          placeholder="Council registration number"
          autoCapitalize="characters"
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
          <TimeField label="Start" value={startTime} onChange={setStartTime} />
          <TimeField label="End" value={endTime} onChange={setEndTime} />
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
        <DateField
          label="Date"
          value={overrideDate}
          onChange={setOverrideDate}
          minimumDate={new Date()}
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
          <TimeField
            label="Start (optional)"
            value={overrideStart}
            onChange={setOverrideStart}
          />
          <TimeField label="End (optional)" value={overrideEnd} onChange={setOverrideEnd} />
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

      <SectionHeader title="About" />
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy diagnostics"
          onPress={copyDiagnostics}
          style={({ pressed }) => [styles.diagnosticsRow, pressed && { opacity: 0.65 }]}
        >
          <View style={styles.diagnosticsIcon}>
            <MaterialCommunityIcons name="information-outline" size={20} color={colors.doctor} />
          </View>
          <View style={{ flex: 1 }}>
            <Body strong>Diagnostics</Body>
            <Muted>
              {`MediFlow ${appVersion} · ${Platform.OS} ${Device.osVersion ?? ""}`.trim()}
            </Muted>
          </View>
          <MaterialCommunityIcons name="content-copy" size={18} color={colors.textMuted} />
        </Pressable>
      </Card>

      <Button label="Sign out" tone="secondary" icon="logout" onPress={signOut} />

      <SectionHeader title="Danger zone" />
      <Card tone="danger">
        <View style={styles.dangerRow}>
          <MaterialCommunityIcons name="account-remove-outline" size={20} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Body strong>Delete account</Body>
            <Muted>
              Affects patient records and bookings, so it requires review. We&apos;ll start the
              request from your registered email.
            </Muted>
          </View>
        </View>
        <Button label="Request account deletion" tone="danger" onPress={requestDeletion} />
      </Card>
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
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  savedText: { color: colors.success, fontFamily: fonts.bodySemibold, fontSize: 12 },
  photoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  photoPreview: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  photoHint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
  diagnosticsRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  diagnosticsIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
});
