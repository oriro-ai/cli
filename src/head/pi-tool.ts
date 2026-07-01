// ORIRO Head — the Pi-native TOOL bindings (replaces the OpenClaw-coupled extension.ts).
// Registers the Head tools via Pi's pi.registerTool so the agent can, on its own judgment,
// go out to a live site, SEE it, and either report its structure or reverse-engineer it into
// clean code / a build spec. The structural engine is pure fetch ($0, no browser, no model);
// the code/spec/screenshot flows use the `playwright` peer for capture + the keyless coder.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { comparePages } from "./comparison-engine.js";
import { runInspect, runUrlToCode, runUrlToSpec, runCapture, runVideoToCode, summarizeReport } from "./run.js";

const InspectSiteParams = Type.Object({
  url: Type.String({ description: "The target website URL to inspect or rebuild from." }),
  competitors: Type.Optional(
    Type.Array(Type.String(), { description: "Optional competitor/reference URLs to compare the target against." }),
  ),
});

const UrlParam = Type.Object({
  url: Type.String({ description: "The website URL to capture and rebuild." }),
  goal: Type.Optional(Type.String({ description: "Optional natural-language goal, e.g. 'rebuild the pricing page'." })),
  stack: Type.Optional(Type.String({ description: "Target stack for the generated code. Default: one self-contained HTML file." })),
});

const CaptureParams = Type.Object({
  urls: Type.Array(Type.String(), { description: "One or more URLs to screenshot in a real browser." }),
});

const VideoParams = Type.Object({
  videoPath: Type.String({ description: "Path to a screen-recording video to rebuild the UI from." }),
  goal: Type.Optional(Type.String()),
  stack: Type.Optional(Type.String()),
});

/**
 * Register all ORIRO Head tools on Pi. Use as a DefaultResourceLoader factory:
 * `new DefaultResourceLoader({ extensionFactories: [registerHead] })`.
 */
export function registerHead(pi: ExtensionAPI): void {
  // 1. STRUCTURAL read — pure fetch, $0, no browser. The agent's default web-sight.
  pi.registerTool({
    name: "inspect_site",
    label: "ORIRO Head",
    description:
      "Go out to a live website and SEE it: its sections, CTAs, structure, and any gaps versus " +
      "competitor URLs. Returns a structured report to build from. Call this whenever the user " +
      "wants to look at, compare against, or rebuild a website/page.",
    parameters: InspectSiteParams,
    async execute(_toolCallId, params) {
      const competitors = params.competitors?.length ? params.competitors : [params.url];
      const report = await comparePages({ targetUrl: params.url, competitorUrls: competitors });
      return { content: [{ type: "text", text: summarizeReport(report) }], details: report };
    },
  });

  // 2. URL → CLEAN CODE — capture the live page (Chromium peer) + reverse-engineer runnable code.
  pi.registerTool({
    name: "url_to_code",
    label: "ORIRO Head · url→code",
    description:
      "Go to a URL, capture the live rendered page in a real browser, and REVERSE-ENGINEER it into " +
      "clean, runnable code. Use when the user wants to rebuild/clone a page. Writes the code to a file " +
      "in the working directory. Needs the `playwright` peer for the browser capture.",
    parameters: UrlParam,
    async execute(_toolCallId, params) {
      const out = await runUrlToCode(params.url, { goal: params.goal, stack: params.stack });
      return { content: [{ type: "text", text: out.summary }], details: { files: out.files } };
    },
  });

  // 3. URL → YAML SPEC — a stack-agnostic, build-ready specification another engineer can build from.
  pi.registerTool({
    name: "url_to_spec",
    label: "ORIRO Head · url→spec",
    description:
      "Go to a URL, capture it, and reverse-engineer a precise, stack-agnostic YAML BUILD SPEC (design " +
      "tokens, layout, component tree, data model, interactions). Use when the user wants a spec to rebuild " +
      "from rather than a one-shot code dump. Needs the `playwright` peer.",
    parameters: UrlParam,
    async execute(_toolCallId, params) {
      const out = await runUrlToSpec(params.url, { goal: params.goal });
      return { content: [{ type: "text", text: out.summary }], details: { files: out.files } };
    },
  });

  // 4. SCREENSHOTS — full-page shots of each URL assembled into one visual flow HTML.
  pi.registerTool({
    name: "capture_site",
    label: "ORIRO Head · screenshots",
    description:
      "Visit each URL in a real browser and capture full-page screenshots, assembled into one visual flow " +
      "HTML file. Use when the user wants to SEE pages, not just their structure. Needs the `playwright` peer.",
    parameters: CaptureParams,
    async execute(_toolCallId, params) {
      const out = await runCapture(params.urls);
      return { content: [{ type: "text", text: out.summary }], details: { files: out.files } };
    },
  });

  // 5. VIDEO → CODE (experimental) — watch a screen recording and build the UI from it.
  pi.registerTool({
    name: "video_to_code",
    label: "ORIRO Head · video→code",
    description:
      "Watch a screen-recording video of a UI and build working code from it. Experimental on the free " +
      "floor (best results with a vision-capable router). Use when the user drops a recording to rebuild.",
    parameters: VideoParams,
    async execute(_toolCallId, params) {
      const out = await runVideoToCode(params.videoPath, { goal: params.goal, stack: params.stack });
      return { content: [{ type: "text", text: out.summary }], details: { files: out.files } };
    },
  });
}
