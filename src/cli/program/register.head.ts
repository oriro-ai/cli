// ORIRO CLI — `oriro head` (Step 3, ORIRO Head 🧭). The web-sighted inspector: it goes
// OUT to live sites, SEES their structure (+ optional full-page screenshots), UNDERSTANDS
// sections / gaps / metrics, and REPORTS BACK in two forms — a structured report the coder
// reads, and a visual HTML for you. Aliases: /inspect, /orirohead.
//
// The pure core (compare + gap + wireframe) is zero-dep, $0, no browser. `--shots` adds
// full-page screenshots via the optional Playwright peer; `--code` reverse-engineers a
// page into working code via an injected model (lights up when a coder model is wired).
import type { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { formatDocsLink } from "../../../packages/terminal-core/src/links.js";
import { theme } from "../../../packages/terminal-core/src/theme.js";

export function registerHeadCommand(program: Command): void {
  program
    .command("head")
    .aliases(["inspect", "orirohead"])
    .description("Inspect live sites — structure, gaps vs competitors, screenshots, or reverse to code")
    .argument("<urls...>", "Target URL first, then optional competitor URLs to compare against")
    .option("--shots", "Also capture full-page screenshots (needs Playwright + Chromium)", false)
    .option("--code", "Reverse-engineer the target page into working code (uses your configured model)", false)
    .option("--stack <stack>", "Target stack for --code (e.g. 'React + Tailwind')")
    .option("--out <file>", "Write the visual HTML report to this path")
    .option("--json", "Print the structured ComparisonReport as JSON", false)
    .addHelpText(
      "after",
      () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/head", "docs.oriro.ai/cli/head")}\n`,
    )
    .action(async (urls: string[], opts: { shots?: boolean; code?: boolean; stack?: string; out?: string; json?: boolean }) => {
      const head = await import("../../head/index.js");
      const target = urls[0];
      const competitors = urls.slice(1);

      // ── url → working code (the headline flow): capture the page in Chromium and
      //    reverse-engineer it with the CLI's configured model (BYOK now / Gauss later). ──
      if (opts.code) {
        try {
          const { urlToCode } = await import("../../head/video-to-code.js");
          const { headModelsFromConfig } = await import("../../head/model.js");
          const { loadConfig } = await import("../../config/io.js");
          process.stdout.write(`\n  🧭 ORIRO Head — capturing ${target} and reverse-engineering to code…\n`);
          const out = await urlToCode(target, headModelsFromConfig(loadConfig()), { stack: opts.stack });
          const codePath = (opts.out || join(homedir(), ".oriro", "head", `code-${Date.now()}`)).replace(/\.html$/, "") + ".txt";
          mkdirSync(join(homedir(), ".oriro", "head"), { recursive: true });
          writeFileSync(codePath, out.code, "utf8");
          process.stdout.write(`\n${out.code}\n\n  Code → ${codePath}\n\n`);
        } catch (err) {
          process.stderr.write(
            `  url→code needs Playwright + a model: ${theme.accent("npm i -D playwright && npx playwright install chromium")}, then connect a model (oriro onboard).\n  (${(err as Error).message})\n`,
          );
        }
        return;
      }
      process.stdout.write(`\n  🧭 ORIRO Head — inspecting ${target}${competitors.length ? ` vs ${competitors.length} competitor(s)` : ""}…\n`);

      const report = await head.comparePages({
        targetUrl: target,
        competitorUrls: competitors.length ? competitors : [target],
      });

      if (opts.json) {
        process.stdout.write(JSON.stringify(report, null, 2) + "\n");
      } else {
        process.stdout.write(`\n  ${report.summary}\n`);
        if (report.missing?.length) {
          process.stdout.write(`\n  Missing on ${target}:\n`);
          for (const g of report.missing.slice(0, 10)) process.stdout.write(`   • ${g.label} (${g.priority}) — ${g.recommendation}\n`);
        }
        if (report.actionItems?.length) {
          process.stdout.write(`\n  Action items:\n`);
          for (const a of report.actionItems.slice(0, 10)) process.stdout.write(`   → ${a.title} [${a.priority}/${a.effort}] — ${a.rationale}\n`);
        }
      }

      // Visual HTML for the human (wireframe of what the head saw).
      const outPath = opts.out || join(homedir(), ".oriro", "head", `report-${report.target?.title ? report.target.title.replace(/\W+/g, "-").slice(0, 24) : "inspect"}.html`);
      try {
        mkdirSync(join(homedir(), ".oriro", "head"), { recursive: true });
        writeFileSync(outPath, head.buildInspectionHtml(report), "utf8");
        process.stdout.write(`\n  Visual report → ${outPath}\n`);
      } catch (err) {
        process.stderr.write(`  (could not write HTML report: ${(err as Error).message})\n`);
      }

      // Optional screenshots via the Playwright peer (separate subpath so the core stays light).
      if (opts.shots) {
        try {
          const shots = await import("../../head/screenshot-flow.js");
          process.stdout.write(`  Capturing screenshots (Chromium)…\n`);
          const caps = await shots.captureScreens([target, ...competitors]);
          const flow = shots.buildScreenshotFlowHtml([{ name: "Inspection", captures: caps }]);
          const flowPath = outPath.replace(/\.html$/, "") + ".shots.html";
          writeFileSync(flowPath, flow, "utf8");
          process.stdout.write(`  Screenshot flow → ${flowPath}\n`);
        } catch (err) {
          process.stderr.write(
            `  Screenshots need Playwright: run ${theme.accent("npm i -D playwright && npx playwright install chromium")}.\n  (${(err as Error).message})\n`,
          );
        }
      }
      process.stdout.write("\n");
    });
}
