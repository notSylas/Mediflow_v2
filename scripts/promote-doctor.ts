// Promotes an existing user to the doctor role. Run after the doctor has
// signed in once (which creates their user row):
//   npx tsx scripts/promote-doctor.ts doctor@example.com
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";

process.loadEnvFile?.();

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/promote-doctor.ts <email>");
  process.exit(1);
}

const [updated] = await db
  .update(user)
  .set({ role: "doctor" })
  .where(eq(user.email, email))
  .returning({ email: user.email, role: user.role });

if (updated) {
  console.log(`✓ ${updated.email} is now a ${updated.role}.`);
  console.log("  Have them visit /doctor to set fee, slot length and availability.");
} else {
  console.error(`✗ No user found with email ${email}. Have them sign in first.`);
  process.exit(1);
}

process.exit(0);
