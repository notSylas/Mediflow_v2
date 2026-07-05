// Seeds / refreshes the specialties taxonomy from the baseline list.
//   npm run seed:specialties
import { db } from "../src/db";
import { specialties } from "../src/db/schema";
import { SPECIALTY_SEED } from "../src/lib/specialty-seed";

async function main() {
  for (let i = 0; i < SPECIALTY_SEED.length; i++) {
    const s = SPECIALTY_SEED[i];
    await db
      .insert(specialties)
      .values({
        slug: s.slug,
        name: s.name,
        group: s.group,
        sortOrder: i,
      })
      .onConflictDoUpdate({
        target: specialties.slug,
        set: {
          name: s.name,
          group: s.group,
          sortOrder: i,
          isActive: true,
        },
      });
  }
  console.log(`Seeded ${SPECIALTY_SEED.length} specialties.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
