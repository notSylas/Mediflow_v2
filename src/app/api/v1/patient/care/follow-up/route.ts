import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/api-auth";
import { requestFollowUp } from "@/lib/care-subscription";

const schema = z.object({ note: z.string().trim().max(2000).optional() });

/**
 * Patient spends their one monthly follow-up credit, creating an async check-in
 * request the doctor sees in their work queue. 403 if not subscribed, 409 if the
 * credit is already used this period.
 */
export async function POST(request: Request) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const result = await requestFollowUp(access.id, parsed.data.note ?? null);
  if (!result.ok) {
    if (result.reason === "not_subscribed") {
      return NextResponse.json(
        { error: "An active care plan is required to request a follow-up." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Your follow-up for this period has already been used." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, request: result.request }, { status: 201 });
}
