// Unit test for the --output/--query renderer (src/commands/output.ts). tsx assertions.
// Run: tsx scripts/test-output.ts
import { renderList, applyQuery } from "../src/commands/output.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

const rows = [
  { id: "oriro-gauss", tier: "keyless", keyless: true },
  { id: "oriro-avila", tier: "keyless", keyless: true },
  { id: "llm7", tier: "free", keyless: false },
];

// json
{
  const out = renderList(rows, { output: "json" });
  const parsed = JSON.parse(out) as unknown[];
  ok(Array.isArray(parsed) && parsed.length === 3, "json: all rows, valid JSON");
}
// csv header + rows
{
  const out = renderList(rows, { output: "csv", columns: ["id", "tier"] });
  ok(out.split("\n")[0] === "id,tier", "csv: header row");
  ok(out.includes("oriro-gauss,keyless"), "csv: data row");
}
// text aligned
{
  const out = renderList(rows, { output: "text", columns: ["id", "tier"] });
  ok(out.split("\n").length === 4, "text: header + 3 rows");
  ok(/id\s+tier/.test(out), "text: aligned header");
}
// query: filter by equality
{
  const out = renderList(rows, { output: "json", query: "keyless=true" });
  const parsed = JSON.parse(out) as unknown[];
  ok(parsed.length === 2, "query filter keyless=true → 2 rows");
}
// query: filter + project a field
{
  const out = renderList(rows, { output: "text", query: "keyless=true:id" });
  ok(out === "oriro-gauss\noriro-avila", "query filter+project → scalar list");
}
// query: bare field projection
{
  const projected = applyQuery(rows, "id");
  ok(Array.isArray(projected) && projected.join(",") === "oriro-gauss,oriro-avila,llm7", "bare field projection");
}
// invalid format throws
{
  let threw = false;
  try { renderList(rows, { output: "yaml" }); } catch { threw = true; }
  ok(threw, "invalid --output rejected");
}
// empty rows → empty string (no crash)
ok(renderList([], { output: "json" }) === "[]", "empty rows json = []");
ok(renderList([], { output: "csv" }) === "", "empty rows csv = ''");

process.stdout.write(fails === 0 ? "\noutput: ALL PASS\n" : `\noutput: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
