import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { auroraHeaderStyles } from "@/components/aurora-header";
import { AuroraScreen } from "@/components/aurora-screen";
import { LegalLinks } from "@/components/legal-links";
import {
  Avatar,
  Body,
  Button,
  Card,
  ErrorState,
  Field,
  Muted,
  SectionHeader,
} from "@/components/ui";
import { authClient, useSession } from "@/lib/auth";
import { colors, fonts, radius } from "@/lib/theme";

export default function PatientSettings() {
  const { data: session, refetch } = useSession();
  const initialName = session?.user.name ?? "";
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameChanged = name.trim() !== initialName.trim();

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const { error: updateError } = await authClient.updateUser({ name: name.trim() });
      if (updateError) throw new Error(updateError.message);
      await refetch();
      setSaved(true);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Couldn't update your account.");
    } finally {
      setSaving(false);
    }
  };

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
      "Account deletion and medical-record retention require clinic review. We'll open an email so you can request deletion from your registered address.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request deletion",
          style: "destructive",
          onPress: () =>
            Linking.openURL(
              `mailto:support@mediflow.app?subject=${encodeURIComponent(
                "Account deletion request"
              )}&body=${encodeURIComponent(
                `Please delete my MediFlow account (${session?.user.email ?? ""}).`
              )}`
            ),
        },
      ]
    );
  };

  return (
    <AuroraScreen
      variant="patient"
      compactHeader
      title="Account settings"
      subtitle="Identity, privacy, support, and legal"
      leading={
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={auroraHeaderStyles.headerAction}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
      }
    >
      <Card>
        <View style={styles.summaryRow}>
          <Avatar name={session?.user.name || session?.user.email || "You"} />
          <View style={{ flex: 1 }}>
            <Body strong>{session?.user.name || "Add your name"}</Body>
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
            setSaved(false);
            setName(value);
          }}
          placeholder="Your name"
          autoComplete="name"
        />
        <View style={styles.readOnlyField}>
          <Text style={styles.fieldLabel}>Email address</Text>
          <View style={styles.emailRow}>
            <MaterialCommunityIcons
              name="email-outline"
              size={19}
              color={colors.textMuted}
            />
            <Text style={styles.email} numberOfLines={1}>
              {session?.user.email}
            </Text>
            <MaterialCommunityIcons
              name="lock-outline"
              size={16}
              color={colors.textMuted}
            />
          </View>
          <Text style={styles.helper}>Used for secure sign-in and clinic communication.</Text>
        </View>
        {error ? <ErrorState message={error} /> : null}
        {saved ? <Text style={styles.saved}>Account details saved.</Text> : null}
        <Button
          label="Save account"
          loading={saving}
          disabled={!name.trim() || !nameChanged}
          onPress={save}
        />
      </Card>

      <SectionHeader title="Privacy and security" />
      <Card>
        <SettingsRow
          icon="shield-lock-outline"
          title="Protected medical information"
          message="Visible only to authenticated clinic participants involved in your care."
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="key-outline"
          title="Account safety"
          message="Never share email verification codes or allow another person to use your account."
        />
      </Card>

      <SectionHeader title="Help" />
      <Card>
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL("mailto:support@mediflow.app")}
          style={({ pressed }) => [styles.supportRow, pressed && { opacity: 0.65 }]}
        >
          <View style={styles.rowIcon}>
            <MaterialCommunityIcons
              name="lifebuoy"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Body strong>Contact support</Body>
            <Muted>support@mediflow.app</Muted>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </Card>

      <SectionHeader title="Legal" />
      <LegalLinks />

      <SectionHeader title="About" />
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy diagnostics"
          onPress={copyDiagnostics}
          style={({ pressed }) => [styles.supportRow, pressed && { opacity: 0.65 }]}
        >
          <View style={styles.rowIcon}>
            <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
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
              Deletion and medical-record retention require clinic review. We&apos;ll start the
              request from your registered email.
            </Muted>
          </View>
        </View>
        <Button label="Request account deletion" tone="danger" onPress={requestDeletion} />
      </Card>

      <Text style={styles.version}>MediFlow {appVersion}</Text>
    </AuroraScreen>
  );
}

function SettingsRow({
  icon,
  title,
  message,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Body strong>{title}</Body>
        <Muted>{message}</Muted>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readOnlyField: { gap: 7 },
  fieldLabel: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 13 },
  emailRow: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  email: { flex: 1, color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
  helper: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 },
  saved: { color: colors.success, fontFamily: fonts.bodySemibold, fontSize: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dangerRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  settingsRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  supportRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 51 },
  version: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: "center",
  },
});
