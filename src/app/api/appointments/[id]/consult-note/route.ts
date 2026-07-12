import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { consultNotes } from "@/db/schema";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { getAppointmentForParticipant } from "@/lib/appointments";

const soapSchema = z.object({
  subjective: z.string().max(10_000).nullish(),
  objective: z.string().max(10_000).nullish(),
  assessment: z.string().max(10_000).nullish(),
  plan: z.string().max(10_000).nullish(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const appointment = await getAppointmentForParticipant(id, access);

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = soapSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const [note] = await db
    .insert(consultNotes)
    .values({ appointmentId: id, ...parsed.data })
    .onConflictDoUpdate({
      target: consultNotes.appointmentId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json(note);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireDoctorSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const appointment = await getAppointmentForParticipant(id, access);

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [note] = await db
    .select()
    .from(consultNotes)
    .where(eq(consultNotes.appointmentId, id));

  return NextResponse.json(note ?? null);
}
