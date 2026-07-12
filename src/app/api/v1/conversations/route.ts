import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { getOrCreatePatientConversation, listDoctorConversations } from "@/lib/chat";
import { getActiveSubscriberIds } from "@/lib/care-subscription";
import { getOrCreateDoctorProfile } from "@/lib/doctor";

/**
 * Patient: returns (and lazily creates) their single conversation with the
 * doctor — 403 unless they have an active care plan. Doctor: returns all
 * conversations, each flagged with whether the patient is a care member.
 */
export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  if (access.role === "doctor") {
    const profile = await getOrCreateDoctorProfile(access.id);
    const [rows, memberIds] = await Promise.all([
      listDoctorConversations(access.id),
      getActiveSubscriberIds(profile.id),
    ]);
    const conversations = rows.map((r) => ({
      ...r,
      isMember: memberIds.has(r.patient.id),
    }));
    return NextResponse.json({ conversations });
  }

  const result = await getOrCreatePatientConversation(access.id);
  if (!result) {
    return NextResponse.json(
      {
        error:
          "Messaging is part of the MediFlow Care plan. Start the plan to message your doctor.",
      },
      { status: 403 }
    );
  }
  return NextResponse.json({ conversation: result.conversation });
}
