import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/api-auth";
import { deleteVaultRecord, getVaultRecord, updateVaultRecord } from "@/lib/vault/vault-records";

/** Used by the web review/edit screen (a full page load, unlike mobile which carries the just-created record via navigation params). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const record = await getVaultRecord(id, access.id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  return NextResponse.json({ record });
}

const medicineSchema = z.object({
  name: z.string().min(1),
  strength: z.string().nullable(),
  route: z.string().nullable(),
  morning: z.boolean(),
  afternoon: z.boolean(),
  evening: z.boolean(),
  night: z.boolean(),
  foodRelation: z.string().nullable(),
  durationDays: z.number().int().nullable(),
  instructions: z.string().nullable(),
});

const patchSchema = z.object({
  recordType: z.enum(["prescription", "lab", "scan", "discharge_summary", "vaccination", "other"]),
  recordDate: z.string().nullable(),
  sourceFacility: z.string().nullable(),
  sourceDoctorName: z.string().nullable(),
  diagnosis: z.string().nullable(),
  advice: z.string().nullable(),
  medicines: z.array(medicineSchema),
});

/** Review step — patient corrects/completes the extracted fields and confirms. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;
  const record = await updateVaultRecord(id, access.id, parsed.data);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  return NextResponse.json({ record });
}

/** Discard an upload — e.g. a bad photo the patient doesn't want to keep. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const deleted = await deleteVaultRecord(id, access.id);
  if (!deleted) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  return NextResponse.json({ status: "deleted" });
}
