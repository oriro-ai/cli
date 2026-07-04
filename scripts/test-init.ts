// Unit test for /init (src/context/init-agents.ts + src/repl-ui/slash-init.ts). tsx assertions.
// Run: tsx scripts/test-init.ts
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectProject, generateAgentsMd, writeAgentsMd } from "../src/context/init-agents.js";
import { isInitSlash, handleInit } from "../src/repl-ui/slash-init.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// slash recognition
ok(isInitSlash("/init"), "recognizes /init");
ok(isInitSlash("/init --force"), "recognizes /init --force");
ok(!isInitSlash("/initialize"), "does NOT match /initialize (word-boundary)");

// Build a realistic Node project tree.
const root = mkdtempSync(join(tmpdir(), "oriro-init-"));
try {
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "acme-widget", description: "A widget factory.",
    scripts: { build: "tsup", test: "vitest", dev: "vite", nope: "x" },
  }));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "index.ts"), "export const x = 1;");
  writeFileSync(join(root, "src", "util.ts"), "export const y = 2;");
  writeFileSync(join(root, "src", "app.py"), "print(1)");
  mkdirSync(join(root, "node_modules", "junk"), { recursive: true }); // must be skipped
  writeFileSync(join(root, "node_modules", "junk", "big.js"), "//");

  // detection
  const facts = detectProject(root);
  ok(facts.name === "acme-widget", "name from package.json");
  ok(facts.description === "A widget factory.", "description from package.json");
  ok(facts.languages[0] === "TypeScript", "TypeScript is the dominant language (2 .ts > 1 .py)");
  ok(facts.languages.includes("Python"), "Python also detected");
  ok(facts.commands.some((c) => c.label === "build" && c.cmd === "npm run build"), "build command mapped");
  ok(facts.commands.some((c) => c.label === "test"), "test command mapped");
  ok(!facts.commands.some((c) => c.label === "nope"), "unknown scripts are ignored");
  ok(facts.topDirs.includes("src") && !facts.topDirs.includes("node_modules"), "top dirs include src, skip node_modules");

  // markdown render
  const md = generateAgentsMd(root);
  ok(md.startsWith("# acme-widget"), "AGENTS.md titled with project name");
  ok(md.includes("A widget factory.") && md.includes("TypeScript") && md.includes("`npm run build`"), "md carries description, lang, command");
  ok(md.includes("## Commands") && md.includes("## Conventions"), "has the standard sections");

  // write: creates when absent
  const r1 = writeAgentsMd(root);
  ok(r1.created && existsSync(join(root, "AGENTS.md")), "writes AGENTS.md when absent");
  // write: never clobbers
  writeFileSync(join(root, "AGENTS.md"), "MINE");
  const r2 = writeAgentsMd(root);
  ok(!r2.created && readFileSync(join(root, "AGENTS.md"), "utf8") === "MINE", "does NOT clobber an existing AGENTS.md");
  // write: --force overwrites
  const r3 = writeAgentsMd(root, true);
  ok(r3.created && readFileSync(join(root, "AGENTS.md"), "utf8").startsWith("# acme-widget"), "--force overwrites");

  // slash handler: existing-file path (after r3 the file exists) → reports 'already exists'
  const out = handleInit("/init", root);
  ok(out.join(" ").includes("already exists"), "handler reports existing file without --force");
  const outF = handleInit("/init --force", root);
  ok(outF.join(" ").includes("wrote"), "handler --force reports a write");
} finally {
  rmSync(root, { recursive: true, force: true });
}

process.stdout.write(fails === 0 ? "\ninit: ALL PASS\n" : `\ninit: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
