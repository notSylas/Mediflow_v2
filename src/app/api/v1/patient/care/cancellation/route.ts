import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { getCancellationBreakdown } from "@/lib/care/care-subscription";

/** Pro-rated deduction/refund breakdown shown before the patient cancels. */
export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const breakdown = await getCancellationBreakdown(access.id);
  return NextResponse.json({ breakdown });
}
