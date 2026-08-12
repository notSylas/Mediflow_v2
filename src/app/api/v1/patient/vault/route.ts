import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { getVaultTimeline } from "@/lib/vault/vault-share";

/** Patient's own vault timeline — read-time aggregation, never materialized. */
export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const items = await getVaultTimeline(access.id);
  return NextResponse.json({ items });
}
