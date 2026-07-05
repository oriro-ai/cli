// Unit test for V0.3.9 /imagine (src/repl-ui/slash-imagine.ts). tsx.
// Run: tsx scripts/test-imagine.ts — saves into a throwaway dir; real ~/.oriro and cwd untouched.
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isImagineSlash, imagineTask, imagineDest, imagineResultLines, IMAGINE_PRIMER } from "../src/repl-ui/slash-imagine.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// slash recognition + task extraction
ok(isImagineSlash("/imagine a red fox") && isImagineSlash("/IMAGINE x") && isImagineSlash("/imagine"), "recognizes /imagine (any case, bare)");
ok(!isImagineSlash("/imagined") && !isImagineSlash("imagine a fox"), "word-boundary: no false matches");
ok(imagineTask("/imagine a red fox at dawn") === "a red fox at dawn", "task extracted");
ok(imagineTask("/imagine   ") === undefined, "bare /imagine → undefined (usage)");

// primer forces the contract
ok(IMAGINE_PRIMER.includes("```svg") && IMAGINE_PRIMER.toLowerCase().includes("viewbox") && IMAGINE_PRIMER.includes("NO external"), "primer demands one standalone fenced SVG");

const tmp = mkdtempSync(join(tmpdir(), "oriro-imagine-"));
const now = new Date(2026, 6, 4, 9, 5, 7);

// collision-safe destination
{
  const d1 = imagineDest(now, tmp);
  ok(d1.endsWith("imagine-0704-090507.svg"), "dest is imagine-MMDD-HHMMSS.svg");
  writeFileSync(d1, "x");
  ok(imagineDest(now, tmp).endsWith("imagine-0704-090507-2.svg"), "collision → -2 suffix");
}

// happy path: fenced svg in the reply → saved + reported
{
  const reply = "Here is your scene:\n```svg\n<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"teal\"/></svg>\n```\n";
  const lines = imagineResultLines(reply, new Date(2026, 6, 4, 10, 0, 0), tmp);
  ok(lines.length === 1 && lines[0]!.includes("✓ imagined"), "reports the save");
  const dest = join(tmp, "imagine-0704-100000.svg");
  ok(existsSync(dest) && readFileSync(dest, "utf8").startsWith("<svg"), "SVG written verbatim to disk");
}

// raw <svg> (no fence) also extracts
{
  const lines = imagineResultLines("<svg xmlns=\"a\" viewBox=\"0 0 1 1\"><rect/></svg>", new Date(2026, 6, 4, 11, 0, 0), tmp);
  ok(lines[0]!.includes("✓ imagined"), "unfenced top-level <svg> still captured");
}

// no svg → honest guidance, nothing written
{
  const lines = imagineResultLines("sorry, I can only describe it in words", new Date(2026, 6, 4, 12, 0, 0), tmp);
  ok(lines[0]!.includes("no SVG came back"), "no SVG → retry guidance");
  ok(!existsSync(join(tmp, "imagine-0704-120000.svg")), "nothing written on a miss");
}

rmSync(tmp, { recursive: true, force: true });
process.stdout.write(fails === 0 ? "\nimagine: ALL PASS\n" : `\nimagine: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
