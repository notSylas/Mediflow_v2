import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prescriptions } from "@/db/schema";
import { requireDoctorSession } from "@/lib/auth/api-auth";
import { getAppointmentForParticipant } from "@/lib/appointments";
import { getPrescriptionWithMedicines } from "@/lib/consult";

/** Issues the draft prescription, locking it permanently. */
export async function POST(
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

  const prescription = await getPrescriptionWithMedicines(id);

  if (!prescription) {
    return NextResponse.json({ error: "No prescription to issue" }, { status: 400 });
  }

  if (prescription.status === "issued") {
    return NextResponse.json({ error: "Already issued" }, { status: 409 });
  }

  if (prescription.medicines.length === 0 && !prescription.diagnosis) {
    return NextResponse.json(
      { error: "Add a diagnosis or at least one medicine before issuing." },
      { status: 400 }
    );
  }

  const [issued] = await db
    .update(prescriptions)
    .set({ status: "issued", issuedAt: new Date(), updatedAt: new Date() })
    .where(eq(prescriptions.id, prescription.id))
    .returning();

  return NextResponse.json(issued);
}
