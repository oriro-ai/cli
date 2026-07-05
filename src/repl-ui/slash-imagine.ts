// V0.3.9 — `/imagine <prompt>`: inline image generation in the REPL (the Grok /imagine gap), done
// the ORIRO way: our OWN keyless engine draws a self-contained SVG (no paid image API, $0, on-brand
// with the platform's SVG-only image rule). The turn is primed to emit exactly one SVG artwork; the
// existing artifact extractor picks it up and we AUTO-SAVE it next to the user (imagine-*.svg),
// ready to open in any browser. Pure pieces are unit-tested in scripts/test-imagine.ts.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractArtifacts } from "./artifacts.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

export function isImagineSlash(cmd: string): boolean {
  return /^\/imagine(\s|$)/i.test(cmd.trim());
}

/** The prompt after `/imagine ` — undefined when bare (caller prints usage). */
export function imagineTask(raw: string): string | undefined {
  const rest = raw.trim().replace(/^\/imagine\s*/i, "").trim();
  return rest.length ? rest : undefined;
}

/** Prepended (after translation) to an /imagine turn — forces exactly one standalone SVG artwork. */
export const IMAGINE_PRIMER =
  "IMAGE MODE: you are ORIRO's image engine. Create ONE complete, self-contained SVG artwork for " +
  "the request below. Reply with ONLY a single fenced ```svg code block containing valid standalone " +
  "SVG — root <svg> with xmlns and a viewBox, generous use of shapes/paths/gradients, NO external " +
  "images, fonts, scripts or links. No prose before or after the block.";

/** Collision-safe destination: imagine-MMDD-HHMMSS.svg (then -2, -3 … if taken). */
export function imagineDest(now: Date, cwd: string = process.cwd()): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, "0");
  const base = `imagine-${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  let dest = join(cwd, `${base}.svg`);
  for (let i = 2; existsSync(dest); i++) dest = join(cwd, `${base}-${i}.svg`);
  return dest;
}

/**
 * Post-turn handler: find the SVG in the reply, auto-save it, return the report lines.
 * No SVG in the reply → honest guidance (weak router turn — retry is free).
 */
export function imagineResultLines(finalText: string, now: Date = new Date(), cwd?: string): string[] {
  const svg = extractArtifacts(finalText).find((a) => a.kind === "svg");
  if (!svg) {
    return [dim("  ⌀ no SVG came back this turn — /imagine again (free), or rephrase the scene.")];
  }
  const dest = imagineDest(now, cwd);
  try {
    writeFileSync(dest, svg.content, "utf8");
  } catch (e) {
    return [dim(`  ✗ could not save the image: ${e instanceof Error ? e.message : String(e)} — /save it via /review instead`)];
  }
  return [
    `  ${fgHex(PALETTE.success, "✓ imagined")} → ${accent(dest)} ${dim(`(${svg.content.length} bytes — open it in any browser)`)}`,
  ];
}
