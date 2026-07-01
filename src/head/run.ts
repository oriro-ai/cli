// @oriro/head/run — the shared ORCHESTRATOR that turns the Head's capabilities into
// artifacts on disk. Used by BOTH invocation surfaces so the logic lives once:
//   • the agent TOOLS (src/head/pi-tool.ts) — the model calls these on its own judgment
//   • the `oriro head` CLI command (src/commands/head.ts) — the explicit user path
//
// Every op is keyless ($0) and local. The structural read (comparePages) is pure fetch.
// url→code / url→spec / screenshots need the `playwright` peer for the browser capture and
// the free-router coder (headModels) for the reverse-engineering — no paid key. video→code
// is experimental on the free floor (needs a vision-capable router for true results).
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { comparePages, type ComparisonReport } from "./comparison-engine.js";
import { buildInspectionHtml } from "./inspection-html.js";
import { urlToCode, urlToSpec, videoToCode, extractFrames, detectMediaType } from "./video-to-code.js";
import { headModels, headVideoModels } from "./model.js";
import { detectInspectIntent, extractUrls } from "./intent.js";

export interface HeadOutcome {
  /** Coder/agent-facing text summary of what the Head did. */
  summary: string;
  /** Absolute paths of any artifacts written (HTML report, code, spec, flow). */
  files: string[];
  /** The structured report, when this op produced one. */
  report?: ComparisonReport;
}

function hostSlug(url: string): string {
  try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).host.replace(/^www\./, "").replace(/[^a-z0-9.-]/gi, "_"); }
  catch { return "site"; }
}

function extForStack(stack?: string): string {
  const s = (stack ?? "").toLowerCase();
  if (/\btsx?\b|react|next/.test(s)) return s.includes("ts") ? ".tsx" : ".jsx";
  if (/\bvue\b/.test(s)) return ".vue";
  if (/\bsvelte\b/.test(s)) return ".svelte";
  return ".html";
}

/** Compact, coder-facing summary of a comparison report. */
export function summarizeReport(report: ComparisonReport): string {
  const lines: string[] = [report.summary];
  const page = (p: ComparisonReport["target"]): string =>
    `  • ${p.url} — ${p.ok ? `${p.sections.length} sections: ${p.sections.map((s) => s.type).join(", ")}` : `not readable (${p.note})`}`;
  lines.push("Pages seen:");
  lines.push(page(report.target));
  for (const c of report.competitors) if (c.url !== report.target.url) lines.push(page(c));
  if (report.missing.length) {
    lines.push("Missing on the target (gaps to build):");
    for (const g of report.missing.slice(0, 12)) lines.push(`  • ${g.label} (${g.priority}) — ${g.recommendation}`);
  }
  if (report.actionItems.length) {
    lines.push("Suggested action items:");
    for (const a of report.actionItems.slice(0, 12)) lines.push(`  → ${a.title} [${a.priority}/${a.effort}] — ${a.rationale}`);
  }
  return lines.join("\n");
}

export interface InspectOpts {
  /** When true, also write the visual HTML report next to the summary. */
  html?: boolean;
  /** Directory to write artifacts into. Default: cwd. */
  outDir?: string;
}

/** STRUCTURAL read: fetch target (+ competitors), detect sections, analyze gaps, report. */
export async function runInspect(target: string, competitors: string[], opts: InspectOpts = {}): Promise<HeadOutcome> {
  const report = await comparePages({ targetUrl: target, competitorUrls: competitors.length ? competitors : [target] });
  const files: string[] = [];
  if (opts.html) {
    const path = join(opts.outDir ?? process.cwd(), `oriro-head-${hostSlug(target)}-inspect.html`);
    await writeFile(path, buildInspectionHtml(report), "utf8");
    files.push(path);
  }
  return { summary: summarizeReport(report), files, report };
}

/** Parse a free-text head request ("look at stripe.com vs us") into target + competitors. */
export function parseHeadTargets(text: string, selfOrigin?: string): { target: string | null; competitors: string[] } {
  const intent = detectInspectIntent(text);
  if (intent.targetIsSelf) return { target: selfOrigin ?? null, competitors: intent.competitors };
  if (intent.target) return { target: intent.target, competitors: intent.competitors };
  const urls = extractUrls(text);
  return { target: urls[0] ?? null, competitors: urls.slice(1) };
}

export interface BuildOpts {
  goal?: string;
  stack?: string;
  outDir?: string;
}

/** URL → CLEAN CODE: capture the live page (Playwright peer) → reverse-engineer runnable code. */
export async function runUrlToCode(url: string, opts: BuildOpts = {}): Promise<HeadOutcome> {
  try {
    const res = await urlToCode(url, headModels(), { goal: opts.goal, stack: opts.stack });
    const codePath = join(opts.outDir ?? process.cwd(), `oriro-head-${hostSlug(url)}${extForStack(opts.stack)}`);
    await writeFile(codePath, res.code, "utf8");
    return { summary: `Reverse-engineered ${url} into clean code (${res.code.length} chars) → ${codePath}`, files: [codePath] };
  } catch (e) {
    return { summary: headCaptureError("url→code", e), files: [] };
  }
}

/** URL → YAML SPEC: capture the live page → a stack-agnostic, build-ready YAML spec. */
export async function runUrlToSpec(url: string, opts: BuildOpts = {}): Promise<HeadOutcome> {
  try {
    const res = await urlToSpec(url, headModels(), { goal: opts.goal });
    const specPath = join(opts.outDir ?? process.cwd(), `oriro-head-${hostSlug(url)}.spec.yaml`);
    await writeFile(specPath, res.spec, "utf8");
    return { summary: `Reverse-engineered ${url} into a YAML build spec → ${specPath}`, files: [specPath] };
  } catch (e) {
    return { summary: headCaptureError("url→spec", e), files: [] };
  }
}

export interface CaptureOpts {
  /** Also record a scroll-through .webm per page (opt-in). */
  video?: boolean;
  outDir?: string;
}

/** SCREENSHOTS: visit each URL in a real browser → one visual flow HTML of full-page shots. */
export async function runCapture(urls: string[], opts: CaptureOpts = {}): Promise<HeadOutcome> {
  try {
    const { captureScreens, buildScreenshotFlowHtml } = await import("./screenshot-flow.js");
    const caps = await captureScreens(urls, { video: opts.video });
    const html = buildScreenshotFlowHtml([{ name: "Captured screens", captures: caps }]);
    const flowPath = join(opts.outDir ?? process.cwd(), "oriro-head-flow.html");
    await writeFile(flowPath, html, "utf8");
    const ok = caps.filter((c) => c.ok).length;
    return { summary: `Captured ${ok}/${caps.length} full-page screenshots → ${flowPath}`, files: [flowPath] };
  } catch (e) {
    return { summary: headCaptureError("screenshots", e), files: [] };
  }
}

/** VIDEO → CODE (experimental): watch a screen recording → build the UI. Best with a vision router. */
export async function runVideoToCode(videoPath: string, opts: BuildOpts = {}): Promise<HeadOutcome> {
  try {
    const mime = detectMediaType(videoPath).mimeType;
    // Prefer sending the video directly; if a frame-sampler (ffmpeg) is present, it can back an
    // image-only vision model instead. Either way the pipeline + prompts are the owned IP.
    let frames: Uint8Array[] | undefined;
    try { frames = await extractFrames(videoPath, { count: 8 }); } catch { frames = undefined; }
    const res = await videoToCode(
      { videoPath, frames, mimeType: mime, goal: opts.goal, stack: opts.stack },
      headVideoModels(),
    );
    const codePath = join(opts.outDir ?? process.cwd(), `oriro-head-video${extForStack(opts.stack)}`);
    await writeFile(codePath, res.code, "utf8");
    return { summary: `Watched ${videoPath} → built code (${res.code.length} chars) → ${codePath}\n(experimental on the free floor — add a vision-capable router for pixel-faithful results.)`, files: [codePath] };
  } catch (e) {
    return { summary: `video→code failed: ${e instanceof Error ? e.message : String(e)}. This flow needs a readable video and gives best results with a vision-capable router.`, files: [] };
  }
}

function headCaptureError(op: string, e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/playwright/i.test(msg)) {
    return `${op} needs the Chromium browser. Install it once:\n  npm i playwright && npx playwright install chromium\nThen retry. (The structural read \`oriro head <url>\` needs no browser.)`;
  }
  return `${op} failed: ${msg}`;
}
