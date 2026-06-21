// @oriro/head/video-to-code — turn a SCREEN RECORDING into WORKING CODE.
//
// The head already records each visit (screenshot-flow.ts, { video: true }); this is the
// other half: WATCH a recording (the head's own clip, or a user-dropped demo) and BUILD
// the UI from it. Pipeline (the owned IP):
//
//   (video | frames) → VISION model WATCHES → structured UI spec → CODER model BUILDS → code
//
// MODELS ARE INJECTED by the host. The package bundles NO model and makes NO network
// call — it owns the PIPELINE + the PROMPTS. The host wires ORIRO's own models:
//   • watch  → a multimodal model (the free Gemini bridge accepts video directly, or an
//              on-device VLM fed extracted frames),
//   • code   → the coder (Gauss).
// This keeps it $0 / on-device / cardinal-clean and model-agnostic (swap the model, keep
// the pipeline). Pure orchestrator (no deps); the optional frame extractor is Node-only.

import { detectMediaType } from './media.js';
export { detectMediaType, isVideo } from './media.js';
export type { MediaType, MediaKind } from './media.js';

export interface MediaInput {
  /** Path to a screen-recording video (any container: webm/mp4/mov/mkv/avi/…). */
  videoPath?: string;
  /** OR sampled frames (PNG/JPEG bytes) when the vision model takes images, not video. */
  frames?: Uint8Array[];
  /** Media MIME (e.g. video/webm). Auto-detected from videoPath when omitted. */
  mimeType?: string;
  /** Optional natural-language goal, e.g. "rebuild this landing page". */
  goal?: string;
  /** Target stack for the generated code. Default: one self-contained HTML file. */
  stack?: string;
}

/** Host-injected multimodal model: WATCH the recording/frames + prompt → a UI spec (text). */
export type WatchModel = (media: { videoPath?: string; frames?: Uint8Array[]; mimeType?: string; prompt: string }) => Promise<string>;

/** Host-injected coder model: a build prompt → working code (text). */
export type CoderModel = (prompt: string) => Promise<string>;

export interface VideoToCodeModels {
  watch: WatchModel;
  code: CoderModel;
}

export interface VideoToCodeResult {
  /** The build-ready UI spec the vision model produced from the recording. */
  spec: string;
  /** The working code the coder produced from the spec. */
  code: string;
}

// ── The owned prompts (the IP) ───────────────────────────────────────────────

export const WATCH_PROMPT =
  `You are watching a screen recording of a web UI. Produce a precise, build-ready ` +
  `SPECIFICATION to reconstruct it exactly — another engineer must rebuild it from your ` +
  `spec alone. Cover, in order:\n` +
  `1. Overall layout & structure (header/nav, hero, content sections in order, footer).\n` +
  `2. Each section: its components, exact text/copy, and visual hierarchy.\n` +
  `3. Styling: colors (hex if discernible), typography (family/weight/scale), spacing, radius, shadows.\n` +
  `4. Behavior visible across the recording: hover/focus states, scroll reveals, modals, ` +
  `carousels, tabs, animations, transitions — note the trigger and the effect.\n` +
  `5. Responsive behavior if the recording shows resizing.\n` +
  `Be concrete and exhaustive. Output a structured spec, not prose.`;

export const CODE_PROMPT_PREFIX =
  `You are an expert front-end engineer. Build COMPLETE, working, production-quality code ` +
  `that reproduces the following UI specification EXACTLY — correct layout, components, ` +
  `copy, colors, typography, spacing, and the described interactions. No placeholders, no ` +
  `TODOs, no "...". Return ONLY the code.`;

export interface VideoToCodeOptions {
  /** Override the vision/spec prompt. */
  watchPrompt?: string;
  /** Override the coder prompt prefix. */
  codePromptPrefix?: string;
}

/**
 * Turn a screen recording into working code. Injects the host's vision + coder models;
 * the package owns the two-step pipeline and the prompts.
 */
export async function videoToCode(
  input: MediaInput,
  models: VideoToCodeModels,
  opts: VideoToCodeOptions = {},
): Promise<VideoToCodeResult> {
  if (!input.videoPath && !(input.frames && input.frames.length)) {
    throw new Error('videoToCode needs input.videoPath or input.frames.');
  }
  // 1. WATCH → spec (auto-detect the MIME so the model knows it's video + which format)
  const mimeType = input.mimeType ?? (input.videoPath ? detectMediaType(input.videoPath).mimeType : undefined);
  const watchPrompt = `${opts.watchPrompt ?? WATCH_PROMPT}${input.goal ? `\n\nUser goal: ${input.goal}` : ''}`;
  const spec = (await models.watch({ videoPath: input.videoPath, frames: input.frames, mimeType, prompt: watchPrompt })).trim();

  // 2. BUILD → code
  const stack = input.stack ?? 'a single self-contained HTML file with inline CSS + vanilla JS (no build step)';
  const codePrompt = `${opts.codePromptPrefix ?? CODE_PROMPT_PREFIX}\n\nTarget stack: ${stack}\n\n=== UI SPECIFICATION ===\n${spec}`;
  const code = (await models.code(codePrompt)).trim();

  return { spec, code };
}

// ── URL → CODE (the headline flow) ───────────────────────────────────────────
// "Go to this URL, check it out, capture it, and give me the HTML AND the code."
// Simpler + more reliable than video→code: the head already has the page's REAL rendered
// HTML, so the coder REVERSE-ENGINEERS clean code from the HTML (+ a screenshot for visual
// context), and we return BOTH the captured HTML and the generated code.

export const REVERSE_PROMPT =
  `You are an expert front-end engineer. Below is the captured RENDERED HTML of a live web ` +
  `page (optionally with a description of its appearance). REVERSE-ENGINEER it into CLEAN, ` +
  `complete, working, self-contained code that reproduces the page's structure, content, ` +
  `copy, layout and visual design. Strip tracking/ads/analytics/3rd-party cruft and dead ` +
  `markup; keep the meaningful sections, components, text and styling. No placeholders, no ` +
  `TODOs. Return ONLY the code.`;

const SCREENSHOT_DESC_PROMPT =
  `Describe this screenshot of a web page for faithful reconstruction: layout, sections, ` +
  `colors, typography, spacing and any notable components. Be concrete and brief.`;

export interface HtmlToCodeInput {
  /** The captured (rendered) HTML to reverse-engineer. */
  html: string;
  /** Optional screenshot bytes for extra visual fidelity (used only if models.watch given). */
  screenshot?: Uint8Array;
  goal?: string;
  /** Target stack. Default: a single clean self-contained HTML file. */
  stack?: string;
}

export interface HtmlToCodeModels {
  /** Coder model: build clean code from the HTML (+ visual notes). Required. */
  code: CoderModel;
  /** Optional multimodal model to describe the screenshot for extra visual context. */
  watch?: WatchModel;
}

/** Reverse-engineer captured HTML (+ optional screenshot) into clean working code. */
export async function htmlToCode(input: HtmlToCodeInput, models: HtmlToCodeModels): Promise<{ code: string; visualNotes?: string }> {
  if (!input.html || !input.html.trim()) throw new Error('htmlToCode needs input.html.');
  let visualNotes = '';
  if (input.screenshot && models.watch) {
    visualNotes = (await models.watch({ frames: [input.screenshot], mimeType: 'image/png', prompt: SCREENSHOT_DESC_PROMPT })).trim();
  }
  const stack = input.stack ?? 'a single clean self-contained HTML file with inline CSS (no build step)';
  const prompt =
    `${REVERSE_PROMPT}\n\nTarget stack: ${stack}` +
    `${input.goal ? `\nGoal: ${input.goal}` : ''}` +
    `${visualNotes ? `\n\n=== VISUAL (from screenshot) ===\n${visualNotes}` : ''}` +
    `\n\n=== CAPTURED HTML ===\n${input.html}`;
  const code = (await models.code(prompt)).trim();
  return { code, visualNotes: visualNotes || undefined };
}

export interface UrlToCodeResult {
  url: string;
  /** The captured RENDERED HTML — "what the head saw". */
  html: string;
  /** Full-page screenshot bytes (PNG), or null. */
  screenshot: Uint8Array | null;
  /** The reverse-engineered clean code. */
  code: string;
}

export interface UrlToCodeOptions {
  goal?: string;
  stack?: string;
  viewport?: { width: number; height: number };
}

/**
 * THE headline flow: go to a URL → crawl it in a real browser → capture screenshot + HTML
 * → reverse-engineer into clean code → return BOTH the captured HTML and the code.
 * Needs the `playwright` peer (capture) + the injected coder model. $0 / on-device.
 */
export async function urlToCode(url: string, models: HtmlToCodeModels, opts: UrlToCodeOptions = {}): Promise<UrlToCodeResult> {
  const { captureScreens } = await import('./screenshot-flow.js');
  const caps = await captureScreens([url], { viewport: opts.viewport });
  const cap = caps[0];
  if (!cap || !cap.ok || !cap.html) {
    throw new Error(`urlToCode: could not capture ${url}${cap?.note ? ` (${cap.note})` : ''}.`);
  }
  const { code } = await htmlToCode(
    { html: cap.html, screenshot: cap.png ?? undefined, goal: opts.goal, stack: opts.stack },
    models,
  );
  return { url, html: cap.html, screenshot: cap.png, code };
}

// ── Optional frame extractor (Node-only; for image-only vision models) ───────
// Many multimodal models (e.g. the Gemini bridge) accept the video directly — then you
// don't need this. For an image-only VLM, sample frames from the recording via ffmpeg
// (system ffmpeg or a host-provided path). Returns PNG bytes per frame.

export interface ExtractFramesOptions {
  /** Max frames to sample (evenly, ~1/sec). Default 8. */
  count?: number;
  /** Path to the ffmpeg binary. Default: "ffmpeg" on PATH. */
  ffmpegPath?: string;
}

export async function extractFrames(videoPath: string, opts: ExtractFramesOptions = {}): Promise<Uint8Array[]> {
  const [{ spawn }, os, path, fs] = await Promise.all([
    import('node:child_process'),
    import('node:os'),
    import('node:path'),
    import('node:fs/promises'),
  ]);
  const count = opts.count ?? 8;
  const ffmpeg = opts.ffmpegPath ?? 'ffmpeg';
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'oriro-head-frames-'));
  const pattern = path.join(dir, 'f-%03d.png');

  await new Promise<void>((resolve, reject) => {
    // `thumbnail` picks representative frames; cap output to `count`.
    const p = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', videoPath, '-vf', 'thumbnail', '-frames:v', String(count), '-y', pattern], { stdio: 'ignore' });
    p.on('error', () => reject(new Error('ffmpeg not found — pass frames yourself or a video-capable model, or set ffmpegPath.')));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });

  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.png')).sort();
  const frames: Uint8Array[] = [];
  for (const f of files.slice(0, count)) frames.push(new Uint8Array(await fs.readFile(path.join(dir, f))));
  return frames;
}
