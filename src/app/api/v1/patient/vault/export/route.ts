import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/api-auth";
import { exportVault } from "@/lib/vault/vault-share";

/** Full vault export — satisfies the DPDP data-subject access right. JSON for this build, not a formatted PDF. */
export async function GET() {
  const access = await requireSession();
  if (access instanceof NextResponse) return access;

  const data = await exportVault(access.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mediflow-vault-export.json"`,
    },
  });
}
