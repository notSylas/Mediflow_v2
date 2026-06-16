import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AuroraScreen } from "@/components/aurora-screen";
import { ChatThread } from "@/components/chat-thread";
import {
  Avatar,
  Body,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  PrimaryButton,
} from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import { colors, radius } from "@/lib/theme";
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
          title="Messaging opens after booking"
          message="Book a consultation to start a secure conversation for visit preparation and follow-up questions."
          action={
            <PrimaryButton
              label="Book a consultation"
              icon="calendar-plus"
              onPress={() => router.push("/(patient)/book")}
            />
          }
        />

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
