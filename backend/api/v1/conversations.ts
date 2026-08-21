import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~backend/db";
import { chatAttachments, conversations, doctorProfiles } from "~backend/db/schema";
import { requireSession } from "~backend/auth/api-auth";
import {
  canSendAttachment,
  getConversationForParticipant,
  getOrCreatePatientConversation,
  listDoctorConversations,
  listMessages,
  markConversationRead,
  patientCanMessageDoctor,
  sendMessage,
} from "~backend/messaging/chat";
import { getActiveSubscriberIds } from "~backend/care/care-subscription";
import { getOrCreateDoctorProfile } from "~backend/people/doctor";
import { ALLOWED_REPORT_TYPES, MAX_REPORT_SIZE_BYTES } from "~backend/consult/reports";
import type { ApiHandler } from "../http";

const sendSchema = z.object({
  body: z.string().trim().max(4000).optional(),
  attachmentId: z.string().uuid().optional(),
});

/**
 * GET /api/v1/conversations
 *
 * Patient: returns (and lazily creates) their single conversation with the
 * doctor — 403 unless they have an active care plan. Doctor: returns all
 * conversations, each flagged with whether the patient is a care member.
 */
export const listConversations: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  if (access.role === "doctor") {
    const profile = await getOrCreateDoctorProfile(access.id);
    const [rows, memberIds] = await Promise.all([
      listDoctorConversations(access.id),
      getActiveSubscriberIds(profile.id),
    ]);
    const conversationList = rows.map((r) => ({
      ...r,
      isMember: memberIds.has(r.patient.id),
    }));
    return Response.json({ conversations: conversationList });
  }

  const result = await getOrCreatePatientConversation(access.id);
  if (!result) {
    return Response.json(
      {
        error:
          "Messaging is part of the MediFlow Care plan. Start the plan to message your doctor.",
      },
      { status: 403 }
    );
  }
  return Response.json({ conversation: result.conversation });
};

/** GET /api/v1/conversations/:id/messages */
export const getMessages: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const row = await getConversationForParticipant(params.id, access);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const before = new URL(request.url).searchParams.get("before") ?? undefined;
  const page = await listMessages(params.id, before);

  // Opening the thread clears the reader's unread counter.
  await markConversationRead(
    params.id,
    access.role === "doctor" ? "doctor" : "patient"
  );

  return Response.json(page);
};

/** POST /api/v1/conversations/:id/messages */
export const postMessage: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const row = await getConversationForParticipant(params.id, access);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }
  if (!parsed.data.body && !parsed.data.attachmentId) {
    return Response.json({ error: "Message is empty." }, { status: 400 });
  }

  // An attachment may only be sent by its uploader, in the conversation it was
  // uploaded into.
  if (
    parsed.data.attachmentId &&
    !(await canSendAttachment(parsed.data.attachmentId, params.id, access.id))
  ) {
    return Response.json({ error: "Invalid attachment." }, { status: 403 });
  }

  const senderRole = access.role === "doctor" ? "doctor" : "patient";
  const message = await sendMessage({
    conversationId: params.id,
    senderId: access.id,
    senderRole,
    body: parsed.data.body ?? null,
    attachmentId: parsed.data.attachmentId,
    patientId: row.conversation.patientId,
    doctorUserId: row.doctorUserId,
  });

  return Response.json({ message }, { status: 201 });
};

/**
 * POST /api/v1/conversations/:id/read — marks the conversation read for the
 * caller. Clients call this when a live message arrives while the thread is
 * already open, so unread counts and read receipts stay correct without
 * re-fetching the whole page.
 */
export const markRead: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const row = await getConversationForParticipant(params.id, access);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  await markConversationRead(
    params.id,
    access.role === "doctor" ? "doctor" : "patient"
  );
  return Response.json({ ok: true });
};

/**
 * POST /api/v1/conversations/:id/attachments — uploads a chat attachment;
 * returns its id to attach to a message.
 */
export const uploadAttachment: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const row = await getConversationForParticipant(params.id, access);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_REPORT_TYPES.includes(file.type as (typeof ALLOWED_REPORT_TYPES)[number])) {
    return Response.json(
      { error: "Only PDF, JPG, and PNG files are supported" },
      { status: 400 }
    );
  }
  if (file.size > MAX_REPORT_SIZE_BYTES) {
    return Response.json({ error: "File is too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const [created] = await db
    .insert(chatAttachments)
    .values({
      conversationId: params.id,
      uploaderId: access.id,
      filename: file.name,
      mimeType: file.type,
      data: buffer,
    })
    .returning({
      id: chatAttachments.id,
      filename: chatAttachments.filename,
      mimeType: chatAttachments.mimeType,
    });

  return Response.json({ ...created, byteSize: buffer.length }, { status: 201 });
};

/**
 * GET /api/v1/attachments/:id — serves a chat attachment to either participant
 * of the active care-plan conversation it was sent in. Returns raw bytes.
 */
export const downloadAttachment: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const [row] = await db
    .select({
      attachment: chatAttachments,
      patientId: conversations.patientId,
      doctorId: conversations.doctorId,
      doctorUserId: doctorProfiles.userId,
    })
    .from(chatAttachments)
    .leftJoin(conversations, eq(conversations.id, chatAttachments.conversationId))
    .leftJoin(doctorProfiles, eq(doctorProfiles.id, conversations.doctorId))
    .where(eq(chatAttachments.id, params.id))
    .limit(1);

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const isParticipant =
    row.patientId === access.id ||
    (access.role === "doctor" && row.doctorUserId === access.id);
  // The uploader can always retrieve their own file (e.g. before the message
  // row exists in a race).
  if (!isParticipant && row.attachment.uploaderId !== access.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (
    row.patientId &&
    row.doctorId &&
    !(await patientCanMessageDoctor(row.patientId, row.doctorId))
  ) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(row.attachment.data), {
    headers: {
      "Content-Type": row.attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.attachment.filename)}"`,
    },
  });
};
