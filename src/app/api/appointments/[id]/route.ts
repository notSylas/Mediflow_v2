import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { getAppointmentForPatient } from "@/lib/booking/appointments";

export async function GET(
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

  return NextResponse.json(row);
}
