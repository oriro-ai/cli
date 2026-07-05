// Unit test for V0.4.0 /prove (src/repl-ui/slash-prove.ts). tsx.
// Pure parts always run; when the optional playwright peer (+ chromium) is installed, one REAL
// end-to-end proof runs against a staged SVG artifact. Run: tsx scripts/test-prove.ts
import { mkdtempSync, rmSync, existsSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isProveSlash, parseProveSlash, renderableArtifact, proveDest, handleProve } from "../src/repl-ui/slash-prove.js";
import { setArtifacts, type Artifact } from "../src/repl-ui/artifacts.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// ── parsing (pure) ─────────────────────────────────────────────────────────────────────────────
ok(isProveSlash("/prove") && isProveSlash("/PROVE 2") && !isProveSlash("/proven"), "recognizes /prove, word-boundary strict");
ok(parseProveSlash("/prove")?.target === "1" && parseProveSlash("/prove")?.video === false, "bare /prove → artifact 1, no video");
ok(parseProveSlash("/prove 3")?.target === "3", "index target");
{
  const p = parseProveSlash("/prove http://localhost:3000 --video");
  ok(p?.target === "http://localhost:3000" && p.video === true, "url target + --video flag");
}
ok(parseProveSlash("/prove --video")?.target === "1" && parseProveSlash("/prove --video")?.video === true, "--video alone keeps default target");

// ── renderable gate (pure) ─────────────────────────────────────────────────────────────────────
const svgArt: Artifact = { kind: "svg", lang: "svg", content: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 80 80\"><rect width=\"80\" height=\"80\" fill=\"teal\"/></svg>", suggestedName: "a.svg" } as Artifact;
const codeArt: Artifact = { kind: "code", lang: "python", content: "print(1)", suggestedName: "a.py" } as Artifact;
ok(renderableArtifact(svgArt) && !renderableArtifact(codeArt) && !renderableArtifact(undefined), "svg renderable, code/absent not");

// ── evidence naming (pure) ─────────────────────────────────────────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), "oriro-prove-qa-"));
const now = new Date(2026, 6, 4, 9, 5, 7);
{
  const d = proveDest(now, "png", tmp);
  ok(d.endsWith("proof-0704-090507.png"), "proof-MMDD-HHMMSS.png");
  writeFileSync(d, "x");
  ok(proveDest(now, "png", tmp).endsWith("proof-0704-090507-2.png"), "collision → -2");
}

// ── guidance paths (no browser needed) ─────────────────────────────────────────────────────────
setArtifacts([codeArt]);
{
  const lines = await handleProve("/prove 1", now, tmp);
  ok(lines.join(" ").includes("is python"), "code artifact → honest redirect, no crash");
}
setArtifacts([]);
{
  const lines = await handleProve("/prove 4", now, tmp);
  ok(lines.join(" ").includes("no artifact 4"), "missing artifact → guidance");
}
{
  const lines = await handleProve("/prove not-a-url", now, tmp);
  ok(lines.join(" ").includes("usage:"), "garbage target → usage");
}

// ── real proof (only when the playwright peer + chromium are installed) ────────────────────────
let hasBrowser = false;
try {
  const pw = await import("playwright");
  hasBrowser = typeof pw.chromium?.executablePath() === "string" && existsSync(pw.chromium.executablePath());
} catch { /* peer absent */ }
if (!hasBrowser) {
  process.stdout.write("⏭  playwright/chromium not installed — real-render proof skipped (guidance paths covered)\n");
} else {
  setArtifacts([svgArt]);
  const lines = await handleProve("/prove 1", new Date(2026, 6, 4, 10, 0, 0), tmp);
  const joined = lines.join(" ");
  const png = join(tmp, "proof-0704-100000.png");
  ok(joined.includes("✓ browser-proof"), "real Chromium render verdict");
  ok(existsSync(png) && statSync(png).size > 500, "proof PNG saved with real pixels");
}

rmSync(tmp, { recursive: true, force: true });
process.stdout.write(fails === 0 ? "\nprove: ALL PASS\n" : `\nprove: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
