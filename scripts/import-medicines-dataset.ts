// One-time (re-runnable) import of a real medicine catalog, replacing the
// small hand-picked seed list with ~250K real Indian pharmaceutical
// products. Source: junioralive/Indian-Medicine-Dataset (MIT-licensed,
// github.com/junioralive/Indian-Medicine-Dataset), sourced from 1mg.
//
// By default this reads the snapshot vendored at
// scripts/data/indian-medicine-dataset.csv.gz (fetched 2026-08-25) rather
// than hitting GitHub — so the import still works even if that repo is
// ever renamed, moved, or deleted. Pass --refresh to instead re-fetch the
// live CSV from GitHub and overwrite the vendored snapshot with it before
// importing; review the resulting git diff before committing.
//   npm run seed:medicines:real
//   npm run seed:medicines:refresh
import { gunzipSync, gzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";
import { db } from "../backend/db";
import { medicines } from "../backend/db/schema";

const DATASET_URL =
  "https://raw.githubusercontent.com/junioralive/Indian-Medicine-Dataset/main/DATA/updated_indian_medicine_data.csv";

const SNAPSHOT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "data/indian-medicine-dataset.csv.gz"
);

// Only what a prescribing autofill needs — no price/pack-size/discount
// (not clinically relevant, goes stale) and no description/side-effects/
// drug-interactions (out of scope for this pass; drug_interactions would
// serve a future interaction-check feature, not autofill).
interface DatasetRow {
  name: string;
  Is_discontinued: string;
  manufacturer_name: string;
  salt_composition: string;
}

const BATCH_SIZE = 1000;

async function loadCsv(): Promise<string> {
  const refresh = process.argv.includes("--refresh");

  if (!refresh) {
    console.log(`Reading vendored snapshot ${SNAPSHOT_PATH} ...`);
    return gunzipSync(readFileSync(SNAPSHOT_PATH)).toString("utf-8");
  }

  console.log(`Fetching ${DATASET_URL} ...`);
  const res = await fetch(DATASET_URL);
  if (!res.ok) {
    throw new Error(`Dataset fetch failed: ${res.status} ${res.statusText}`);
  }
  const csv = await res.text();

  console.log(`Updating vendored snapshot ${SNAPSHOT_PATH} ...`);
  writeFileSync(SNAPSHOT_PATH, gzipSync(csv, { level: 9 }));

  return csv;
}

async function main() {
  const csv = await loadCsv();

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as DatasetRow[];
  console.log(`Parsed ${rows.length} rows.`);

  const seen = new Set<string>();
  const values: Array<{
    name: string;
    manufacturer: string | null;
    composition: string | null;
  }> = [];
  let skippedDiscontinued = 0;
  let skippedEmptyName = 0;
  let skippedDuplicate = 0;

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      skippedEmptyName++;
      continue;
    }
    if (row.Is_discontinued?.trim().toUpperCase() === "TRUE") {
      skippedDiscontinued++;
      continue;
    }
    // The CSV itself contains duplicate name strings across manufacturers
    // (a handful, not the common case) — name is unique in our table, so
    // keep the first occurrence and count the rest.
    if (seen.has(name)) {
      skippedDuplicate++;
      continue;
    }
    seen.add(name);

    values.push({
      name,
      manufacturer: row.manufacturer_name?.trim() || null,
      composition: row.salt_composition?.trim() || null,
    });
  }

  console.log(
    `Importing ${values.length} rows ` +
      `(skipped: ${skippedDiscontinued} discontinued, ${skippedEmptyName} empty-name, ${skippedDuplicate} duplicate name).`
  );

  console.log("Clearing old seed data...");
  await db.execute(sql`TRUNCATE medicines`);

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(medicines).values(batch).onConflictDoNothing();
    process.stdout.write(
      `\r  ${Math.min(i + BATCH_SIZE, values.length)} / ${values.length}`
    );
  }
  console.log(`\nDone. Imported ${values.length} medicines.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
