// Unit test for artifact extraction (src/repl-ui/artifacts.ts). tsx assertions.
// Run: tsx scripts/test-artifacts.ts
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extractArtifacts, setArtifacts } from "../src/repl-ui/artifacts.js";
import { handleArtifactSlash } from "../src/repl-ui/slash-artifacts.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// A reply with a python block, an html block, and a bare SVG.
const reply = [
  "Here's the script:",
  "```python",
  "print('hi')",
  "```",
  "and a page:",
  "```html",
  "<h1>Hi</h1>",
  "```",
  "and a logo:",
  '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>',
].join("\n");

const a = extractArtifacts(reply);
ok(a.length === 3, `extracted 3 artifacts (got ${a.length})`);
ok(a[0]?.kind === "code" && a[0]?.lang === "python" && a[0]?.suggestedName === "artifact-1.py", "python block → .py");
ok(a[0]?.content === "print('hi')", "code content captured (no fences)");
ok(a[1]?.suggestedName === "artifact-2.html", "html block → .html");
ok(a[2]?.kind === "svg" && a[2]?.suggestedName === "artifact-3.svg", "bare <svg> → svg artifact");

// SVG inside a fence should be classified as svg, not double-counted with the bare pass.
const svgFence = "```svg\n<svg><rect/></svg>\n```";
const b = extractArtifacts(svgFence);
ok(b.length === 1 && b[0]?.kind === "svg", "fenced svg counted once as svg");

// No artifacts in plain prose.
ok(extractArtifacts("just some words, no code.").length === 0, "plain prose → no artifacts");
// Empty fence ignored.
ok(extractArtifacts("```js\n\n```").length === 0, "empty code block ignored");

// ── /save approve→apply flow ──
setArtifacts(extractArtifacts("```python\nprint(1)\n```"));
const dest = join(tmpdir(), `oriro-art-${Date.now()}.py`);
const saved = handleArtifactSlash(`/save 1 ${dest}`);
ok(existsSync(dest) && readFileSync(dest, "utf8") === "print(1)", "/save writes the artifact to disk");
ok((saved[0] ?? "").includes("saved"), "/save reports success");
ok((handleArtifactSlash(`/save 1 ${dest}`)[0] ?? "").includes("exists"), "/save refuses to overwrite an existing file");
ok((handleArtifactSlash("/save 9")[0] ?? "").includes("usage"), "/save with a bad index → usage");
rmSync(dest, { force: true });
setArtifacts([]);
ok((handleArtifactSlash("/review")[0] ?? "").includes("no artifacts"), "/review with none → guidance");

process.stdout.write(fails === 0 ? "\nartifacts: ALL PASS\n" : `\nartifacts: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
