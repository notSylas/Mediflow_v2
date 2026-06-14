export interface ChatAttachment {
  id: string;
  filename: string;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "patient" | "doctor";
  body: string | null;
  attachmentId: string | null;
  attachment: ChatAttachment | null;
  createdAt: string;
}

export interface MessagesPage {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface Conversation {
  id: string;
  patientId: string;
  doctorId: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  patientUnread: number;
  doctorUnread: number;
}

export interface DoctorConversationRow {
  conversation: Conversation;
  patient: { id: string; name: string; email: string };
}

/** Live event the socket server emits on the "message" channel. */
export interface ChatSocketEvent {
  conversationId: string;
  message: ChatMessage;
}
