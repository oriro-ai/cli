// Unit test for /compact (src/repl-ui/slash-compact.ts). tsx assertions.
// Run: tsx scripts/test-compact.ts
import { isCompactSlash, compactInstructions, formatCompactionResult } from "../src/repl-ui/slash-compact.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// recognition
ok(isCompactSlash("/compact"), "recognizes /compact");
ok(isCompactSlash("/COMPACT focus on the bug"), "recognizes /compact + args, case-insensitive");
ok(!isCompactSlash("/compacted"), "does NOT match /compacted (word-boundary)");
ok(!isCompactSlash("/model"), "does not match other slashes");

// custom instructions extraction
ok(compactInstructions("/compact") === undefined, "no args → undefined instructions");
ok(compactInstructions("/compact keep the auth decisions") === "keep the auth decisions", "extracts focus instructions");
ok(compactInstructions("/compact   ") === undefined, "whitespace-only args → undefined");

// formatter: with estimatedTokensAfter → shows % freed
{
  const lines = formatCompactionResult({ summary: "s", firstKeptEntryId: "e", tokensBefore: 10000, estimatedTokensAfter: 2500 });
  const joined = lines.join(" ");
  ok(joined.includes("10,000") && joined.includes("2,500"), "shows before → after with thousands separators");
  ok(joined.includes("75%"), "computes 75% freed (10000→2500)");
}
// formatter: no estimatedTokensAfter → graceful fallback, no NaN/%
{
  const lines = formatCompactionResult({ summary: "s", firstKeptEntryId: "e", tokensBefore: 8000 });
  const joined = lines.join(" ");
  ok(joined.includes("8,000") && !joined.includes("%") && !joined.includes("NaN"), "fallback line, no % / NaN when after is absent");
}
// formatter: zero-before edge (never divides by zero)
{
  const lines = formatCompactionResult({ summary: "s", firstKeptEntryId: "e", tokensBefore: 0, estimatedTokensAfter: 0 });
  ok(lines.join(" ").length > 0 && !lines.join(" ").includes("NaN"), "zero tokensBefore → no NaN, still reports");
}

process.stdout.write(fails === 0 ? "\ncompact: ALL PASS\n" : `\ncompact: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
