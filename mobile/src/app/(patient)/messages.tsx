import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChatThread } from "@/components/chat-thread";
import { EmptyState, ErrorState, Loading, PrimaryButton } from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { ApiError, apiFetch } from "@/lib/api";
import type { Conversation } from "@/lib/chat-types";

interface PatientHomeDoctor {
  doctor: { name: string } | null;
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

  // 403 = no booking yet; messaging is gated behind a consultation.
  if (conversation.error instanceof ApiError && conversation.error.status === 403) {
    return (
      <AuroraScreen variant="patient" title="Messages" subtitle="Chat with your doctor">
        <EmptyState
          icon="chat-plus-outline"
          title="Messaging opens after you book"
          message="Once you've booked a consultation, you can message your doctor here for follow-up questions."
          action={
            <PrimaryButton
              label="Book a consultation"
              icon="calendar-plus"
              onPress={() => router.push("/(patient)/book")}
            />
          }
        />
      </AuroraScreen>
    );
  }

  if (!conversation.data) {
    return (
      <AuroraScreen variant="patient" title="Messages" subtitle="Chat with your doctor">
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
      peerName={home.data?.doctor ? `Dr. ${home.data.doctor.name}` : "Your doctor"}
      onBack={() => router.back()}
    />
  );
}
