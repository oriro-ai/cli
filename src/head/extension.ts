// ORIRO CLI — ORIRO Head as a built-in agent TOOL (the robust fallback).
//
// The default-on agentic trigger (agentic.ts) is a fast regex path — convenient, but it
// can MISS an unusual phrasing. This registers the head as a tool the coder model can
// call on its OWN judgment ("the user wants me to look at this site — I'll call
// inspect_site"), so coverage never depends on the regex. Three layers total:
//   1. regex auto-trigger (zero-effort, fires on clear phrasing)        — agentic.ts
//   2. THIS tool          (model judgment, catches what the regex missed) — here
//   3. `oriro head <url>` command (deterministic, user-driven)          — register.head.ts
// All three call the same pure engine; any failure fails safe (never breaks the turn).

import type { ExtensionAPI } from "../agents/sessions/index.js";
import { Type } from "typebox";
import { textResult } from "../agents/tools/common.js";
import { comparePages, type ComparisonReport } from "./comparison-engine.js";

/** Compact, coder-facing summary of what the head saw. */
function summarizeForCoder(report: ComparisonReport): string {
  const lines: string[] = [report.summary];
  const page = (p: ComparisonReport["target"]) =>
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

const InspectSiteParams = Type.Object({
  url: Type.String({ description: "The target website URL to inspect or rebuild from." }),
  competitors: Type.Optional(
    Type.Array(Type.String(), {
      description: "Optional competitor/reference URLs to compare the target against.",
    }),
  ),
});

/** Built-in ExtensionFactory: registers the `inspect_site` tool (Head's model-driven door). */
export default function headExtension(api: ExtensionAPI): void {
  api.registerTool({
    name: "inspect_site",
    label: "ORIRO Head",
    description:
      "Go out to a live website and SEE it: its sections, CTAs, structure, and any gaps versus " +
      "competitor URLs. Returns a structured report to build from. Call this whenever the user " +
      "wants to look at, compare against, or rebuild a website/page.",
    promptSnippet: "inspect_site(url, competitors?) — visit a live site, report its structure + gaps.",
    parameters: InspectSiteParams,
    async execute(_toolCallId, params) {
      const target = params.url;
      const competitors = params.competitors?.length ? params.competitors : [target];
      const report = await comparePages({ targetUrl: target, competitorUrls: competitors });
      return textResult(summarizeForCoder(report), report);
    },
  });
}
