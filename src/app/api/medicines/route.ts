import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/db";
import { medicines } from "@/db/schema";

// GET /api/medicines?q=para — ranked formulary search for the prescription
// autocomplete. Prefix matches rank first, then substring / category matches.
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ medicines: [] });
  }

  const like = `%${q}%`;
  const prefix = `${q}%`;
  const rows = await db
    .select({
      name: medicines.name,
      strengths: medicines.strengths,
      route: medicines.route,
      klass: medicines.category,
    })
    .from(medicines)
    .where(
      and(
        eq(medicines.isActive, true),
        or(ilike(medicines.name, like), ilike(medicines.category, like))
      )
    )
    .orderBy(
      sql`case when ${medicines.name} ilike ${prefix} then 0 else 1 end`,
      medicines.name
    )
    .limit(8);

  return NextResponse.json({
    medicines: rows.map((row) => ({
      name: row.name,
      strengths: row.strengths,
      route: row.route,
      klass: row.klass ?? "Medicine",
    })),
  });
}
