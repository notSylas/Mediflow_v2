import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuroraScreen } from "@/components/aurora-screen";
import { ChatThread } from "@/components/chat-thread";
import {
  Avatar,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  PrimaryButton,
} from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";
import {
  CARE_BENEFITS,
  CARE_MESSAGING_DISCLAIMER,
  CARE_PLAN_NAME,
  CARE_REPLY_EXPECTATION,
} from "@/lib/care-types";
import type { Conversation } from "@/lib/chat-types";

interface PatientHomeDoctor {
  doctor: { name: string; specialty: string | null } | null;
}

export default function PatientMessages() {
  const conversation = useQuery({
    queryKey: ["patient", "conversation"],
    queryFn: () =>
      apiFetch<{ conversation: Conversation }>("/api/v1/conversations"),
    retry: false,
  });
  const home = useQuery({
    queryKey: ["patient", "home", "doctor-name"],
    queryFn: () => apiFetch<PatientHomeDoctor>("/api/v1/patient/home"),
  });

  if (conversation.isLoading) return <Loading label="Opening messages…" />;

  const doctorName = home.data?.doctor?.name?.trim();
  const doctorLabel = doctorName
    ? /^(dr\.?\s)/i.test(doctorName)
      ? doctorName
      : `Dr. ${doctorName}`
    : "Your clinic doctor";

  if (conversation.error instanceof ApiError && conversation.error.status === 403) {
    return (
      <AuroraScreen
        variant="patient"
        compactHeader
        title="Messages"
        subtitle="Secure follow-up with your doctor"
      >
        <Card>
          <View style={styles.doctorRow}>
            <Avatar name={doctorName || "Doctor"} />
            <View style={{ flex: 1 }}>
              <Body strong>{doctorLabel}</Body>
              <Muted>{home.data?.doctor?.specialty || "General physician"}</Muted>
            </View>
            <View style={styles.secureIcon}>
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={19}
                color={colors.success}
              />
            </View>
          </View>
        </Card>

        <EmptyState
          compact
          icon="chat-plus-outline"
          title="Unlock messaging with your doctor"
          message="Start the MediFlow Care plan to unlock ongoing messaging with your doctor. One-off video consultations do not include chat access."
          action={
            <PrimaryButton
              label="Start care plan"
              icon="hand-heart"
              onPress={() => router.push("/(patient)/care/checkout")}
            />
          }
        />

        <Card tone="accent">
          <View style={styles.careHeader}>
            <View style={styles.careIcon}>
              <MaterialCommunityIcons name="hand-heart" size={19} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Body strong>{CARE_PLAN_NAME}</Body>
              <Muted>Ongoing messaging without a booking — plus monthly follow-ups.</Muted>
            </View>
          </View>
          <View style={styles.careBenefits}>
            {CARE_BENEFITS.map((b) => (
              <View key={b} style={styles.careBenefitRow}>
                <MaterialCommunityIcons name="check" size={14} color={colors.primary} />
                <Text style={styles.careBenefitText}>{b}</Text>
              </View>
            ))}
          </View>
          <Button
            label="Start care plan"
            icon="arrow-right"
            onPress={() => router.push("/(patient)/care/checkout")}
          />
          <Text style={styles.careDisclaimer}>
            {CARE_MESSAGING_DISCLAIMER} {CARE_REPLY_EXPECTATION}
          </Text>
        </Card>

        <Card tone="accent">
          <Body strong>How messaging works</Body>
          <Expectation
            icon="message-text-clock-outline"
            message="Messages are asynchronous, so replies may not be immediate."
          />
          <Expectation
            icon="paperclip"
            message="Share relevant files only when they are needed for your care."
          />
          <Expectation
            icon="shield-account-outline"
            message="Only authenticated clinic participants can access the conversation."
          />
        </Card>

        <Card tone="danger">
          <Expectation
            icon="alert-circle-outline"
            message="Messaging is not monitored 24/7. For urgent symptoms, call your local emergency number or go to the nearest emergency department."
            danger
          />
        </Card>
      </AuroraScreen>
    );
  }

  if (!conversation.data) {
    return (
      <AuroraScreen
        variant="patient"
        compactHeader
        title="Messages"
        subtitle="Secure follow-up with your doctor"
      >
        <ErrorState
          message={conversation.error?.message}
          onRetry={() => conversation.refetch()}
        />
      </AuroraScreen>
    );
  }

  return (
    <ChatThread
      conversationId={conversation.data.conversation.id}
      currentRole="patient"
      peerName={doctorLabel}
      onBack={() => router.back()}
    />
  );
}

function Expectation({
  icon,
  message,
  danger,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  message: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.expectation}>
      <MaterialCommunityIcons
        name={icon}
        size={19}
        color={danger ? colors.danger : colors.primary}
      />
      <View style={{ flex: 1 }}>
        <Muted>{message}</Muted>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  doctorRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  careHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  careIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  careBenefits: { gap: 7 },
  careBenefitRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  careBenefitText: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13 },
  careDisclaimer: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
  secureIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  expectation: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
});
