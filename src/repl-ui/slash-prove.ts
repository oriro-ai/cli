// V0.4.0 — `/prove [n | url] [--video]`: browser-proof verification (the Antigravity gap, keyless).
// Renders an artifact from the last reply (html/svg) — or any URL, e.g. the app the agent just
// started — in REAL Chromium via the Head capture engine, and saves EVIDENCE next to the user:
// a full-page proof-*.png screenshot, plus a proof-*.webm scroll-through clip with --video.
// The claim "it works" becomes a file you can open. Needs the optional `playwright` peer (same as
// Head screenshots); degrades to a clear install hint without it. Pure parts unit-tested.
import { writeFileSync, copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getArtifacts, type Artifact } from "./artifacts.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

export function isProveSlash(cmd: string): boolean {
  return /^\/prove(\s|$)/i.test(cmd.trim());
}

export interface ProveCmd {
  target: string; // "1"-based artifact index (default "1") or an http(s):// / file:// URL
  video: boolean;
}

export function parseProveSlash(line: string): ProveCmd | undefined {
  const m = /^\/prove(?:\s+(\S[\s\S]*))?$/i.exec(line.trim());
  if (!m) return undefined;
  let rest = (m[1] ?? "").trim();
  const video = /(^|\s)--video(\s|$)/i.test(rest);
  rest = rest.replace(/(^|\s)--video(?=\s|$)/gi, " ").replace(/\s+/g, " ").trim();
  return { target: rest || "1", video };
}

/** Only html/svg artifacts can be browser-proven; code artifacts get an honest redirect. */
export function renderableArtifact(a: Artifact | undefined): boolean {
  return !!a && (a.kind === "svg" || /^html?$/i.test(a.lang));
}

/** Collision-safe evidence path: proof-MMDD-HHMMSS.<ext> (then -2, -3 …). */
export function proveDest(now: Date, ext: string, cwd: string = process.cwd()): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, "0");
  const base = `proof-${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  let dest = join(cwd, `${base}.${ext}`);
  for (let i = 2; existsSync(dest); i++) dest = join(cwd, `${base}-${i}.${ext}`);
  return dest;
}

/** Run the proof. Returns REPL lines; never throws. */
export async function handleProve(raw: string, now: Date = new Date(), cwd: string = process.cwd()): Promise<string[]> {
  const cmd = parseProveSlash(raw);
  if (!cmd) return [dim("  usage: /prove [n | url] [--video]")];

  // Resolve the target to a URL Chromium can visit.
  let url: string;
  if (/^https?:\/\//i.test(cmd.target) || cmd.target.toLowerCase().startsWith("file://")) {
    url = cmd.target;
  } else if (/^\d+$/.test(cmd.target)) {
    const arts = getArtifacts();
    const a = arts[Number(cmd.target) - 1];
    if (!a) return [dim(`  no artifact ${cmd.target} in the last reply — /review to list them, or /prove <url>`)];
    if (!renderableArtifact(a)) {
      return [dim(`  artifact ${cmd.target} is ${a.lang || a.kind} — /prove renders html/svg artifacts (or pass a URL, e.g. your running app)`)];
    }
    const tmp = join(tmpdir(), `oriro-prove-${now.getTime()}.${a.kind === "svg" ? "svg" : "html"}`);
    try {
      writeFileSync(tmp, a.content, "utf8");
    } catch (e) {
      return [dim(`  ✗ could not stage the artifact: ${e instanceof Error ? e.message : String(e)}`)];
    }
    url = pathToFileURL(tmp).href;
  } else {
    return [dim("  usage: /prove [n | url] [--video] — n from /review, or an http(s):// URL")];
  }

  let captures;
  try {
    const { captureScreens } = await import("../head/screenshot-flow.js");
    captures = await captureScreens([url], { video: cmd.video });
  } catch {
    return [
      dim("  ✗ browser proof needs the playwright peer (free, on-device):"),
      `    ${accent("npm i playwright && npx playwright install chromium")}`,
    ];
  }

  const c = captures[0];
  if (!c?.ok || !c.png) {
    return [`  ${fgHex(PALETTE.error, "✗ proof failed")} ${dim(`— did not render: ${c?.note || "no capture"}`)}`];
  }

  const lines: string[] = [];
  const pngDest = proveDest(now, "png", cwd);
  try {
    writeFileSync(pngDest, c.png);
  } catch (e) {
    return [dim(`  ✗ rendered, but could not save the evidence: ${e instanceof Error ? e.message : String(e)}`)];
  }
  lines.push(
    `  ${fgHex(PALETTE.success, "✓ browser-proof")} ${dim(`rendered${c.title ? ` “${c.title}”` : ""}${c.status ? ` · HTTP ${c.status}` : ""}`)} → ${accent(pngDest)}`,
  );
  if (cmd.video && c.videoPath) {
    const webmDest = proveDest(now, "webm", cwd);
    try {
      copyFileSync(c.videoPath, webmDest);
      lines.push(`  ${dim("🎞 scroll-through clip →")} ${accent(webmDest)}`);
    } catch { lines.push(dim(`  🎞 clip recorded at ${c.videoPath} (could not copy here)`)); }
  }
  return lines;
}
