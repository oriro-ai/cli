// Unit test for project-instructions ingestion (src/context/project-md.ts). tsx assertions.
// Run: tsx scripts/test-project-md.ts
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverProjectInstructions, buildProjectContext } from "../src/context/project-md.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// Build a throwaway repo tree:  root/.git , root/AGENTS.md , root/sub/CLAUDE.md
const root = mkdtempSync(join(tmpdir(), "oriro-projmd-"));
try {
  mkdirSync(join(root, ".git"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "Root rule: use tabs.");
  const sub = join(root, "sub");
  mkdirSync(sub, { recursive: true });
  writeFileSync(join(sub, "CLAUDE.md"), "Sub rule: use spaces.");

  // Discovery from the SUBDIR should find both, root-first (nearest last).
  const chain = discoverProjectInstructions(sub);
  ok(chain.length === 2, "discovers both files up the tree");
  ok(chain[0]?.path.endsWith("AGENTS.md"), "root file first (farthest)");
  ok(chain[1]?.path.endsWith("CLAUDE.md"), "nearest file last (wins on conflict)");

  // buildProjectContext: nearest content must appear AFTER root content in the prompt.
  const ctx = buildProjectContext(sub);
  ok(ctx.includes("Root rule") && ctx.includes("Sub rule"), "both files in the prompt block");
  ok(ctx.indexOf("Root rule") < ctx.indexOf("Sub rule"), "nearest (spaces) lands last → wins");

  // A directory with no instruction files anywhere up to a fresh root → empty string.
  const bare = mkdtempSync(join(tmpdir(), "oriro-bare-"));
  mkdirSync(join(bare, ".git"), { recursive: true });
  ok(buildProjectContext(bare) === "", "no files → empty (caller appends nothing)");
  rmSync(bare, { recursive: true, force: true });

  // Precedence within one level: AGENTS.md wins over a sibling CLAUDE.md.
  const both = mkdtempSync(join(tmpdir(), "oriro-both-"));
  mkdirSync(join(both, ".git"), { recursive: true });
  writeFileSync(join(both, "AGENTS.md"), "AGENTS wins.");
  writeFileSync(join(both, "CLAUDE.md"), "CLAUDE loses.");
  const bc = buildProjectContext(both);
  ok(bc.includes("AGENTS wins.") && !bc.includes("CLAUDE loses."), "AGENTS.md wins over sibling CLAUDE.md");
  rmSync(both, { recursive: true, force: true });
} finally {
  rmSync(root, { recursive: true, force: true });
}

process.stdout.write(fails === 0 ? "\nproject-md: ALL PASS\n" : `\nproject-md: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
