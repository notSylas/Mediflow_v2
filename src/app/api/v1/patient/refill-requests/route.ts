import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/api-auth";
import { createRefillRequest } from "@/lib/care/refills";

const schema = z.object({ prescriptionId: z.string().uuid() });

/** Patient requests a refill of one of their issued prescriptions. */
export async function POST(request: Request) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const created = await createRefillRequest(parsed.data.prescriptionId, access.id);
  if (!created) {
    return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
