// @oriro/head — ORIRO Head 🧭. The web-sighted head for a terminal coder: it goes OUT
// to live sites, SEES them (structure now; full-page screenshots via the ./screenshot
// subpath), UNDERSTANDS them (sections / gaps / metrics), and REPORTS BACK in two
// synchronized forms — a structured report for the AI and a visual HTML for the human.
//
// THIS ENTRY (`@oriro/head`) is PURE — no browser, no deps, $0 — safe in any runtime
// (Node CLI, browser, worker): comparison engine + visual-HTML generator + the agentic
// intent matcher. The SCREENSHOT capability needs Chromium and lives on a separate
// subpath so this entry never pulls Playwright:
//
//   import { comparePages, buildInspectionHtml, detectInspectIntent, inspect } from '@oriro/head';
//   import { captureScreens, buildScreenshotFlowHtml } from '@oriro/head/screenshot'; // needs playwright peer
//
// ── INVOCATION (how the user triggers the head) ──────────────────────────────
//   1. AGENTIC (primary): the orchestrator runs detectInspectIntent(userText) every
//      turn; when isInspect, call inspect()/comparePages with the extracted URLs. The
//      user just talks ("go look at stripe.com", "what does X have that we don't",
//      "build a pricing page like linear's"). Composes with voice (speak in any of the
//      99 languages → translated to English → same intent).
//   2. SLASH (explicit): `/head <url> [<url>…] [--shots]` (aliases /inspect /orirohead)
//      → call the head directly with those URLs. Thin wrapper over the same functions.
//
// CARDINAL: server-side fetch + (peer) Chromium render only — free/open/on-device, $0,
// no key, no model. Nothing leaves the machine.

export * from './comparison-engine.js';
export * from './inspection-html.js';
export * from './intent.js';

import { comparePages, type ComparisonReport } from './comparison-engine.js';
import { detectInspectIntent } from './intent.js';

export interface InspectResult {
  /** Whether the text was an inspect request (false → caller should ignore). */
  triggered: boolean;
  /** The structured report (for the AI) — present when triggered with a resolvable target. */
  report: ComparisonReport | null;
}

/**
 * High-level agentic entry: given a user's message (and the caller's own origin for the
 * "us/our" case), decide if it's an inspect request and, if so, run the structural head.
 * Screenshots are intentionally NOT run here (no Chromium dependency in this entry) —
 * the caller adds them via `@oriro/head/screenshot` when a real browser is available.
 */
export async function inspect(userText: string, selfOrigin?: string): Promise<InspectResult> {
  const intent = detectInspectIntent(userText);
  if (!intent.isInspect) return { triggered: false, report: null };

  const target = intent.targetIsSelf ? selfOrigin : intent.target;
  if (!target) return { triggered: true, report: null }; // intent matched but no resolvable target
  const competitors = intent.competitors.length ? intent.competitors : [];
  if (competitors.length === 0) {
    // single-site inspect: report the one page's structure (target vs itself is meaningless,
    // so the caller can comparePages with [target] and read report.target).
    const report = await comparePages({ targetUrl: target, competitorUrls: [target] });
    return { triggered: true, report };
  }
  const report = await comparePages({ targetUrl: target, competitorUrls: competitors });
  return { triggered: true, report };
}
