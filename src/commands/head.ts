// `oriro head` — ORIRO Head on the command line. Go OUT to a live site and SEE it, then either
// report its structure (default, pure fetch, $0, no browser) or reverse-engineer it into clean
// code / a YAML spec / screenshots (needs the `playwright` peer + the keyless coder).
//
//   oriro head <url> [competitor ...]        structural read + gap analysis
//   oriro head <url> --html                  also write the visual HTML report
//   oriro head <url> --code                  reverse-engineer clean, runnable code
//   oriro head <url> --spec                  reverse-engineer a YAML build spec
//   oriro head <url> [url ...] --shots        full-page screenshots → one visual flow HTML
//   oriro head --video <path>                 rebuild a UI from a screen recording (experimental)
import type { Command } from "commander";
import { info, heading, ok, die } from "./ui.js";
import { dim, accent } from "../ui/theme.js";
import { runInspect, runUrlToCode, runUrlToSpec, runCapture, runVideoToCode, parseHeadTargets } from "../head/run.js";

interface HeadOpts {
  code?: boolean;
  spec?: boolean;
  shots?: boolean;
  html?: boolean;
  video?: string;
  goal?: string;
  stack?: string;
  out?: string;
}

function usage(): void {
  heading("ORIRO Head 🧭");
  info("Go out to a live site and SEE it — structure, gaps, or a full rebuild. Keyless, on-device.");
  process.stdout.write(
    `\n  ${accent("oriro head <url> [competitor ...]")}   ${dim("structural read + gap analysis (no browser)")}\n` +
    `  ${accent("oriro head <url> --html")}              ${dim("also write the visual HTML report")}\n` +
    `  ${accent("oriro head <url> --code")}              ${dim("reverse-engineer clean, runnable code")}\n` +
    `  ${accent("oriro head <url> --spec")}              ${dim("reverse-engineer a YAML build spec")}\n` +
    `  ${accent("oriro head <url> [url ...] --shots")}   ${dim("full-page screenshots → visual flow HTML")}\n` +
    `  ${accent("oriro head --video <path>")}            ${dim("rebuild a UI from a screen recording (experimental)")}\n\n` +
    `  ${dim("--goal <text>  --stack <text>  --out <dir>")}\n` +
    `  ${dim("code/spec/shots need Chromium once: npm i playwright && npx playwright install chromium")}\n`,
  );
}

export function registerHeadCommand(program: Command): void {
  program
    .command("head")
    .description("go out to a live site and SEE it — structure, code, spec, or screenshots")
    .argument("[url]", "the target URL (or omit when using --video)")
    .argument("[competitors...]", "optional competitor/reference URLs")
    .option("--code", "reverse-engineer the page into clean, runnable code")
    .option("--spec", "reverse-engineer the page into a YAML build spec")
    .option("--shots", "capture full-page screenshots into one visual flow HTML")
    .option("--html", "also write the visual HTML report (structural read)")
    .option("--video <path>", "rebuild a UI from a screen recording (experimental)")
    .option("--goal <text>", "natural-language goal for the rebuild")
    .option("--stack <text>", "target stack for generated code")
    .option("--out <dir>", "directory to write artifacts into (default: current dir)")
    .action(async (url: string | undefined, competitors: string[], opts: HeadOpts) => {
      const outDir = opts.out;

      if (opts.video) {
        heading("ORIRO Head · video→code");
        const res = await runVideoToCode(opts.video, { goal: opts.goal, stack: opts.stack, outDir });
        process.stdout.write(`${res.summary}\n`);
        for (const f of res.files) ok(`wrote ${f}`);
        return;
      }

      if (!url) { usage(); return; } // no target → help, clean exit 0 (smoke-safe)

      // A bare URL/domain is used as-is; a natural-language request ("compare stripe.com vs
      // linear.com") is parsed with the same agentic intent matcher the chat agent uses.
      const looksLikeUrl = /^https?:\/\//i.test(url) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)+/i.test(url);
      let target = url;
      let refs = competitors;
      if (!looksLikeUrl) {
        const parsed = parseHeadTargets([url, ...competitors].join(" "));
        if (!parsed.target) { usage(); return; }
        target = parsed.target;
        refs = parsed.competitors;
      }

      heading("ORIRO Head 🧭");
      try {
        let res;
        if (opts.code) res = await runUrlToCode(target, { goal: opts.goal, stack: opts.stack, outDir });
        else if (opts.spec) res = await runUrlToSpec(target, { goal: opts.goal, outDir });
        else if (opts.shots) res = await runCapture([target, ...refs], { outDir });
        else res = await runInspect(target, refs, { html: opts.html, outDir });
        process.stdout.write(`${res.summary}\n`);
        for (const f of res.files) ok(`wrote ${f}`);
      } catch (e) {
        die(`head failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
}
