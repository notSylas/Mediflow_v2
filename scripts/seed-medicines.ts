// Seeds / refreshes the medicines table from the baseline formulary.
//   npm run seed:medicines
import { db } from "../src/db";
import { medicines } from "../src/db/schema";
import { MEDICINE_SEED } from "../src/lib/consult/medicine-seed";

async function main() {
  for (const m of MEDICINE_SEED) {
    await db
      .insert(medicines)
      .values({
        name: m.name,
        strengths: m.strengths,
        route: m.route,
        category: m.category,
      })
      .onConflictDoUpdate({
        target: medicines.name,
        set: {
          strengths: m.strengths,
          route: m.route,
          category: m.category,
          isActive: true,
        },
      });
  }
  console.log(`Seeded ${MEDICINE_SEED.length} medicines.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
