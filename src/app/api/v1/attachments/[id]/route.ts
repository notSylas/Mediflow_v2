import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chatAttachments, conversations, doctorProfiles } from "@/db/schema";
import { requireSession } from "@/lib/auth/api-auth";
import { patientCanMessageDoctor } from "@/lib/chat";

/**
 * Serves a chat attachment to either participant of the active care-plan
 * conversation it was sent in.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;

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
    .where(eq(chatAttachments.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant =
    row.patientId === access.id ||
    (access.role === "doctor" && row.doctorUserId === access.id);
  // The uploader can always retrieve their own file (e.g. before the message
  // row exists in a race).
  if (!isParticipant && row.attachment.uploaderId !== access.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (
    row.patientId &&
    row.doctorId &&
    !(await patientCanMessageDoctor(row.patientId, row.doctorId))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(row.attachment.data), {
    headers: {
      "Content-Type": row.attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.attachment.filename)}"`,
    },
  });
}
