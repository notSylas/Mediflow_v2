import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { requireSession } from "@/lib/api-auth";
import { getAppointmentForPatient } from "@/lib/appointments";
import { canCancelAppointment } from "@/lib/booking";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const row = await getAppointmentForPatient(id, access.id);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canCancelAppointment(row.appointment, new Date())) {
    return NextResponse.json(
      { error: "This appointment can no longer be cancelled" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: "cancelled" })
    .where(eq(appointments.id, id))
    .returning();

  return NextResponse.json(updated);
}
