import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { ALLOWED_REPORT_TYPES, MAX_REPORT_SIZE_BYTES } from "@/lib/consult/reports";
import { createVaultRecord } from "@/lib/vault/vault-records";

/**
 * Tier 2 upload — a record from any doctor, not just MediFlow's own. Stores
 * the file once, runs extraction (currently a stub, see vault-extraction.ts),
 * and returns the created draft for the patient to review before it counts
 * toward the vault (patientConfirmed stays false until the PATCH step).
 */
export async function POST(request: Request) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_REPORT_TYPES.includes(file.type as (typeof ALLOWED_REPORT_TYPES)[number])) {
    return NextResponse.json(
      { error: "Only PDF, JPG, and PNG files are supported" },
      { status: 400 }
    );
  }
  if (file.size > MAX_REPORT_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const record = await createVaultRecord(access.id, {
    buffer,
    filename: file.name,
    mimeType: file.type,
  });

  return NextResponse.json({ record }, { status: 201 });
}
