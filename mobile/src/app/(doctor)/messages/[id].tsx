import { router, useLocalSearchParams } from "expo-router";
import { ChatThread } from "@/components/chat-thread";

export default function DoctorThread() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  return (
    <ChatThread
      conversationId={id}
      currentRole="doctor"
      peerName={name || "Patient"}
      onBack={() => router.back()}
    />
  );
}
