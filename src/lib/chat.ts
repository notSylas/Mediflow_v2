import { and, desc, eq, lt, sql as dsql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  chatAttachments,
  conversations,
  doctorProfiles,
  messages,
  user,
} from "@/db/schema";
import { publishChatMessage } from "@/lib/realtime";
import {
  attachmentUsableBy,
  messagingAllowedForStatus,
} from "@/lib/chat-policy";

export const MESSAGE_PAGE_SIZE = 30;

export interface ChatMessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "patient" | "doctor";
  body: string | null;
  attachmentId: string | null;
  attachment: { id: string; filename: string; mimeType: string; byteSize: number } | null;
  createdAt: string;
}

async function attachmentMeta(attachmentId: string | null) {
  if (!attachmentId) return null;
  const [a] = await db
    .select({
      id: chatAttachments.id,
      filename: chatAttachments.filename,
      mimeType: chatAttachments.mimeType,
      byteSize: dsql<number>`octet_length(${chatAttachments.data})`,
    })
    .from(chatAttachments)
    .where(eq(chatAttachments.id, attachmentId));
  return a ?? null;
}

/**
 * Validates that an attachment may be sent in this conversation by this sender.
 * Returns true only if the attachment exists, was uploaded by the sender, into
 * this same conversation. Defends against a leaked/guessed attachment id being
 * attached elsewhere to read another user's file.
 */
export async function canSendAttachment(
  attachmentId: string,
  conversationId: string,
  senderId: string
): Promise<boolean> {
  const [a] = await db
    .select({
      uploaderId: chatAttachments.uploaderId,
      conversationId: chatAttachments.conversationId,
    })
    .from(chatAttachments)
    .where(eq(chatAttachments.id, attachmentId));
  if (!a) return false;
  return attachmentUsableBy(a, { senderId, conversationId });
}

/**
 * True if the patient has a *paid* appointment with the doctor — messaging is
 * unlocked by a real consultation, not an unpaid hold. See chat-policy.ts.
 */
export async function patientHasBooking(
  patientId: string,
  doctorId: string
): Promise<boolean> {
  const rows = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        eq(appointments.doctorId, doctorId)
      )
    );
  return rows.some((r) => messagingAllowedForStatus(r.status));
}

/**
 * Returns the conversation for a patient with the (single) doctor, creating it
 * on first use. Gated: the patient must have a booking with the doctor.
 */
export async function getOrCreatePatientConversation(patientId: string) {
  const [doctor] = await db
    .select({ id: doctorProfiles.id, userId: doctorProfiles.userId })
    .from(doctorProfiles)
    .limit(1);
  if (!doctor) return null;

  if (!(await patientHasBooking(patientId, doctor.id))) return null;

  const pair = and(
    eq(conversations.patientId, patientId),
    eq(conversations.doctorId, doctor.id)
  );

  const [existing] = await db.select().from(conversations).where(pair);
  if (existing) return { conversation: existing, doctorUserId: doctor.userId };

  // Insert idempotently: two concurrent first-messages would otherwise race on
  // the uq_conversation_pair unique index (23505). onConflictDoNothing + a
  // re-select makes this safe.
  await db
    .insert(conversations)
    .values({ patientId, doctorId: doctor.id })
    .onConflictDoNothing();
  const [conversation] = await db.select().from(conversations).where(pair);
  return { conversation, doctorUserId: doctor.userId };
}

/** Loads a conversation if the user is one of its two participants. */
export async function getConversationForParticipant(
  conversationId: string,
  user_: { id: string; role: string }
) {
  const [row] = await db
    .select({ conversation: conversations, doctorUserId: doctorProfiles.userId })
    .from(conversations)
    .innerJoin(doctorProfiles, eq(doctorProfiles.id, conversations.doctorId))
    .where(eq(conversations.id, conversationId));
  if (!row) return null;

  const isPatient = row.conversation.patientId === user_.id;
  const isDoctor = user_.role === "doctor" && row.doctorUserId === user_.id;
  if (!isPatient && !isDoctor) return null;

  return row;
}

/** Doctor's conversation list with patient name + unread, newest activity first. */
export async function listDoctorConversations(doctorUserId: string) {
  const [doctor] = await db
    .select({ id: doctorProfiles.id })
    .from(doctorProfiles)
    .where(eq(doctorProfiles.userId, doctorUserId));
  if (!doctor) return [];

  return db
    .select({
      conversation: conversations,
      patient: { id: user.id, name: user.name, email: user.email },
    })
    .from(conversations)
    .innerJoin(user, eq(user.id, conversations.patientId))
    .where(eq(conversations.doctorId, doctor.id))
    .orderBy(desc(conversations.lastMessageAt));
}

/** A page of messages, newest first, optionally before a cursor (message id). */
export async function listMessages(conversationId: string, beforeId?: string) {
  let beforeCreatedAt: Date | undefined;
  if (beforeId) {
    const [cursor] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, beforeId));
    beforeCreatedAt = cursor?.createdAt;
  }

  const rows = await db
    .select({
      message: messages,
      attachment: {
        id: chatAttachments.id,
        filename: chatAttachments.filename,
        mimeType: chatAttachments.mimeType,
        byteSize: dsql<number>`octet_length(${chatAttachments.data})`,
      },
    })
    .from(messages)
    .leftJoin(chatAttachments, eq(chatAttachments.id, messages.attachmentId))
    .where(
      beforeCreatedAt
        ? and(
            eq(messages.conversationId, conversationId),
            lt(messages.createdAt, beforeCreatedAt)
          )
        : eq(messages.conversationId, conversationId)
    )
    .orderBy(desc(messages.createdAt))
    .limit(MESSAGE_PAGE_SIZE + 1);

  const hasMore = rows.length > MESSAGE_PAGE_SIZE;
  const page = rows.slice(0, MESSAGE_PAGE_SIZE);
  const dtos: ChatMessageDTO[] = page.map((r) => ({
    id: r.message.id,
    conversationId: r.message.conversationId,
    senderId: r.message.senderId,
    senderRole: r.message.senderRole,
    body: r.message.body,
    attachmentId: r.message.attachmentId,
    attachment: r.attachment?.id ? r.attachment : null,
    createdAt: r.message.createdAt.toISOString(),
  }));

  const ordered = dtos.reverse(); // chronological for the UI (oldest first)
  return {
    messages: ordered,
    // The oldest message id — pass it back as `before` to load older history.
    nextCursor: hasMore ? ordered[0]?.id ?? null : null,
    hasMore,
  };
}

interface SendArgs {
  conversationId: string;
  senderId: string;
  senderRole: "patient" | "doctor";
  body: string | null;
  attachmentId?: string | null;
  patientId: string;
  doctorUserId: string;
}

/** Persists a message, bumps conversation metadata + the recipient's unread, and publishes it. */
export async function sendMessage(args: SendArgs) {
  const preview =
    args.body?.slice(0, 80) ?? (args.attachmentId ? "📎 Attachment" : "");

  const message = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(messages)
      .values({
        conversationId: args.conversationId,
        senderId: args.senderId,
        senderRole: args.senderRole,
        body: args.body,
        attachmentId: args.attachmentId ?? null,
      })
      .returning();

    await tx
      .update(conversations)
      .set({
        lastMessageAt: inserted.createdAt,
        lastMessagePreview: preview,
        // Increment the *recipient's* unread counter.
        ...(args.senderRole === "patient"
          ? { doctorUnread: dsql`${conversations.doctorUnread} + 1` }
          : { patientUnread: dsql`${conversations.patientUnread} + 1` }),
      })
      .where(eq(conversations.id, args.conversationId));

    return inserted;
  });

  const attachment = await attachmentMeta(message.attachmentId);
  const dto: ChatMessageDTO = {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderRole: message.senderRole,
    body: message.body,
    attachmentId: message.attachmentId,
    attachment,
    createdAt: message.createdAt.toISOString(),
  };

  await publishChatMessage({
    conversationId: args.conversationId,
    message: dto,
    patientId: args.patientId,
    doctorUserId: args.doctorUserId,
  });

  return dto;
}

/** Clears the reading user's unread counter and stamps read receipts. */
export async function markConversationRead(
  conversationId: string,
  readerRole: "patient" | "doctor"
) {
  await db
    .update(conversations)
    .set(readerRole === "patient" ? { patientUnread: 0 } : { doctorUnread: 0 })
    .where(eq(conversations.id, conversationId));

  // Mark the other side's messages as read.
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        dsql`${messages.senderRole} <> ${readerRole}`,
        dsql`${messages.readAt} is null`
      )
    );
}
