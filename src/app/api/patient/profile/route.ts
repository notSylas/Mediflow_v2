import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import {
  getPatientProfile,
  patientProfileUpdateSchema,
  updatePatientIdentityAndProfile,
} from "@/lib/patient";

export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  return NextResponse.json(await getPatientProfile(access.id));
}

export async function PUT(request: Request) {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const parsed = patientProfileUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const saved = await updatePatientIdentityAndProfile(access.id, parsed.data);
  return NextResponse.json(saved);
}
