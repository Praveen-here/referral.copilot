// One-off: finds job boards for companies in the research CSV that the seed list doesn't
// watch yet, and prints verified ones as SEED_BOARDS lines to review and paste.
//   pnpm --filter @rc/api exec tsx src/scripts/find-boards.ts [csvPath]
// Costs one Serper search per job system tried (big companies: Workday only; others:
// Greenhouse, Lever, Ashby until one works). Reads no database.

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import "../env";
import { findBoards, type FoundBoard, type SearchableAts } from "../services/board-finder";
import { SEED_BOARDS } from "../services/openings-seed";

const csvPath = process.argv[2] ?? fileURLToPath(new URL("../../../../docs/research/reports/india_tech_hiring_companies.csv", import.meta.url));

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, commas and newlines inside quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [[]];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") rows.at(-1)!.push(field), (field = "");
    else if (c === "\n") rows.at(-1)!.push(field.replace(/\r$/, "")), (field = ""), rows.push([]);
    else field += c;
  }
  if (field || rows.at(-1)!.length) rows.at(-1)!.push(field);
  const [header, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(header!.map((h, i) => [h, r[i] ?? ""])));
}

const watched = new Set(SEED_BOARDS.map(([, , name]) => name.toLowerCase()));
const todo = parseCsv(fs.readFileSync(csvPath, "utf8")).filter(
  // YC and Wellfound listings have no public feed to watch.
  (r) => !watched.has(r.company!.toLowerCase()) && !/^(YC|Wellfound)\b/.test(r.ats!),
);
const kindsFor = (category: string): SearchableAts[] => (/big tech|MNC/i.test(category) ? ["workday"] : ["greenhouse", "lever", "ashby"]);

console.log(`Searching boards for ${todo.length} companies`);
const found: FoundBoard[] = [];
for (const r of todo) {
  try {
    const boards = await findBoards(r.company!, kindsFor(r.category!));
    found.push(...boards);
    console.log(`${r.company}: ${boards.length ? boards.map((b) => `${b.ats}:${b.slug} (${b.postings})`).join(", ") : "-"}`);
  } catch (e) {
    console.log(`${r.company}: failed (${(e as Error).message.slice(0, 80)})`);
  }
}

console.log("\n// Verified boards with India tech roles open now:");
for (const b of found.filter((b) => b.postings > 0)) console.log(`  ["${b.ats}", "${b.slug}", "${b.companyName}"],`);
console.log("\n// Verified boards with no India tech role open now:");
for (const b of found.filter((b) => b.postings === 0)) console.log(`  // ["${b.ats}", "${b.slug}", "${b.companyName}"],`);
