import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { getConversationForParticipant, markConversationRead } from "@/lib/chat";

/**
 * Marks the conversation read for the caller. Clients call this when a live
 * message arrives while the thread is already open, so unread counts and read
 * receipts stay correct without re-fetching the whole page.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const row = await getConversationForParticipant(id, access);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await markConversationRead(id, access.role === "doctor" ? "doctor" : "patient");
  return NextResponse.json({ ok: true });
}
