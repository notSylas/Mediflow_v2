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
