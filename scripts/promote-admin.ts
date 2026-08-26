// Break-glass trust-root bootstrap: there is no self-service path to the
// admin role, by design. Run once by the owner with real DATABASE_URL
// access, after the target user has signed in once (which creates their
// user row):
//   npx tsx scripts/promote-admin.ts admin@example.com
import { eq } from "drizzle-orm";
import { user } from "../backend/db/schema";

process.loadEnvFile?.();

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/promote-admin.ts <email>");
  process.exit(1);
}

// Wrapped in an async IIFE rather than top-level await: this repo's root
// package.json has no "type": "module", so tsx transforms a bare script
// invocation to CJS output, which doesn't support top-level await. Not
// awaited here either, for the same reason — the IIFE calls process.exit()
// itself once it settles.
//
// backend/db is imported dynamically, after loadEnvFile() above — a static
// import would be hoisted ahead of that call, so DATABASE_URL wouldn't be
// set yet when backend/db/index.ts reads it at module scope.
void (async () => {
  const { db } = await import("../backend/db");

  const [updated] = await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email))
    .returning({ email: user.email, role: user.role });

  if (updated) {
    console.log(`✓ ${updated.email} is now an ${updated.role}.`);
    console.log("  Have them visit /admin to review pending doctor verifications.");
  } else {
    console.error(`✗ No user found with email ${email}. Have them sign in first.`);
    process.exit(1);
  }

  process.exit(0);
})();
