import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { getAppointmentForParticipant } from "@/lib/booking/appointments";

const statusSchema = z.object({
  status: z.enum(["completed", "no_show"]),
});

/** Doctor marks a confirmed appointment's outcome after the consult. */
export async function POST(
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

  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  if (appointment.status !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed appointments can be marked completed or no-show." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(appointments.id, id))
    .returning();

  return NextResponse.json(updated);
}
