import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { requireSession } from "@/lib/api-auth";
import { getAppointmentForPatient } from "@/lib/appointments";
import { getAvailableSlots } from "@/lib/availability";
import { isUniqueViolation } from "@/lib/db-errors";
import { getDoctorProfile } from "@/lib/doctor";

const schema = z.object({ startsAt: z.string().datetime() });

/** Moves a confirmed (already-paid) appointment to a new free slot. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const row = await getAppointmentForPatient(id, access.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (row.appointment.status !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed appointments can be rescheduled." },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getDoctorProfile();
  if (!profile) {
    return NextResponse.json({ error: "No doctor configured" }, { status: 400 });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const now = new Date();
  if (startsAt <= now) {
    return NextResponse.json({ error: "Pick a future time." }, { status: 400 });
  }

  const endsAt = new Date(startsAt.getTime() + profile.slotMinutes * 60 * 1000);
  const { slots } = await getAvailableSlots(now, endsAt);
  const isFree = slots.some((s) => s.getTime() === startsAt.getTime());
  if (!isFree) {
    return NextResponse.json(
      { error: "That slot isn't available. Please pick another." },
      { status: 409 }
    );
  }

  try {
    const [updated] = await db
      .update(appointments)
      .set({ startsAt, endsAt, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return NextResponse.json({ appointment: updated });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "That slot was just taken. Please pick another." },
        { status: 409 }
      );
    }
    throw error;
  }
}
