import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getOrCreatePatientConversation, listDoctorConversations } from "@/lib/chat";

/**
 * Patient: returns (and lazily creates) their single conversation with the
 * doctor — 403 if they have no booking yet. Doctor: returns all conversations.
 */
export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  if (access.role === "doctor") {
    const rows = await listDoctorConversations(access.id);
    return NextResponse.json({ conversations: rows });
  }

  const result = await getOrCreatePatientConversation(access.id);
  if (!result) {
    return NextResponse.json(
      { error: "Messaging opens once you've booked a consultation." },
      { status: 403 }
    );
  }
  return NextResponse.json({ conversation: result.conversation });
}
