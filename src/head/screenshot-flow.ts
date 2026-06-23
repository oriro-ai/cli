// NOTE: the page.evaluate(...) callbacks below run inside the BROWSER (Chromium via
// Playwright), so they reference browser globals. Declared as `any` here so this Node CLI
// compiles without pulling the whole DOM lib into the project.
declare const window: any;
declare const document: any;

// @oriro/head/screenshot — the SCREENSHOT head. Visits each URL in a real browser
// (hydration-wait + scroll-to-bottom for lazy content) and captures a full-page
// screenshot of every screen, then assembles them into ONE visual flow HTML.
//
// Playwright + Chromium are a PEER dependency the host (the CLI) provides — imported
// dynamically so this subpath only loads it when capture is actually used. This is the
// part that needs a real browser runtime (CLI / local / service), NOT a no-Chromium
// web server. Pure assembler (buildScreenshotFlowHtml) needs nothing.
//
// CARDINAL: Chromium is the renderer only — free/open/on-device/$0/no-key. The host
// installs it (`npx playwright install chromium`). Nothing leaves the machine.

export interface ScreenCapture {
  url: string;
  ok: boolean;
  status: number;
  title: string;
  /** PNG bytes of the full-page screenshot, or null if the visit failed. */
  png: Uint8Array | null;
  /** Path to the recorded .webm scroll-through clip (when { video: true }); else null. */
  videoPath?: string | null;
  /** The page's RENDERED HTML (post-JS DOM) — what the head actually saw. For url→code. */
  html?: string | null;
  note: string;
}

export interface CaptureOptions {
  viewport?: { width: number; height: number };
  navTimeoutMs?: number;
  /** Record a scroll-through video of each visit — captures the motion, hover/scroll
   *  reveals, lazy-load and animation a STATIC screenshot misses, for a vision model to
   *  WATCH. Same Chromium peer, no extra cost. Off by default. */
  video?: boolean;
  /** Where to write the .webm clips when { video: true }. Defaults to the OS temp dir. */
  videoDir?: string;
  /** Called after each page so the host can show progress. */
  onProgress?: (done: number, total: number, url: string) => void;
}

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

/** Visit each URL in Chromium and capture a full-page screenshot. Needs the `playwright` peer. */
export async function captureScreens(urls: string[], opts: CaptureOptions = {}): Promise<ScreenCapture[]> {
  // Optional peer: 'playwright' is present only when the host installs it for screenshots.
  let chromium: any;
  try {
    // @ts-ignore optional 'playwright' peer dependency
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('@oriro/head/screenshot needs the `playwright` peer dependency (and `npx playwright install chromium`).');
  }

  const viewport = opts.viewport ?? DEFAULT_VIEWPORT;
  const out: ScreenCapture[] = [];
  const videos: Array<any | null> = [];
  const browser = await chromium.launch({ headless: true });

  // Video (opt-in): record each visit so a vision model can WATCH the motion, hover,
  // lazy-load and animation a static screenshot misses. recordVideo is a context option;
  // each page gets its own .webm, finalized when that page closes.
  const ctxOpts: any = { viewport, deviceScaleFactor: 1 };
  if (opts.video) {
    const [os, path, fs] = await Promise.all([import('node:os'), import('node:path'), import('node:fs/promises')]);
    const dir = opts.videoDir ?? path.join(os.tmpdir(), 'oriro-head-video');
    await fs.mkdir(dir, { recursive: true });
    ctxOpts.recordVideo = { dir, size: viewport };
  }
  const ctx = await browser.newContext(ctxOpts);

  try {
    let done = 0;
    for (const url of urls) {
      const page = await ctx.newPage();
      const rec: ScreenCapture = { url, ok: false, status: 0, title: '', png: null, videoPath: null, html: null, note: '' };
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.navTimeoutMs ?? 30000 });
        rec.status = resp ? resp.status() : 0;
        try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch { /* some pages never idle */ }
        await scrollToBottom(page);
        await page.waitForTimeout(600);
        rec.title = await page.title();
        rec.html = await page.content();   // the RENDERED DOM — what the head saw (for url→code)
        const buf = await page.screenshot({ fullPage: true });
        rec.png = new Uint8Array(buf);
        rec.ok = true;
      } catch (e) {
        rec.note = (e instanceof Error ? e.message : String(e)).split('\n')[0] ?? 'capture failed';
      } finally {
        const vid = opts.video ? page.video() : null;
        await page.close();                 // finalizes this page's video file
        out.push(rec);
        videos.push(vid);
        opts.onProgress?.(++done, urls.length, url);
      }
    }
  } finally {
    // Video paths resolve only after the page closes — resolve them before the browser does.
    if (opts.video) {
      for (let i = 0; i < out.length; i++) {
        try {
          const p = await videos[i]?.path();
          const c = out[i];
          if (p && c) c.videoPath = p;
        } catch { /* a failed visit may have no video */ }
      }
    }
    await browser.close();
  }
  return out;
}

// Hydration + lazy-content: scroll in 500px steps to the bottom, then back to top.
async function scrollToBottom(page: any): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let y = 0;
      const step = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
      }, 120);
      setTimeout(() => { clearInterval(timer); resolve(); }, 6000);
    });
    window.scrollTo(0, 0);
  });
}

// ── Flow-HTML assembler (pure — no browser, no deps) ─────────────────────────

export interface FlowGroup {
  /** Section label (e.g. a site name). */
  name: string;
  captures: ScreenCapture[];
}

export interface FlowHtmlOptions {
  /** Resolve the <img src> for a capture. Default: inline base64 data URL. Pass a
   *  function that returns a relative path if you write the PNGs to disk instead. */
  imgSrc?: (c: ScreenCapture, index: number) => string;
  /** Resolve the <video src> for a capture's recorded clip. Default: the videoPath as-is
   *  (write the flow HTML next to the videos, or override to copy + use a relative path). */
  videoSrc?: (c: ScreenCapture, index: number) => string;
  title?: string;
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function hostOf(u: string): string { try { return new URL(u).host.replace(/^www\./, ''); } catch { return u; } }
function pathOf(u: string): string { try { return new URL(u).pathname || '/'; } catch { return u; } }

function toBase64(bytes: Uint8Array): string {
  // Works in Node (Buffer) and browsers (btoa) without a dep.
  const g = globalThis as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } }; btoa?: (s: string) => string };
  if (g.Buffer) return g.Buffer.from(bytes).toString('base64');
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] ?? 0);
  return g.btoa ? g.btoa(bin) : '';
}

const defaultImgSrc = (c: ScreenCapture): string =>
  c.png ? `data:image/png;base64,${toBase64(c.png)}` : '';

/** Assemble captured screens into ONE self-contained visual flow HTML document. */
export function buildScreenshotFlowHtml(groups: FlowGroup[], opts: FlowHtmlOptions = {}): string {
  const imgSrc = opts.imgSrc ?? defaultImgSrc;
  const all = groups.flatMap((g) => g.captures);
  const ok = all.filter((c) => c.ok).length;
  const sections = groups.map((g) => {
    const cards = g.captures.map((c, i) => {
      const src = c.ok ? imgSrc(c, i) : '';
      const vsrc = c.ok && c.videoPath ? (opts.videoSrc ? opts.videoSrc(c, i) : c.videoPath) : '';
      const media = c.ok && src
        ? `<a href="${src}" target="_blank"><img loading="lazy" src="${src}" alt="${esc(c.title)}"></a>${vsrc ? `<video class="vid" controls preload="metadata" src="${vsrc}"></video>` : ''}`
        : `<div class="failbox">${esc(c.note || 'no capture')}</div>`;
      return `<figure class="shot"><figcaption><span class="step">${i + 1}</span><span class="u">${esc(hostOf(c.url))}<b>${esc(pathOf(c.url))}</b></span><span class="pill ${c.ok ? 'ok' : 'bad'}">${c.ok ? (c.status || 200) + ' OK' : 'FAILED'}</span></figcaption>${media}<div class="cap">${esc(c.title || '(no title)')}</div></figure>`;
    }).join('');
    return `<section><h2>${esc(g.name)}</h2><div class="row">${cards}</div></section>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title ?? 'ORIRO Head — visual flow')}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0b0b12;color:#e2e8f0;font:14px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif;padding:24px}h1{font-size:22px;font-weight:700;letter-spacing:-.02em;background:linear-gradient(90deg,#2dd4bf,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}.sub{color:#94a3b8;margin:4px 0 22px}h2{font-size:15px;color:#f1f5f9;margin:22px 0 12px;border-left:3px solid #2dd4bf;padding-left:8px}.row{display:flex;gap:16px;overflow-x:auto;padding-bottom:12px}.shot{flex:0 0 300px;background:#0f0f1a;border:1px solid #1e293b;border-radius:12px;overflow:hidden}figcaption{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#15151f;border-bottom:1px solid #1e293b;font-size:11px}.step{background:#2dd4bf;color:#06251f;font-weight:800;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;flex:0 0 auto}.u{flex:1;color:#cbd5e1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.u b{color:#64748b;font-weight:400}.pill{font-size:9px;font-weight:700;padding:2px 6px;border-radius:5px}.pill.ok{background:rgba(34,197,94,.15);color:#4ade80}.pill.bad{background:rgba(244,63,94,.15);color:#fb7185}.shot img{width:100%;height:360px;object-fit:cover;object-position:top;display:block;background:#fff}.shot .vid{width:100%;display:block;background:#000;border-top:1px solid #1e293b}.failbox{height:120px;display:flex;align-items:center;justify-content:center;color:#fb7185;font-size:11px;padding:12px;text-align:center}.cap{padding:8px 10px;font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.foot{margin-top:26px;color:#475569;font-size:11px;border-top:1px solid #1e293b;padding-top:12px}</style></head><body><h1>ORIRO Head — visual flow</h1><div class="sub">The head visited ${all.length} screens and captured ${ok}/${all.length} full-page screenshots. Click any shot to open full size.</div>${sections}<div class="foot">ORIRO Head · real full-page screenshots, hydration-waited + scrolled for lazy content.</div></body></html>`;
}
