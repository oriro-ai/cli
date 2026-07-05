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

// ── V0.3.7: --output md ────────────────────────────────────────────────────────────────────────
{
  const out = renderList(rows, { output: "md", columns: ["id", "tier"] });
  const lines = out.split("\n");
  ok(lines[0] === "| id | tier |" && lines[1] === "| --- | --- |", "md: table header + separator");
  ok(lines.length === 2 + rows.length && lines[2]!.startsWith("| oriro-gauss |"), "md: one row per record");
}
{
  const out = renderList([{ note: "a|b\nc" }], { output: "md" });
  ok(out.includes("a\\|b c"), "md: pipes escaped, newlines flattened");
}
{
  const out = renderList(rows, { output: "md", query: "id" });
  ok(out.startsWith("- oriro-gauss"), "md: scalar projection renders as a bullet list");
}
ok(renderList([], { output: "md" }) === "", "empty rows md = ''");

// ── V0.3.7: JMESPath --query (lightweight grammar still first) ─────────────────────────────────
{
  const out = renderList(rows, { output: "json", query: "[?keyless].id" });
  ok((JSON.parse(out) as string[]).join(",") === "oriro-gauss,oriro-avila", "JMESPath filter+project [?keyless].id");
}
{
  const out = renderList(rows, { output: "json", query: "length(@)" });
  ok(JSON.parse(out) === rows.length, "JMESPath function length(@) — non-array result ok");
}
{
  const out = renderList(rows, { output: "text", query: "length(@)" });
  ok(out === String(rows.length), "non-array JMESPath result normalized for text");
}
{
  const out = renderList(rows, { output: "json", query: "[0].id" });
  ok(JSON.parse(out) === "oriro-gauss", "JMESPath indexing [0].id");
}
// exact back-compat: the lightweight forms still take the lightweight path (= is not JMESPath)
ok(renderList(rows, { output: "text", query: "keyless=true:id" }) === "oriro-gauss\noriro-avila", "lightweight grammar untouched");
{
  let threw = "";
  try { renderList(rows, { output: "json", query: "[?broken" }); } catch (e) { threw = e instanceof Error ? e.message : String(e); }
  ok(threw.includes("invalid --query"), "bad JMESPath → clean one-line error");
}

process.stdout.write(fails === 0 ? "\noutput: ALL PASS\n" : `\noutput: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
