import { sql } from "@/db";

/**
 * Swappable realtime transport. Today it publishes over Postgres LISTEN/NOTIFY,
 * which a self-hosted socket.io server consumes (see realtime/server.ts). To
 * move to a managed provider (Ably/Pusher) later, only this file and the client
 * subscription change — the schema, REST API, and UI stay the same.
 */

export const CHAT_CHANNEL = "chat_message";

export interface ChatEvent {
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    senderRole: "patient" | "doctor";
    body: string | null;
    attachmentId: string | null;
    attachment: { id: string; filename: string; mimeType: string } | null;
    createdAt: string;
  };
  // The two participant user ids, so the socket server can route to the
  // right rooms without an extra query.
  patientId: string;
  doctorUserId: string;
}

export async function publishChatMessage(event: ChatEvent): Promise<void> {
  try {
    await sql.notify(CHAT_CHANNEL, JSON.stringify(event));
  } catch {
    // Realtime delivery is best-effort — the message is already persisted and
    // will load via REST on the next fetch. Never fail the send on this.
  }
}
