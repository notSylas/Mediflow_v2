import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { medicalReports } from "@/db/schema";
import { requireSession } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const { id } = await params;

  const [report] = await db
    .select()
    .from(medicalReports)
    .where(eq(medicalReports.id, id));

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (report.patientId !== access.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new Response(new Uint8Array(report.data), {
    headers: {
      "Content-Type": report.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(report.filename)}"`,
    },
  });
}
