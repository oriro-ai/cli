// ORIRO Head — the Pi-native TOOL binding (replaces the OpenClaw-coupled extension.ts).
// Registers `inspect_site` via Pi's pi.registerTool so the agent can, on its own judgment,
// go out to a live site, SEE its structure/sections/gaps, and report back. The structural
// engine (comparePages) is pure fetch — no model, $0, nothing leaves the machine.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { comparePages, type ComparisonReport } from "./comparison-engine.js";

/** Compact, coder-facing summary of what the Head saw. */
function summarizeForCoder(report: ComparisonReport): string {
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

const InspectSiteParams = Type.Object({
  url: Type.String({ description: "The target website URL to inspect or rebuild from." }),
  competitors: Type.Optional(
    Type.Array(Type.String(), { description: "Optional competitor/reference URLs to compare the target against." }),
  ),
});

/**
 * Register the ORIRO Head `inspect_site` tool on Pi. Use as a DefaultResourceLoader factory:
 * `new DefaultResourceLoader({ extensionFactories: [registerHead] })`.
 */
export function registerHead(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "inspect_site",
    label: "ORIRO Head",
    description:
      "Go out to a live website and SEE it: its sections, CTAs, structure, and any gaps versus " +
      "competitor URLs. Returns a structured report to build from. Call this whenever the user " +
      "wants to look at, compare against, or rebuild a website/page.",
    parameters: InspectSiteParams,
    async execute(_toolCallId, params) {
      const target = params.url;
      const competitors = params.competitors?.length ? params.competitors : [target];
      const report = await comparePages({ targetUrl: target, competitorUrls: competitors });
      return { content: [{ type: "text", text: summarizeForCoder(report) }], details: report };
    },
  });
}
