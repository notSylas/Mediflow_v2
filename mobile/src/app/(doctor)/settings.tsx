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
  ErrorState,
  Field,
  Loading,
  Muted,
  SectionHeader,
} from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { LegalLinks } from "@/components/legal-links";
import { apiFetch } from "@/lib/api";
import { authClient, useSession } from "@/lib/auth";
import { colors, fonts, radius } from "@/lib/theme";
import type { DoctorProfile } from "@/lib/types";

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
      carePlanPrice: string;
      slotMinutes: string;
      timezone: string;
    }>
  >({});
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
    carePlanPrice: String((profileQuery.data?.carePlanPriceInPaise ?? 49900) / 100),
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
          carePlanPriceInPaise: Math.round(Number(profile.carePlanPrice) * 100),
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

  if (profileQuery.isLoading) {
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
              label="Care plan / month (INR)"
              value={profile.carePlanPrice}
              onChangeText={(value) =>
                setProfileEdits((current) => ({ ...current, carePlanPrice: value }))
              }
              keyboardType="number-pad"
            />
          </View>
        </View>
        <View style={styles.row}>
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
          <View style={{ flex: 1 }}>
            <Field
              label="Timezone"
              value={profile.timezone}
              onChangeText={(value) =>
                setProfileEdits((current) => ({ ...current, timezone: value }))
              }
              autoCapitalize="none"
            />
          </View>
        </View>
        {saveProfile.error ? <ErrorState message={saveProfile.error.message} /> : null}
        <Button
          label="Save profile"
          loading={saveProfile.isPending}
          onPress={() => saveProfile.mutate()}
        />
      </Card>

      <SectionHeader title="Patient booking hours" />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(doctor)/schedule")}
        style={({ pressed }) => [styles.navCard, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.navIcon}>
          <MaterialCommunityIcons name="calendar-clock" size={22} color={colors.doctor} />
        </View>
        <View style={{ flex: 1 }}>
          <Body strong>Manage availability</Body>
          <Muted>Set your weekly hours, time off, and one-off clinics.</Muted>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
      </Pressable>

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
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    padding: 16,
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
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
