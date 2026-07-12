import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicalReports } from "@/db/schema";
import { requireSession } from "@/lib/auth/api-auth";
import { ALLOWED_REPORT_TYPES, MAX_REPORT_SIZE_BYTES } from "@/lib/consult/reports";

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

  const [created] = await db
    .insert(medicalReports)
    .values({
      patientId: access.id,
      filename: file.name,
      mimeType: file.type,
      data: buffer,
    })
    .returning({ id: medicalReports.id, filename: medicalReports.filename });

  return NextResponse.json(created, { status: 201 });
}
