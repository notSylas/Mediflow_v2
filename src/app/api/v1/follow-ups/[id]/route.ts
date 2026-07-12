import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/api-auth";
import { setFollowUpStatus } from "@/lib/follow-ups";

const schema = z.object({ status: z.enum(["booked", "dismissed"]) });

/** Patient acknowledges (booked) or dismisses a recommended follow-up. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const updated = await setFollowUpStatus(id, access.id, parsed.data.status);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ followUp: updated });
}
