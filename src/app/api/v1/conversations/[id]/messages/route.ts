import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import {
  canSendAttachment,
  getConversationForParticipant,
  listMessages,
  markConversationRead,
  sendMessage,
} from "@/lib/chat";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const row = await getConversationForParticipant(id, access);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const before = new URL(request.url).searchParams.get("before") ?? undefined;
  const page = await listMessages(id, before);

  // Opening the thread clears the reader's unread counter.
  await markConversationRead(id, access.role === "doctor" ? "doctor" : "patient");

  return NextResponse.json(page);
}

const sendSchema = z.object({
  body: z.string().trim().max(4000).optional(),
  attachmentId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const row = await getConversationForParticipant(id, access);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  if (!parsed.data.body && !parsed.data.attachmentId) {
    return NextResponse.json({ error: "Message is empty." }, { status: 400 });
  }

  // An attachment may only be sent by its uploader, in the conversation it was
  // uploaded into.
  if (
    parsed.data.attachmentId &&
    !(await canSendAttachment(parsed.data.attachmentId, id, access.id))
  ) {
    return NextResponse.json({ error: "Invalid attachment." }, { status: 403 });
  }

  const senderRole = access.role === "doctor" ? "doctor" : "patient";
  const message = await sendMessage({
    conversationId: id,
    senderId: access.id,
    senderRole,
    body: parsed.data.body ?? null,
    attachmentId: parsed.data.attachmentId,
    patientId: row.conversation.patientId,
    doctorUserId: row.doctorUserId,
  });

  return NextResponse.json({ message }, { status: 201 });
}
