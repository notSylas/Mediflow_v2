import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatAttachments } from "@/db/schema";
import { requireSession } from "@/lib/auth/api-auth";
import { getConversationForParticipant } from "@/lib/chat";
import { ALLOWED_REPORT_TYPES, MAX_REPORT_SIZE_BYTES } from "@/lib/consult/reports";

/** Uploads a chat attachment; returns its id to attach to a message. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const row = await getConversationForParticipant(id, access);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_REPORT_TYPES.includes(file.type as (typeof ALLOWED_REPORT_TYPES)[number])) {
    return NextResponse.json(
      { error: "Only PDF, JPG, and PNG files are supported" },
      { status: 400 }
    );
  }
  if (file.size > MAX_REPORT_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const [created] = await db
    .insert(chatAttachments)
    .values({
      conversationId: id,
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

  return NextResponse.json({ ...created, byteSize: buffer.length }, { status: 201 });
}
