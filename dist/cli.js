#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/head/screenshot-flow.ts
var screenshot_flow_exports = {};
__export(screenshot_flow_exports, {
  buildScreenshotFlowHtml: () => buildScreenshotFlowHtml,
  captureScreens: () => captureScreens
});
async function captureScreens(urls, opts = {}) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("@oriro/head/screenshot needs the `playwright` peer dependency (and `npx playwright install chromium`).");
  }
  const viewport = opts.viewport ?? DEFAULT_VIEWPORT;
  const out = [];
  const videos = [];
  const browser = await chromium.launch({ headless: true });
  const ctxOpts = { viewport, deviceScaleFactor: 1 };
  if (opts.video) {
    const [os, path, fs] = await Promise.all([import("os"), import("path"), import("fs/promises")]);
    const dir = opts.videoDir ?? path.join(os.tmpdir(), "oriro-head-video");
    await fs.mkdir(dir, { recursive: true });
    ctxOpts.recordVideo = { dir, size: viewport };
  }
  const ctx = await browser.newContext(ctxOpts);
  try {
    let done = 0;
    for (const url of urls) {
      const page = await ctx.newPage();
      const rec = { url, ok: false, status: 0, title: "", png: null, videoPath: null, html: null, note: "" };
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: opts.navTimeoutMs ?? 3e4 });
        rec.status = resp ? resp.status() : 0;
        try {
          await page.waitForLoadState("networkidle", { timeout: 8e3 });
        } catch {
        }
        await scrollToBottom(page);
        await page.waitForTimeout(600);
        rec.title = await page.title();
        rec.html = await page.content();
        const buf = await page.screenshot({ fullPage: true });
        rec.png = new Uint8Array(buf);
        rec.ok = true;
      } catch (e) {
        rec.note = (e instanceof Error ? e.message : String(e)).split("\n")[0] ?? "capture failed";
      } finally {
        const vid = opts.video ? page.video() : null;
        await page.close();
        out.push(rec);
        videos.push(vid);
        opts.onProgress?.(++done, urls.length, url);
      }
    }
  } finally {
    if (opts.video) {
      for (let i = 0; i < out.length; i++) {
        try {
          const p = await videos[i]?.path();
          const c = out[i];
          if (p && c) c.videoPath = p;
        } catch {
        }
      }
    }
    await browser.close();
  }
  return out;
}
async function scrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 120);
      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, 6e3);
    });
    window.scrollTo(0, 0);
  });
}
function esc2(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function hostOf3(u) {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return u;
  }
}
function pathOf2(u) {
  try {
    return new URL(u).pathname || "/";
  } catch {
    return u;
  }
}
function toBase642(bytes) {
  const g = globalThis;
  if (g.Buffer) return g.Buffer.from(bytes).toString("base64");
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] ?? 0);
  return g.btoa ? g.btoa(bin) : "";
}
function buildScreenshotFlowHtml(groups, opts = {}) {
  const imgSrc = opts.imgSrc ?? defaultImgSrc;
  const all = groups.flatMap((g) => g.captures);
  const ok2 = all.filter((c) => c.ok).length;
  const sections = groups.map((g) => {
    const cards = g.captures.map((c, i) => {
      const src = c.ok ? imgSrc(c, i) : "";
      const vsrc = c.ok && c.videoPath ? opts.videoSrc ? opts.videoSrc(c, i) : c.videoPath : "";
      const media = c.ok && src ? `<a href="${src}" target="_blank"><img loading="lazy" src="${src}" alt="${esc2(c.title)}"></a>${vsrc ? `<video class="vid" controls preload="metadata" src="${vsrc}"></video>` : ""}` : `<div class="failbox">${esc2(c.note || "no capture")}</div>`;
      return `<figure class="shot"><figcaption><span class="step">${i + 1}</span><span class="u">${esc2(hostOf3(c.url))}<b>${esc2(pathOf2(c.url))}</b></span><span class="pill ${c.ok ? "ok" : "bad"}">${c.ok ? (c.status || 200) + " OK" : "FAILED"}</span></figcaption>${media}<div class="cap">${esc2(c.title || "(no title)")}</div></figure>`;
    }).join("");
    return `<section><h2>${esc2(g.name)}</h2><div class="row">${cards}</div></section>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc2(opts.title ?? "ORIRO Head \u2014 visual flow")}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0b0b12;color:#e2e8f0;font:14px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif;padding:24px}h1{font-size:22px;font-weight:700;letter-spacing:-.02em;background:linear-gradient(90deg,#2dd4bf,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}.sub{color:#94a3b8;margin:4px 0 22px}h2{font-size:15px;color:#f1f5f9;margin:22px 0 12px;border-left:3px solid #2dd4bf;padding-left:8px}.row{display:flex;gap:16px;overflow-x:auto;padding-bottom:12px}.shot{flex:0 0 300px;background:#0f0f1a;border:1px solid #1e293b;border-radius:12px;overflow:hidden}figcaption{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#15151f;border-bottom:1px solid #1e293b;font-size:11px}.step{background:#2dd4bf;color:#06251f;font-weight:800;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;flex:0 0 auto}.u{flex:1;color:#cbd5e1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.u b{color:#64748b;font-weight:400}.pill{font-size:9px;font-weight:700;padding:2px 6px;border-radius:5px}.pill.ok{background:rgba(34,197,94,.15);color:#4ade80}.pill.bad{background:rgba(244,63,94,.15);color:#fb7185}.shot img{width:100%;height:360px;object-fit:cover;object-position:top;display:block;background:#fff}.shot .vid{width:100%;display:block;background:#000;border-top:1px solid #1e293b}.failbox{height:120px;display:flex;align-items:center;justify-content:center;color:#fb7185;font-size:11px;padding:12px;text-align:center}.cap{padding:8px 10px;font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.foot{margin-top:26px;color:#475569;font-size:11px;border-top:1px solid #1e293b;padding-top:12px}</style></head><body><h1>ORIRO Head \u2014 visual flow</h1><div class="sub">The head visited ${all.length} screens and captured ${ok2}/${all.length} full-page screenshots. Click any shot to open full size.</div>${sections}<div class="foot">ORIRO Head \xB7 real full-page screenshots, hydration-waited + scrolled for lazy content.</div></body></html>`;
}
var DEFAULT_VIEWPORT, defaultImgSrc;
var init_screenshot_flow = __esm({
  "src/head/screenshot-flow.ts"() {
    "use strict";
    DEFAULT_VIEWPORT = { width: 1280, height: 800 };
    defaultImgSrc = (c) => c.png ? `data:image/png;base64,${toBase642(c.png)}` : "";
  }
});

// src/cli.ts
import { createRequire } from "module";
import { Command } from "commander";

// src/repl.ts
import { createInterface as createInterface5 } from "readline/promises";
import { stdin as stdin5, stdout as stdout6 } from "process";

// src/ui/theme.ts
var PALETTE = {
  teal: "#2DD4BF",
  blue: "#3884DE",
  violet: "#8060DE",
  magenta: "#C454C6",
  pink: "#E8609C",
  gold: "#F6C453",
  text: "#E8E3D5",
  dim: "#8A93A6",
  faint: "#5B6472",
  success: "#7DD3A5",
  error: "#F97066"
};
var BRAND_GRADIENT = [
  PALETTE.teal,
  PALETTE.blue,
  PALETTE.violet,
  PALETTE.magenta,
  PALETTE.pink
];
var RESET = "\x1B[0m";
var hexToRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
var lerp = (a, b, t) => Math.round(a + (b - a) * t);
function gradientAt(stops, t) {
  const segs = stops.length - 1;
  const x = Math.max(0, Math.min(t, 1)) * segs;
  const i = Math.min(Math.floor(x), segs - 1);
  const f = x - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}
var fg = (rgb, s) => `\x1B[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${s}${RESET}`;
var fgHex = (hex, s) => fg(hexToRgb(hex), s);
var bold = (s) => `\x1B[1m${s}${RESET}`;
var dim = (s) => fgHex(PALETTE.dim, s);
var accent = (s) => fgHex(PALETTE.gold, s);
function gradient(text, stops = BRAND_GRADIENT) {
  const chars = [...text];
  const last = Math.max(chars.length - 1, 1);
  return chars.map((ch, i) => ch === " " ? ch : fg(gradientAt(stops, i / last), ch)).join("");
}

// src/ui/banner.ts
var WORDMARK = [
  "\u2588\u2580\u2588 \u2588\u2580\u2588 \u2588 \u2588\u2580\u2588 \u2588\u2580\u2588",
  "\u2588\u2591\u2588 \u2588\u2580\u2584 \u2588 \u2588\u2580\u2584 \u2588\u2591\u2588",
  "\u2580\u2580\u2580 \u2580\u2591\u2580 \u2580 \u2580\u2591\u2580 \u2580\u2580\u2580"
];
function banner() {
  const mark = WORDMARK.map((row) => "  " + gradient(row)).join("\n");
  const tagline = "  " + dim("free") + dim(" \xB7 ") + dim("on-device") + dim(" \xB7 ") + dim("keyless") + dim(" \xB7 ") + dim("your language");
  return `
${mark}
${tagline}
`;
}

// src/onboarding/wrapper.ts
import { createInterface as createInterface4 } from "readline/promises";
import { stdin as stdin4, stdout as stdout5 } from "process";

// src/language/languages.ts
var LANGUAGES = [
  { name: "English", code: "en", neuralVoice: true },
  { name: "Chinese", code: "zh", neuralVoice: true },
  { name: "German", code: "de", neuralVoice: true },
  { name: "Spanish", code: "es", neuralVoice: true },
  { name: "Russian", code: "ru", neuralVoice: true },
  { name: "Korean", code: "ko", neuralVoice: false },
  { name: "French", code: "fr", neuralVoice: true },
  { name: "Japanese", code: "ja", neuralVoice: false },
  { name: "Portuguese", code: "pt", neuralVoice: true },
  { name: "Turkish", code: "tr", neuralVoice: true },
  { name: "Polish", code: "pl", neuralVoice: true },
  { name: "Catalan", code: "ca", neuralVoice: false },
  { name: "Dutch", code: "nl", neuralVoice: true },
  { name: "Arabic", code: "ar", neuralVoice: true },
  { name: "Swedish", code: "sv", neuralVoice: true },
  { name: "Italian", code: "it", neuralVoice: true },
  { name: "Indonesian", code: "id", neuralVoice: true },
  { name: "Hindi", code: "hi", neuralVoice: true },
  { name: "Finnish", code: "fi", neuralVoice: true },
  { name: "Vietnamese", code: "vi", neuralVoice: true },
  { name: "Hebrew", code: "he", neuralVoice: false },
  { name: "Ukrainian", code: "uk", neuralVoice: true },
  { name: "Greek", code: "el", neuralVoice: true },
  { name: "Malay", code: "ms", neuralVoice: false },
  { name: "Czech", code: "cs", neuralVoice: true },
  { name: "Romanian", code: "ro", neuralVoice: true },
  { name: "Danish", code: "da", neuralVoice: true },
  { name: "Hungarian", code: "hu", neuralVoice: true },
  { name: "Tamil", code: "ta", neuralVoice: false },
  { name: "Norwegian", code: "no", neuralVoice: true },
  { name: "Thai", code: "th", neuralVoice: false },
  { name: "Urdu", code: "ur", neuralVoice: true },
  { name: "Croatian", code: "hr", neuralVoice: true },
  { name: "Bulgarian", code: "bg", neuralVoice: true },
  { name: "Lithuanian", code: "lt", neuralVoice: false },
  { name: "Latin", code: "la", neuralVoice: false },
  { name: "Maori", code: "mi", neuralVoice: false },
  { name: "Malayalam", code: "ml", neuralVoice: true },
  { name: "Welsh", code: "cy", neuralVoice: true },
  { name: "Slovak", code: "sk", neuralVoice: true },
  { name: "Telugu", code: "te", neuralVoice: true },
  { name: "Persian", code: "fa", neuralVoice: true },
  { name: "Latvian", code: "lv", neuralVoice: true },
  { name: "Bengali", code: "bn", neuralVoice: false },
  { name: "Serbian", code: "sr", neuralVoice: true },
  { name: "Azerbaijani", code: "az", neuralVoice: false },
  { name: "Slovenian", code: "sl", neuralVoice: true },
  { name: "Kannada", code: "kn", neuralVoice: false },
  { name: "Estonian", code: "et", neuralVoice: false },
  { name: "Macedonian", code: "mk", neuralVoice: false },
  { name: "Breton", code: "br", neuralVoice: false },
  { name: "Basque", code: "eu", neuralVoice: true },
  { name: "Icelandic", code: "is", neuralVoice: true },
  { name: "Armenian", code: "hy", neuralVoice: false },
  { name: "Nepali", code: "ne", neuralVoice: true },
  { name: "Mongolian", code: "mn", neuralVoice: false },
  { name: "Bosnian", code: "bs", neuralVoice: false },
  { name: "Kazakh", code: "kk", neuralVoice: true },
  { name: "Albanian", code: "sq", neuralVoice: true },
  { name: "Swahili", code: "sw", neuralVoice: true },
  { name: "Galician", code: "gl", neuralVoice: false },
  { name: "Marathi", code: "mr", neuralVoice: false },
  { name: "Punjabi", code: "pa", neuralVoice: false },
  { name: "Sinhala", code: "si", neuralVoice: false },
  { name: "Khmer", code: "km", neuralVoice: false },
  { name: "Shona", code: "sn", neuralVoice: false },
  { name: "Yoruba", code: "yo", neuralVoice: false },
  { name: "Somali", code: "so", neuralVoice: false },
  { name: "Afrikaans", code: "af", neuralVoice: false },
  { name: "Occitan", code: "oc", neuralVoice: false },
  { name: "Georgian", code: "ka", neuralVoice: true },
  { name: "Belarusian", code: "be", neuralVoice: false },
  { name: "Tajik", code: "tg", neuralVoice: false },
  { name: "Sindhi", code: "sd", neuralVoice: false },
  { name: "Gujarati", code: "gu", neuralVoice: false },
  { name: "Amharic", code: "am", neuralVoice: false },
  { name: "Yiddish", code: "yi", neuralVoice: false },
  { name: "Lao", code: "lo", neuralVoice: false },
  { name: "Uzbek", code: "uz", neuralVoice: false },
  { name: "Faroese", code: "fo", neuralVoice: false },
  { name: "Haitian Creole", code: "ht", neuralVoice: false },
  { name: "Pashto", code: "ps", neuralVoice: false },
  { name: "Turkmen", code: "tk", neuralVoice: false },
  { name: "Norwegian Nynorsk", code: "nn", neuralVoice: false },
  { name: "Maltese", code: "mt", neuralVoice: false },
  { name: "Sanskrit", code: "sa", neuralVoice: false },
  { name: "Luxembourgish", code: "lb", neuralVoice: true },
  { name: "Burmese", code: "my", neuralVoice: false },
  { name: "Tibetan", code: "bo", neuralVoice: false },
  { name: "Tagalog", code: "tl", neuralVoice: false },
  { name: "Malagasy", code: "mg", neuralVoice: false },
  { name: "Assamese", code: "as", neuralVoice: false },
  { name: "Tatar", code: "tt", neuralVoice: false },
  { name: "Hawaiian", code: "haw", neuralVoice: false },
  { name: "Lingala", code: "ln", neuralVoice: false },
  { name: "Hausa", code: "ha", neuralVoice: false },
  { name: "Bashkir", code: "ba", neuralVoice: false },
  { name: "Javanese", code: "jw", neuralVoice: false },
  { name: "Sundanese", code: "su", neuralVoice: false },
  { name: "Cantonese", code: "yue", neuralVoice: false }
];
var ENGLISH = LANGUAGES.find((l) => l.code === "en") ?? { name: "English", code: "en", neuralVoice: true };
function languageByCode(code) {
  const c = (code || "").toLowerCase();
  return LANGUAGES.find((l) => l.code.toLowerCase() === c);
}
function searchLanguages(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return LANGUAGES;
  return LANGUAGES.filter(
    (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().startsWith(q)
  );
}
var NEURAL_VOICE_COUNT = LANGUAGES.filter((l) => l.neuralVoice).length;

// src/language/config.ts
import { join as join2 } from "path";
import { readFileSync, writeFileSync } from "fs";

// src/config/paths.ts
import { mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
function oriroDir() {
  return process.env.ORIRO_STATE_DIR ?? join(homedir(), ".oriro");
}
function ensureOriroDir() {
  const dir = oriroDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

// src/language/config.ts
var file = () => join2(oriroDir(), "language.json");
function readLanguageConfig() {
  try {
    return JSON.parse(readFileSync(file(), "utf8"));
  } catch {
    return null;
  }
}
function writeLanguageConfig(cfg) {
  const f = join2(ensureOriroDir(), "language.json");
  writeFileSync(f, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}
function isLanguageConfigured() {
  return readLanguageConfig() !== null;
}
function getTerminalLanguage() {
  const cfg = readLanguageConfig();
  return cfg && languageByCode(cfg.code) || ENGLISH;
}
function setTerminalLanguage(lang, opts) {
  const cfg = {
    code: lang.code,
    // English speakers need no translation; everyone else gets it on by default.
    translateToEnglish: lang.code.toLowerCase() !== "en",
    voice: opts?.voice ?? false
  };
  writeLanguageConfig(cfg);
  return cfg;
}

// src/language/translate.ts
var active = null;
function registerTranslator(t) {
  active = t;
}
var isEnglish = (code) => !code || code.toLowerCase().startsWith("en");
async function translateForCoder(text, fromLang) {
  if (isEnglish(fromLang) || !text.trim()) return text;
  if (active && active.ready()) {
    try {
      return await active.toEnglish(text, fromLang);
    } catch {
    }
  }
  return text;
}
async function translateForUser(english, toLang) {
  if (isEnglish(toLang) || !english.trim()) return english;
  if (active && active.ready()) {
    try {
      return await active.fromEnglish(english, toLang);
    } catch {
    }
  }
  return english;
}

// src/language/onboarding.ts
import { createInterface } from "readline/promises";
import { stdin, stdout as stdout2 } from "process";

// src/onboarding/prompt.ts
import { stdout } from "process";
async function ask(rl, question) {
  try {
    return await rl.question(question);
  } catch {
    try {
      rl.close();
    } catch {
    }
    stdout.write(dim("\nBye.\n"));
    process.exit(0);
  }
}

// src/language/onboarding.ts
var C = {
  teal: "\x1B[38;2;45;212;191m",
  purple: "\x1B[38;2;128;96;222m",
  dim: "\x1B[2m",
  bold: "\x1B[1m",
  reset: "\x1B[0m"
};
function header() {
  stdout2.write(`
  ${C.teal}\u25EF${C.reset} ${C.bold}ORIRO${C.reset} ${C.dim}\u2014 your terminal, your language${C.reset}
`);
  stdout2.write(`  ${C.dim}You type and read in your language; the AI works in English for you.${C.reset}
`);
  stdout2.write(`  ${C.dim}${LANGUAGES.length} languages \xB7 ${NEURAL_VOICE_COUNT} with a built-in voice (${C.purple}\u2605${C.dim}).${C.reset}

`);
}
function renderList(list) {
  const shown = list.slice(0, 15);
  shown.forEach((l, i) => {
    const star = l.neuralVoice ? `${C.purple}\u2605${C.reset}` : " ";
    stdout2.write(`  ${C.teal}${String(i + 1).padStart(2)}${C.reset}  ${star} ${l.name} ${C.dim}(${l.code})${C.reset}
`);
  });
  if (list.length > shown.length) {
    stdout2.write(`  ${C.dim}\u2026 ${list.length - shown.length} more \u2014 keep typing to narrow.${C.reset}
`);
  }
}
async function selectLanguageInteractive() {
  header();
  const rl = createInterface({ input: stdin, output: stdout2 });
  try {
    let list = searchLanguages("");
    renderList(list);
    for (; ; ) {
      const ans = (await ask(rl, `
  ${C.teal}\u203A${C.reset} Type a language, or a number to pick: `)).trim();
      const n = Number(ans);
      const shown = Math.min(15, list.length);
      const byNumber = ans && Number.isInteger(n) && n >= 1 && n <= shown ? list[n - 1] : void 0;
      if (byNumber) return byNumber;
      const direct = languageByCode(ans);
      if (direct) return direct;
      list = searchLanguages(ans);
      if (list.length === 0) {
        stdout2.write(`  ${C.dim}No match \u2014 try the English name or ISO code.${C.reset}
`);
        list = searchLanguages("");
      } else {
        const only = list.length === 1 ? list[0] : void 0;
        if (only) return only;
      }
      stdout2.write("\n");
      renderList(list);
    }
  } finally {
    rl.close();
  }
}
async function runLanguageOnboarding() {
  const existing = readLanguageConfig();
  if (existing) {
    const l = languageByCode(existing.code);
    if (l) return l;
  }
  const lang = await selectLanguageInteractive();
  setTerminalLanguage(lang);
  stdout2.write(
    `
  ${C.teal}\u25EF${C.reset} ${C.bold}${lang.name}${C.reset} is now your terminal language. ${C.dim}Change it anytime with ${C.reset}${C.teal}oriro language${C.reset}

`
  );
  return lang;
}

// src/guardian/v3lite.ts
var INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+|previous\s+|prior\s+)*instructions/i,
  /you are now (a |an )?different/i,
  /print (your )?system prompt/i,
  /forget (everything|all) (you|above)/i,
  /\[INST\]|<<SYS>>/
];
var IOC_PATTERNS = [
  ["ioc:secret_read", /\bread\b[^\n]*(\.ssh(?![-.\w])|\.env\b|id_rsa)/i],
  ["ioc:exfil_post", /\bsend\b[^\n]*\bto\s+https?:\/\//i],
  ["ioc:env_exfil", /process\.env[^\n]{0,40}https?:\/\//i],
  ["ioc:pipe_shell", /(curl|wget)[^\n]*\|\s*(sh|bash|node)\b/i],
  ["ioc:pipe_exfil", /(cat|type|read)[^\n]*(\.ssh(?![-.\w])|id_rsa|\.env\b)[^\n]*\|\s*(curl|wget|nc)\b/i],
  ["ioc:exfiltrate", /exfiltrat/i],
  ["ioc:obf_loader", /eval\(\s*(atob|Buffer\.from)\(/i],
  ["ioc:cp_loader", /child_process[\s\S]{0,40}(atob|fromCharCode)/i]
];
function firstIOC(text) {
  for (const [id, re] of IOC_PATTERNS) {
    if (re.test(text)) return id;
  }
  return null;
}
var HIDDEN_RANGES = [
  [8203, 8207],
  // zero-width space … RTL/LTR marks
  [8234, 8238],
  // bidi embedding/override
  [8288, 8292],
  // word-joiner … invisible separators
  [65279, 65279]
  // BOM / zero-width no-break space
];
function hasHiddenUnicode(s) {
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    for (const [lo, hi] of HIDDEN_RANGES) if (c >= lo && c <= hi) return true;
  }
  return false;
}
function firstInjection(text) {
  for (const re of INJECTION_PATTERNS) {
    const m = re.exec(text);
    if (m) return m[0].slice(0, 80);
  }
  return null;
}
function scanToolCall(name, description, params) {
  const blob = `${name}
${description}
${typeof params === "string" ? params : JSON.stringify(params ?? "")}`;
  const hit = firstInjection(blob);
  if (hit) return { safe: false, threat: `injection:${hit}` };
  const ioc = firstIOC(blob);
  if (ioc) return { safe: false, threat: ioc };
  if (hasHiddenUnicode(blob)) return { safe: false, threat: "hidden_unicode" };
  return { safe: true };
}
function scanExecCommand(text) {
  const ioc = firstIOC(text);
  if (ioc) return { safe: false, threat: ioc };
  if (hasHiddenUnicode(text)) return { safe: false, threat: "hidden_unicode" };
  return { safe: true };
}

// src/guardian/rules.ts
var block = (rule, reason, severity = "critical") => ({
  decision: "block",
  severity,
  rule,
  reason
});
var ask2 = (rule, reason, severity = "warning") => ({
  decision: "ask",
  severity,
  rule,
  reason
});
var cmdOf = (c) => (c.command ?? "").toLowerCase();
var norm = (s) => s.replace(/\s+/g, " ").trim();
var anyMatch = (patterns, text) => patterns.some((re) => re.test(text));
var stripQuotes = (t) => t.replace(/^['"]+/, "").replace(/['"]+$/, "");
function statements(cmd) {
  return cmd.split(/(?:&&|\|\||[;|&\n])+/g).map((s) => s.trim()).filter(Boolean);
}
function words(stmt) {
  return stmt.split(/\s+/).map(stripQuotes).filter(Boolean);
}
function commandWord(stmt) {
  const w = words(stmt);
  let i = 0;
  while (i < w.length && /^(sudo|nohup|nice|time|exec|command|builtin|then|do|else)$/i.test(w[i] ?? "")) i++;
  if (i < w.length && /^env$/i.test(w[i] ?? "")) {
    i++;
    while (i < w.length && /^[\w.]+=/.test(w[i] ?? "")) i++;
  }
  while (i < w.length && /^[\w.]+=/.test(w[i] ?? "")) i++;
  return (w[i] ?? "").replace(/^.*[\\/]/, "").toLowerCase();
}
var SYS_DIR = "(etc|usr|bin|sbin|var|boot|lib|lib64|sys|proc|dev|root|opt|windows|system32|programdata|library|applications|system|private|cores|volumes|network)";
function classifyRmTarget(raw) {
  let t = stripQuotes(raw).trim();
  if (!t || t.startsWith("-")) return "safe";
  t = t.replace(/\$\{?home\}?/gi, "~");
  if (/^(\/|\/\*|~|~\/|~\/\*|\.|\.\/|\.\/\*|\*|\.\*)$/.test(t)) return "danger";
  if (new RegExp(`^/${SYS_DIR}(/\\*?)?$`, "i").test(t)) return "danger";
  if (/^\/home(\/[^/]+)?\/?\*?$/i.test(t)) return "danger";
  if (new RegExp(`^/${SYS_DIR}/.+`, "i").test(t)) return "system-sub";
  return "safe";
}
function rmVerdict(stmt) {
  const cw = commandWord(stmt);
  if (cw !== "rm") return null;
  const w = words(stmt);
  const flags = w.filter((x) => x.startsWith("-")).join(" ");
  const recursive = /(^|[^-])-[a-z]*r/i.test(" " + flags) || /--recursive\b/i.test(flags);
  const force = /(^|[^-])-[a-z]*f/i.test(" " + flags) || /--force\b/i.test(flags);
  const noPreserve = /--no-preserve-root\b/i.test(flags);
  if (!recursive || !force) return null;
  if (noPreserve) return block("fs-destruction", "Recursive force-delete with --no-preserve-root");
  const targets = w.slice(1).filter((x) => !x.startsWith("-")).map(classifyRmTarget);
  if (targets.includes("danger")) return block("fs-destruction", "Recursive force-delete of root/home/cwd/system path");
  if (targets.includes("system-sub")) return ask2("fs-destruction", "Recursive force-delete inside a system directory");
  return null;
}
var DISK = "(sd|nvme|disk|hd|vd|xvd|mmcblk|loop)";
var FS_DESTRUCTION = [
  new RegExp(`\\bmkfs\\.?\\w*\\s+/dev/${DISK}`, "i"),
  // reformat a disk
  new RegExp(`\\bdd\\b[^\\n]*\\bof=/dev/${DISK}`, "i"),
  // overwrite raw disk
  new RegExp(`>\\s*/dev/${DISK}\\w`, "i"),
  // redirect over raw disk
  /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
  // fork bomb
  /\bremove-item\b.*-recurse.*-force.*[\\/](windows|system32|users)\b/i,
  // PS recursive wipe
  /\b(format|cipher\s+\/w)\b.*[a-z]:\\?/i,
  // windows format / wipe-free-space
  /\bfind\b[^\n]*\s(-delete\b|-exec\s+rm\b)/i,
  // find … -delete / -exec rm
  /\bshred\b\s+(-|\S*\/dev\/)/i,
  // shred a device/file destructively
  new RegExp(`\\btruncate\\b[^\\n]*\\s/dev/${DISK}`, "i"),
  // truncate a device
  /\bmv\b[^\n]*\s\/dev\/null\b/i,
  // mv important → /dev/null
  /\bchmod\b\s+-[a-z]*r[a-z]*\s+0{3,4}\b/i,
  // chmod -R 000 (strip all perms recursively)
  /\bwipefs\b/i
];
var HOST_DISRUPT = /* @__PURE__ */ new Set(["shutdown", "reboot", "halt", "poweroff"]);
var FETCH = "(curl|wget|fetch|httpie)";
var SHELL = "(sh|bash|zsh|dash|ksh|sudo\\s+sh|sudo\\s+bash|python\\d?|node|perl|ruby|php)";
var REMOTE_EXEC = [
  new RegExp(`\\b${FETCH}\\b[^\\n|]*\\|\\s*(sudo\\s+)?${SHELL}\\b`, "i"),
  // curl … | sh
  new RegExp(`(?:^|[\\s;&|(])(bash|sh|zsh|ksh|source|\\.)\\s*<\\s*\\(\\s*${FETCH}`, "i"),
  // sh <(curl) / bash<(curl) / . <(curl)
  new RegExp(`\\b(bash|sh|zsh|ksh|eval)\\b[^\\n]*\\$\\(\\s*${FETCH}\\b`, "i"),
  // bash -c "$(curl)"
  new RegExp(`\\$\\(\\s*${FETCH}\\b[^)]*\\)`, "i"),
  // bare $(curl …) substitution
  /`\s*(curl|wget|fetch)\b/i,
  // backtick `curl`
  /\b(irm|iwr|invoke-webrequest|invoke-restmethod)\b[^\n|]*\|\s*(iex|invoke-expression)/i,
  // PS download|iex
  /\biex\b\s*\(\s*(new-object\s+net\.webclient|.*downloadstring)/i,
  // iex(New-Object Net.WebClient…)
  /\bpython\d?\s+-c\b[^\n]*(urllib|requests|httpx|socket|os\.system|subprocess|exec\(|eval\()/i,
  // python -c fetch/exec
  /\b(perl|ruby|node|php)\s+-(e|r)\b[^\n]*(http|socket|system|exec|eval|fsockopen|downloadstring)/i,
  // perl/ruby/node/php -e RCE
  /\b(base64\s+(-d|--decode)|xxd\s+-r|openssl\s+enc\s+-d)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh|python\d?|node|perl|ruby)\b/i,
  // decode|sh
  new RegExp(`\\b${FETCH}\\b[^\\n]*\\s-[a-z]*[oO]\\b[^\\n]*&&[^\\n]*(chmod\\s+\\+x|\\./|\\bsh\\b|\\bbash\\b)`, "i")
  // download then exec
];
var REVERSE_SHELL = [
  /\b(nc|ncat|netcat)\b[^\n]*\s-[a-z]*e\b/i,
  // nc/ncat -e
  /\b(ncat|socat)\b[^\n]*exec[: ]/i,
  // socat … exec:
  /\bsocat\b[^\n]*tcp[:-][^\n]*exec/i,
  // socat tcp … exec
  /\b(bash|sh|zsh)\s+-i\b[^\n]*>&?\s*\/dev\/tcp\//i,
  // bash -i >& /dev/tcp/…
  /\/dev\/(tcp|udp)\/[\w.\-]+\/\d+/i,
  // /dev/tcp/<host-or-ip>/<port>
  /\bpython\d?\b[^\n]*socket\.socket[^\n]*(subprocess|pty\.spawn|exec)/i,
  // python reverse shell
  /\b(perl|php|ruby)\b[^\n]*(fsockopen|socket)[^\n]*(exec|system|\/bin\/(sh|bash))/i,
  // perl/php/ruby reverse shell
  /\bmkfifo\b[^\n]*(\bnc\b|\bncat\b)/i
  // mkfifo backpipe
];
var SECRET_PATHS = /(\.ssh(?![-.\w])|authorized_keys|id_rsa|id_ed25519|id_ecdsa|\.aws(?![-.\w])|\.oriro[\\/]credentials|\.config[\\/]gcloud|\.env(\.|\b)|\.netrc|\.npmrc|\.pypirc|\.docker(?![-.\w])|\.git-credentials|\.kube(?![-.\w])|wallet\.dat|\.gnupg(?![-.\w])|cookies(\.sqlite)?|login\s*data)/i;
var NET_SINK = /\b(curl|wget|nc|ncat|netcat|socat|scp|rsync|ftp|tftp|invoke-webrequest|invoke-restmethod)\b/i;
var ENV_EXFIL = [
  /\$\(\s*(printenv|env)\b/i,
  // $(printenv X) / $(env)
  /\bprintenv\b/i,
  // printenv … (paired with a net sink below = exfil)
  /\benv\s*\|/i,
  // env | …
  /\$\(\s*cat\b[^)]*(\.ssh|\.aws|\.env|\.netrc|credential|secret|token|id_rsa|id_ed25519)/i
  // $(cat <secret>)
];
var ENV_VAR_IN_BODY = /\s--?(d|data|data-binary|data-raw|form|post|body|upload-file)\b[^\n]*\$\{?\w*(secret|token|api[_-]?key|password|passwd|credential|aws_)\w*\}?/i;
var PERSISTENCE = [
  /\bcrontab\b\s+(-|\S+)/i,
  />>?\s*~?\/?\.(bashrc|zshrc|bash_profile|profile|zprofile)\b/i,
  />>?[^\n]*\.ssh[\\/]authorized_keys/i,
  // implant an SSH key (backdoor)
  /\b(launchctl\s+load|systemctl\s+enable|sc\s+create|new-service)\b/i,
  /\bregistry::|reg\s+add\b.*\\run\b/i,
  /[\\/]start menu[\\/]programs[\\/]startup[\\/]/i,
  /\bschtasks\b\s+\/create/i
];
var GUARDIAN_TAMPER = [
  /\boriro\b.*\bguardian\b.*\b(disable|off|stop|uninstall)\b/i,
  /[\\/]\.oriro[\\/]guardian/i,
  // direct path to Guardian's config/state
  /\bguardian\.json\b/i
  // any write referencing guardian.json (cd … && > guardian.json)
];
var TAMPER = [
  /\bchmod\s+-?\s*0?777\b/i,
  /\b(ufw|firewall-cmd|iptables)\b.*\b(disable|stop|flush|-f)\b/i,
  /\bset-mppreference\b.*-disable/i,
  /\bhistory\s+-c\b|\bunset\s+histfile\b|>\s*~?\/?\.bash_history/i
];
var MALWARE = [
  /\b(xmrig|minerd|cgminer|cpuminer|stratum\+tcp)\b/i,
  /\b(nanopool|minexmr|supportxmr|pool\.minexmr)\b/i
];
var DEFAULT_RULES = [
  {
    id: "fs-destruction",
    description: "Block recursive deletes of root/home/system paths, disk reformats, fork bombs, host shutdown.",
    match: (c) => {
      const raw = cmdOf(c);
      const cmd = norm(raw);
      for (const stmt of statements(cmd)) {
        const v = rmVerdict(stmt);
        if (v) return v;
        if (HOST_DISRUPT.has(commandWord(stmt))) return block("fs-destruction", "Host shutdown/reboot");
      }
      return anyMatch(FS_DESTRUCTION, cmd) ? block("fs-destruction", "Destructive filesystem/system operation") : null;
    }
  },
  {
    id: "remote-code-exec",
    description: "Block pull-and-run of remote code (curl|sh, $(curl), sh <(curl), bash -c $(curl), decode|sh).",
    match: (c) => anyMatch(REMOTE_EXEC, norm(cmdOf(c))) ? block("remote-code-exec", "Downloading and executing remote code") : null
  },
  {
    id: "reverse-shell",
    description: "Block reverse shells / remote backdoors (nc -e, /dev/tcp/<host>, socat exec, mkfifo backpipe).",
    match: (c) => anyMatch(REVERSE_SHELL, norm(cmdOf(c))) ? block("reverse-shell", "Opening a reverse shell / remote backdoor") : null
  },
  {
    id: "secret-exfiltration",
    description: "Block reading a credential/key file or env secret and sending it off the machine.",
    match: (c) => {
      const cmd = norm(cmdOf(c));
      if (!cmd || !NET_SINK.test(cmd)) return null;
      if (SECRET_PATHS.test(cmd)) return block("secret-exfiltration", "Reading secrets and sending them off the machine");
      if (anyMatch(ENV_EXFIL, cmd) || ENV_VAR_IN_BODY.test(cmd)) return block("secret-exfiltration", "Sending environment variables / secrets off the machine");
      return null;
    }
  },
  {
    id: "persistence",
    description: "Block SSH-key implants; flag cron/rc/startup/service edits used for Trojan persistence.",
    match: (c) => {
      const cmd = norm(cmdOf(c));
      if (/>>?[^\n]*\.ssh[\\/]authorized_keys/i.test(cmd)) return block("persistence", "Implanting an SSH key (backdoor)");
      return anyMatch(PERSISTENCE, cmd) ? ask2("persistence", "Installing a persistent foothold (cron/startup/service)") : null;
    }
  },
  {
    id: "guardian-self-defense",
    description: "Block any attempt to disable, uninstall, or rewrite Guardian's own config/state.",
    match: (c) => {
      if (anyMatch(GUARDIAN_TAMPER, norm(cmdOf(c)))) return block("guardian-self-defense", "Attempt to disable or tamper with Guardian itself");
      if (c.paths?.some((p) => /[\\/]\.oriro[\\/]guardian/i.test(p))) return block("guardian-self-defense", "Direct write to Guardian's own config/state");
      return null;
    }
  },
  {
    id: "security-tamper",
    description: "Flag disabling firewall/Defender or wiping history.",
    match: (c) => anyMatch(TAMPER, norm(cmdOf(c))) ? ask2("security-tamper", "Disabling security controls or covering tracks") : null
  },
  {
    id: "malware-signature",
    description: "Block known crypto-miner / malware command signatures.",
    match: (c) => anyMatch(MALWARE, norm(cmdOf(c))) ? block("malware-signature", "Known malware / crypto-miner signature") : null
  },
  {
    id: "v3lite",
    description: "Guardian V3 Lite on the tool call: IOC catalog + hidden-unicode (exec); + injection scan for untrusted MCP params.",
    match: (c) => {
      const r = c.kind === "mcp" ? scanToolCall(c.toolName, c.command ?? "", c.params) : scanExecCommand(`${c.toolName}
${c.command ?? ""}`);
      return r.safe ? null : block("v3lite", `Guardian V3 Lite flagged ${r.threat}`);
    }
  },
  {
    id: "sensitive-path-write",
    description: "Flag writes into SSH keys, credential stores, or system directories.",
    match: (c) => {
      if (c.kind !== "fs" || !c.paths?.length) return null;
      const hit = c.paths.find(
        (p) => SECRET_PATHS.test(p) || /[\\/]\.ssh[\\/]/i.test(p) || /[\\/](etc|boot|sys|windows[\\/]system32)[\\/]/i.test(p)
      );
      return hit ? ask2("sensitive-path-write", `Writing to a sensitive location: ${hit}`) : null;
    }
  }
];

// src/guardian/policy.ts
var ALLOW = { decision: "allow", severity: "info", rule: "allow", reason: "No policy match" };
var RANK = { allow: 0, ask: 1, block: 2 };
var SEV_RANK = { info: 0, warning: 1, critical: 2 };
function haystack(call) {
  return [call.toolName, call.command ?? "", call.mcpServer ?? "", ...call.paths ?? []].join(" ").toLowerCase();
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function listMatches(list, hay) {
  for (const entry of list) {
    const e = entry.trim().toLowerCase();
    if (!e) continue;
    const re = new RegExp(`(?:^|[^a-z0-9_-])${escapeRegExp(e)}(?:$|[^a-z0-9_-])`);
    if (re.test(hay)) return entry;
  }
  return null;
}
function escalate(v) {
  if (v.decision === "ask") return { ...v, decision: "block", reason: `${v.reason} (strict mode)` };
  return v;
}
function evaluate(call, policy) {
  const hay = haystack(call);
  const denied = listMatches(policy.deny, hay);
  if (denied) return finalize({ decision: "block", severity: "warning", rule: "denylist", reason: `Matches your denylist: "${denied}"` }, policy.mode);
  const rules = policy.rules ?? DEFAULT_RULES;
  let worst = ALLOW;
  for (const rule of rules) {
    let v = null;
    try {
      v = rule.match(call);
    } catch {
      v = null;
    }
    if (v && isWorse(v, worst)) worst = v;
  }
  if (call.kind === "mcp" && call.mcpServer && !policy.trustedServers.some((s) => s.toLowerCase() === call.mcpServer.toLowerCase())) {
    const mcp = { decision: "ask", severity: "warning", rule: "mcp-untrusted", reason: `Call from untrusted MCP server "${call.mcpServer}"` };
    if (isWorse(mcp, worst)) worst = mcp;
  }
  if (worst.severity !== "critical") {
    const allowed = listMatches(policy.allow, hay);
    if (allowed) return { decision: "allow", severity: "info", rule: "allowlist", reason: `Matches your allowlist: "${allowed}"` };
  }
  return finalize(worst, policy.mode);
}
function isWorse(a, b) {
  if (RANK[a.decision] !== RANK[b.decision]) return RANK[a.decision] > RANK[b.decision];
  return SEV_RANK[a.severity] > SEV_RANK[b.severity];
}
function finalize(v, mode) {
  if (v.decision === "allow") return v;
  if (v.severity === "critical") {
    return v.decision === "block" ? v : { ...v, decision: "block", reason: `${v.reason} (critical floor)` };
  }
  if (mode === "passive") return { ...v, decision: "allow", rule: `${v.rule}:passive`, reason: `[passive] ${v.reason}` };
  if (mode === "strict") return escalate(v);
  return v;
}

// src/guardian/config.ts
import { join as join3 } from "path";
import { readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "fs";
var FILE = () => join3(oriroDir(), "guardian.json");
var DEFAULT_GUARDIAN_CONFIG = {
  enabled: true,
  mode: "active",
  allow: [],
  deny: [],
  trustedServers: [],
  modelReady: false
};
function readGuardianConfig() {
  try {
    const parsed = JSON.parse(readFileSync2(FILE(), "utf8"));
    return { ...DEFAULT_GUARDIAN_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_GUARDIAN_CONFIG };
  }
}
function writeGuardianConfig(cfg) {
  const f = join3(ensureOriroDir(), "guardian.json");
  writeFileSync2(f, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}
function isGuardianActivated() {
  try {
    readFileSync2(FILE(), "utf8");
    return true;
  } catch {
    return false;
  }
}
function resolvePolicy(cfg = readGuardianConfig()) {
  return {
    mode: cfg.mode,
    allow: cfg.allow,
    deny: cfg.deny,
    trustedServers: cfg.trustedServers
  };
}

// src/guardian/audit.ts
import { homedir as homedir2 } from "os";
import { join as join4 } from "path";
import { appendFileSync, mkdirSync as mkdirSync2, readFileSync as readFileSync3 } from "fs";
var DIR = join4(homedir2(), ".oriro", "guardian");
var FILE2 = join4(DIR, "audit.jsonl");
function recordAudit(entry) {
  try {
    mkdirSync2(DIR, { recursive: true });
    appendFileSync(FILE2, JSON.stringify(entry) + "\n", "utf8");
  } catch {
  }
}

// src/guardian/analyzer.ts
var active2 = null;
async function analyze(call, ruleVerdict) {
  if (!active2 || !active2.ready() || ruleVerdict.decision === "allow") return ruleVerdict;
  try {
    const refined = await active2.analyze(call, ruleVerdict);
    if (ruleVerdict.decision === "block" && refined.decision !== "block") {
      return refined.decision === "allow" ? { ...ruleVerdict, reason: `${ruleVerdict.reason} \xB7 ${refined.reason}` } : refined;
    }
    return refined;
  } catch {
    return ruleVerdict;
  }
}

// src/guardian/byok-analyzer.ts
var SYSTEM_PROMPT = [
  "You are ORIRO Guardian, a terminal security analyst.",
  "A deterministic rule has FLAGGED one tool call for a second look. Decide if it is a real threat",
  "(data theft, remote-code execution, reverse shell, persistence/Trojan, secret exfiltration,",
  "a malicious MCP payload or prompt injection) or a benign action a developer would normally run.",
  "Be conservative: when genuinely unsure, prefer 'ask'. Never downgrade an obviously destructive call.",
  "Answer on a SINGLE line, EXACTLY: VERDICT=<allow|ask|block> REASON=<one short sentence>"
].join(" ");

// src/guardian/normalize.ts
var str = (v) => typeof v === "string" ? v : void 0;
function classify(toolName, toolKind) {
  const n = (toolName || "").toLowerCase();
  if (toolKind === "mcp" || n.includes("mcp")) return "mcp";
  if (/(bash|exec|shell|command|terminal|powershell|\bsh\b|\brun\b)/.test(n)) return "exec";
  if (/(write|read|edit|patch|file|fs|delete|remove|move|copy)/.test(n)) return "fs";
  if (/(fetch|http|curl|web|download|request|browse)/.test(n)) return "network";
  return "other";
}
function extractCommand(params) {
  return str(params.command) ?? str(params.cmd) ?? str(params.script) ?? str(params.shell) ?? str(params.code) ?? str(params.input);
}
function extractPaths(params, derived) {
  const out = derived ? [...derived] : [];
  for (const k of ["path", "file_path", "filePath", "file", "target", "dest", "destination"]) {
    const v = str(params[k]);
    if (v) out.push(v);
  }
  return out;
}
function normalizeCall(toolName, params, opts) {
  const kind = classify(toolName, opts?.toolKind);
  return {
    toolName,
    kind,
    params,
    command: extractCommand(params),
    paths: extractPaths(params, opts?.derivedPaths),
    mcpServer: kind === "mcp" ? str(params.server) ?? str(params.serverName) ?? str(params._server) : void 0,
    cwd: str(params.cwd) ?? str(params.workdir)
  };
}

// src/guardian/pi-gate.ts
var blocked = (reason, rule) => `\u{1F6E1} ORIRO Guardian blocked this action \u2014 ${reason} [${rule}]`;
function registerGuardian(pi) {
  pi.on("tool_call", async (event, ctx) => {
    const cfg = readGuardianConfig();
    if (!cfg.enabled) return void 0;
    const call = normalizeCall(event.toolName, event.input ?? {});
    const verdict = await analyze(call, evaluate(call, resolvePolicy(cfg)));
    const noteworthy = verdict.rule !== "allow" && verdict.rule !== "allowlist";
    const audit = (resolved) => {
      if (!noteworthy) return;
      const entry = {
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        decision: verdict.decision,
        severity: verdict.severity,
        rule: verdict.rule,
        reason: verdict.reason,
        toolName: call.toolName,
        kind: call.kind,
        command: call.command,
        mcpServer: call.mcpServer,
        ...resolved ? { resolved } : {}
      };
      recordAudit(entry);
    };
    if (verdict.decision === "block") {
      audit("denied");
      return { block: true, reason: blocked(verdict.reason, verdict.rule) };
    }
    if (verdict.decision === "ask") {
      if (!ctx.hasUI) {
        audit("denied");
        return { block: true, reason: `\u{1F6E1} ORIRO Guardian blocked (no UI to approve) \u2014 ${verdict.reason} [${verdict.rule}]` };
      }
      const choice = await ctx.ui.select(
        `\u{1F6E1} ORIRO Guardian \u2014 ${verdict.reason}
Tool: ${call.toolName}${call.command ? `
Command: ${call.command}` : ""}

Allow this action?`,
        ["Deny", "Allow once"]
      );
      const allowed = choice === "Allow once";
      audit(allowed ? "allowed" : "denied");
      return allowed ? void 0 : { block: true, reason: "Denied by user" };
    }
    audit();
    return void 0;
  });
}

// src/guardian/mcp.ts
function vetMcpServer(name, server) {
  const command = typeof server.command === "string" ? server.command : "";
  const args = Array.isArray(server.args) ? server.args.map(String).join(" ") : "";
  const url = typeof server.url === "string" ? server.url : "";
  const env = server.env && typeof server.env === "object" ? Object.entries(server.env).map(([k, v]) => `${k}=${String(v)}`).join(" ") : "";
  const blob = [command, args, url, env].filter(Boolean).join(" ");
  return evaluate(
    {
      toolName: name,
      kind: "mcp",
      params: server,
      command: blob || void 0,
      mcpServer: name
    },
    resolvePolicy(readGuardianConfig())
  );
}

// src/guardian/activate.ts
var modelFetcher = null;
async function activateGuardian() {
  if (!isGuardianActivated()) {
    writeGuardianConfig({ ...DEFAULT_GUARDIAN_CONFIG });
  }
  const cfg = readGuardianConfig();
  if (!cfg.modelReady && modelFetcher) {
    void (async () => {
      try {
        await modelFetcher();
        writeGuardianConfig({ ...readGuardianConfig(), modelReady: true });
      } catch {
      }
    })();
  }
  return "\u{1F6E1} ORIRO Guardian V3 is now protecting this terminal (always on).";
}

// src/avatar/avatars.json
var avatars_default = { avatars: [{ id: "813db996ee7b20af", slug: "gen-z-01", category: "Gen Z", image_url: "/api/avatars/img/gen-z-01" }, { id: "ad694588da43b13b", slug: "gen-z-02", category: "Gen Z", image_url: "/api/avatars/img/gen-z-02" }, { id: "e8b93ac755c364b3", slug: "gen-z-04", category: "Gen Z", image_url: "/api/avatars/img/gen-z-04" }, { id: "cb54bb7ba0accb9b", slug: "gen-z-06", category: "Gen Z", image_url: "/api/avatars/img/gen-z-06" }, { id: "3b49b273fd782408", slug: "gen-z-08", category: "Gen Z", image_url: "/api/avatars/img/gen-z-08" }, { id: "5dd4edb573e45563", slug: "gen-z-09", category: "Gen Z", image_url: "/api/avatars/img/gen-z-09" }, { id: "be1611ef3b188dbc", slug: "gen-z-10", category: "Gen Z", image_url: "/api/avatars/img/gen-z-10" }, { id: "960992c8484f38ae", slug: "fun-01", category: "Creative", image_url: "/api/avatars/img/fun-01" }, { id: "37c715a202014e62", slug: "fun-02", category: "Creative", image_url: "/api/avatars/img/fun-02" }, { id: "883abad238502939", slug: "fun-04", category: "Creative", image_url: "/api/avatars/img/fun-04" }, { id: "2fe883c65c464637", slug: "fun-05", category: "Creative", image_url: "/api/avatars/img/fun-05" }, { id: "d24b1d1df0afc221", slug: "fun-07", category: "Creative", image_url: "/api/avatars/img/fun-07" }, { id: "2168d77a76c5ebdc", slug: "fun-09", category: "Creative", image_url: "/api/avatars/img/fun-09" }, { id: "bf4ca588ca132f9a", slug: "fun-10", category: "Creative", image_url: "/api/avatars/img/fun-10" }, { id: "5d3a5f1effa56f71", slug: "fantasy-02", category: "Fantasy", image_url: "/api/avatars/img/fantasy-02" }, { id: "7532e949bff0abe6", slug: "fantasy-03", category: "Fantasy", image_url: "/api/avatars/img/fantasy-03" }, { id: "68702daf31710218", slug: "fantasy-05", category: "Fantasy", image_url: "/api/avatars/img/fantasy-05" }, { id: "b160d76a3fdbedbf", slug: "fantasy-06", category: "Fantasy", image_url: "/api/avatars/img/fantasy-06" }, { id: "719ad88a97de6cfc", slug: "fantasy-08", category: "Fantasy", image_url: "/api/avatars/img/fantasy-08" }, { id: "101558de2f8917bb", slug: "fantasy-10", category: "Fantasy", image_url: "/api/avatars/img/fantasy-10" }, { id: "4bb0e52a5a6d0edc", slug: "global-01", category: "Global", image_url: "/api/avatars/img/global-01" }, { id: "8824b9c348046047", slug: "global-03", category: "Global", image_url: "/api/avatars/img/global-03" }, { id: "81424ffd10547dac", slug: "global-04", category: "Global", image_url: "/api/avatars/img/global-04" }, { id: "737366b7d9df4549", slug: "global-06", category: "Global", image_url: "/api/avatars/img/global-06" }, { id: "93163fa1d46f21e1", slug: "global-08", category: "Global", image_url: "/api/avatars/img/global-08" }, { id: "f6075bcefff712da", slug: "global-09", category: "Global", image_url: "/api/avatars/img/global-09" }, { id: "be86a80bb94c84c8", slug: "expert-01", category: "Expert", image_url: "/api/avatars/img/expert-01" }, { id: "f7d6487e222bcc29", slug: "expert-02", category: "Expert", image_url: "/api/avatars/img/expert-02" }, { id: "d0aa93a43ad3a23e", slug: "expert-04", category: "Expert", image_url: "/api/avatars/img/expert-04" }, { id: "74ad39869e9d82ac", slug: "expert-05", category: "Expert", image_url: "/api/avatars/img/expert-05" }, { id: "8471765aad30231d", slug: "expert-07", category: "Expert", image_url: "/api/avatars/img/expert-07" }, { id: "834eadae5399d239", slug: "expert-09", category: "Expert", image_url: "/api/avatars/img/expert-09" }, { id: "b7f2e37653eea65e", slug: "expert-10", category: "Expert", image_url: "/api/avatars/img/expert-10" }, { id: "e3867b1ff11475b0", slug: "gen-z-05", category: "Gen Z", image_url: "/api/avatars/img/gen-z-05" }, { id: "cb6047052e603e7a", slug: "gen-z-07", category: "Gen Z", image_url: "/api/avatars/img/gen-z-07" }, { id: "117a54c7d49aea48", slug: "fun-03", category: "Creative", image_url: "/api/avatars/img/fun-03" }, { id: "81a5223da360f2e6", slug: "fun-06", category: "Creative", image_url: "/api/avatars/img/fun-06" }, { id: "2c817bedcb1b1fd0", slug: "fantasy-01", category: "Fantasy", image_url: "/api/avatars/img/fantasy-01" }, { id: "12280bbaa9e04ff5", slug: "fantasy-09", category: "Fantasy", image_url: "/api/avatars/img/fantasy-09" }, { id: "f6cd1faec4b371a6", slug: "global-02", category: "Global", image_url: "/api/avatars/img/global-02" }, { id: "c67691eb77e3b623", slug: "global-05", category: "Global", image_url: "/api/avatars/img/global-05" }, { id: "05417b4e7e122913", slug: "global-07", category: "Global", image_url: "/api/avatars/img/global-07" }, { id: "49e2532316daa4a6", slug: "global-10", category: "Global", image_url: "/api/avatars/img/global-10" }, { id: "c4cca88fa74e819c", slug: "expert-03", category: "Expert", image_url: "/api/avatars/img/expert-03" }, { id: "a894d2ef7ae29f2a", slug: "expert-06", category: "Expert", image_url: "/api/avatars/img/expert-06" }, { id: "d93e5fe1986cd8a3", slug: "gen-z-03", category: "Gen Z", image_url: "/api/avatars/img/gen-z-03" }, { id: "418f971b45ccf4c0", slug: "fun-08", category: "Creative", image_url: "/api/avatars/img/fun-08" }, { id: "870f8b85db72aad1", slug: "fantasy-04", category: "Fantasy", image_url: "/api/avatars/img/fantasy-04" }, { id: "02af33587005ec54", slug: "expert-08", category: "Expert", image_url: "/api/avatars/img/expert-08" }, { id: "f59fa0d2d4a52da9", slug: "fantasy-07", category: "Fantasy", image_url: "/api/avatars/img/fantasy-07" }, { id: "1adc5831f2a6cd83", slug: "alex", category: "Business", image_url: "/api/avatars/img/alex" }, { id: "7654cf80f7f49a91", slug: "sarah", category: "Business", image_url: "/api/avatars/img/sarah" }, { id: "9546cef00e19c2da", slug: "marcus", category: "Business", image_url: "/api/avatars/img/marcus" }, { id: "5d22a0dcde2ec384", slug: "diana", category: "Business", image_url: "/api/avatars/img/diana" }, { id: "99366ec1f89e00c9", slug: "leo", category: "Creativity", image_url: "/api/avatars/img/leo" }, { id: "3f85d0c0864ed624", slug: "zara", category: "Creativity", image_url: "/api/avatars/img/zara" }, { id: "816687d3bbfa94c6", slug: "kai", category: "Education", image_url: "/api/avatars/img/kai" }, { id: "777fa97d66765c7b", slug: "prof-james", category: "Education", image_url: "/api/avatars/img/prof-james" }, { id: "a15e356b6d211790", slug: "maya", category: "Education", image_url: "/api/avatars/img/maya" }, { id: "98ae5c5ae60410a5", slug: "ethan", category: "Education", image_url: "/api/avatars/img/ethan" }, { id: "6336f9e456fe8bf3", slug: "dr-nora", category: "Health", image_url: "/api/avatars/img/dr-nora" }, { id: "01edf97260e9c79a", slug: "jake", category: "Health", image_url: "/api/avatars/img/jake" }, { id: "67258a6b886f8bcb", slug: "luna", category: "Technology", image_url: "/api/avatars/img/luna" }, { id: "ab3dc37da75071e1", slug: "dr-ben", category: "Technology", image_url: "/api/avatars/img/dr-ben" }, { id: "b5af67d61b4253af", slug: "nova", category: "Technology", image_url: "/api/avatars/img/nova" }, { id: "4961c7e62c358235", slug: "dev", category: "Technology", image_url: "/api/avatars/img/dev" }, { id: "0f68f79143fe7f12", slug: "aria", category: "Finance", image_url: "/api/avatars/img/aria" }, { id: "8ee6daf89856b905", slug: "victor", category: "Finance", image_url: "/api/avatars/img/victor" }, { id: "9c651cb88d46adee", slug: "claire", category: "Finance", image_url: "/api/avatars/img/claire" }, { id: "9dcd063928b84355", slug: "rico", category: "Finance", image_url: "/api/avatars/img/rico" }], categories: ["Business", "Creative", "Creativity", "Education", "Expert", "Fantasy", "Finance", "Gen Z", "Global", "Health", "Technology"] };

// src/avatar/manifest.ts
var MANIFEST = avatars_default;
var AVATARS = MANIFEST.avatars ?? [];
var AVATAR_ORIGIN = "https://oriro.ai";
function avatarCategories() {
  const seen = /* @__PURE__ */ new Set();
  for (const a of AVATARS) seen.add(a.category);
  return [...seen];
}
function avatarsInCategory(category) {
  const c = category.toLowerCase();
  return AVATARS.filter((a) => a.category.toLowerCase() === c);
}
function avatarBySlug(slug) {
  const s = (slug || "").toLowerCase();
  return AVATARS.find((a) => a.slug.toLowerCase() === s);
}
function avatarImageUrl(a) {
  return a.image_url.startsWith("http") ? a.image_url : `${AVATAR_ORIGIN}${a.image_url}`;
}
var AVATAR_COUNT = AVATARS.length;

// src/avatar/config.ts
import { join as join5 } from "path";
import { readFileSync as readFileSync4, writeFileSync as writeFileSync3 } from "fs";
var FILE3 = () => join5(oriroDir(), "avatar.json");
function readAvatarConfig() {
  try {
    return JSON.parse(readFileSync4(FILE3(), "utf8"));
  } catch {
    return null;
  }
}
function writeAvatarConfig(cfg) {
  const f = join5(ensureOriroDir(), "avatar.json");
  writeFileSync3(f, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}
function isAvatarConfigured() {
  return readAvatarConfig() !== null;
}
function getSelectedAvatar() {
  const cfg = readAvatarConfig();
  return cfg && avatarBySlug(cfg.slug) || null;
}
function setSelectedAvatar(avatar, opts) {
  const cfg = {
    slug: avatar.slug,
    voiceId: avatar.voice_id,
    show: true,
    speak: opts?.speak ?? false
  };
  writeAvatarConfig(cfg);
  return cfg;
}

// src/avatar/cache.ts
import { homedir as homedir3 } from "os";
import { join as join6 } from "path";
import { mkdirSync as mkdirSync3, readFileSync as readFileSync5, writeFileSync as writeFileSync4, statSync } from "fs";
var CACHE_DIR = join6(homedir3(), ".oriro", "avatars");
function avatarCachePath(slug) {
  return join6(CACHE_DIR, `${slug}.png`);
}
function isAvatarCached(slug) {
  try {
    return statSync(avatarCachePath(slug)).size > 0;
  } catch {
    return false;
  }
}
async function ensureAvatarImage(avatar) {
  const path = avatarCachePath(avatar.slug);
  if (isAvatarCached(avatar.slug)) return path;
  const res = await fetch(avatarImageUrl(avatar));
  if (!res.ok) throw new Error(`avatar image fetch failed (${res.status}) for ${avatar.slug}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  mkdirSync3(CACHE_DIR, { recursive: true });
  writeFileSync4(path, bytes);
  return path;
}
function readCachedAvatar(slug) {
  return new Uint8Array(readFileSync5(avatarCachePath(slug)));
}

// src/avatar/render.ts
function detectImageProtocol(env = process.env) {
  if (env.KITTY_WINDOW_ID || (env.TERM ?? "").includes("kitty")) return "kitty";
  const prog = env.TERM_PROGRAM ?? "";
  if (prog === "iTerm.app" || prog === "WezTerm" || env.LC_TERMINAL === "iTerm2") return "iterm2";
  return "none";
}
function toBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}
function encodeInlineImage(pngBytes, protocol) {
  const b64 = toBase64(pngBytes);
  if (protocol === "iterm2") {
    return `\x1B]1337;File=inline=1;width=12;preserveAspectRatio=1:${b64}\x07`;
  }
  if (protocol === "kitty") {
    const CHUNK = 4096;
    let out = "";
    for (let i = 0; i < b64.length; i += CHUNK) {
      const piece = b64.slice(i, i + CHUNK);
      const more = i + CHUNK < b64.length ? 1 : 0;
      const ctrl = i === 0 ? `a=T,f=100,m=${more}` : `m=${more}`;
      out += `\x1B_G${ctrl};${piece}\x1B\\`;
    }
    return out;
  }
  return null;
}
var C2 = { teal: "\x1B[38;2;34;184;166m", purple: "\x1B[38;2;155;93;229m", dim: "\x1B[2m", bold: "\x1B[1m", reset: "\x1B[0m" };
function renderCard(avatar, opts) {
  const name = avatar.slug.replace(/-/g, " ");
  const pulse = opts?.speaking ? `${C2.purple}\u266A speaking\u2026${C2.reset}` : `${C2.dim}idle${C2.reset}`;
  const w = Math.max(name.length, avatar.category.length, 14) + 2;
  const bar = "\u2500".repeat(w);
  return `  ${C2.teal}\u256D${bar}\u256E${C2.reset}
  ${C2.teal}\u2502${C2.reset} ${C2.bold}\u{1F9D1}\u200D\u{1F3A8} ${name}${C2.reset}${" ".repeat(Math.max(0, w - name.length - 4))}${C2.teal}\u2502${C2.reset}
  ${C2.teal}\u2502${C2.reset} ${C2.dim}${avatar.category}${C2.reset}${" ".repeat(Math.max(0, w - avatar.category.length - 1))}${C2.teal}\u2502${C2.reset}
  ${C2.teal}\u2502${C2.reset} ${pulse}${" ".repeat(Math.max(0, w - (opts?.speaking ? 11 : 4) - 1))}${C2.teal}\u2502${C2.reset}
  ${C2.teal}\u2570${bar}\u256F${C2.reset}
`;
}
function renderAvatar(avatar, pngBytes, opts) {
  const protocol = detectImageProtocol(opts?.env);
  if (pngBytes && protocol !== "none") {
    const img = encodeInlineImage(pngBytes, protocol);
    if (img) return img + (opts?.speaking ? `
  ${C2.purple}\u266A speaking\u2026${C2.reset}
` : "\n");
  }
  return renderCard(avatar, opts);
}

// src/avatar/voice.ts
import { spawn } from "child_process";
import { tmpdir } from "os";
import { join as join7 } from "path";
import { writeFileSync as writeFileSync5, rmSync } from "fs";
var synth = null;
var listener = null;
function registerVoiceSynth(fn) {
  synth = fn;
}
function registerVoiceListen(fn) {
  listener = fn;
}
function audioPlayers(file5) {
  if (process.platform === "darwin") return [{ cmd: "afplay", args: [file5] }];
  if (process.platform === "win32")
    return [
      { cmd: "powershell", args: ["-NoProfile", "-c", `(New-Object Media.SoundPlayer '${file5}').PlaySync()`] }
    ];
  return [
    { cmd: "aplay", args: ["-q", file5] },
    { cmd: "ffplay", args: ["-nodisp", "-autoexit", "-loglevel", "quiet", file5] },
    { cmd: "paplay", args: [file5] }
  ];
}
function playWav(wav) {
  const file5 = join7(tmpdir(), `oriro-avatar-${process.pid}-${wav.length}.wav`);
  writeFileSync5(file5, wav);
  const players = audioPlayers(file5);
  return new Promise((resolve) => {
    const tryPlayer = (i) => {
      if (i >= players.length) {
        rmSync(file5, { force: true });
        return resolve(false);
      }
      const p = players[i];
      if (!p) {
        rmSync(file5, { force: true });
        return resolve(false);
      }
      const child = spawn(p.cmd, p.args, { stdio: "ignore" });
      child.on("error", () => tryPlayer(i + 1));
      child.on("close", (code) => {
        rmSync(file5, { force: true });
        resolve(code === 0);
      });
    };
    tryPlayer(0);
  });
}
async function speak(text, opts = {}) {
  if (!synth || !text.trim()) return false;
  try {
    const wav = await synth(text, opts);
    return await playWav(wav);
  } catch {
    return false;
  }
}
async function listen() {
  if (!listener) return null;
  try {
    return await listener();
  } catch {
    return null;
  }
}

// src/avatar/onboarding.ts
import { stdin as stdin2, stdout as stdout3 } from "process";
import { createInterface as createInterface2 } from "readline/promises";

// src/avatar/system-voice.ts
import { spawn as spawn2 } from "child_process";
import { tmpdir as tmpdir2 } from "os";
import { join as join8 } from "path";
import { existsSync, readFileSync as readFileSync6, rmSync as rmSync2 } from "fs";
function tmpWav() {
  return join8(tmpdir2(), `oriro-tts-${process.pid}-${Date.now()}-${Math.floor(performance.now())}.wav`);
}
function readAndClean(file5) {
  const buf = readFileSync6(file5);
  rmSync2(file5, { force: true });
  return new Uint8Array(buf);
}
function winSapi(text, lang) {
  const out = tmpWav();
  const culture = lang ? `'${lang.replace(/'/g, "")}'` : "$null";
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $c = ${culture}; if ($c) { try { $s.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, (New-Object System.Globalization.CultureInfo($c))) } catch {} } $s.SetOutputToWaveFile('${out}'); $s.Speak([Console]::In.ReadToEnd()); $s.Dispose();`;
  return new Promise((resolve, reject) => {
    const p = spawn2("powershell", ["-NoProfile", "-Command", ps], { stdio: ["pipe", "ignore", "ignore"] });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0 && existsSync(out)) resolve(readAndClean(out));
      else reject(new Error("SAPI synth failed"));
    });
    p.stdin.write(text);
    p.stdin.end();
  });
}
function macSay(text) {
  const out = tmpWav();
  return new Promise((resolve, reject) => {
    const p = spawn2("say", ["-o", out, "--data-format=LEI16@22050", text], { stdio: "ignore" });
    p.on("error", reject);
    p.on(
      "close",
      (code) => code === 0 && existsSync(out) ? resolve(readAndClean(out)) : reject(new Error("say failed"))
    );
  });
}
function linuxEspeak(text) {
  const out = tmpWav();
  return new Promise((resolve, reject) => {
    const p = spawn2("espeak", ["-w", out, text], { stdio: "ignore" });
    p.on("error", reject);
    p.on(
      "close",
      (code) => code === 0 && existsSync(out) ? resolve(readAndClean(out)) : reject(new Error("espeak failed"))
    );
  });
}
var systemVoiceSynth = async (text, opts) => {
  if (process.platform === "win32") return winSapi(text, opts.lang);
  if (process.platform === "darwin") return macSay(text);
  return linuxEspeak(text);
};
var wired = false;
function setupSystemVoice() {
  if (wired) return;
  registerVoiceSynth(systemVoiceSynth);
  wired = true;
}

// src/avatar/onboarding.ts
var C3 = {
  teal: "\x1B[38;2;34;184;166m",
  purple: "\x1B[38;2;155;93;229m",
  dim: "\x1B[2m",
  bold: "\x1B[1m",
  reset: "\x1B[0m"
};
async function previewAvatar(avatar) {
  stdout3.write(
    `
  ${C3.teal}\u25EF${C3.reset} ${C3.bold}${avatar.slug}${C3.reset} is now your terminal face. ${C3.dim}Change anytime with ${C3.reset}${C3.teal}oriro avatar${C3.reset}
`
  );
  let png = null;
  try {
    await ensureAvatarImage(avatar);
    png = readCachedAvatar(avatar.slug);
  } catch {
  }
  stdout3.write("\n" + renderAvatar(avatar, png) + "\n");
  setupSystemVoice();
  const spoke = await speak(`Hi, I'm ${avatar.slug}, your ORIRO terminal face. I'll speak your replies.`, {
    voiceId: avatar.slug,
    lang: "en-US"
  });
  if (spoke) stdout3.write(`  ${C3.dim}(spoken aloud in your terminal's voice)${C3.reset}
`);
}
async function selectAvatarInteractive() {
  const rl = createInterface2({ input: stdin2, output: stdout3 });
  try {
    stdout3.write(
      `
  ${C3.teal}\u25EF${C3.reset} ${C3.bold}Choose your ORIRO avatar${C3.reset} ${C3.dim}\u2014 ${AVATAR_COUNT} faces, it floats in your terminal and speaks.${C3.reset}

`
    );
    const cats = avatarCategories();
    cats.forEach(
      (cat2, i) => stdout3.write(
        `  ${C3.teal}${String(i + 1).padStart(2)}${C3.reset}  ${cat2} ${C3.dim}(${avatarsInCategory(cat2).length})${C3.reset}
`
      )
    );
    let cat;
    for (; ; ) {
      const ans = (await ask(rl, `
  ${C3.teal}\u203A${C3.reset} Pick a category number ${C3.dim}(or Enter to skip)${C3.reset}: `)).trim();
      if (!ans) {
        stdout3.write(`  ${C3.dim}Skipped \u2014 no avatar.${C3.reset}
`);
        return null;
      }
      const n = Number(ans);
      cat = Number.isInteger(n) ? cats[n - 1] : void 0;
      if (cat) break;
      stdout3.write(`  ${C3.dim}Please enter a number from the list.${C3.reset}
`);
    }
    const list = avatarsInCategory(cat);
    stdout3.write("\n");
    list.forEach(
      (a, i) => stdout3.write(`  ${C3.teal}${String(i + 1).padStart(2)}${C3.reset}  ${a.slug}
`)
    );
    for (; ; ) {
      const ans = (await ask(rl, `
  ${C3.teal}\u203A${C3.reset} Pick an avatar number ${C3.dim}(or Enter to skip)${C3.reset}: `)).trim();
      if (!ans) {
        stdout3.write(`  ${C3.dim}Skipped \u2014 no avatar.${C3.reset}
`);
        return null;
      }
      const n = Number(ans);
      const chosen = Number.isInteger(n) ? list[n - 1] : void 0;
      if (chosen) return chosen;
      stdout3.write(`  ${C3.dim}Please enter a number from the list.${C3.reset}
`);
    }
  } finally {
    rl.close();
  }
}
async function runAvatarOnboarding() {
  if (isAvatarConfigured()) {
    return;
  }
  const chosen = await selectAvatarInteractive();
  if (!chosen) {
    return;
  }
  setSelectedAvatar(chosen, { speak: true });
  await previewAvatar(chosen);
}

// src/scribe/consent.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync4, readFileSync as readFileSync7, writeFileSync as writeFileSync6 } from "fs";
import { dirname, join as join9 } from "path";

// src/utils.ts
var CONFIG_DIR = oriroDir();

// src/scribe/consent.ts
function consentFile() {
  const override = process.env.ORIRO_SCRIBE_DIR?.trim();
  return override && override.length > 0 ? join9(override, "consent.json") : join9(CONFIG_DIR, "scribe.json");
}
function isScribeEnabled() {
  try {
    const f = consentFile();
    if (!existsSync2(f)) return false;
    const data = JSON.parse(readFileSync7(f, "utf8"));
    return data.enabled === true;
  } catch {
    return false;
  }
}
function setScribeConsent(enabled) {
  const f = consentFile();
  mkdirSync4(dirname(f), { recursive: true });
  const state = { enabled, consentedAt: (/* @__PURE__ */ new Date()).toISOString() };
  writeFileSync6(f, `${JSON.stringify(state, null, 2)}
`, "utf8");
  return state;
}
function hasScribeChoice() {
  try {
    return existsSync2(consentFile());
  } catch {
    return false;
  }
}

// src/routers/onboarding.ts
import { createInterface as createInterface3 } from "readline/promises";
import { stdin as stdin3, stdout as stdout4 } from "process";
import { existsSync as existsSync4, mkdirSync as mkdirSync7, writeFileSync as writeFileSync9 } from "fs";
import { join as join12 } from "path";

// src/routers/catalog.ts
var C4 = (e) => ({
  api: "openai-completions",
  freeModels: [],
  tier: "free",
  kind: "chat",
  ...e
});
var ROUTER_CATALOG = [
  // ── Keyless & live-verified (works now, zero keys, through the agent) ──
  C4({
    id: "pollinations",
    displayName: "Pollinations",
    baseUrl: "https://text.pollinations.ai/openai",
    freeModels: ["openai", "mistral"],
    obtainUrl: "https://pollinations.ai",
    keyless: true,
    verified: true
  }),
  // ── Free, no credit card — user brings a free token (validated at add-time) ──
  // LLM7 serves anonymously over raw HTTP but REJECTS a bogus bearer, and the agent
  // transport must send one for remote URLs — so it is NOT keyless-through-the-agent.
  // A free token (no card) at llm7.io makes it work via `oriro routers add llm7 --key`.
  C4({
    id: "llm7",
    displayName: "LLM7.io",
    baseUrl: "https://api.llm7.io/v1",
    freeModels: ["codestral-latest", "kimi-k2.6", "gpt-5.4-mini", "deepseek-v4-flash"],
    obtainUrl: "https://llm7.io"
  }),
  // ── Free, no credit card — user brings a free key (validated at add-time) ──
  C4({
    id: "openrouter",
    displayName: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    freeModels: ["deepseek/deepseek-chat-v3-0324:free", "moonshotai/kimi-k2.6:free"],
    obtainUrl: "https://openrouter.ai/keys"
  }),
  C4({
    id: "requesty",
    displayName: "Requesty",
    baseUrl: "https://router.requesty.ai/v1",
    freeModels: ["google/gemini-2.0-flash-exp"],
    obtainUrl: "https://requesty.ai"
  }),
  C4({
    id: "google",
    displayName: "Google AI Studio",
    api: "google-generative-ai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    freeModels: ["gemini-2.5-flash", "gemini-2.0-flash"],
    obtainUrl: "https://aistudio.google.com/apikey"
  }),
  C4({
    id: "groq",
    displayName: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    freeModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    obtainUrl: "https://console.groq.com/keys"
  }),
  C4({
    id: "mistral",
    displayName: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    freeModels: ["mistral-small-latest"],
    obtainUrl: "https://console.mistral.ai/api-keys"
  }),
  C4({
    id: "cerebras",
    displayName: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    freeModels: ["llama-3.3-70b", "llama3.1-8b"],
    obtainUrl: "https://cloud.cerebras.ai"
  }),
  C4({
    id: "cloudflare",
    displayName: "Cloudflare Workers AI",
    baseUrl: "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
    freeModels: ["@cf/meta/llama-3.1-8b-instruct"],
    obtainUrl: "https://dash.cloudflare.com/profile/api-tokens"
  }),
  C4({
    id: "github-models",
    displayName: "GitHub Models",
    baseUrl: "https://models.inference.ai.azure.com",
    freeModels: ["gpt-4o-mini"],
    obtainUrl: "https://github.com/marketplace/models"
  }),
  C4({
    id: "nvidia",
    displayName: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    freeModels: ["moonshotai/kimi-k2.6", "meta/llama-3.1-8b-instruct"],
    obtainUrl: "https://build.nvidia.com"
  }),
  C4({
    id: "sambanova",
    displayName: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1",
    freeModels: ["Meta-Llama-3.3-70B-Instruct"],
    obtainUrl: "https://cloud.sambanova.ai"
  }),
  C4({
    id: "siliconflow",
    displayName: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    freeModels: ["Qwen/Qwen2.5-7B-Instruct"],
    obtainUrl: "https://siliconflow.cn"
  }),
  C4({
    id: "deepseek",
    displayName: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    freeModels: ["deepseek-chat"],
    obtainUrl: "https://platform.deepseek.com/api_keys"
  }),
  C4({
    id: "zai",
    displayName: "Z.AI GLM",
    baseUrl: "https://api.z.ai/api/paas/v4",
    freeModels: ["glm-4-flash"],
    obtainUrl: "https://z.ai"
  }),
  C4({
    id: "scaleway",
    displayName: "Scaleway",
    baseUrl: "https://api.scaleway.ai/v1",
    freeModels: ["llama-3.1-8b-instruct"],
    obtainUrl: "https://console.scaleway.com"
  }),
  C4({
    id: "xai",
    displayName: "xAI Grok",
    baseUrl: "https://api.x.ai/v1",
    freeModels: ["grok-2-latest"],
    obtainUrl: "https://console.x.ai"
  }),
  C4({
    id: "together",
    displayName: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    freeModels: ["meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"],
    obtainUrl: "https://api.together.ai"
  }),
  C4({
    id: "fireworks",
    displayName: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    freeModels: ["accounts/fireworks/models/llama-v3p1-8b-instruct"],
    obtainUrl: "https://fireworks.ai"
  }),
  C4({
    id: "ai21",
    displayName: "AI21 Labs",
    baseUrl: "https://api.ai21.com/studio/v1",
    freeModels: ["jamba-mini"],
    obtainUrl: "https://studio.ai21.com"
  }),
  C4({
    id: "hyperbolic",
    displayName: "Hyperbolic",
    baseUrl: "https://api.hyperbolic.xyz/v1",
    freeModels: ["meta-llama/Meta-Llama-3.1-8B-Instruct"],
    obtainUrl: "https://app.hyperbolic.xyz"
  }),
  C4({
    id: "nebius",
    displayName: "Nebius",
    baseUrl: "https://api.studio.nebius.ai/v1",
    freeModels: ["meta-llama/Meta-Llama-3.1-8B-Instruct"],
    obtainUrl: "https://studio.nebius.ai"
  }),
  C4({
    id: "novita",
    displayName: "Novita",
    baseUrl: "https://api.novita.ai/v3/openai",
    freeModels: ["meta-llama/llama-3.1-8b-instruct"],
    obtainUrl: "https://novita.ai"
  }),
  C4({
    id: "upstage",
    displayName: "Upstage",
    baseUrl: "https://api.upstage.ai/v1/solar",
    freeModels: ["solar-mini"],
    obtainUrl: "https://console.upstage.ai"
  }),
  C4({
    id: "nlpcloud",
    displayName: "NLP Cloud",
    baseUrl: "https://api.nlpcloud.io/v1",
    freeModels: ["finetuned-llama-3-70b"],
    obtainUrl: "https://nlpcloud.com"
  }),
  C4({
    id: "baseten",
    displayName: "Baseten",
    baseUrl: "https://inference.baseten.co/v1",
    freeModels: ["llama-3.1-8b-instruct"],
    obtainUrl: "https://baseten.co"
  }),
  C4({
    id: "anyscale",
    displayName: "Anyscale",
    baseUrl: "https://api.endpoints.anyscale.com/v1",
    freeModels: ["meta-llama/Meta-Llama-3.1-8B-Instruct"],
    obtainUrl: "https://anyscale.com"
  }),
  C4({
    id: "inference-net",
    displayName: "Inference.net",
    baseUrl: "https://api.inference.net/v1",
    freeModels: ["meta-llama/llama-3.1-8b-instruct"],
    obtainUrl: "https://inference.net"
  }),
  C4({
    id: "cohere",
    displayName: "Cohere",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    freeModels: ["command-r-08-2024"],
    obtainUrl: "https://dashboard.cohere.com/api-keys"
  }),
  C4({
    id: "chutes",
    displayName: "Chutes",
    baseUrl: "https://llm.chutes.ai/v1",
    freeModels: ["deepseek-ai/DeepSeek-V3"],
    obtainUrl: "https://chutes.ai"
  }),
  C4({
    id: "berget",
    displayName: "Berget AI",
    baseUrl: "https://api.berget.ai/v1",
    freeModels: ["mistralai/Mistral-Small-Instruct"],
    obtainUrl: "https://berget.ai"
  }),
  C4({
    id: "huggingface",
    displayName: "Hugging Face",
    baseUrl: "https://router.huggingface.co/v1",
    freeModels: ["meta-llama/Llama-3.2-3B-Instruct"],
    obtainUrl: "https://huggingface.co/settings/tokens"
  }),
  C4({
    id: "replicate",
    displayName: "Replicate",
    baseUrl: "https://api.replicate.com/v1",
    freeModels: ["meta/meta-llama-3.1-8b-instruct"],
    obtainUrl: "https://replicate.com/account/api-tokens"
  }),
  // ── Free gateways/proxies (no CC) — route through your own provider keys ──
  C4({
    id: "vercel-ai-gateway",
    displayName: "Vercel AI Gateway",
    baseUrl: "https://ai-gateway.vercel.sh/v1",
    freeModels: ["openai/gpt-4o-mini"],
    obtainUrl: "https://vercel.com/ai-gateway"
  }),
  C4({
    id: "portkey",
    displayName: "Portkey",
    baseUrl: "https://api.portkey.ai/v1",
    freeModels: [],
    obtainUrl: "https://portkey.ai"
  }),
  C4({
    id: "helicone",
    displayName: "Helicone",
    baseUrl: "https://oai.helicone.ai/v1",
    freeModels: [],
    obtainUrl: "https://helicone.ai"
  }),
  C4({
    id: "litellm",
    displayName: "LiteLLM (self-hosted)",
    baseUrl: "http://localhost:4000/v1",
    freeModels: [],
    keyless: true
  }),
  C4({
    id: "ollama",
    displayName: "Ollama (local)",
    api: "ollama",
    baseUrl: "http://localhost:11434/v1",
    freeModels: ["llama3.2"],
    keyless: true
  }),
  // ── Image / speech services (catalog completeness; not chat-routable by the Mux) ──
  C4({
    id: "stability",
    displayName: "Stability AI",
    baseUrl: "https://api.stability.ai/v2beta",
    freeModels: ["stable-image-core"],
    obtainUrl: "https://platform.stability.ai",
    kind: "image"
  }),
  C4({
    id: "fal",
    displayName: "fal.ai",
    baseUrl: "https://fal.run",
    freeModels: ["fal-ai/flux/schnell"],
    obtainUrl: "https://fal.ai",
    kind: "image"
  }),
  C4({
    id: "wavespeed",
    displayName: "WaveSpeedAI",
    baseUrl: "https://api.wavespeed.ai",
    freeModels: [],
    obtainUrl: "https://wavespeed.ai",
    kind: "image"
  }),
  C4({
    id: "ai-horde",
    displayName: "AI Horde",
    baseUrl: "https://aihorde.net/api/v2",
    freeModels: [],
    obtainUrl: "https://aihorde.net",
    keyless: true,
    kind: "image"
  }),
  C4({
    id: "assemblyai",
    displayName: "AssemblyAI",
    baseUrl: "https://api.assemblyai.com/v2",
    freeModels: [],
    obtainUrl: "https://assemblyai.com",
    kind: "speech"
  }),
  // ── Paid (requires payment/recharge — moved out of free per the CC rule) ──
  C4({
    id: "moonshot",
    displayName: "Moonshot (Direct)",
    baseUrl: "https://api.moonshot.ai/v1",
    freeModels: ["kimi-k2.6"],
    obtainUrl: "https://platform.moonshot.ai",
    tier: "paid"
  }),
  // ── ORIRO models — coming soon, greyed/"(free)", not selectable yet ──
  C4({ id: "oriro-gauss", displayName: "ORIRO-Gauss", baseUrl: "", comingSoon: true }),
  C4({ id: "oriro-avila", displayName: "ORIRO-Avila", baseUrl: "", comingSoon: true })
];
function routerById(id) {
  return ROUTER_CATALOG.find((r) => r.id === id);
}

// src/routers/router-pool.ts
import { mkdirSync as mkdirSync6, readFileSync as readFileSync9, writeFileSync as writeFileSync8 } from "fs";
import { join as join11 } from "path";

// src/routers/pool.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync5, readFileSync as readFileSync8, writeFileSync as writeFileSync7 } from "fs";
import { join as join10 } from "path";
function poolFile(dir) {
  return join10(dir, "routers", "selected.json");
}
function loadPool(dir) {
  const p = poolFile(dir);
  if (!existsSync3(p)) return [];
  try {
    const v = JSON.parse(readFileSync8(p, "utf8"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function savePool(dir, ids) {
  mkdirSync5(join10(dir, "routers"), { recursive: true });
  writeFileSync7(poolFile(dir), JSON.stringify([...new Set(ids)], null, 2), "utf8");
}

// src/routers/validate.ts
var PROBE_TIMEOUT_MS = 12e3;
async function validateRouter(entry, key, modelId) {
  const model = modelId ?? entry.freeModels[0] ?? "";
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    let res;
    if (entry.api === "google-generative-ai") {
      const url = `${entry.baseUrl.replace(/\/$/, "")}/models/${model}:generateContent${key ? `?key=${encodeURIComponent(key)}` : ""}`;
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
        signal: controller.signal
      });
    } else {
      const headers = { "content-type": "application/json" };
      if (key) headers.authorization = `Bearer ${key}`;
      res = await fetch(`${entry.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1
        }),
        signal: controller.signal
      });
    }
    return {
      ok: res.ok,
      latencyMs: Date.now() - t0,
      model,
      error: res.ok ? void 0 : `HTTP ${res.status}`
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      model,
      error: e instanceof Error ? e.message : String(e)
    };
  } finally {
    clearTimeout(timer);
  }
}

// src/routers/router-pool.ts
var KEYLESS_SENTINEL = "oriro-keyless-no-key-required";
function regFile() {
  return join11(oriroDir(), "routers", "registered.json");
}
function readReg() {
  try {
    return JSON.parse(readFileSync9(regFile(), "utf8"));
  } catch {
    return {};
  }
}
function writeReg(m) {
  mkdirSync6(join11(oriroDir(), "routers"), { recursive: true });
  writeFileSync8(regFile(), JSON.stringify(m, null, 2), "utf8");
}
async function addRouter(entry, opts) {
  if (entry.comingSoon) {
    return { ok: false, validation: { ok: false, latencyMs: 0, model: "", error: "coming soon" } };
  }
  if (entry.kind && entry.kind !== "chat") {
    return { ok: false, validation: { ok: false, latencyMs: 0, model: "", error: `'${entry.id}' is a ${entry.kind} router, not a chat router` } };
  }
  const key = opts?.key ?? (entry.keyless ? KEYLESS_SENTINEL : void 0);
  const v = await validateRouter(entry, key, opts?.modelId);
  if (!v.ok) return { ok: false, validation: v };
  const router = {
    id: entry.id,
    name: entry.displayName,
    baseUrl: entry.baseUrl,
    model: opts?.modelId ?? v.model ?? entry.freeModels[0] ?? "",
    apiKey: key ?? KEYLESS_SENTINEL
  };
  const reg = readReg();
  reg[entry.id] = router;
  writeReg(reg);
  savePool(oriroDir(), [...loadPool(oriroDir()), entry.id]);
  return { ok: true, validation: v };
}
function useRouters(ids) {
  const reg = readReg();
  const applied = ids.filter((id) => reg[id]);
  const unknown = ids.filter((id) => !reg[id]);
  if (applied.length > 0) savePool(oriroDir(), applied);
  return { applied, unknown };
}
function registeredRouters() {
  return Object.values(readReg());
}
function resolvePool() {
  const reg = readReg();
  return loadPool(oriroDir()).map((id) => reg[id]).filter((r) => Boolean(r));
}

// src/routers/onboarding.ts
function markerFile() {
  return join12(oriroDir(), "routers", "onboarded.json");
}
function hasRouterChoice() {
  try {
    return existsSync4(markerFile());
  } catch {
    return false;
  }
}
function markRouterOnboarded() {
  try {
    mkdirSync7(join12(oriroDir(), "routers"), { recursive: true });
    writeFileSync9(markerFile(), `${JSON.stringify({ onboardedAt: (/* @__PURE__ */ new Date()).toISOString() }, null, 2)}
`, "utf8");
  } catch {
  }
}
async function runRouterOnboarding() {
  stdout4.write(
    `
  ${accent("Routers")} \u2014 ORIRO runs on a ${accent("free keyless router")} by default. No key, $0, works right now.
  ${dim("Add your own key (any free provider) for a faster, private lane \u2014 or skip and stay keyless.")}
`
  );
  const rl = createInterface3({ input: stdin3, output: stdout4 });
  try {
    const add = (await ask(rl, `  Add your own key now? ${dim("[y/N]")} `)).trim().toLowerCase();
    if (add === "y" || add === "yes") {
      const picks = ROUTER_CATALOG.filter(
        (r) => !r.comingSoon && !r.keyless && (!r.kind || r.kind === "chat")
      ).slice(0, 8);
      stdout4.write(`
  ${dim("Free providers (grab a free key from each provider's site):")}
`);
      for (const r of picks) {
        stdout4.write(`    ${accent(r.id.padEnd(14))} ${dim(r.displayName)}
`);
      }
      stdout4.write(`    ${dim("\u2026or any id from `oriro routers list`")}

`);
      const slug = (await ask(rl, `  Which provider? ${dim("(id, or blank to skip)")} `)).trim();
      if (slug) {
        const entry = routerById(slug);
        if (!entry) {
          stdout4.write(`  ${dim(`Unknown '${slug}' \u2014 skipped. You can add it later: oriro routers add ${slug}`)}
`);
        } else {
          const key = (await ask(rl, `  Paste your ${accent(entry.displayName)} API key: `)).trim();
          if (key) {
            stdout4.write(`  ${dim("Validating\u2026")}
`);
            const res = await addRouter(entry, { key });
            if (res.ok) {
              stdout4.write(
                `  ${accent("\u2713")} added ${accent(slug)} (${res.validation.latencyMs}ms) \u2014 it now races in your pool.
`
              );
            } else {
              stdout4.write(
                `  ${dim(`Couldn't add ${slug}: ${res.validation.error ?? "validation failed"}. Staying keyless \u2014 retry: oriro routers add ${slug} --key <key>`)}
`
              );
            }
          } else {
            stdout4.write(`  ${dim("No key entered \u2014 staying keyless.")}
`);
          }
        }
      }
    }
  } finally {
    rl.close();
  }
  markRouterOnboarded();
  stdout4.write(`  ${dim("Manage routers anytime: ")}${accent("oriro routers list \xB7 add \xB7 use")}
`);
}

// src/onboarding/wrapper.ts
function isFirstRun() {
  return !isLanguageConfigured() || !hasScribeChoice();
}
async function askYesNo(question) {
  const rl = createInterface4({ input: stdin4, output: stdout5 });
  try {
    const a = (await ask(rl, `${question} ${dim("[Y/n]")} `)).trim().toLowerCase();
    return a === "" || a === "y" || a === "yes";
  } finally {
    rl.close();
  }
}
async function runOnboarding() {
  stdout5.write(banner());
  await runLanguageOnboarding();
  await activateGuardian();
  stdout5.write(`  ${accent("\u{1F6E1} Guardian V3")} is on by default. ${accent("\u{1F9ED} Head")} is ready.

`);
  if (!isAvatarConfigured()) await runAvatarOnboarding();
  if (!hasScribeChoice()) {
    const yes = await askYesNo(
      "Remember with me? The Scriber keeps your work in context on THIS machine only \u2014 it never leaves it."
    );
    setScribeConsent(yes);
    stdout5.write(yes ? `  ${accent("\u{1F4D3} Scriber")} on.
` : `  ${dim("Scriber off \u2014 `oriro scribe on` anytime.")}
`);
  }
  if (!hasRouterChoice()) await runRouterOnboarding();
  stdout5.write(`
  ${accent("ORIRO is ready.")} ${dim("Type to chat \xB7 /exit to leave")}

`);
}

// src/onboarding/assemble.ts
import {
  createAgentSession as createAgentSession2,
  AuthStorage as AuthStorage2,
  ModelRegistry as ModelRegistry2,
  SessionManager as SessionManager2,
  SettingsManager,
  DefaultResourceLoader,
  getAgentDir
} from "@earendil-works/pi-coding-agent";

// src/routers/mux-provider.ts
import { streamSimple as piStreamSimple, createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { register as registerOpenAICompletions } from "@earendil-works/pi-ai/openai-completions";

// src/routers/mux.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync8, readFileSync as readFileSync10, writeFileSync as writeFileSync10 } from "fs";
import { join as join13 } from "path";
var COOLDOWN_DEFAULT_MS = 6e4;
var UNHEALTHY_AFTER = 3;
var RouterMux = class {
  stats = /* @__PURE__ */ new Map();
  now;
  constructor(routerIds, now = () => Date.now()) {
    this.now = now;
    for (const id of routerIds) {
      this.stats.set(id, {
        id,
        latencyMs: Number.POSITIVE_INFINITY,
        healthy: true,
        cooldownUntil: 0,
        consecutiveErrors: 0
      });
    }
  }
  /** Available routers, best-first (healthy, not cooling down, lowest latency). */
  ranked() {
    const t = this.now();
    return [...this.stats.values()].filter((s) => s.healthy && s.cooldownUntil <= t).sort((a, b) => a.latencyMs - b.latencyMs).map((s) => s.id);
  }
  recordSuccess(id, latencyMs) {
    const s = this.stats.get(id);
    if (!s) return;
    s.latencyMs = s.latencyMs === Number.POSITIVE_INFINITY ? latencyMs : 0.7 * s.latencyMs + 0.3 * latencyMs;
    s.consecutiveErrors = 0;
    s.healthy = true;
  }
  recordFailure(id, err) {
    const s = this.stats.get(id);
    if (!s) return;
    s.consecutiveErrors += 1;
    if (err?.status === 429) {
      s.cooldownUntil = this.now() + (err.retryAfterMs ?? COOLDOWN_DEFAULT_MS);
    }
    if (s.consecutiveErrors >= UNHEALTHY_AFTER) s.healthy = false;
  }
  /** Run a call through the best router, failing over on error. Throws only if all exhausted. */
  async run(call) {
    const order = this.ranked();
    if (order.length === 0) {
      throw new Error(
        "All selected routers are rate-limited or unavailable. Add a BYOK key, select more free routers, or retry shortly."
      );
    }
    let lastErr;
    for (const id of order) {
      const t0 = this.now();
      try {
        const result = await call(id);
        this.recordSuccess(id, this.now() - t0);
        return { result, routerId: id };
      } catch (e) {
        const err = e;
        this.recordFailure(id, { status: err?.status, retryAfterMs: err?.retryAfterMs });
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("All selected routers failed this request.");
  }
  snapshot() {
    return [...this.stats.values()].map((s) => ({ ...s }));
  }
  load(stats) {
    for (const s of stats) if (this.stats.has(s.id)) this.stats.set(s.id, { ...s });
  }
};
function healthStatePath(dir) {
  return join13(dir, "routers", "health.json");
}
function saveMuxState(dir, stats) {
  const p = healthStatePath(dir);
  mkdirSync8(join13(dir, "routers"), { recursive: true });
  writeFileSync10(p, JSON.stringify(stats, null, 2), "utf8");
}
function loadMuxState(dir) {
  const p = healthStatePath(dir);
  if (!existsSync5(p)) return [];
  try {
    const stats = JSON.parse(readFileSync10(p, "utf8"));
    return stats.map((s) => ({ ...s, latencyMs: Number.isFinite(s.latencyMs) ? s.latencyMs : Number.POSITIVE_INFINITY }));
  } catch {
    return [];
  }
}

// src/routers/floor.ts
var KEYLESS_FLOOR = [
  {
    id: "pollinations",
    name: "Pollinations (free)",
    baseUrl: "https://text.pollinations.ai/openai",
    model: "openai",
    apiKey: "oriro-keyless"
  },
  {
    id: "ollama-local",
    name: "Ollama (on-device)",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
    apiKey: "ollama"
  }
];
function routerModel(r) {
  return {
    id: r.model,
    name: r.name,
    api: "openai-completions",
    provider: r.id,
    baseUrl: r.baseUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128e3,
    maxTokens: 4096
  };
}

// src/identity/filter.ts
var ORIRO_IDENTITY = "You are ORIRO, a free on-device AI assistant in the user's terminal. You are ORIRO and only ORIRO. Never state, imply, or reveal that you are, or are built on, any other model or company (such as GPT, Claude, Gemini, Qwen, Llama, Mistral, DeepSeek, OpenAI, Anthropic, Google, or Meta). If asked what you are, you are ORIRO.";
var BANNED_TEST = /\b(qwen|llama|mistral|mixtral|deepseek|gpt(?:-?\d(?:\.\d)?)?|claude|gemini|openai|anthropic|google|meta\s?ai|alibaba)\b/i;
var BANNED_REPLACE = new RegExp(BANNED_TEST.source, "gi");
var SELF_REF = /\b(i am|i'm|i was|based on|powered by|my name|my model|my architecture|trained|created by|made by|built (?:on|by)|developed by)\b/i;
var SELF_INTRO = /\b(i am|i'm)\s+(a|an)\b/i;
var AI_NOUN = /\b(assistant|ai|model|language model|bot|agent|chatbot)\b/i;
function applyIdentity(context) {
  const sys = context.systemPrompt ? `${ORIRO_IDENTITY}

${context.systemPrompt}` : ORIRO_IDENTITY;
  return { ...context, systemPrompt: sys };
}
function scrubIdentity(text) {
  return text.replace(/[^.?!\n]+[.?!]?/g, (sentence) => {
    let s = SELF_REF.test(sentence) && BANNED_TEST.test(sentence) ? sentence.replace(BANNED_REPLACE, "ORIRO") : sentence;
    if (!/\boriro\b/i.test(s) && SELF_INTRO.test(s) && AI_NOUN.test(s)) {
      s = s.replace(SELF_INTRO, "I am ORIRO, $2");
    }
    return s;
  });
}
function scrubMessageIdentity(msg) {
  return {
    ...msg,
    content: msg.content.map(
      (c) => c.type === "text" ? { ...c, text: scrubIdentity(c.text) } : c
    )
  };
}

// src/routers/tool-sanitize.ts
var CONTROL_TOKEN = /<\|[^|]*\|>/g;
var RECIPIENT_PREFIX = /^(?:to=)?(?:functions?|tools?|recipient)[.=]/i;
var RECIPIENT = /(?:to=)?(?:functions?|tools?|recipient)[.=]([A-Za-z0-9_.:-]+)/i;
var CLEAN_NAME = /^[A-Za-z0-9_.:-]+$/;
function sanitizeToolName(raw) {
  if (!raw) return raw;
  if (!raw.includes("<|") && !RECIPIENT_PREFIX.test(raw)) return raw;
  const base = (raw.split("<|")[0] ?? "").replace(RECIPIENT_PREFIX, "").trim();
  if (base && CLEAN_NAME.test(base)) return base;
  const recip = raw.match(RECIPIENT);
  if (recip?.[1]) return recip[1];
  const m = raw.replace(CONTROL_TOKEN, " ").match(/[A-Za-z_][A-Za-z0-9_.:-]*/);
  return m ? m[0] : raw;
}
function sanitizeMessageToolCalls(msg) {
  let changed = false;
  const content = msg.content.map((c) => {
    if (c.type === "toolCall") {
      const name = sanitizeToolName(c.name);
      if (name !== c.name) {
        changed = true;
        return { ...c, name };
      }
    }
    return c;
  });
  return changed ? { ...msg, content } : msg;
}
function sanitizeEventToolCalls(ev) {
  let next = ev;
  if ("partial" in next && next.partial) {
    const partial = sanitizeMessageToolCalls(next.partial);
    if (partial !== next.partial) next = { ...next, partial };
  }
  if (next.type === "toolcall_end" && next.toolCall) {
    const name = sanitizeToolName(next.toolCall.name);
    if (name !== next.toolCall.name) next = { ...next, toolCall: { ...next.toolCall, name } };
  }
  return next;
}

// src/scribe/scribe-pi.ts
import { existsSync as existsSync10, readFileSync as readFileSync16 } from "fs";
import { Type } from "typebox";

// src/scribe/capture.ts
import { closeSync as closeSync2, fsyncSync as fsyncSync2, mkdirSync as mkdirSync11, openSync as openSync2, writeSync as writeSync2 } from "fs";
import { join as join15 } from "path";

// src/scribe/digest.ts
import { existsSync as existsSync6, mkdirSync as mkdirSync9, readFileSync as readFileSync11, writeFileSync as writeFileSync11 } from "fs";

// src/scribe/paths.ts
import { join as join14 } from "path";
function scribeDir() {
  const override = process.env.ORIRO_SCRIBE_DIR?.trim();
  return override && override.length > 0 ? override : join14(CONFIG_DIR, "scribe");
}
function journalFile(date) {
  return join14(scribeDir(), `${date}.md`);
}
function digestFile() {
  return join14(scribeDir(), "_digest.md");
}
function timelineFile() {
  return join14(scribeDir(), "_timeline.md");
}
function artifactsDir() {
  return join14(scribeDir(), "artifacts");
}

// src/scribe/digest.ts
var DIGEST_CAP = 8192;
var TIMELINE_DAY_CAP = 400;
function read(file5) {
  return existsSync6(file5) ? readFileSync11(file5, "utf8") : "";
}
function updateDigest(summary, context) {
  mkdirSync9(scribeDir(), { recursive: true });
  const existing = read(digestFile());
  let contextBlock = context?.trim();
  if (!contextBlock) {
    const m = existing.match(/## Context\n([\s\S]*?)\n## /);
    contextBlock = m?.[1]?.trim() ?? "_(not set yet)_";
  }
  const recentMatch = existing.match(/## Recent activity[^\n]*\n([\s\S]*)$/);
  const priorRecent = recentMatch?.[1]?.trim() ?? "";
  let recent = summary.trim() ? `- ${summary.trim()}
${priorRecent}` : priorRecent;
  const header2 = `# ORIRO Scribe \u2014 Digest

## Context
${contextBlock}

## Recent activity (newest first)
`;
  let out = header2 + recent;
  while (Buffer.byteLength(out, "utf8") > DIGEST_CAP && recent.includes("\n")) {
    recent = recent.slice(0, recent.lastIndexOf("\n")).trimEnd();
    out = header2 + recent;
  }
  writeFileSync11(digestFile(), out, "utf8");
}
function updateTimeline(date, topic) {
  mkdirSync9(scribeDir(), { recursive: true });
  const clean = topic.replace(/\s+/g, " ").trim();
  if (!clean) return;
  const lines = read(timelineFile()).split("\n").filter(Boolean);
  const header2 = "# ORIRO Scribe \u2014 Timeline";
  const body = lines.filter((l) => l !== header2);
  const idx = body.findIndex((l) => l.startsWith(`- ${date} \xB7`));
  if (idx === -1) {
    body.push(`- ${date} \xB7 ${clean}`.slice(0, TIMELINE_DAY_CAP + date.length + 6));
  } else {
    let merged = `${body[idx]}; ${clean}`;
    if (merged.length > TIMELINE_DAY_CAP) merged = `${merged.slice(0, TIMELINE_DAY_CAP)}\u2026`;
    body[idx] = merged;
  }
  body.sort();
  writeFileSync11(timelineFile(), `${header2}
${body.join("\n")}
`, "utf8");
}
function readDigest() {
  return read(digestFile());
}
function readTimeline() {
  return read(timelineFile());
}

// src/scribe/journal.ts
import {
  closeSync,
  existsSync as existsSync7,
  fsyncSync,
  mkdirSync as mkdirSync10,
  openSync,
  readFileSync as readFileSync12,
  writeSync
} from "fs";
function appendJournal(date, content) {
  mkdirSync10(scribeDir(), { recursive: true });
  const fd = openSync(journalFile(date), "a");
  try {
    writeSync(fd, content.endsWith("\n") ? content : `${content}
`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function readJournal(date) {
  const f = journalFile(date);
  return existsSync7(f) ? readFileSync12(f, "utf8") : "";
}

// src/scribe/redact.ts
var RULES = [
  {
    label: "private-key",
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
  },
  // Lone PEM markers — a key SPLIT across fields/turns leaves only a BEGIN-head or an END-tail in
  // one field. A field carrying either marker is key material: redact the marker + its adjacent body
  // (forward from BEGIN, backward to END) so no sub-threshold fragment can ever sit on disk.
  { label: "private-key", re: /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*/g },
  { label: "private-key", re: /[\s\S]*-----END[A-Z ]*PRIVATE KEY-----/g },
  { label: "anthropic-key", re: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { label: "openrouter-key", re: /sk-or-v1-[A-Za-z0-9]{20,}/g },
  // Stripe-style keys (sk_live_/pk_live_/rk_test_/…), underscore segments.
  { label: "stripe-key", re: /\b[srp]k_(?:live|test)_[A-Za-z0-9]{16,}/g },
  // Generic sk- secret keys — allow hyphenated segments (sk-live-…, sk-proj-…) so a second
  // hyphen no longer breaks the match (the gap the Scriber spike caught).
  { label: "secret-key-sk", re: /sk[-_][A-Za-z0-9][A-Za-z0-9-]{14,}/g },
  { label: "google-key", re: /AIza[0-9A-Za-z_-]{30,}/g },
  { label: "groq-key", re: /gsk_[A-Za-z0-9]{20,}/g },
  { label: "github-pat", re: /github_pat_[A-Za-z0-9_]{20,}/g },
  { label: "github-token", re: /gh[posr]_[A-Za-z0-9]{30,}/g },
  { label: "xai-key", re: /xai-[A-Za-z0-9]{20,}/g },
  { label: "aws-key", re: /AKIA[0-9A-Z]{16}/g },
  { label: "jwt", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/g },
  { label: "telegram-token", re: /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/g },
  // Auth headers / inline credentials (any provider) — the audit found these leaked.
  { label: "bearer-token", re: /\bbearer\s+[A-Za-z0-9._~+/=-]{12,}/gi },
  { label: "basic-auth", re: /\bbasic\s+[A-Za-z0-9+/=]{12,}/gi },
  // key: value / key=value secrets (password, token, secret, api_key, access_key, …).
  { label: "secret-kv", re: /\b(?:pass(?:word|wd)?|pwd|secret|token|api[_-]?key|access[_-]?key|auth)\s*[:=]\s*\S{3,}/gi },
  // Credentials embedded in a URL: scheme://user:PASSWORD@host  → redact the password.
  { label: "url-credential", re: /\b([a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:)[^/\s@]+(@)/gi },
  { label: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { label: "phone", re: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g }
];
function marker(label) {
  return `\u27E8REDACTED:${label}\u27E9`;
}
function entropy(s) {
  const freq = /* @__PURE__ */ new Map();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}
function looksLikeUnknownSecret(token) {
  if (token.length < 32) return false;
  if (token.includes("\u27E8REDACTED:")) return false;
  if (/^[0-9a-f]+$/i.test(token)) return false;
  const classes = (/[a-z]/.test(token) ? 1 : 0) + (/[A-Z]/.test(token) ? 1 : 0) + (/[0-9]/.test(token) ? 1 : 0);
  if (classes < 2) return false;
  return entropy(token) >= 4.2;
}
function redact(input) {
  const counts = /* @__PURE__ */ new Map();
  let text = input;
  for (const rule of RULES) {
    text = text.replace(rule.re, () => {
      counts.set(rule.label, (counts.get(rule.label) ?? 0) + 1);
      return marker(rule.label);
    });
  }
  text = text.split(/(\s+)/).map((tok) => {
    if (looksLikeUnknownSecret(tok)) {
      counts.set("high-entropy", (counts.get("high-entropy") ?? 0) + 1);
      return marker("high-entropy");
    }
    return tok;
  }).join("");
  const redactions = [...counts.entries()].map(([label, count]) => ({
    label,
    count
  }));
  return { text, redactions };
}
function containsSecret(text) {
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    if (rule.re.test(text)) return true;
  }
  for (const tok of text.split(/\s+/)) {
    if (looksLikeUnknownSecret(tok)) return true;
  }
  return false;
}

// src/scribe/capture.ts
var INLINE_CAP = 4e3;
function sideFile(date, ts, kind, full) {
  mkdirSync11(artifactsDir(), { recursive: true });
  const name = `${date}_${ts.replace(/[:.]/g, "-")}_${kind}.md`;
  const p = join15(artifactsDir(), name);
  const fd = openSync2(p, "w");
  try {
    writeSync2(fd, full);
    fsyncSync2(fd);
  } finally {
    closeSync2(fd);
  }
  return p;
}
function field(date, ts, label, value) {
  if (!value || !value.trim()) return "";
  if (value.length > INLINE_CAP) {
    const ref = sideFile(date, ts, label.toLowerCase().replace(/\s+/g, "-"), value);
    return `**${label}** (full \u2192 ${ref}):
${value.slice(0, INLINE_CAP)}
\u2026(truncated; full content in artifact)

`;
  }
  return `**${label}:**
${value}

`;
}
function renderTurn(rec) {
  let md = `## ${rec.ts}

`;
  md += field(rec.date, rec.ts, "User", rec.user);
  md += field(rec.date, rec.ts, "Router", rec.router);
  if (rec.tools?.length) md += `**Tools:** ${rec.tools.join(", ")}

`;
  if (rec.files?.length) md += `**Files:** ${rec.files.join(", ")}

`;
  md += field(rec.date, rec.ts, "Note", rec.note);
  return `${md}---
`;
}
function oneLineSummary(rec) {
  const bits = [];
  if (rec.user) bits.push(rec.user.replace(/\s+/g, " ").slice(0, 80));
  if (rec.files?.length) bits.push(`files: ${rec.files.slice(0, 3).join(", ")}`);
  if (rec.note) bits.push(rec.note.replace(/\s+/g, " ").slice(0, 60));
  return bits.join(" \xB7 ") || "(activity)";
}
function redactRecord(rec) {
  const tally = /* @__PURE__ */ new Map();
  const rd = (s) => {
    if (!s) return s;
    const r = redact(s);
    for (const x of r.redactions) tally.set(x.label, (tally.get(x.label) ?? 0) + x.count);
    return r.text;
  };
  const safeRec = {
    ...rec,
    user: rd(rec.user),
    note: rd(rec.note),
    router: rd(rec.router),
    context: rd(rec.context),
    files: rec.files?.map((f) => rd(f) ?? f)
  };
  return { rec: safeRec, redactions: [...tally.entries()].map(([label, count]) => ({ label, count })) };
}
function captureTurn(rec) {
  const { rec: safeRec, redactions } = redactRecord(rec);
  const journal = renderTurn(safeRec);
  appendJournal(rec.date, `${journal}
`);
  updateDigest(`${safeRec.ts} \xB7 ${oneLineSummary(safeRec)}`, safeRec.context);
  updateTimeline(safeRec.date, oneLineSummary(safeRec));
  const auditClean = !containsSecret(readJournal(rec.date)) && !containsSecret(readDigest() ?? "");
  return {
    journalDate: rec.date,
    redactions,
    bytes: Buffer.byteLength(journal, "utf8"),
    auditClean
  };
}

// src/scribe/health.ts
import {
  closeSync as closeSync3,
  fsyncSync as fsyncSync3,
  mkdirSync as mkdirSync12,
  openSync as openSync3,
  readFileSync as readFileSync13,
  writeFileSync as writeFileSync12,
  writeSync as writeSync3
} from "fs";
import { join as join16 } from "path";
function healthFile() {
  return join16(scribeDir(), "_health.json");
}
function faultLogFile() {
  return join16(scribeDir(), "_faults.log");
}
function read2() {
  try {
    return JSON.parse(readFileSync13(healthFile(), "utf8"));
  } catch {
    return { faultCount: 0 };
  }
}
function write(h) {
  mkdirSync12(scribeDir(), { recursive: true });
  writeFileSync12(healthFile(), `${JSON.stringify(h, null, 2)}
`, "utf8");
}
function recordHealth() {
  const h = read2();
  h.lastWriteAt = (/* @__PURE__ */ new Date()).toISOString();
  write(h);
}
function recordFault(role, err) {
  try {
    mkdirSync12(scribeDir(), { recursive: true });
    const msg = `${(/* @__PURE__ */ new Date()).toISOString()} [${role}] ${err instanceof Error ? err.message : String(err)}`;
    const fd = openSync3(faultLogFile(), "a");
    try {
      writeSync3(fd, `${msg}
`);
      fsyncSync3(fd);
    } finally {
      closeSync3(fd);
    }
    const h = read2();
    h.faultCount = (h.faultCount ?? 0) + 1;
    h.lastFault = msg;
    write(h);
  } catch {
  }
}
function readHealth() {
  return read2();
}

// src/scribe/wal.ts
import {
  closeSync as closeSync4,
  existsSync as existsSync8,
  fsyncSync as fsyncSync4,
  mkdirSync as mkdirSync13,
  openSync as openSync4,
  readFileSync as readFileSync14,
  writeFileSync as writeFileSync13,
  writeSync as writeSync4
} from "fs";
import { join as join17 } from "path";
function walFile() {
  return join17(scribeDir(), "_wal.jsonl");
}
function appendLine(obj) {
  mkdirSync13(scribeDir(), { recursive: true });
  const fd = openSync4(walFile(), "a");
  try {
    writeSync4(fd, `${JSON.stringify(obj)}
`);
    fsyncSync4(fd);
  } finally {
    closeSync4(fd);
  }
}
function walAppend(id, rec) {
  appendLine({ t: "add", id, rec });
}
function walCommit(id) {
  appendLine({ t: "commit", id });
}
function walPending() {
  if (!existsSync8(walFile())) return [];
  const committed = /* @__PURE__ */ new Set();
  const adds = /* @__PURE__ */ new Map();
  for (const line of readFileSync14(walFile(), "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.t === "commit") committed.add(e.id);
      else if (e.t === "add" && e.rec) adds.set(e.id, e.rec);
    } catch {
    }
  }
  const out = [];
  for (const [id, rec] of adds) {
    if (!committed.has(id)) out.push({ id, rec });
  }
  return out;
}
function walCompact() {
  if (!existsSync8(walFile())) return;
  const pending = walPending();
  const body = pending.map((p) => JSON.stringify({ t: "add", id: p.id, rec: p.rec })).join("\n");
  writeFileSync13(walFile(), body ? `${body}
` : "", "utf8");
}

// src/scribe/supervisor.ts
var draining = false;
function uid(ts) {
  return `${ts}-${Math.random().toString(36).slice(2, 9)}`;
}
function drainBacklog() {
  if (draining) return;
  draining = true;
  try {
    let drained = 0;
    for (const e of walPending()) {
      try {
        captureTurn(e.rec);
        walCommit(e.id);
        drained++;
      } catch (err) {
        recordFault("standby-replay", err);
        break;
      }
    }
    if (drained > 0) walCompact();
  } finally {
    draining = false;
  }
}
function supervisedCapture(rec) {
  try {
    drainBacklog();
    const id = uid(rec.ts);
    const safe = redactRecord(rec).rec;
    walAppend(id, safe);
    try {
      const res = captureTurn(safe);
      walCommit(id);
      walCompact();
      recordHealth();
      return res;
    } catch (primaryErr) {
      recordFault("primary", primaryErr);
      try {
        const res = captureTurn(safe);
        walCommit(id);
        walCompact();
        recordHealth();
        return res;
      } catch (standbyErr) {
        recordFault("standby", standbyErr);
        return null;
      }
    }
  } catch (fatal) {
    recordFault("supervisor", fatal);
    return null;
  }
}

// src/scribe/retrieval.ts
import { existsSync as existsSync9, readFileSync as readFileSync15, readdirSync } from "fs";
function listDays() {
  const dir = scribeDir();
  if (!existsSync9(dir)) return [];
  return readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).map((f) => f.replace(/\.md$/, "")).sort();
}
function readDay(date) {
  const f = journalFile(date);
  return existsSync9(f) ? readFileSync15(f, "utf8") : "";
}
function searchScribe(query, limit = 100) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const hits = [];
  for (const date of listDays().reverse()) {
    const lines = readDay(date).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (ln && ln.toLowerCase().includes(q)) {
        hits.push({ date, line: i + 1, text: ln.trim().slice(0, 200) });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

// src/scribe/scribe-pi.ts
function scribeTurn(input) {
  if (!isScribeEnabled()) return;
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  supervisedCapture({ ts, date: ts.slice(0, 10), ...input });
}
var pendingUserInput = "";
function noteUserInput(text) {
  pendingUserInput = text;
}
function takePendingUserInput() {
  const u = pendingUserInput;
  pendingUserInput = "";
  return u;
}
function buildScribeContext() {
  if (!isScribeEnabled()) return "";
  const parts = [];
  try {
    const t = timelineFile();
    if (existsSync10(t)) parts.push(`# Work history \u2014 every day so far
${readFileSync16(t, "utf8").trim()}`);
  } catch {
  }
  try {
    const d = readDigest();
    if (d?.trim()) parts.push(`# Current context (recent)
${d.trim()}`);
  } catch {
  }
  if (!parts.length) return "";
  return `${parts.join("\n\n")}

(Call scribe_recall to fetch the full text of any past day or topic.)`;
}
function registerScribe(pi) {
  pi.registerTool({
    name: "scribe_recall",
    label: "ORIRO Scribe",
    description: "Recall the user's past work from the on-device journal: search by keyword, or read a specific day (YYYY-MM-DD). Use to recover decisions, code, files, and context from earlier sessions.",
    parameters: Type.Object({
      query: Type.Optional(Type.String({ description: "Keyword/topic to search across all journals." })),
      day: Type.Optional(Type.String({ description: "A specific day YYYY-MM-DD to read in full." }))
    }),
    async execute(_id, params) {
      let text;
      const details = {};
      if (!isScribeEnabled()) {
        text = "Scribe is off (the user has not enabled it).";
      } else if (params.day) {
        text = readDay(params.day) || `No journal for ${params.day}. Days: ${listDays().join(", ") || "none"}`;
        details.day = params.day;
      } else {
        const hits = params.query ? searchScribe(params.query) : [];
        details.hits = hits;
        text = hits.length ? hits.map((h) => `${h.date}:${h.line}  ${h.text}`).join("\n") : `No matches${params.query ? ` for "${params.query}"` : ""}. Days recorded: ${listDays().join(", ") || "none"}`;
      }
      return { content: [{ type: "text", text }], details };
    }
  });
}
function attachScribe(session) {
  let user = "";
  let assistant = "";
  const tools = /* @__PURE__ */ new Set();
  session.subscribe((e) => {
    if (!isScribeEnabled()) return;
    if (e?.type === "user_message" || e?.type === "session_user_message") user = String(e.text ?? e.message ?? user);
    if (e?.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") assistant += e.assistantMessageEvent.delta ?? "";
    if ((e?.type === "tool_call" || e?.type === "tool_execution_start") && e.toolName) tools.add(String(e.toolName));
    if (e?.type === "agent_end") {
      const userText = takePendingUserInput() || user;
      scribeTurn({ user: userText || void 0, router: "oriro-free", tools: [...tools], note: assistant.slice(0, 4e3) || void 0 });
      user = "";
      assistant = "";
      tools.clear();
    }
  });
}

// src/routers/mux-provider.ts
var MUX_PROVIDER = "oriro-mux";
var MUX_MODEL = "oriro-free";
function errToCallError(msg) {
  const text = msg.errorMessage ?? "";
  return /\b429\b|rate.?limit|too many requests/i.test(text) ? { status: 429 } : {};
}
function buildErrorMessage(message) {
  return {
    role: "assistant",
    content: [],
    api: "openai-completions",
    provider: MUX_PROVIDER,
    model: MUX_MODEL,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "error",
    timestamp: Date.now(),
    errorMessage: message
  };
}
async function driveMux(out, mux, byId, context, options) {
  let lastError;
  for (const id of mux.ranked()) {
    const router = byId.get(id);
    if (!router) continue;
    const t0 = Date.now();
    let committed = false;
    let lastPartial;
    try {
      const inner = piStreamSimple(routerModel(router), context, {
        ...options ?? {},
        apiKey: router.apiKey
      });
      let failedBeforeContent = false;
      for await (const ev of inner) {
        if (ev.type === "error") {
          mux.recordFailure(id, errToCallError(ev.error));
          if (!committed) {
            lastError = ev.error;
            failedBeforeContent = true;
            break;
          }
          out.push(ev);
          out.end(ev.error);
          return;
        }
        committed = true;
        if (ev.type === "done") {
          mux.recordSuccess(id, Date.now() - t0);
          const clean = sanitizeMessageToolCalls(scrubMessageIdentity(ev.message));
          out.push({ type: "done", reason: ev.reason, message: clean });
          out.end(clean);
          return;
        }
        lastPartial = ev.partial;
        out.push(sanitizeEventToolCalls(ev));
      }
      if (failedBeforeContent) continue;
      if (!committed) {
        mux.recordFailure(id, {});
        lastError ??= buildErrorMessage("Router returned no output.");
        continue;
      }
      mux.recordSuccess(id, Date.now() - t0);
      out.end(lastPartial ? sanitizeMessageToolCalls(scrubMessageIdentity(lastPartial)) : void 0);
      return;
    } catch (e) {
      mux.recordFailure(id, e);
    }
  }
  const msg = lastError ?? buildErrorMessage(
    "All keyless routers are unavailable. Add a BYOK key, select more free routers, or retry shortly."
  );
  out.push({ type: "error", reason: "error", error: msg });
  out.end(msg);
}
function registerOriroMux(registry, opts = {}) {
  registerOpenAICompletions();
  const pooled = resolvePool();
  const routers = opts.routers ?? (pooled.length > 0 ? pooled : KEYLESS_FLOOR);
  const byId = new Map(routers.map((r) => [r.id, r]));
  const mux = new RouterMux(routers.map((r) => r.id));
  try {
    mux.load(loadMuxState(oriroDir()));
  } catch {
  }
  registry.registerProvider(MUX_PROVIDER, {
    name: "ORIRO Free (keyless Mux)",
    api: "openai-completions",
    apiKey: "oriro-keyless",
    // Placeholder — required by registry validation but never used: our custom streamSimple
    // routes to the real keyless floor endpoints itself (see driveMux).
    baseUrl: "http://oriro-mux.local",
    models: [
      {
        id: MUX_MODEL,
        name: "ORIRO Free (best-router)",
        api: "openai-completions",
        baseUrl: "http://oriro-mux.local",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128e3,
        maxTokens: 4096
      }
    ],
    streamSimple: (_model, context, options) => {
      const out = createAssistantMessageEventStream();
      const ctx = applyIdentity(context);
      const memory = buildScribeContext();
      const withMemory = memory ? { ...ctx, systemPrompt: `${ctx.systemPrompt}

${memory}` } : ctx;
      void driveMux(out, mux, byId, withMemory, options).finally(() => {
        try {
          saveMuxState(oriroDir(), mux.snapshot());
        } catch {
        }
      });
      return out;
    }
  });
  return registry.find(MUX_PROVIDER, MUX_MODEL);
}

// src/head/pi-tool.ts
import { Type as Type2 } from "typebox";

// src/head/comparison-engine.ts
var SECTION_RULES = [
  {
    type: "hero",
    label: "Hero",
    priority: "CRITICAL",
    markup: [/<h1[\s>]/],
    recommend: "Add a clear above-the-fold hero \u2014 one headline that states the value + one primary CTA."
  },
  {
    type: "navigation",
    label: "Navigation",
    priority: "CRITICAL",
    markup: [/<nav[\s>]/, /role=["']navigation["']/],
    recommend: "Add a top navigation so visitors can reach key sections."
  },
  {
    type: "features",
    label: "Features",
    priority: "CRITICAL",
    text: [/\bfeatures?\b/, /\bwhat you (?:can|get)\b/, /\bcapabilit/],
    recommend: "Add a features section that spells out concrete capabilities, not adjectives."
  },
  {
    type: "pricing",
    label: "Pricing",
    priority: "CRITICAL",
    text: [/\bpricing\b/, /\bper month\b/, /\b\/mo\b/, /\bfree plan\b/, /\$\d/, /₹\d/, /€\d/],
    recommend: 'Add transparent pricing \u2014 a critical conversion element; even a single "Free" tier helps.'
  },
  {
    type: "cta",
    label: "Call-to-Action",
    priority: "CRITICAL",
    text: [/\bget started\b/, /\bsign up\b/, /\bstart (?:free|now|building)\b/, /\btry (?:it|now|free)\b/, /\bbook a demo\b/, /\bget a demo\b/],
    recommend: 'Add a strong, repeated primary CTA ("Get started") so the next step is obvious.'
  },
  {
    type: "testimonials",
    label: "Testimonials",
    priority: "HIGH",
    text: [/\btestimonial/, /\bwhat (?:our )?(?:customers|users) say\b/, /\bloved by\b/, /\breview(?:s|ed)\b/],
    recommend: "Add 2\u20133 customer testimonials with names/photos to build trust."
  },
  {
    type: "stats",
    label: "Stats / Metrics",
    priority: "HIGH",
    text: [/\b\d[\d,.]*\s*[kkmm]\+?\s*(?:users|customers|developers|downloads|teams)\b/, /\b9\d(?:\.\d+)?%\b/, /\buptime\b/],
    recommend: 'Add impressive metrics ("10K+ users", "99.9% uptime") as social proof.'
  },
  {
    type: "video",
    label: "Video",
    priority: "HIGH",
    markup: [/<video[\s>]/, /youtube\.com\/embed/, /player\.vimeo\.com/, /<iframe[^>]+(?:youtube|vimeo)/],
    text: [/\bwatch the (?:video|demo)\b/],
    recommend: "Add a short explainer/demo video \u2014 it lifts conversion on landing pages."
  },
  {
    type: "demo",
    label: "Live Demo",
    priority: "HIGH",
    text: [/\btry it (?:now|live|free)\b/, /\bplayground\b/, /\binteractive demo\b/, /\blive demo\b/],
    recommend: 'Add a "try it" live demo or playground so visitors experience the product immediately.'
  },
  {
    type: "socialProof",
    label: "Social Proof",
    priority: "HIGH",
    text: [/\btrusted by\b/, /\bbacked by\b/, /\bused by\b/, /\bas seen (?:in|on)\b/, /\bcustomers include\b/],
    recommend: 'Add social proof (customer/investor logos, "trusted by \u2026") near the hero.'
  },
  {
    type: "faq",
    label: "FAQ",
    priority: "MEDIUM",
    text: [/\bfaq\b/, /\bfrequently asked\b/],
    markup: [/<details[\s>]/],
    recommend: "Add an FAQ that answers the top objections before they become exits."
  },
  {
    type: "integrations",
    label: "Integrations",
    priority: "MEDIUM",
    text: [/\bintegrations?\b/, /\bworks with\b/, /\bconnect your\b/],
    recommend: "Add an integrations section showing what the product connects to."
  },
  {
    type: "newsletter",
    label: "Newsletter / Capture",
    priority: "MEDIUM",
    text: [/\bsubscribe\b/, /\bnewsletter\b/, /\bjoin (?:the )?waitlist\b/],
    markup: [/type=["']email["']/],
    recommend: "Add an email capture (newsletter/waitlist) so non-converting visitors are not lost."
  },
  {
    type: "comparison",
    label: "Comparison",
    priority: "MEDIUM",
    text: [/\bcompare\b/, /\bcomparison\b/, /\b vs\.? \b/, /\bwhy choose\b/],
    recommend: 'Add a comparison ("us vs alternatives") to win evaluators who are shopping around.'
  },
  {
    type: "team",
    label: "Team / About",
    priority: "LOW",
    text: [/\bour team\b/, /\bmeet the team\b/, /\bfounders?\b/, /\babout us\b/],
    recommend: "Add a brief team/about section to humanize the brand."
  }
];
var PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
var PRIORITY_EFFORT = { CRITICAL: "L", HIGH: "M", MEDIUM: "M", LOW: "S" };
var FETCH_TIMEOUT_MS = 12e3;
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 ORIRO-Inspector";
async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" }
    });
    const html = await res.text();
    return { html, ms: Date.now() - start, status: res.status, ok: res.ok, error: "" };
  } catch (err) {
    return { html: "", ms: Date.now() - start, status: 0, ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}
function toText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").toLowerCase().trim();
}
function firstMatch(re, hay) {
  const m = re.exec(hay);
  if (!m) return "";
  const slice = (m[0] ?? "").trim();
  return slice.length > 80 ? `${slice.slice(0, 77)}\u2026` : slice;
}
function detectSections(rawHtmlLower, text) {
  const found = [];
  for (const rule of SECTION_RULES) {
    let evidence = "";
    for (const re of rule.markup ?? []) {
      const hit = firstMatch(re, rawHtmlLower);
      if (hit) {
        evidence = hit;
        break;
      }
    }
    if (!evidence) {
      for (const re of rule.text ?? []) {
        const hit = firstMatch(re, text);
        if (hit) {
          evidence = hit;
          break;
        }
      }
    }
    if (evidence) found.push({ type: rule.type, label: rule.label, priority: rule.priority, evidence });
  }
  return found;
}
function extractMatches(re, html, max) {
  const out = [];
  for (const m of html.matchAll(re)) {
    const inner = (m[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (inner && !out.includes(inner)) out.push(inner);
    if (out.length >= max) break;
  }
  return out;
}
var CTA_WORDS = /\b(get started|sign up|start free|start now|start building|try (?:it|now|free)|book a demo|get a demo|request access|join (?:the )?waitlist|download)\b/i;
function extractStructure(url, fr) {
  const html = fr.html;
  const lowerHtml = html.toLowerCase();
  const text = toText(html);
  const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = (titleM?.[1] ?? "").replace(/\s+/g, " ").trim();
  const descM = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html) ?? /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html);
  const description = (descM?.[1] ?? "").replace(/\s+/g, " ").trim();
  const headings = extractMatches(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, html, 12);
  const ctaAll = extractMatches(/<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi, html, 80);
  const ctas = [];
  for (const c of ctaAll) {
    if (CTA_WORDS.test(c) && !ctas.includes(c)) ctas.push(c);
    if (ctas.length >= 10) break;
  }
  const forms = (lowerHtml.match(/<form[\s>]/g) ?? []).length;
  const links = (lowerHtml.match(/<a[\s>]/g) ?? []).length;
  const images = (lowerHtml.match(/<img[\s>]/g) ?? []).length;
  const hasVideo = /<video[\s>]/.test(lowerHtml) || /(?:youtube\.com\/embed|player\.vimeo\.com)/.test(lowerHtml);
  const domNodes = (html.match(/<[a-z!\/]/gi) ?? []).length;
  let note = "";
  if (fr.ok && text.length < 400 && domNodes < 60) {
    note = "Sparse HTML \u2014 likely a client-rendered (SPA) page; structure may be under-detected without a JS render.";
  }
  return {
    url,
    title,
    description,
    sections: detectSections(lowerHtml, text),
    headings,
    ctas,
    forms,
    links,
    images,
    hasVideo,
    metrics: { htmlBytes: html.length, domNodes, fetchMs: fr.ms, status: fr.status },
    ok: fr.ok && html.length > 0,
    note: fr.ok ? note : `Could not load: ${fr.error || `HTTP ${fr.status}`}`
  };
}
function ruleFor(type) {
  return SECTION_RULES.find((r) => r.type === type) ?? SECTION_RULES[0];
}
function analyzeGaps(target, competitors) {
  const targetTypes = new Set(target.sections.map((s) => s.type));
  const compPresence = /* @__PURE__ */ new Map();
  for (const comp of competitors) {
    if (!comp.ok) continue;
    for (const s of comp.sections) {
      const list = compPresence.get(s.type) ?? [];
      if (!list.includes(comp.url)) list.push(comp.url);
      compPresence.set(s.type, list);
    }
  }
  const missing = [];
  const parity = [];
  for (const [type, presentOn] of compPresence) {
    if (targetTypes.has(type)) {
      parity.push(type);
    } else {
      const rule = ruleFor(type);
      missing.push({ section: type, label: rule.label, priority: rule.priority, presentOn, recommendation: rule.recommend });
    }
  }
  missing.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.presentOn.length - a.presentOn.length);
  const advantages = target.sections.filter((s) => !compPresence.has(s.type));
  return { missing, advantages, parity };
}
function generateActionItems(missing) {
  return missing.map((g) => ({
    title: `Add a ${g.label} section`,
    priority: g.priority,
    effort: PRIORITY_EFFORT[g.priority],
    rationale: `${g.presentOn.length} of the compared page(s) have it; you don't. ${g.recommendation}`
  }));
}
function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function generateSummary(target, competitors, gaps) {
  const okComps = competitors.filter((c) => c.ok);
  const tName = hostOf(target.url);
  if (!target.ok) return `Could not load ${tName} (${target.note}). Nothing to compare against yet.`;
  if (okComps.length === 0) return `Loaded ${tName} (${target.sections.length} sections) but none of the comparison URLs could be loaded.`;
  const crit = gaps.missing.filter((m) => m.priority === "CRITICAL").map((m) => m.label);
  const high = gaps.missing.filter((m) => m.priority === "HIGH").map((m) => m.label);
  const parts = [];
  parts.push(`${tName} has ${target.sections.length} detectable sections; compared against ${okComps.length} page(s).`);
  if (gaps.missing.length === 0) {
    parts.push("No structural gaps found \u2014 you cover everything they do.");
  } else {
    parts.push(`${gaps.missing.length} gap(s) found.`);
    if (crit.length) parts.push(`Critical: ${crit.join(", ")}.`);
    if (high.length) parts.push(`High: ${high.join(", ")}.`);
  }
  if (gaps.advantages.length) parts.push(`Your edge: ${gaps.advantages.map((a) => a.label).join(", ")}.`);
  return parts.join(" ");
}
function normalizeUrl(u) {
  const t = (u || "").trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
async function comparePages(opts) {
  const targetUrl = normalizeUrl(opts.targetUrl);
  const competitorUrls = (opts.competitorUrls ?? []).map(normalizeUrl).filter((u) => u.length > 0).slice(0, 30);
  const [targetFetch, ...compFetches] = await Promise.all([
    fetchPage(targetUrl),
    ...competitorUrls.map((u) => fetchPage(u))
  ]);
  const target = extractStructure(targetUrl, targetFetch ?? { html: "", ms: 0, status: 0, ok: false, error: "no fetch" });
  const competitors = competitorUrls.map(
    (u, i) => extractStructure(u, compFetches[i] ?? { html: "", ms: 0, status: 0, ok: false, error: "no fetch" })
  );
  const gaps = analyzeGaps(target, competitors);
  return {
    target,
    competitors,
    missing: gaps.missing,
    advantages: gaps.advantages,
    parity: gaps.parity,
    actionItems: generateActionItems(gaps.missing),
    summary: generateSummary(target, competitors, gaps)
  };
}

// src/head/run.ts
import { writeFile } from "fs/promises";
import { join as join18 } from "path";

// src/head/inspection-html.ts
var PRIORITY_COLOR = {
  CRITICAL: "#f43f5e",
  // rose
  HIGH: "#f59e0b",
  // amber
  MEDIUM: "#0ea5e9",
  // sky
  LOW: "#64748b"
  // slate
};
var SECTION_ORDER = [
  "navigation",
  "hero",
  "socialProof",
  "stats",
  "features",
  "demo",
  "video",
  "integrations",
  "comparison",
  "pricing",
  "testimonials",
  "faq",
  "newsletter",
  "cta",
  "team"
];
function esc(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function hostOf2(url) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function pathOf(url) {
  try {
    const u = new URL(url);
    return (u.pathname || "/") + (u.search || "");
  } catch {
    return url;
  }
}
function orderedSections(sections) {
  return [...sections].sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a.type);
    const ib = SECTION_ORDER.indexOf(b.type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}
function sectionBlock(s) {
  const color = PRIORITY_COLOR[s.priority];
  return `
    <div class="blk" style="border-left:4px solid ${color}">
      <div class="blk-row">
        <span class="dot" style="background:${color}"></span>
        <span class="blk-label">${esc(s.label)}</span>
        <span class="blk-pri" style="color:${color}">${esc(s.priority)}</span>
      </div>
      <code class="blk-ev">${esc(s.evidence)}</code>
    </div>`;
}
function pageCard(p, isTarget) {
  const statusOk = p.ok && p.metrics.status >= 200 && p.metrics.status < 400;
  const badge = statusOk ? `<span class="pill pill-ok">${p.metrics.status || 200} OK</span>` : `<span class="pill pill-bad">${p.metrics.status || "FAILED"}</span>`;
  const blocks = p.sections.length ? orderedSections(p.sections).map(sectionBlock).join("") : `<div class="blk-empty">No sections detected${p.note ? "" : " (sparse / client-rendered?)"}</div>`;
  const kb = Math.round(p.metrics.htmlBytes / 1024);
  return `
    <div class="card${isTarget ? " card-target" : ""}">
      <div class="chrome">
        <span class="dots"><i></i><i></i><i></i></span>
        <span class="addr" title="${esc(p.url)}">${esc(hostOf2(p.url))}<span class="path">${esc(pathOf(p.url))}</span></span>
        ${badge}
      </div>
      ${isTarget ? '<div class="tag-you">YOUR PAGE</div>' : ""}
      <div class="title">${esc(p.title || "(untitled)")}</div>
      <div class="stack">${blocks}</div>
      <div class="meta">
        <span title="headings">H ${p.headings.length}</span>
        <span title="CTAs">CTA ${p.ctas.length}</span>
        <span title="links">\u21A9 ${p.metrics ? p.links : 0}</span>
        <span title="images">\u25A6 ${p.images}</span>
        <span title="video">${p.hasVideo ? "\u25B6 video" : "\u25B7 no video"}</span>
        <span title="page size">${kb} KB</span>
        <span title="DOM nodes">${p.metrics.domNodes} nodes</span>
        <span title="fetch time">${p.metrics.fetchMs} ms</span>
      </div>
      ${p.note ? `<div class="note">\u26A0 ${esc(p.note)}</div>` : ""}
    </div>`;
}
function gapsPanel(report) {
  if (!report.missing.length && !report.advantages.length) return "";
  const missing = report.missing.map((g) => {
    const color = PRIORITY_COLOR[g.priority];
    return `<li><span class="dot" style="background:${color}"></span><b>${esc(g.label)}</b>
      <span class="gap-pri" style="color:${color}">${esc(g.priority)}</span>
      <div class="gap-rec">${esc(g.recommendation)}</div>
      <div class="gap-on">on: ${g.presentOn.map((u) => esc(hostOf2(u))).join(", ")}</div></li>`;
  }).join("");
  const adv = report.advantages.map((s) => `<span class="chip">${esc(s.label)}</span>`).join("");
  return `
    <div class="gaps">
      ${report.missing.length ? `<div class="gaps-col"><h2>Missing from your page</h2><ul class="gap-list">${missing}</ul></div>` : ""}
      ${report.advantages.length ? `<div class="gaps-col"><h2>Your advantages</h2><div class="chips">${adv}</div></div>` : ""}
    </div>`;
}
function buildInspectionHtml(report) {
  const pages = [report.target, ...report.competitors];
  const ok2 = pages.filter((p) => p.ok).length;
  const cards = pages.map((p, i) => pageCard(p, i === 0)).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ORIRO Inspector \u2014 what it saw</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0b0b12;color:#e2e8f0;font:14px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px}
  .head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:6px}
  .head h1{font-size:20px;font-weight:700;letter-spacing:-.02em;background:linear-gradient(90deg,#2dd4bf,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{color:#94a3b8;font-size:13px;margin-bottom:18px}
  .summary{background:#11111c;border:1px solid #1e293b;border-radius:12px;padding:12px 14px;margin-bottom:20px;color:#cbd5e1}
  .row{display:flex;gap:16px;overflow-x:auto;padding-bottom:10px}
  .card{flex:0 0 300px;background:#0f0f1a;border:1px solid #1e293b;border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
  .card-target{border-color:#2dd4bf;box-shadow:0 0 0 1px rgba(45,212,191,.25)}
  .chrome{display:flex;align-items:center;gap:8px;background:#15151f;padding:8px 10px;border-bottom:1px solid #1e293b}
  .dots{display:flex;gap:4px}.dots i{width:8px;height:8px;border-radius:50%;background:#334155;display:block}
  .addr{flex:1;font-size:11px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
  .addr .path{color:#64748b;font-weight:400}
  .pill{font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px}
  .pill-ok{background:rgba(34,197,94,.15);color:#4ade80}.pill-bad{background:rgba(244,63,94,.15);color:#fb7185}
  .tag-you{font-size:9px;font-weight:800;letter-spacing:.08em;color:#2dd4bf;padding:6px 12px 0}
  .title{font-size:13px;font-weight:600;color:#f1f5f9;padding:8px 12px 4px}
  .stack{display:flex;flex-direction:column;gap:6px;padding:8px 12px}
  .blk{background:#13131f;border-radius:8px;padding:7px 9px}
  .blk-row{display:flex;align-items:center;gap:7px}
  .dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}
  .blk-label{font-weight:600;font-size:12px;flex:1;color:#e2e8f0}
  .blk-pri{font-size:9px;font-weight:700;letter-spacing:.04em}
  .blk-ev{display:block;font-size:10px;color:#64748b;font-family:ui-monospace,monospace;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .blk-empty{color:#64748b;font-size:12px;padding:10px;text-align:center;font-style:italic}
  .meta{display:flex;flex-wrap:wrap;gap:8px;padding:8px 12px;border-top:1px solid #1e293b;color:#94a3b8;font-size:11px;margin-top:auto}
  .note{background:rgba(245,158,11,.1);color:#fbbf24;font-size:11px;padding:7px 12px;border-top:1px solid rgba(245,158,11,.2)}
  .gaps{display:flex;gap:24px;flex-wrap:wrap;margin-top:24px}
  .gaps-col{flex:1;min-width:260px}
  .gaps h2{font-size:14px;color:#f1f5f9;margin-bottom:10px}
  .gap-list{list-style:none;display:flex;flex-direction:column;gap:10px}
  .gap-list li{background:#0f0f1a;border:1px solid #1e293b;border-radius:10px;padding:10px 12px}
  .gap-list b{font-size:13px}.gap-pri{font-size:10px;font-weight:700;margin-left:6px}
  .gap-rec{color:#94a3b8;font-size:12px;margin-top:4px}.gap-on{color:#64748b;font-size:10px;margin-top:4px}
  .chips{display:flex;flex-wrap:wrap;gap:6px}
  .chip{background:rgba(45,212,191,.12);color:#5eead4;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:600}
  .foot{margin-top:26px;color:#475569;font-size:11px;border-top:1px solid #1e293b;padding-top:12px}
</style></head>
<body>
  <div class="head"><h1>ORIRO Inspector</h1><span class="sub">what the head saw \u2014 ${ok2}/${pages.length} pages crawled</span></div>
  <div class="summary">${esc(report.summary)}</div>
  <div class="row">${cards}</div>
  ${gapsPanel(report)}
  <div class="foot">ORIRO Inspector \xB7 structural read (server-side HTML) \xB7 each block = a section the head detected, coloured by priority.</div>
</body></html>`;
}

// src/head/media.ts
var IMAGE_MIME_BY_SUFFIX = Object.freeze({
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif"
});
var VIDEO_MIME_BY_SUFFIX = Object.freeze({
  ".mp4": "video/mp4",
  ".mpg": "video/mpeg",
  ".mpeg": "video/mpeg",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".ogv": "video/ogg",
  ".wmv": "video/x-ms-wmv",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".flv": "video/x-flv",
  ".3gp": "video/3gpp",
  ".3g2": "video/3gpp2"
});
function suffixOf(nameOrPath) {
  const base = (nameOrPath || "").split(/[\\/]/).pop() ?? "";
  const i = base.lastIndexOf(".");
  return i < 0 ? "" : base.slice(i).toLowerCase();
}
function sniff(head) {
  if (!head || head.length < 12) return null;
  const b = (i) => head[i] ?? -1;
  if (b(0) === 26 && b(1) === 69 && b(2) === 223 && b(3) === 163) return { kind: "video", mimeType: "video/webm" };
  if (b(4) === 102 && b(5) === 116 && b(6) === 121 && b(7) === 112) return { kind: "video", mimeType: "video/mp4" };
  if (b(0) === 137 && b(1) === 80 && b(2) === 78 && b(3) === 71) return { kind: "image", mimeType: "image/png" };
  if (b(0) === 255 && b(1) === 216 && b(2) === 255) return { kind: "image", mimeType: "image/jpeg" };
  if (b(0) === 71 && b(1) === 73 && b(2) === 70) return { kind: "image", mimeType: "image/gif" };
  return null;
}
function detectMediaType(nameOrPath, head) {
  const sniffed = sniff(head);
  if (sniffed) return sniffed;
  const suf = suffixOf(nameOrPath);
  const v = VIDEO_MIME_BY_SUFFIX[suf];
  if (v) return { kind: "video", mimeType: v };
  const img = IMAGE_MIME_BY_SUFFIX[suf];
  if (img) return { kind: "image", mimeType: img };
  return { kind: "unknown", mimeType: "application/octet-stream" };
}

// src/head/video-to-code.ts
var WATCH_PROMPT = `You are watching a screen recording of a web UI. Produce a precise, build-ready SPECIFICATION to reconstruct it exactly \u2014 another engineer must rebuild it from your spec alone. Cover, in order:
1. Overall layout & structure (header/nav, hero, content sections in order, footer).
2. Each section: its components, exact text/copy, and visual hierarchy.
3. Styling: colors (hex if discernible), typography (family/weight/scale), spacing, radius, shadows.
4. Behavior visible across the recording: hover/focus states, scroll reveals, modals, carousels, tabs, animations, transitions \u2014 note the trigger and the effect.
5. Responsive behavior if the recording shows resizing.
Be concrete and exhaustive. Output a structured spec, not prose.`;
var CODE_PROMPT_PREFIX = `You are an expert front-end engineer. Build COMPLETE, working, production-quality code that reproduces the following UI specification EXACTLY \u2014 correct layout, components, copy, colors, typography, spacing, and the described interactions. No placeholders, no TODOs, no "...". Return ONLY the code.`;
async function videoToCode(input, models, opts = {}) {
  if (!input.videoPath && !(input.frames && input.frames.length)) {
    throw new Error("videoToCode needs input.videoPath or input.frames.");
  }
  const mimeType = input.mimeType ?? (input.videoPath ? detectMediaType(input.videoPath).mimeType : void 0);
  const watchPrompt = `${opts.watchPrompt ?? WATCH_PROMPT}${input.goal ? `

User goal: ${input.goal}` : ""}`;
  const spec = (await models.watch({ videoPath: input.videoPath, frames: input.frames, mimeType, prompt: watchPrompt })).trim();
  const stack = input.stack ?? "a single self-contained HTML file with inline CSS + vanilla JS (no build step)";
  const codePrompt = `${opts.codePromptPrefix ?? CODE_PROMPT_PREFIX}

Target stack: ${stack}

=== UI SPECIFICATION ===
${spec}`;
  const code = (await models.code(codePrompt)).trim();
  return { spec, code };
}
var REVERSE_PROMPT = `You are an expert front-end engineer. Below is the captured RENDERED HTML of a live web page (optionally with visual notes from a screenshot). REVERSE-ENGINEER it into CLEAN, COMPLETE, PRODUCTION-QUALITY, RUNNABLE code that a developer can PASTE AND BUILD with no edits.

Requirements:
\u2022 Reproduce the page EXACTLY: every meaningful section/component in order, the real text/copy, layout, and visual design \u2014 colors as hex, typography (family/weight/size), spacing, radius, shadows, borders.
\u2022 Strip tracking/ads/analytics/third-party cruft and dead markup; keep the real content.
\u2022 Output COMPLETE file(s) for the target stack: include EVERY import, the entry/mount point (e.g. ReactDOM render / index), all components, and all styles. If multiple files are needed, emit each prefixed with a "// FILE: <path>" header so it can be split out.
\u2022 Use the REAL extracted content/data (titles, labels, links, values) \u2014 never lorem ipsum or dummy data.
\u2022 NO placeholders, NO TODOs, NO "...", NO truncation, NO commentary or explanation. Every component fully implemented and wired.
\u2022 It must be immediately runnable and visually faithful.
Return ONLY the code.`;
var SCREENSHOT_DESC_PROMPT = `Describe this screenshot of a web page for FAITHFUL pixel-level reconstruction. Be concrete and exhaustive: overall layout & grid, each section top\u2192bottom, every component, exact colors (hex if discernible), typography (family/weight/size/line-height), spacing/padding/margins, border radius, shadows, alignment, and any icons/imagery. This description will be used to rebuild the page, so omit nothing visually significant.`;
async function htmlToCode(input, models) {
  if (!input.html || !input.html.trim()) throw new Error("htmlToCode needs input.html.");
  let visualNotes = "";
  if (input.screenshot && models.watch) {
    visualNotes = (await models.watch({ frames: [input.screenshot], mimeType: "image/png", prompt: SCREENSHOT_DESC_PROMPT })).trim();
  }
  const stack = input.stack ?? "a single clean self-contained HTML file with inline CSS (no build step)";
  const prompt = `${REVERSE_PROMPT}

Target stack: ${stack}${input.goal ? `
Goal: ${input.goal}` : ""}${visualNotes ? `

=== VISUAL (from screenshot) ===
${visualNotes}` : ""}

=== CAPTURED HTML ===
${input.html}`;
  const code = (await models.code(prompt)).trim();
  return { code, visualNotes: visualNotes || void 0 };
}
async function urlToCode(url, models, opts = {}) {
  const { captureScreens: captureScreens2 } = await Promise.resolve().then(() => (init_screenshot_flow(), screenshot_flow_exports));
  const caps = await captureScreens2([url], { viewport: opts.viewport });
  const cap = caps[0];
  if (!cap || !cap.ok || !cap.html) {
    throw new Error(`urlToCode: could not capture ${url}${cap?.note ? ` (${cap.note})` : ""}.`);
  }
  const { code } = await htmlToCode(
    { html: cap.html, screenshot: cap.png ?? void 0, goal: opts.goal, stack: opts.stack },
    models
  );
  return { url, html: cap.html, screenshot: cap.png, code };
}
var SPEC_YAML_PROMPT = `You are a senior front-end engineer reverse-engineering a live web page so ANOTHER engineer can rebuild it from your spec ALONE. Below is the page's captured RENDERED HTML (optionally with visual notes from a screenshot). Strip tracking/ads/analytics/dead markup; keep the meaningful structure. Output a precise, exhaustive, build-ready spec as VALID YAML ONLY \u2014 no prose, no markdown, no code fences. Use exactly this top-level schema:
page:            # url, title, purpose (one line: what this page is for)
design_tokens:   # colors: {name: hex}; typography: {fontFamily, weights, scale}; spacing; radius; shadows
layout:          # ordered list of regions top\u2192bottom; each: {region, role, components: [names]}
components:      # reusable components; each: {name, description, structure (element tree), styling (key css/classes), content_example}
data_model:      # entities the page renders; each: {entity, fields: [..]}
interactions:    # list of {trigger, effect}
responsive:      # notable breakpoints/behavior
build_notes:     # how to assemble it, stack-agnostic
Be concrete (real colors as hex, real copy, real fields). Output ONLY YAML.`;
async function htmlToSpec(input, models) {
  if (!input.html || !input.html.trim()) throw new Error("htmlToSpec needs input.html.");
  let visualNotes = "";
  if (input.screenshot && models.watch) {
    visualNotes = (await models.watch({ frames: [input.screenshot], mimeType: "image/png", prompt: SCREENSHOT_DESC_PROMPT })).trim();
  }
  const prompt = `${SPEC_YAML_PROMPT}${input.goal ? `
Goal: ${input.goal}` : ""}${visualNotes ? `

=== VISUAL (from screenshot) ===
${visualNotes}` : ""}

=== CAPTURED HTML ===
${input.html}`;
  let spec = (await models.code(prompt)).trim();
  spec = spec.replace(/^```ya?ml\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  return { spec, visualNotes: visualNotes || void 0 };
}
async function urlToSpec(url, models, opts = {}) {
  const { captureScreens: captureScreens2 } = await Promise.resolve().then(() => (init_screenshot_flow(), screenshot_flow_exports));
  const caps = await captureScreens2([url], { viewport: opts.viewport });
  const cap = caps[0];
  if (!cap || !cap.ok || !cap.html) {
    throw new Error(`urlToSpec: could not capture ${url}${cap?.note ? ` (${cap.note})` : ""}.`);
  }
  const { spec } = await htmlToSpec(
    { html: cap.html, screenshot: cap.png ?? void 0, goal: opts.goal },
    models
  );
  return { url, html: cap.html, screenshot: cap.png, spec };
}
async function extractFrames(videoPath, opts = {}) {
  const [{ spawn: spawn4 }, os, path, fs] = await Promise.all([
    import("child_process"),
    import("os"),
    import("path"),
    import("fs/promises")
  ]);
  const count = opts.count ?? 8;
  const ffmpeg = opts.ffmpegPath ?? "ffmpeg";
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-head-frames-"));
  const pattern = path.join(dir, "f-%03d.png");
  await new Promise((resolve, reject) => {
    const p = spawn4(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", videoPath, "-vf", "thumbnail", "-frames:v", String(count), "-y", pattern], { stdio: "ignore" });
    p.on("error", () => reject(new Error("ffmpeg not found \u2014 pass frames yourself or a video-capable model, or set ffmpegPath.")));
    p.on("close", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
  });
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".png")).sort();
  const frames = [];
  for (const f of files.slice(0, count)) frames.push(new Uint8Array(await fs.readFile(path.join(dir, f))));
  return frames;
}

// src/head/model.ts
import { register as registerOpenAICompletions2 } from "@earendil-works/pi-ai/openai-completions";

// src/routers/keyless-complete.ts
import { complete } from "@earendil-works/pi-ai";
async function completeViaRouter(router, context, maxTokens = 1024) {
  const reply = await complete(routerModel(router), context, {
    apiKey: router.apiKey,
    maxTokens
  });
  if (reply.stopReason === "error") {
    const msg = reply.errorMessage ?? "router error";
    const err = new Error(msg);
    if (/\b429\b|rate.?limit|too many requests/i.test(msg)) err.status = 429;
    throw err;
  }
  const text = reply.content.filter((c) => c.type === "text").map((c) => c.text).join("");
  if (!text.trim()) throw new Error("empty completion");
  return text;
}

// src/head/model.ts
var HEAD_CODER_SYSTEM = "You are ORIRO Head's senior front-end engineer. Reproduce UIs faithfully and output exactly what the instruction asks for (clean, working code or a structured spec). No preamble.";
function buildHeadCoderModel(routers = KEYLESS_FLOOR) {
  registerOpenAICompletions2();
  const byId = new Map(routers.map((r) => [r.id, r]));
  const mux = new RouterMux(routers.map((r) => r.id));
  return async (prompt) => {
    const context = {
      systemPrompt: HEAD_CODER_SYSTEM,
      messages: [{ role: "user", content: prompt, timestamp: Date.now() }]
    };
    const { result } = await mux.run(async (id) => {
      const r = byId.get(id);
      if (!r) throw new Error(`unknown router ${id}`);
      return completeViaRouter(r, context, 8192);
    });
    return result;
  };
}
function headModels(routers = KEYLESS_FLOOR) {
  return { code: buildHeadCoderModel(routers) };
}
var HEAD_WATCH_SYSTEM = "You are ORIRO Head's UI analyst. From the described/attached media, produce a precise, build-ready specification of the interface. Be concrete and exhaustive. No preamble.";
function buildHeadWatchModel(routers = KEYLESS_FLOOR) {
  registerOpenAICompletions2();
  const byId = new Map(routers.map((r) => [r.id, r]));
  const mux = new RouterMux(routers.map((r) => r.id));
  return async ({ prompt }) => {
    const context = {
      systemPrompt: HEAD_WATCH_SYSTEM,
      messages: [{ role: "user", content: prompt, timestamp: Date.now() }]
    };
    const { result } = await mux.run(async (id) => {
      const r = byId.get(id);
      if (!r) throw new Error(`unknown router ${id}`);
      return completeViaRouter(r, context, 8192);
    });
    return result;
  };
}
function headVideoModels(routers = KEYLESS_FLOOR) {
  return { watch: buildHeadWatchModel(routers), code: buildHeadCoderModel(routers) };
}

// src/head/intent.ts
var TRIGGERS = [
  /\bgo (and )?(look|check|see|visit|inspect)\b/i,
  /\binspect\b/i,
  /\bcompare\b/i,
  /\bvs\.?\b/i,
  /\bgap analysis\b/i,
  /\bcompetitive analysis\b/i,
  /\bwhat (do|does) .* have that we (don'?t|do not|lack)\b/i,
  /\b(build|make) .* like .+'s\b/i,
  // "build a pricing page like stripe's"
  /\blook at (this )?(url|site|page|https?:\/\/)/i
];
var SELF = /\b(us|our|ours|my|mine|this (site|page|app))\b/i;
var SHOTS = /\bscreenshots?\b|\bshow me\b|--shots\b|\bvisual(s|ly)?\b/i;
var URL_RE = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]*)?)\b/gi;
function normalize(u) {
  const t = u.replace(/[).,;]+$/, "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
function extractUrls(text) {
  const seen = /* @__PURE__ */ new Set();
  for (const m of text.matchAll(URL_RE)) {
    const u = normalize(m[1] ?? "");
    if (u && /\.[a-z]{2,}/i.test(u)) seen.add(u);
  }
  return [...seen];
}
function detectInspectIntent(text) {
  const urls = extractUrls(text);
  const phraseHit = TRIGGERS.some((re) => re.test(text));
  const isInspect = phraseHit || urls.length >= 2;
  const targetIsSelf = SELF.test(text);
  const wantsShots = SHOTS.test(text);
  if (!isInspect || urls.length === 0) {
    return { isInspect: isInspect && urls.length > 0, targetIsSelf, competitors: [], wantsShots };
  }
  if (targetIsSelf) {
    return { isInspect: true, targetIsSelf: true, competitors: urls, wantsShots };
  }
  const [target, ...competitors] = urls;
  return { isInspect: true, targetIsSelf: false, target, competitors, wantsShots };
}

// src/head/run.ts
function hostSlug(url) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).host.replace(/^www\./, "").replace(/[^a-z0-9.-]/gi, "_");
  } catch {
    return "site";
  }
}
function extForStack(stack) {
  const s = (stack ?? "").toLowerCase();
  if (/\btsx?\b|react|next/.test(s)) return s.includes("ts") ? ".tsx" : ".jsx";
  if (/\bvue\b/.test(s)) return ".vue";
  if (/\bsvelte\b/.test(s)) return ".svelte";
  return ".html";
}
function summarizeReport(report) {
  const lines = [report.summary];
  const page = (p) => `  \u2022 ${p.url} \u2014 ${p.ok ? `${p.sections.length} sections: ${p.sections.map((s) => s.type).join(", ")}` : `not readable (${p.note})`}`;
  lines.push("Pages seen:");
  lines.push(page(report.target));
  for (const c of report.competitors) if (c.url !== report.target.url) lines.push(page(c));
  if (report.missing.length) {
    lines.push("Missing on the target (gaps to build):");
    for (const g of report.missing.slice(0, 12)) lines.push(`  \u2022 ${g.label} (${g.priority}) \u2014 ${g.recommendation}`);
  }
  if (report.actionItems.length) {
    lines.push("Suggested action items:");
    for (const a of report.actionItems.slice(0, 12)) lines.push(`  \u2192 ${a.title} [${a.priority}/${a.effort}] \u2014 ${a.rationale}`);
  }
  return lines.join("\n");
}
async function runInspect(target, competitors, opts = {}) {
  const report = await comparePages({ targetUrl: target, competitorUrls: competitors.length ? competitors : [target] });
  const files = [];
  if (opts.html) {
    const path = join18(opts.outDir ?? process.cwd(), `oriro-head-${hostSlug(target)}-inspect.html`);
    await writeFile(path, buildInspectionHtml(report), "utf8");
    files.push(path);
  }
  return { summary: summarizeReport(report), files, report };
}
function parseHeadTargets(text, selfOrigin) {
  const intent = detectInspectIntent(text);
  if (intent.targetIsSelf) return { target: selfOrigin ?? null, competitors: intent.competitors };
  if (intent.target) return { target: intent.target, competitors: intent.competitors };
  const urls = extractUrls(text);
  return { target: urls[0] ?? null, competitors: urls.slice(1) };
}
async function runUrlToCode(url, opts = {}) {
  try {
    const res = await urlToCode(url, headModels(), { goal: opts.goal, stack: opts.stack });
    const codePath = join18(opts.outDir ?? process.cwd(), `oriro-head-${hostSlug(url)}${extForStack(opts.stack)}`);
    await writeFile(codePath, res.code, "utf8");
    return { summary: `Reverse-engineered ${url} into clean code (${res.code.length} chars) \u2192 ${codePath}`, files: [codePath] };
  } catch (e) {
    return { summary: headCaptureError("url\u2192code", e), files: [] };
  }
}
async function runUrlToSpec(url, opts = {}) {
  try {
    const res = await urlToSpec(url, headModels(), { goal: opts.goal });
    const specPath = join18(opts.outDir ?? process.cwd(), `oriro-head-${hostSlug(url)}.spec.yaml`);
    await writeFile(specPath, res.spec, "utf8");
    return { summary: `Reverse-engineered ${url} into a YAML build spec \u2192 ${specPath}`, files: [specPath] };
  } catch (e) {
    return { summary: headCaptureError("url\u2192spec", e), files: [] };
  }
}
async function runCapture(urls, opts = {}) {
  try {
    const { captureScreens: captureScreens2, buildScreenshotFlowHtml: buildScreenshotFlowHtml2 } = await Promise.resolve().then(() => (init_screenshot_flow(), screenshot_flow_exports));
    const caps = await captureScreens2(urls, { video: opts.video });
    const html = buildScreenshotFlowHtml2([{ name: "Captured screens", captures: caps }]);
    const flowPath = join18(opts.outDir ?? process.cwd(), "oriro-head-flow.html");
    await writeFile(flowPath, html, "utf8");
    const ok2 = caps.filter((c) => c.ok).length;
    return { summary: `Captured ${ok2}/${caps.length} full-page screenshots \u2192 ${flowPath}`, files: [flowPath] };
  } catch (e) {
    return { summary: headCaptureError("screenshots", e), files: [] };
  }
}
async function runVideoToCode(videoPath, opts = {}) {
  try {
    const mime = detectMediaType(videoPath).mimeType;
    let frames;
    try {
      frames = await extractFrames(videoPath, { count: 8 });
    } catch {
      frames = void 0;
    }
    const res = await videoToCode(
      { videoPath, frames, mimeType: mime, goal: opts.goal, stack: opts.stack },
      headVideoModels()
    );
    const codePath = join18(opts.outDir ?? process.cwd(), `oriro-head-video${extForStack(opts.stack)}`);
    await writeFile(codePath, res.code, "utf8");
    return { summary: `Watched ${videoPath} \u2192 built code (${res.code.length} chars) \u2192 ${codePath}
(experimental on the free floor \u2014 add a vision-capable router for pixel-faithful results.)`, files: [codePath] };
  } catch (e) {
    return { summary: `video\u2192code failed: ${e instanceof Error ? e.message : String(e)}. This flow needs a readable video and gives best results with a vision-capable router.`, files: [] };
  }
}
function headCaptureError(op, e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/playwright/i.test(msg)) {
    return `${op} needs the Chromium browser. Install it once:
  npm i playwright && npx playwright install chromium
Then retry. (The structural read \`oriro head <url>\` needs no browser.)`;
  }
  return `${op} failed: ${msg}`;
}

// src/head/pi-tool.ts
var InspectSiteParams = Type2.Object({
  url: Type2.String({ description: "The target website URL to inspect or rebuild from." }),
  competitors: Type2.Optional(
    Type2.Array(Type2.String(), { description: "Optional competitor/reference URLs to compare the target against." })
  )
});
var UrlParam = Type2.Object({
  url: Type2.String({ description: "The website URL to capture and rebuild." }),
  goal: Type2.Optional(Type2.String({ description: "Optional natural-language goal, e.g. 'rebuild the pricing page'." })),
  stack: Type2.Optional(Type2.String({ description: "Target stack for the generated code. Default: one self-contained HTML file." }))
});
var CaptureParams = Type2.Object({
  urls: Type2.Array(Type2.String(), { description: "One or more URLs to screenshot in a real browser." })
});
var VideoParams = Type2.Object({
  videoPath: Type2.String({ description: "Path to a screen-recording video to rebuild the UI from." }),
  goal: Type2.Optional(Type2.String()),
  stack: Type2.Optional(Type2.String())
});
function registerHead(pi) {
  pi.registerTool({
    name: "inspect_site",
    label: "ORIRO Head",
    description: "Go out to a live website and SEE it: its sections, CTAs, structure, and any gaps versus competitor URLs. Returns a structured report to build from. Call this whenever the user wants to look at, compare against, or rebuild a website/page.",
    parameters: InspectSiteParams,
    async execute(_toolCallId, params) {
      const competitors = params.competitors?.length ? params.competitors : [params.url];
      const report = await comparePages({ targetUrl: params.url, competitorUrls: competitors });
      return { content: [{ type: "text", text: summarizeReport(report) }], details: report };
    }
  });
  pi.registerTool({
    name: "url_to_code",
    label: "ORIRO Head \xB7 url\u2192code",
    description: "Go to a URL, capture the live rendered page in a real browser, and REVERSE-ENGINEER it into clean, runnable code. Use when the user wants to rebuild/clone a page. Writes the code to a file in the working directory. Needs the `playwright` peer for the browser capture.",
    parameters: UrlParam,
    async execute(_toolCallId, params) {
      const out = await runUrlToCode(params.url, { goal: params.goal, stack: params.stack });
      return { content: [{ type: "text", text: out.summary }], details: { files: out.files } };
    }
  });
  pi.registerTool({
    name: "url_to_spec",
    label: "ORIRO Head \xB7 url\u2192spec",
    description: "Go to a URL, capture it, and reverse-engineer a precise, stack-agnostic YAML BUILD SPEC (design tokens, layout, component tree, data model, interactions). Use when the user wants a spec to rebuild from rather than a one-shot code dump. Needs the `playwright` peer.",
    parameters: UrlParam,
    async execute(_toolCallId, params) {
      const out = await runUrlToSpec(params.url, { goal: params.goal });
      return { content: [{ type: "text", text: out.summary }], details: { files: out.files } };
    }
  });
  pi.registerTool({
    name: "capture_site",
    label: "ORIRO Head \xB7 screenshots",
    description: "Visit each URL in a real browser and capture full-page screenshots, assembled into one visual flow HTML file. Use when the user wants to SEE pages, not just their structure. Needs the `playwright` peer.",
    parameters: CaptureParams,
    async execute(_toolCallId, params) {
      const out = await runCapture(params.urls);
      return { content: [{ type: "text", text: out.summary }], details: { files: out.files } };
    }
  });
  pi.registerTool({
    name: "video_to_code",
    label: "ORIRO Head \xB7 video\u2192code",
    description: "Watch a screen-recording video of a UI and build working code from it. Experimental on the free floor (best results with a vision-capable router). Use when the user drops a recording to rebuild.",
    parameters: VideoParams,
    async execute(_toolCallId, params) {
      const out = await runVideoToCode(params.videoPath, { goal: params.goal, stack: params.stack });
      return { content: [{ type: "text", text: out.summary }], details: { files: out.files } };
    }
  });
}

// src/orchestrate.ts
import { createAgentSession, AuthStorage, ModelRegistry, SessionManager } from "@earendil-works/pi-coding-agent";
import { Type as Type3 } from "typebox";
var MAX_AGENTS = 8;
var MAX_CONCURRENCY = 4;
async function runOnce(spec) {
  const authStorage = AuthStorage.inMemory();
  const modelRegistry = ModelRegistry.inMemory(authStorage);
  const model = registerOriroMux(modelRegistry);
  if (!model) return { ...spec, ok: false, output: "no free model available" };
  const { session } = await createAgentSession({
    model,
    authStorage,
    modelRegistry,
    sessionManager: SessionManager.inMemory(),
    noTools: "all"
  });
  let out = "";
  const unsub = session.subscribe((e) => {
    if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") out += e.assistantMessageEvent.delta ?? "";
  });
  try {
    await session.prompt(`You are the ${spec.role} sub-agent. ${spec.task}`);
  } catch (e) {
    return { ...spec, ok: false, output: e instanceof Error ? e.message : String(e) };
  } finally {
    unsub();
    session.dispose();
  }
  return { ...spec, ok: out.trim().length > 0, output: out.trim() };
}
async function runAgent(spec) {
  let last = await runOnce(spec);
  if (!last.ok) last = await runOnce(spec);
  return last;
}
async function runPool(items, n, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      if (item === void 0) continue;
      results[idx] = await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
  return results;
}
async function orchestrate(opts) {
  const agents = opts.agents.slice(0, MAX_AGENTS);
  if ((opts.mode ?? "parallel") === "chain") {
    const results = [];
    let prev = "";
    for (const a of agents) {
      const r = await runAgent({ role: a.role, task: prev ? `${a.task}

Previous result:
${prev}` : a.task });
      results.push(r);
      prev = r.output;
    }
    return results;
  }
  return runPool(agents, MAX_CONCURRENCY, runAgent);
}
function registerOrchestrator(pi) {
  pi.registerTool({
    name: "deploy_agents",
    label: "ORIRO Orchestrator",
    description: "Deploy multiple sub-agents in parallel (or chained) to do work \u2014 e.g. 'spawn 4 QA + 2 coders, run the tests'. Each sub-agent runs FREE on the router pool. Give each agent a role and a task.",
    parameters: Type3.Object({
      agents: Type3.Array(Type3.Object({ role: Type3.String(), task: Type3.String() }), {
        description: "The sub-agents to deploy (max 8)."
      }),
      mode: Type3.Optional(Type3.Union([Type3.Literal("parallel"), Type3.Literal("chain")]))
    }),
    async execute(_id, params) {
      const results = await orchestrate({ agents: params.agents, mode: params.mode });
      const text = results.map((r) => `[${r.role}] ${r.ok ? "\u2713" : "\u2717"} ${r.output.slice(0, 300)}`).join("\n");
      return { content: [{ type: "text", text }], details: { results } };
    }
  });
}

// src/skills/loader.ts
import { loadSkills, formatSkillsForPrompt } from "@earendil-works/pi-coding-agent";
import { fileURLToPath } from "url";
import { existsSync as existsSync11 } from "fs";
import { dirname as dirname2, join as join19 } from "path";
function packageRoot(start) {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync11(join19(dir, "package.json"))) return dir;
    const parent = dirname2(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}
function skillsDir() {
  if (process.env.ORIRO_SKILLS_DIR) return process.env.ORIRO_SKILLS_DIR;
  return join19(packageRoot(dirname2(fileURLToPath(import.meta.url))), "skills");
}
async function loadOriroSkills(dir = skillsDir()) {
  const result = await loadSkills({
    cwd: dir,
    agentDir: dir,
    skillPaths: [dir],
    includeDefaults: false
  });
  const all = Array.isArray(result) ? result : result.skills ?? [];
  return {
    all,
    core: all.filter((s) => !s.disableModelInvocation),
    tail: all.filter((s) => s.disableModelInvocation),
    prompt: formatSkillsForPrompt(all)
  };
}

// src/onboarding/assemble.ts
async function assembleOriroSession(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const authStorage = AuthStorage2.inMemory();
  const modelRegistry = ModelRegistry2.inMemory(authStorage);
  const settingsManager = SettingsManager.create(cwd);
  const model = registerOriroMux(modelRegistry);
  if (!model) throw new Error("ORIRO keyless model unavailable");
  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir: getAgentDir(),
    settingsManager,
    additionalSkillPaths: [skillsDir()],
    extensionFactories: [registerGuardian, registerHead, registerScribe, registerOrchestrator]
  });
  await resourceLoader.reload();
  const { session, extensionsResult } = await createAgentSession2({
    model,
    authStorage,
    modelRegistry,
    settingsManager,
    sessionManager: SessionManager2.inMemory(),
    resourceLoader
  });
  attachScribe(session);
  return { session, extensionsResult };
}

// src/language/nllb-translator.ts
var NLLB_CODE = {
  en: "eng_Latn",
  zh: "zho_Hans",
  de: "deu_Latn",
  es: "spa_Latn",
  ru: "rus_Cyrl",
  ko: "kor_Hang",
  fr: "fra_Latn",
  ja: "jpn_Jpan",
  pt: "por_Latn",
  tr: "tur_Latn",
  pl: "pol_Latn",
  ca: "cat_Latn",
  nl: "nld_Latn",
  ar: "arb_Arab",
  sv: "swe_Latn",
  it: "ita_Latn",
  id: "ind_Latn",
  hi: "hin_Deva",
  fi: "fin_Latn",
  vi: "vie_Latn",
  he: "heb_Hebr",
  uk: "ukr_Cyrl",
  el: "ell_Grek",
  ms: "zsm_Latn",
  cs: "ces_Latn",
  ro: "ron_Latn",
  da: "dan_Latn",
  hu: "hun_Latn",
  ta: "tam_Taml",
  no: "nob_Latn",
  th: "tha_Thai",
  ur: "urd_Arab",
  hr: "hrv_Latn",
  bg: "bul_Cyrl",
  lt: "lit_Latn",
  mi: "mri_Latn",
  ml: "mal_Mlym",
  cy: "cym_Latn",
  sk: "slk_Latn",
  te: "tel_Telu",
  fa: "pes_Arab",
  lv: "lvs_Latn",
  bn: "ben_Beng",
  sr: "srp_Cyrl",
  az: "azj_Latn",
  sl: "slv_Latn",
  kn: "kan_Knda",
  et: "est_Latn",
  mk: "mkd_Cyrl",
  eu: "eus_Latn",
  is: "isl_Latn",
  hy: "hye_Armn",
  ne: "npi_Deva",
  mn: "khk_Cyrl",
  bs: "bos_Latn",
  kk: "kaz_Cyrl",
  sq: "als_Latn",
  sw: "swh_Latn",
  gl: "glg_Latn",
  mr: "mar_Deva",
  pa: "pan_Guru",
  si: "sin_Sinh",
  km: "khm_Khmr",
  sn: "sna_Latn",
  yo: "yor_Latn",
  so: "som_Latn",
  af: "afr_Latn",
  oc: "oci_Latn",
  ka: "kat_Geor",
  be: "bel_Cyrl",
  tg: "tgk_Cyrl",
  sd: "snd_Arab",
  gu: "guj_Gujr",
  am: "amh_Ethi",
  yi: "ydd_Hebr",
  lo: "lao_Laoo",
  uz: "uzn_Latn",
  fo: "fao_Latn",
  ht: "hat_Latn",
  ps: "pbt_Arab",
  tk: "tuk_Latn",
  nn: "nno_Latn",
  mt: "mlt_Latn",
  sa: "san_Deva",
  lb: "ltz_Latn",
  my: "mya_Mymr",
  bo: "bod_Tibt",
  tl: "tgl_Latn",
  mg: "plt_Latn",
  as: "asm_Beng",
  tt: "tat_Cyrl",
  ln: "lin_Latn",
  ha: "hau_Latn",
  ba: "bak_Cyrl",
  jw: "jav_Latn",
  su: "sun_Latn",
  yue: "yue_Hant"
};
var ENG = "eng_Latn";
var toNllb = (iso) => NLLB_CODE[(iso || "").toLowerCase()] ?? ENG;
var NllbTranslator = class {
  pipe = null;
  loading = null;
  ready() {
    return this.pipe !== null;
  }
  /** Lazy-load NLLB-200 once (first-use download + cache). Idempotent. */
  async load(modelId = "Xenova/nllb-200-distilled-600M") {
    if (this.pipe) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      this.pipe = await pipeline("translation", modelId);
    })();
    return this.loading;
  }
  async run(text, src, tgt) {
    if (!this.pipe) await this.load();
    if (!this.pipe) return text;
    const out = await this.pipe(text, { src_lang: src, tgt_lang: tgt });
    return out?.[0]?.translation_text?.trim() || text;
  }
  toEnglish(text, fromLang) {
    return this.run(text, toNllb(fromLang), ENG);
  }
  fromEnglish(english, toLang) {
    return this.run(english, ENG, toNllb(toLang));
  }
};
var instance = null;
function setupNllbTranslator(opts) {
  if (!instance) {
    instance = new NllbTranslator();
    registerTranslator(instance);
  }
  if (opts?.preload) void instance.load();
  return instance;
}

// src/language/gateway.ts
var isEnglish2 = (code) => !code || code.toLowerCase().startsWith("en");
var isCommand = (text) => text.trimStart().startsWith("/");
async function ensureReady() {
  try {
    await setupNllbTranslator().load();
  } catch {
  }
}
async function translateIncoming(message) {
  const lang = getTerminalLanguage().code;
  if (isEnglish2(lang) || !message.trim() || isCommand(message)) return message;
  await ensureReady();
  return translateForCoder(message, lang);
}
async function translateOutgoing(text) {
  const lang = getTerminalLanguage().code;
  if (isEnglish2(lang) || !text.trim()) return text;
  await ensureReady();
  return translateForUser(text, lang);
}

// src/repl-ui/tui-repl.ts
import { ProcessTerminal, TUI, Editor, Text, Container } from "@earendil-works/pi-tui";

// src/repl-ui/permission.ts
var MODES = ["manual", "accept_edits", "auto", "plan"];
var MODE_META = {
  manual: { label: "Manual", indicator: "\u25CF" },
  accept_edits: { label: "Accept Edits", indicator: "\u270E" },
  auto: { label: "Auto", indicator: "\u23F5\u23F5" },
  plan: { label: "Plan", indicator: "\u25A2" }
};
var current = "manual";
function getMode() {
  return current;
}
function cycleMode() {
  const i = MODES.indexOf(current);
  current = MODES[(i + 1) % MODES.length];
  return current;
}
var thinking = false;
function getThinking() {
  return thinking;
}
function toggleThinking() {
  thinking = !thinking;
  return thinking;
}
var THINKING_PRIMER = "Think step by step and plan your approach before acting. Reason carefully and check your work.";

// src/repl-ui/tui-repl.ts
var editorTheme = {
  borderColor: (s) => dim(s),
  selectList: {
    selectedPrefix: (s) => accent(s),
    selectedText: (s) => accent(s),
    description: (s) => dim(s),
    scrollInfo: (s) => dim(s),
    noMatch: (s) => dim(s)
  }
};
function footerText() {
  const cur = getMode();
  const bar = MODES.map((m) => {
    const meta = MODE_META[m];
    const s = `${meta.indicator} ${meta.label}`;
    return m === cur ? accent(s) : dim(s);
  }).join(dim(" \xB7 "));
  const think = getThinking() ? accent("\u{1F9E0} Thinking") : dim("\u{1F9E0} Thinking");
  return `${bar}   ${think}   ${dim("Shift+Tab posture \xB7 Alt+Shift+T thinking \xB7 /exit")}`;
}
async function runTuiRepl(session) {
  const isEnglish3 = getTerminalLanguage().code.toLowerCase().startsWith("en");
  const term = new ProcessTerminal();
  const tui = new TUI(term, true);
  const chat = new Container();
  const editor = new Editor(tui, editorTheme, { paddingX: 1 });
  const sep = new Text(dim("\u2500".repeat(Math.max(8, term.columns))), 0, 0);
  const footer = new Text(footerText(), 0, 0);
  tui.addChild(chat);
  tui.addChild(editor);
  tui.addChild(sep);
  tui.addChild(footer);
  tui.setFocus(editor);
  const refreshFooter = () => {
    sep.setText(dim("\u2500".repeat(Math.max(8, term.columns))));
    footer.setText(footerText());
    tui.requestRender();
  };
  const removeListener = tui.addInputListener((data) => {
    if (data === "\x1B[Z") {
      cycleMode();
      refreshFooter();
      return { consume: true };
    }
    if (data === "\x1BT" || data === "\x1Bt") {
      toggleThinking();
      refreshFooter();
      return { consume: true };
    }
    return void 0;
  });
  let stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    try {
      removeListener();
    } catch {
    }
    try {
      session.dispose();
    } catch {
    }
    try {
      tui.stop();
    } catch {
    }
    process.stdout.write(dim("\nBye.\n"));
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  let busy = false;
  editor.onSubmit = (raw) => {
    const text = raw.trim();
    if (!text || busy) return;
    const slash = text.toLowerCase();
    if (slash === "/exit" || slash === "/quit") return cleanup();
    if (slash === "/help" || slash === "/?") {
      chat.addChild(new Text(dim("  Just type to chat. Shift+Tab posture \xB7 Alt+Shift+T thinking \xB7 /voice to speak \xB7 /exit."), 0, 0));
      editor.setText("");
      tui.requestRender();
      return;
    }
    if (slash === "/voice") {
      editor.setText("");
      const status = new Text(dim("  \u{1F399} listening\u2026 (needs ffmpeg + the transformers voice peer)"), 0, 0);
      chat.addChild(status);
      tui.requestRender();
      void (async () => {
        const heard = await listen();
        if (heard?.text) {
          status.setText(dim(`  \u{1F399} heard [${heard.language}]:`));
          editor.setText(heard.text);
        } else {
          status.setText(dim("  \u{1F399} voice input unavailable (install ffmpeg + `npm i @huggingface/transformers`)."));
        }
        tui.requestRender();
      })();
      return;
    }
    editor.addToHistory(text);
    editor.setText("");
    chat.addChild(new Text(`${accent("\u203A")} ${text}`, 0, 1));
    const streaming = new Text(dim("\u2026"), 0, 0);
    chat.addChild(streaming);
    tui.requestRender();
    busy = true;
    void (async () => {
      let english = await translateIncoming(text);
      if (getThinking()) english = `${THINKING_PRIMER}

${english}`;
      noteUserInput(text);
      let out = "";
      const unsub = session.subscribe(
        (e) => {
          if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
            out += e.assistantMessageEvent.delta ?? "";
            if (isEnglish3) {
              streaming.setText(out);
              tui.requestRender();
            }
          }
        }
      );
      try {
        await session.prompt(english);
      } catch {
        streaming.setText(dim("(every free router is busy right now \u2014 give it a moment and try again)"));
        tui.requestRender();
        busy = false;
        unsub();
        return;
      }
      unsub();
      const finalText = isEnglish3 ? out.trim() : await translateOutgoing(out.trim());
      streaming.setText(finalText || dim("(no response)"));
      tui.requestRender();
      busy = false;
    })();
  };
  tui.start();
  refreshFooter();
  await new Promise(() => {
  });
}

// src/voice/mic.ts
import { spawn as spawn3 } from "child_process";
import { tmpdir as tmpdir3 } from "os";
import { join as join20 } from "path";
import { existsSync as existsSync12, statSync as statSync2 } from "fs";
function recorders(outFile, seconds) {
  const dur = String(seconds);
  if (process.platform === "darwin") {
    return [
      { cmd: "ffmpeg", args: ["-hide_banner", "-loglevel", "error", "-f", "avfoundation", "-i", ":0", "-t", dur, "-y", outFile] },
      { cmd: "sox", args: ["-d", outFile, "trim", "0", dur] }
    ];
  }
  if (process.platform === "win32") {
    return [
      { cmd: "ffmpeg", args: ["-hide_banner", "-loglevel", "error", "-f", "dshow", "-i", "audio=default", "-t", dur, "-y", outFile] }
    ];
  }
  return [
    { cmd: "arecord", args: ["-q", "-f", "cd", "-d", dur, outFile] },
    { cmd: "ffmpeg", args: ["-hide_banner", "-loglevel", "error", "-f", "alsa", "-i", "default", "-t", dur, "-y", outFile] },
    { cmd: "sox", args: ["-d", outFile, "trim", "0", dur] }
  ];
}
async function recordMic(seconds = 6) {
  const outFile = join20(tmpdir3(), `oriro-voice-${process.pid}-${seconds}.wav`);
  for (const r of recorders(outFile, seconds)) {
    const okFile = await new Promise((resolve) => {
      const child = spawn3(r.cmd, r.args, { stdio: "ignore" });
      child.on("error", () => resolve(false));
      child.on("close", (code) => resolve(code === 0 && existsSync12(outFile) && statSync2(outFile).size > 44));
    });
    if (okFile) return outFile;
  }
  return null;
}

// src/voice/stt.ts
async function decodePcm(path) {
  const { spawn: spawn4 } = await import("child_process");
  return await new Promise((resolve, reject) => {
    const chunks = [];
    const p = spawn4(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"],
      { stdio: ["ignore", "pipe", "ignore"] }
    );
    p.stdout.on("data", (c) => chunks.push(c));
    p.on("error", () => reject(new Error("ffmpeg not found \u2014 install ffmpeg to decode audio for speech-to-text.")));
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code ?? "?"} decoding ${path}`));
      const buf = Buffer.concat(chunks);
      if (!buf.length) return reject(new Error(`no audio decoded from ${path}`));
      resolve(new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4)));
    });
  });
}
var asr = null;
async function loadAsr(modelId = "Xenova/whisper-base") {
  if (asr) return asr;
  const { pipeline } = await import("@huggingface/transformers");
  asr = await pipeline("automatic-speech-recognition", modelId);
  return asr;
}
async function transcribeAudioFile(path, opts = {}) {
  const pcm = await decodePcm(path);
  const model = await loadAsr();
  const out = await model(pcm, {
    task: opts.translate ? "translate" : "transcribe",
    return_language: true,
    chunk_length_s: 30
  });
  return { text: (out?.text ?? "").trim(), language: out?.language ?? "en" };
}

// src/voice/setup.ts
var wired2 = false;
function setupVoiceInput() {
  if (wired2) return;
  wired2 = true;
  registerVoiceListen(async () => {
    const clip = await recordMic();
    if (!clip) throw new Error("no microphone recorder available");
    const t = await transcribeAudioFile(clip, { translate: true });
    return { text: t.text, language: t.language };
  });
}

// src/repl.ts
function replHelp() {
  return `
  ${accent("ORIRO terminal \u2014 help")}
  ${dim("Just type to chat; ORIRO writes and runs code for you (keyless, free).")}

  ${accent("/help")}  this help     ${accent("/exit")} or ${accent("/quit")}  leave     ${dim("Ctrl-D / Ctrl-C also exit")}
  ${dim("Run these OUTSIDE the chat (in your shell):")}
  ${dim("oriro skills \xB7 routers \xB7 connectors \xB7 channels \xB7 scribe \xB7 language \xB7 avatar")}

`;
}
async function runRepl() {
  if (isFirstRun()) await runOnboarding();
  else stdout6.write(banner());
  const { session } = await assembleOriroSession();
  setupVoiceInput();
  if (stdin5.isTTY && stdout6.isTTY) {
    await runTuiRepl(session);
    return;
  }
  await runReadlineRepl(session);
}
async function runReadlineRepl(session) {
  const isEnglish3 = getTerminalLanguage().code.toLowerCase().startsWith("en");
  const rl = createInterface5({ input: stdin5, output: stdout6 });
  let closing = false;
  const onSigint = () => {
    if (closing) return;
    closing = true;
    stdout6.write(dim("\nBye.\n"));
    try {
      rl.close();
    } catch {
    }
    try {
      session.dispose();
    } catch {
    }
    process.exit(0);
  };
  process.on("SIGINT", onSigint);
  try {
    for (; ; ) {
      let line;
      try {
        line = (await rl.question("\u203A ")).trim();
      } catch {
        break;
      }
      if (!line) continue;
      const slash = line.toLowerCase();
      if (slash === "/exit" || slash === "/quit") break;
      if (slash === "/help" || slash === "/?") {
        stdout6.write(replHelp());
        continue;
      }
      const english = await translateIncoming(line);
      noteUserInput(line);
      let out = "";
      const unsub = session.subscribe(
        (e) => {
          if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
            const d = e.assistantMessageEvent.delta ?? "";
            out += d;
            if (isEnglish3) stdout6.write(d);
          }
        }
      );
      try {
        await session.prompt(english);
      } finally {
        unsub();
      }
      if (isEnglish3) stdout6.write("\n\n");
      else stdout6.write(`${await translateOutgoing(out.trim())}

`);
    }
  } finally {
    process.removeListener("SIGINT", onSigint);
    if (!closing) {
      rl.close();
      session.dispose();
      stdout6.write(dim("\nBye.\n"));
    }
  }
}

// src/commands/ui.ts
var ok = (s) => {
  process.stdout.write(`${fgHex(PALETTE.success, "\u2713")} ${s}
`);
};
var fail = (s) => {
  process.stderr.write(`${fgHex(PALETTE.error, "\u2717")} ${s}
`);
};
var info = (s) => {
  process.stdout.write(`${dim("\xB7")} ${s}
`);
};
var heading = (s) => {
  process.stdout.write(`
${bold(accent(s))}
`);
};
var DieError = class extends Error {
};
function die(msg) {
  fail(msg);
  process.exitCode = 1;
  throw new DieError(msg);
}

// src/commands/routers.ts
function registerRoutersCommand(program2) {
  const routers = program2.command("routers").description("manage the free-router pool the model runs on");
  routers.command("list").description("list the router catalog and the active pool").action(() => {
    heading("Routers");
    for (const r of ROUTER_CATALOG) {
      if (r.comingSoon) {
        process.stdout.write(`  ${dim(`${r.id}  ${r.displayName}  (coming soon)`)}
`);
        continue;
      }
      const tier = r.keyless ? fgHex(PALETTE.success, "keyless") : dim(r.tier);
      process.stdout.write(`  ${accent(r.id.padEnd(22))} ${r.displayName.padEnd(24)} ${tier}
`);
    }
    const custom = registeredRouters().filter((r) => !ROUTER_CATALOG.some((c) => c.id === r.id));
    if (custom.length) {
      process.stdout.write(`
  ${accent("your custom routers")}
`);
      for (const r of custom) {
        const type = r.apiKey && r.apiKey !== KEYLESS_SENTINEL ? dim("BYOK") : fgHex(PALETTE.success, "keyless");
        process.stdout.write(`  ${accent(r.id.padEnd(22))} ${dim(r.baseUrl.padEnd(40))} ${type}
`);
      }
    }
    const pool = resolvePool();
    info(pool.length ? `active pool: ${pool.map((p) => p.id).join(", ")}` : "active pool: empty \u2192 using the keyless floor");
  });
  routers.command("add <name>").description("live-validate a router and add it to the pool \u2014 a catalog name, OR any custom endpoint via --url").option("-k, --key <key>", "API key (BYOK) \u2014 omit for a keyless free router").option("-m, --model <id>", "model id to run (REQUIRED for a custom --url router)").option("--url <baseUrl>", "add ANY custom free/BYOK router by its OpenAI-compatible base URL (the part BEFORE /chat/completions)").option("--api <api>", "custom router API: 'openai' (default) or 'google'", "openai").action(async (name, opts) => {
    let entry;
    if (opts.url) {
      if (!opts.model) die("a custom --url router needs --model <id> (the model to run on that endpoint)");
      const baseUrl = opts.url.replace(/\/(?:chat\/completions)\/?$/i, "").replace(/\/$/, "");
      entry = {
        id: name,
        displayName: name,
        baseUrl,
        api: opts.api === "google" ? "google-generative-ai" : "openai-completions",
        freeModels: [opts.model],
        keyless: !opts.key,
        tier: "free",
        kind: "chat"
      };
    } else {
      entry = routerById(name);
      if (!entry) die(`unknown router '${name}' \u2014 run \`oriro routers list\`, or add any custom endpoint with: oriro routers add <name> --url <baseUrl> --model <id> [--key <key>]`);
    }
    const res = await addRouter(entry, { ...opts.key ? { key: opts.key } : {}, ...opts.model ? { modelId: opts.model } : {} });
    if (!res.ok) die(`could not add '${name}': ${res.validation.error ?? "validation failed"}`);
    ok(`added ${accent(name)} (${res.validation.latencyMs}ms, model ${res.validation.model}${opts.key ? ", BYOK" : ", keyless"}) \u2192 active pool`);
  });
  routers.command("use <slugs...>").description("set the active router pool (ids must be added first)").action((slugs) => {
    const { applied, unknown } = useRouters(slugs);
    if (!applied.length) {
      die(`none of those are added yet: ${unknown.join(", ")} \u2014 run \`oriro routers add <slug>\` first`);
    }
    ok(`pool set: ${applied.join(", ")}`);
    if (unknown.length) info(`skipped (not added yet \u2014 run \`oriro routers add\`): ${unknown.join(", ")}`);
  });
}

// src/commands/scribe.ts
import { readFileSync as readFileSync18 } from "fs";

// src/scribe/transcript.ts
import { existsSync as existsSync13, readFileSync as readFileSync17 } from "fs";
function parseHookStdin(raw) {
  try {
    const j = JSON.parse(raw);
    return {
      transcriptPath: typeof j.transcript_path === "string" ? j.transcript_path : void 0,
      cwd: typeof j.cwd === "string" ? j.cwd : void 0,
      sessionId: typeof j.session_id === "string" ? j.session_id : void 0,
      stopHookActive: j.stop_hook_active === true
    };
  } catch {
    return { stopHookActive: false };
  }
}
function shouldCapture(cwd) {
  if (process.env.ORIRO_SCRIBE_ONLY !== "1") return true;
  if (!cwd) return false;
  return /oriro/i.test(cwd.replace(/\\/g, "/"));
}
function textOf(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content.filter((b) => b.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n").trim();
}
function isHumanUser(e) {
  if (e.type !== "user" && e.message?.role !== "user") return false;
  const c = e.message?.content;
  if (typeof c === "string") return c.trim().length > 0;
  if (Array.isArray(c)) return c.some((b) => b.type === "text" && (b.text ?? "").trim().length > 0);
  return false;
}
var FILE_KEYS = ["file_path", "path", "notebook_path", "filePath"];
function lastTurnFromTranscript(path) {
  if (!existsSync13(path)) return null;
  const raw = readFileSync17(path, "utf8");
  const entries = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
    }
  }
  if (entries.length === 0) return null;
  let anchor;
  let start = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e && isHumanUser(e)) {
      start = i;
      anchor = e;
      break;
    }
  }
  const slice = start === -1 ? entries : entries.slice(start);
  const user = anchor ? textOf(anchor.message?.content) : "";
  const noteParts = [];
  const tools = /* @__PURE__ */ new Set();
  const files = /* @__PURE__ */ new Set();
  let ts;
  for (const e of slice) {
    if (e.timestamp) ts = e.timestamp;
    const role = e.type ?? e.message?.role;
    const content = e.message?.content;
    if (role === "assistant") {
      const t = textOf(content);
      if (t) noteParts.push(t);
    }
    if (Array.isArray(content)) {
      for (const b of content) {
        if (b.type === "tool_use" && b.name) {
          tools.add(b.name);
          const input = b.input ?? {};
          for (const k of FILE_KEYS) {
            const v = input[k];
            if (typeof v === "string" && v.trim()) files.add(v.trim());
          }
        }
      }
    }
  }
  const note = noteParts.join("\n\n").trim();
  if (!user && !note && tools.size === 0) return null;
  return {
    user: user || void 0,
    note: note || void 0,
    tools: tools.size ? [...tools] : void 0,
    files: files.size ? [...files] : void 0,
    ts
  };
}

// src/commands/scribe.ts
function readStdin() {
  try {
    return readFileSync18(0, "utf8");
  } catch {
    return "";
  }
}
function csv(v) {
  if (typeof v !== "string") return void 0;
  const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : void 0;
}
function hasContent(rec) {
  return Boolean(rec.user?.trim() || rec.note?.trim() || rec.tools?.length || rec.files?.length);
}
function registerScribeCommand(program2) {
  const scribe = program2.command("scribe").description("the consent-gated local work journal (off by default)");
  scribe.command("on").description("enable the journal (recorded locally at ~/.oriro/scribe, never leaves your machine)").action(() => {
    setScribeConsent(true);
    ok("Scriber is ON \u2014 turns are journaled locally (redacted) and recalled across sessions.");
    info(dim("everything stays on this machine; turn off any time with `oriro scribe off`"));
  });
  scribe.command("off").description("disable the journal").action(() => {
    setScribeConsent(false);
    ok("Scriber is OFF \u2014 no new turns are recorded or injected.");
  });
  scribe.command("status").description("show whether the journal is on or off").action(() => {
    info(isScribeEnabled() ? "Scriber: ON" : "Scriber: OFF (default)");
  });
  scribe.command("capture").description("capture one turn into the journal (used by the Claude Code Stop hook + /scribe skill)").option("--hook", "read the Claude Code Stop-hook JSON from stdin and capture the latest turn").option("--json <record>", "capture an explicit TurnRecord (JSON)").option("--user <text>", "the user/request text for this turn").option("--note <text>", "a note / assistant summary for this turn").option("--router <name>", "which router/model produced the turn").option("--files <list>", "comma-separated file paths touched").option("--tools <list>", "comma-separated tool names used").action((opts) => {
    try {
      if (!isScribeEnabled()) {
        if (!opts.hook) info("Scriber is OFF \u2014 run `oriro scribe on` first.");
        return;
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let rec = null;
      if (opts.hook) {
        const hook = parseHookStdin(readStdin());
        if (hook.stopHookActive) return;
        if (!shouldCapture(hook.cwd)) return;
        if (!hook.transcriptPath) return;
        const turn = lastTurnFromTranscript(hook.transcriptPath);
        if (!turn) return;
        const ts = turn.ts ?? now;
        rec = {
          ts,
          date: ts.slice(0, 10),
          user: turn.user,
          note: turn.note,
          tools: turn.tools,
          files: turn.files,
          router: opts.router ?? "claude-code",
          context: hook.cwd ? `cwd: ${hook.cwd}` : void 0
        };
      } else if (opts.json) {
        const parsed = JSON.parse(opts.json);
        const ts = parsed.ts ?? now;
        rec = { ...parsed, ts, date: parsed.date ?? ts.slice(0, 10) };
      } else {
        rec = {
          ts: now,
          date: now.slice(0, 10),
          user: opts.user,
          note: opts.note,
          router: opts.router,
          files: csv(opts.files),
          tools: csv(opts.tools)
        };
      }
      if (!rec || !hasContent(rec)) {
        if (!opts.hook) info("nothing to capture.");
        return;
      }
      const res = supervisedCapture(rec);
      if (!opts.hook) {
        if (res) {
          const red = res.redactions.length ? ` (redacted: ${res.redactions.map((r) => `${r.label}\xD7${r.count}`).join(", ")})` : "";
          ok(`captured \u2192 ${res.journalDate}.md${red}`);
        } else {
          info("capture deferred (logged); will retry next turn.");
        }
      }
    } catch (err) {
      if (!opts.hook) fail(`scribe capture: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
  scribe.command("recall <query>").description("full-text search across every day's journal").option("-n, --limit <n>", "max matches", "50").action((query, opts) => {
    const limit = Math.max(1, Number(opts.limit) || 50);
    const hits = searchScribe(query, limit);
    if (!hits.length) {
      info(`no matches for "${query}".`);
      return;
    }
    heading(`Scribe \u2014 ${hits.length} match(es) for "${query}"`);
    for (const h of hits) info(`${h.date}:${h.line} \xB7 ${h.text}`);
  });
  scribe.command("digest").description("print the rolling digest (recent context, injectable in a flash)").action(() => {
    const d = readDigest();
    process.stdout.write(d?.trim() ? `${d.trim()}
` : "\xB7 digest empty (nothing captured yet).\n");
  });
  scribe.command("timeline").description("print the full-history timeline (one line per day)").action(() => {
    const t = readTimeline();
    process.stdout.write(t?.trim() ? `${t.trim()}
` : "\xB7 timeline empty (nothing captured yet).\n");
  });
  scribe.command("health").description("show the scribe writer's health (last write, fault count)").action(() => {
    const h = readHealth();
    info(`last write: ${h.lastWriteAt ?? "never"}`);
    info(`faults: ${h.faultCount}${h.lastFault ? ` (last: ${h.lastFault})` : ""}`);
  });
}

// src/commands/connectors.ts
import { createInterface as createInterface6 } from "readline/promises";
import { stdin as stdin6, stdout as stdout7 } from "process";

// src/connectors/connectors.ts
import { readFileSync as readFileSync19, writeFileSync as writeFileSync14 } from "fs";
import { join as join21 } from "path";

// src/connectors/catalog.ts
var CONNECTOR_CATALOG = [
  {
    "slug": "github",
    "name": "GitHub",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://github.com/github/github-mcp-server",
    "description": "Official GitHub server for integration with repository management, PRs, issues, and more.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via GitHub OAuth \u2014 no keys to paste.",
      "docs": "https://docs.github.com/rest"
    }
  },
  {
    "slug": "gitlab",
    "name": "GitLab",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://github.com/kopfrechner/gitlab-mr-mcp",
    "description": "Interact seamlessly with issues and merge requests of your GitLab projects.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via GitLab OAuth \u2014 no keys to paste.",
      "docs": "https://docs.gitlab.com/ee/api/"
    }
  },
  {
    "slug": "linear",
    "name": "Linear",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://github.com/tacticlaunch/mcp-linear",
    "description": "Integrates with Linear project management system",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Linear OAuth \u2014 no keys to paste.",
      "docs": "https://developers.linear.app/"
    }
  },
  {
    "slug": "jira",
    "name": "Jira",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://github.com/sooperset/mcp-atlassian",
    "description": "MCP server for Atlassian products (Confluence and Jira). Supports Confluence Cloud, Jira Cloud, and Jira Server/Data Center. Provides comprehensive tools for searching, reading, creating, and managing content across Atlassian workspaces.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Jira OAuth \u2014 no keys to paste.",
      "docs": "https://developer.atlassian.com/cloud/jira/"
    }
  },
  {
    "slug": "sentry",
    "name": "Sentry",
    "category": "Development",
    "authType": "token",
    "mcpUrl": "https://github.com/getsentry/sentry-mcp",
    "description": "Sentry.io integration for error tracking and performance monitoring",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Sentry Access Token",
          "type": "password",
          "help": "https://docs.sentry.io/api/"
        }
      ]
    }
  },
  {
    "slug": "vercel",
    "name": "Vercel",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://mcp.vercel.com",
    "description": "Vercel is the platform for deploying and hosting frontend apps and serverless functions. Its official remote MCP server lets ORIRO manage projects, deployments, domains, and environment variables.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Vercel OAuth \u2014 no keys to paste.",
      "docs": "https://vercel.com/docs/rest-api"
    }
  },
  {
    "slug": "netlify",
    "name": "Netlify",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "npm:@netlify/mcp",
    "description": "Netlify is a web platform for building, deploying, and hosting modern sites and serverless functions. The official @netlify/mcp package (6 tools, node) exposes site, deploy, and build operations.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Netlify OAuth \u2014 no keys to paste.",
      "docs": "https://docs.netlify.com/api/get-started/"
    }
  },
  {
    "slug": "cloudflare",
    "name": "Cloudflare",
    "category": "Development",
    "authType": "apikey",
    "mcpUrl": "https://github.com/cloudflare/mcp-server-cloudflare",
    "description": "Integration with Cloudflare services including Workers, KV, R2, and D1",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Cloudflare API Key",
          "type": "password",
          "help": "https://developers.cloudflare.com/api/"
        }
      ]
    }
  },
  {
    "slug": "aws",
    "name": "AWS",
    "category": "Development",
    "authType": "apikey",
    "mcpUrl": "https://github.com/awslabs/mcp",
    "description": "AWS MCP servers for seamless integration with AWS services and resources.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "AWS API Key",
          "type": "password",
          "help": "https://docs.aws.amazon.com/"
        }
      ]
    }
  },
  {
    "slug": "datadog",
    "name": "Datadog",
    "category": "Development",
    "authType": "apikey",
    "mcpUrl": "https://github.com/traceloop/opentelemetry-mcp-server",
    "description": "An MCP server for connecting to any OpenTelemetry backend (Datadog, Grafana, Dynatrace, Traceloop, etc.).",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Datadog API Key",
          "type": "password",
          "help": "https://docs.datadoghq.com/api/"
        }
      ]
    }
  },
  {
    "slug": "slack",
    "name": "Slack",
    "category": "Communication",
    "authType": "oauth",
    "mcpUrl": "https://github.com/korotovsky/slack-mcp-server",
    "description": "The most powerful MCP server for Slack Workspaces.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Slack OAuth \u2014 no keys to paste.",
      "docs": "https://api.slack.com/"
    }
  },
  {
    "slug": "discord",
    "name": "Discord",
    "category": "Communication",
    "authType": "token",
    "mcpUrl": "https://github.com/SaseQ/discord-mcp",
    "description": "A MCP server for the Discord integration. Enable your AI assistants to seamlessly interact with Discord. Enhance your Discord experience with powerful automation capabilities.",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Discord Access Token",
          "type": "password",
          "help": "https://discord.com/developers/docs"
        }
      ]
    }
  },
  {
    "slug": "telegram",
    "name": "Telegram",
    "category": "Communication",
    "authType": "token",
    "mcpUrl": "https://github.com/chaindead/telegram-mcp",
    "description": "Telegram API integration for accessing user data, managing dialogs (chats, channels, groups), retrieving messages, and handling read status",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Telegram Access Token",
          "type": "password",
          "help": "https://core.telegram.org/bots/api"
        }
      ]
    }
  },
  {
    "slug": "microsoft-teams",
    "name": "Microsoft Teams",
    "category": "Communication",
    "authType": "oauth",
    "mcpUrl": "https://github.com/InditexTech/mcp-teams-server",
    "description": "MCP server that integrates Microsoft Teams messaging (read, post, mention, list members and threads)",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Microsoft Teams OAuth \u2014 no keys to paste.",
      "docs": "https://learn.microsoft.com/graph/teams-concept-overview"
    }
  },
  {
    "slug": "zoom",
    "name": "Zoom",
    "category": "Communication",
    "authType": "oauth",
    "mcpUrl": "https://github.com/joinly-ai/joinly",
    "description": "MCP server to interact with browser-based meeting platforms (Zoom, Teams, Google Meet). Enables AI agents to send bots to online meetings, gather live transcripts, speak text, and send messages in the meeting chat.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Zoom OAuth \u2014 no keys to paste.",
      "docs": "https://developers.zoom.us/docs/api/"
    }
  },
  {
    "slug": "twilio",
    "name": "Twilio",
    "category": "Communication",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Twilio integration for ORIRO. (Communication category.)",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Twilio API Key",
          "type": "password",
          "help": "https://www.twilio.com/docs/usage/api"
        }
      ]
    }
  },
  {
    "slug": "notion",
    "name": "Notion",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "https://github.com/suekou/mcp-notion-server",
    "description": "Interacting with Notion API",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Notion OAuth \u2014 no keys to paste.",
      "docs": "https://developers.notion.com/"
    }
  },
  {
    "slug": "google-drive",
    "name": "Google Drive",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "https://github.com/isaacphi/mcp-gdrive",
    "description": "Model Context Protocol (MCP) Server for reading from Google Drive and editing Google Sheets.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Google Drive OAuth \u2014 no keys to paste.",
      "docs": "https://developers.google.com/drive"
    }
  },
  {
    "slug": "airtable",
    "name": "Airtable",
    "category": "Productivity",
    "authType": "apikey",
    "mcpUrl": "https://github.com/domdomegg/airtable-mcp-server",
    "description": "Airtable database integration with schema inspection, read and write capabilities",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Airtable API Key",
          "type": "password",
          "help": "https://airtable.com/developers/web/api/introduction"
        }
      ]
    }
  },
  {
    "slug": "confluence",
    "name": "Confluence",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "https://github.com/sooperset/mcp-atlassian",
    "description": "MCP server for Atlassian products (Confluence and Jira). Supports Confluence Cloud, Jira Cloud, and Jira Server/Data Center. Provides comprehensive tools for searching, reading, creating, and managing content across Atlassian workspaces.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Confluence OAuth \u2014 no keys to paste.",
      "docs": "https://developer.atlassian.com/cloud/confluence/"
    }
  },
  {
    "slug": "google-calendar",
    "name": "Google Calendar",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "https://github.com/takumi0706/google-calendar-mcp",
    "description": "An MCP server to interface with the Google Calendar API. Based on TypeScript.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Google Calendar OAuth \u2014 no keys to paste.",
      "docs": "https://developers.google.com/calendar"
    }
  },
  {
    "slug": "microsoft-365",
    "name": "Microsoft 365",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "Microsoft 365 is the productivity suite \u2014 Outlook, Teams, SharePoint, OneDrive. ORIRO connects via the Microsoft Graph API for mail, calendar, files, and collaboration.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Microsoft 365 OAuth \u2014 no keys to paste.",
      "docs": "https://learn.microsoft.com/graph/"
    }
  },
  {
    "slug": "figma",
    "name": "Figma",
    "category": "Design",
    "authType": "token",
    "mcpUrl": "https://github.com/GLips/Figma-Context-MCP",
    "description": "Provide coding agents direct access to Figma data to help them one-shot design implementation.",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Figma Access Token",
          "type": "password",
          "help": "https://www.figma.com/developers/api"
        }
      ]
    }
  },
  {
    "slug": "canva",
    "name": "Canva",
    "category": "Design",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "Canva integration for ORIRO. (Design category.)",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Canva OAuth \u2014 no keys to paste.",
      "docs": "https://www.canva.dev/docs/connect/"
    }
  },
  {
    "slug": "adobe",
    "name": "Adobe",
    "category": "Design",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "Adobe Analytics is an enterprise web/marketing analytics platform. Its official MCP server exposes reporting and segment tools.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Adobe OAuth \u2014 no keys to paste.",
      "docs": "https://developer.adobe.com/"
    }
  },
  {
    "slug": "google-analytics",
    "name": "Google Analytics",
    "category": "Data and Analytics",
    "authType": "oauth",
    "mcpUrl": "https://github.com/googleanalytics/google-analytics-mcp",
    "description": "Google Analytics (GA4) is the standard web analytics platform. Its official MCP server provides read-only reporting tools, authenticated via Google Application Default Credentials.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Google Analytics OAuth \u2014 no keys to paste.",
      "docs": "https://developers.google.com/analytics"
    }
  },
  {
    "slug": "mixpanel",
    "name": "Mixpanel",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://docs.mixpanel.com/docs/mcp",
    "description": "Mixpanel is a product-analytics platform. Its official hosted MCP server (2026) answers natural-language questions about events, funnels, flows, retention, and session replays.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Mixpanel API Key",
          "type": "password",
          "help": "https://developer.mixpanel.com/"
        }
      ]
    }
  },
  {
    "slug": "amplitude",
    "name": "Amplitude",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Amplitude is a digital-analytics platform. Its official MCP server covers analytics, session replays, feature flags, and web vitals.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Amplitude API Key",
          "type": "password",
          "help": "https://www.docs.developers.amplitude.com/"
        }
      ]
    }
  },
  {
    "slug": "segment",
    "name": "Segment",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Segment is a customer-data platform. ORIRO connects via its REST + Connections API to route and manage event and customer data across tools.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Segment API Key",
          "type": "password",
          "help": "https://segment.com/docs/"
        }
      ]
    }
  },
  {
    "slug": "snowflake",
    "name": "Snowflake",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/Snowflake-Labs/mcp",
    "description": "Open-source MCP server for Snowflake from official Snowflake-Labs supports prompting Cortex Agents, querying structured & unstructured data, object management, SQL execution, semantic view querying, and more. RBAC, fine-grained CRUD controls, and all authentication methods supported.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Snowflake API Key",
          "type": "password",
          "help": "https://docs.snowflake.com/"
        }
      ]
    }
  },
  {
    "slug": "bigquery",
    "name": "BigQuery",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/ergut/mcp-bigquery-server",
    "description": "Server implementation for Google BigQuery integration that enables direct BigQuery database access and querying capabilities",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "BigQuery API Key",
          "type": "password",
          "help": "https://cloud.google.com/bigquery/docs"
        }
      ]
    }
  },
  {
    "slug": "supabase",
    "name": "Supabase",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/supabase-community/supabase-mcp",
    "description": "Official Supabase MCP server to connect AI assistants directly with your Supabase project and allows them to perform tasks like managing tables, fetching config, and querying data.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Supabase API Key",
          "type": "password",
          "help": "https://supabase.com/docs"
        }
      ]
    }
  },
  {
    "slug": "mongodb-atlas",
    "name": "MongoDB Atlas",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/furey/mongodb-lens",
    "description": "MongoDB Lens: Full Featured MCP Server for MongoDB Databases",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "MongoDB Atlas API Key",
          "type": "password",
          "help": "https://www.mongodb.com/docs/atlas/"
        }
      ]
    }
  },
  {
    "slug": "planetscale",
    "name": "PlanetScale",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/planetscale/cli",
    "description": "The CLI for PlanetScale Database.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "PlanetScale API Key",
          "type": "password",
          "help": "https://planetscale.com/docs"
        }
      ]
    }
  },
  {
    "slug": "stripe",
    "name": "Stripe",
    "category": "Finance",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Stripe integration for ORIRO. (Finance category.)",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Stripe API Key",
          "type": "password",
          "help": "https://stripe.com/docs/api"
        }
      ]
    }
  },
  {
    "slug": "quickbooks",
    "name": "QuickBooks",
    "category": "Finance",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "QuickBooks integration for ORIRO. (Finance category.)",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via QuickBooks OAuth \u2014 no keys to paste.",
      "docs": "https://developer.intuit.com/"
    }
  },
  {
    "slug": "xero",
    "name": "Xero",
    "category": "Finance",
    "authType": "oauth",
    "mcpUrl": "https://github.com/XeroAPI/xero-mcp-server",
    "description": "An MCP server that integrates with Xero's API, allowing for standardized access to Xero's accounting and business features.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Xero OAuth \u2014 no keys to paste.",
      "docs": "https://developer.xero.com/"
    }
  },
  {
    "slug": "plaid",
    "name": "Plaid",
    "category": "Finance",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Plaid connects apps to users' bank accounts. ORIRO connects via its REST API for balances, transactions, and identity (financial data connectivity).",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Plaid API Key",
          "type": "password",
          "help": "https://plaid.com/docs/api/"
        }
      ]
    }
  },
  {
    "slug": "shopify",
    "name": "Shopify",
    "category": "E-commerce",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Shopify is a leading e-commerce platform. ORIRO connects via its REST + GraphQL Admin API to manage products, orders, customers, and inventory.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Shopify API Key",
          "type": "password",
          "help": "https://shopify.dev/docs/api"
        }
      ]
    }
  },
  {
    "slug": "woocommerce",
    "name": "WooCommerce",
    "category": "E-commerce",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "WooCommerce is the WordPress e-commerce plugin powering millions of stores. ORIRO connects via its REST API for products, orders, and customers.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "WooCommerce API Key",
          "type": "password",
          "help": "https://woocommerce.github.io/woocommerce-rest-api-docs/"
        }
      ]
    }
  },
  {
    "slug": "mailchimp",
    "name": "Mailchimp",
    "category": "Marketing",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Mailchimp is an email-marketing industry standard. ORIRO connects via REST API v3 to manage audiences, campaigns, and automations.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Mailchimp API Key",
          "type": "password",
          "help": "https://mailchimp.com/developer/"
        }
      ]
    }
  },
  {
    "slug": "sendgrid",
    "name": "SendGrid",
    "category": "Marketing",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "SendGrid is a transactional and marketing email service used by millions of developers. ORIRO connects via its REST API to send mail and manage templates, contacts, and stats.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "SendGrid API Key",
          "type": "password",
          "help": "https://docs.sendgrid.com/api-reference"
        }
      ]
    }
  },
  {
    "slug": "hubspot",
    "name": "HubSpot",
    "category": "Marketing",
    "authType": "oauth",
    "mcpUrl": "https://developers.hubspot.com/mcp",
    "description": "HubSpot is a leading CRM and marketing/sales platform. Its official remote MCP server (GA May 2026) works with contacts, companies, deals, tickets, and engagements.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via HubSpot OAuth \u2014 no keys to paste.",
      "docs": "https://developers.hubspot.com/"
    }
  },
  {
    "slug": "salesforce",
    "name": "Salesforce",
    "category": "Marketing",
    "authType": "oauth",
    "mcpUrl": "https://github.com/salesforcecli/mcp",
    "description": "Salesforce is the leading enterprise CRM. The official salesforcecli/mcp server (Apache 2.0) exposes 60+ tools with dynamic toolsets for orgs, records, and metadata.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Salesforce OAuth \u2014 no keys to paste.",
      "docs": "https://developer.salesforce.com/"
    }
  },
  {
    "slug": "meta",
    "name": "Meta",
    "category": "Marketing",
    "authType": "oauth",
    "mcpUrl": "https://github.com/gomarble-ai/facebook-ads-mcp-server",
    "description": "MCP server acting as an interface to the Facebook Ads, enabling programmatic access to Facebook Ads data and management features.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Meta OAuth \u2014 no keys to paste.",
      "docs": "https://developers.facebook.com/"
    }
  },
  {
    "slug": "google-ads",
    "name": "Google Ads",
    "category": "Marketing",
    "authType": "oauth",
    "mcpUrl": "https://github.com/gomarble-ai/google-ads-mcp-server",
    "description": "MCP server acting as an interface to the Google Ads, enabling programmatic access to Google Ads data and management features.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Google Ads OAuth \u2014 no keys to paste.",
      "docs": "https://developers.google.com/google-ads/api/docs/start"
    }
  },
  {
    "slug": "youtube",
    "name": "YouTube",
    "category": "Media and Content",
    "authType": "oauth",
    "mcpUrl": "https://github.com/kimtaeyoon83/mcp-server-youtube-transcript",
    "description": "Fetch YouTube subtitles and transcripts for AI analysis",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via YouTube OAuth \u2014 no keys to paste.",
      "docs": "https://developers.google.com/youtube"
    }
  },
  {
    "slug": "tiktok",
    "name": "TikTok",
    "category": "Media and Content",
    "authType": "oauth",
    "mcpUrl": "https://github.com/Seym0n/tiktok-mcp",
    "description": "Interact with TikTok videos",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via TikTok OAuth \u2014 no keys to paste.",
      "docs": "https://developers.tiktok.com/"
    }
  },
  {
    "slug": "vimeo",
    "name": "Vimeo",
    "category": "Media and Content",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "Vimeo is a professional video-hosting platform. ORIRO connects via its REST API v3.4 (OAuth) to upload, manage, and retrieve videos.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Vimeo OAuth \u2014 no keys to paste.",
      "docs": "https://developer.vimeo.com/"
    }
  },
  {
    "slug": "wordpress",
    "name": "WordPress",
    "category": "Media and Content",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "WordPress integration for ORIRO. (Media and Content category.)",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "WordPress API Key",
          "type": "password",
          "help": "https://developer.wordpress.org/rest-api/"
        }
      ]
    }
  },
  {
    "slug": "ghost",
    "name": "Ghost",
    "category": "Media and Content",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Ghost is a modern publishing platform. ORIRO connects via its Content + Admin REST API to manage posts, pages, and members.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Ghost API Key",
          "type": "password",
          "help": "https://ghost.org/docs/admin-api/"
        }
      ]
    }
  },
  {
    "slug": "hugging-face",
    "name": "Hugging Face",
    "category": "AI and Research",
    "authType": "token",
    "mcpUrl": "https://github.com/evalstate/mcp-hfspace",
    "description": "Use HuggingFace Spaces directly from Claude. Use Open Source Image Generation, Chat, Vision tasks and more. Supports Image, Audio and text uploads/downloads.",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Hugging Face Access Token",
          "type": "password",
          "help": "https://huggingface.co/docs/api-inference"
        }
      ]
    }
  },
  {
    "slug": "replicate",
    "name": "Replicate",
    "category": "AI and Research",
    "authType": "token",
    "mcpUrl": "https://github.com/awkoy/replicate-flux-mcp",
    "description": "Provides the ability to generate images via Replicate's API.",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Replicate Access Token",
          "type": "password",
          "help": "https://replicate.com/docs/reference/http"
        }
      ]
    }
  },
  {
    "slug": "wolfram-alpha",
    "name": "Wolfram Alpha",
    "category": "AI and Research",
    "authType": "apikey",
    "mcpUrl": "https://github.com/SecretiveShell/MCP-wolfram-alpha",
    "description": "An MCP server for querying wolfram alpha API.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Wolfram Alpha API Key",
          "type": "password",
          "help": "https://products.wolframalpha.com/api/"
        }
      ]
    }
  },
  {
    "slug": "arxiv",
    "name": "arXiv",
    "category": "AI and Research",
    "authType": "none",
    "mcpUrl": "https://github.com/andybrandt/mcp-simple-arxiv",
    "description": "MCP for LLM to search and read papers from arXiv",
    "configSchema": {
      "auth": "none",
      "fields": [],
      "note": "Public API \u2014 no credentials required."
    }
  },
  {
    "slug": "pubmed",
    "name": "PubMed",
    "category": "AI and Research",
    "authType": "none",
    "mcpUrl": "https://github.com/andybrandt/mcp-simple-pubmed",
    "description": "MCP to search and read medical / life sciences papers from PubMed.",
    "configSchema": {
      "auth": "none",
      "fields": [],
      "note": "Public API \u2014 no credentials required."
    }
  },
  {
    "slug": "octoprint",
    "name": "OctoPrint",
    "category": "Making and Hardware",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "OctoPrint is the leading 3D-printer web control software (8k+ stars). ORIRO connects via its REST API to monitor and control prints.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "OctoPrint API Key",
          "type": "password",
          "help": "https://docs.octoprint.org/en/master/api/"
        }
      ]
    }
  },
  {
    "slug": "arduino-cloud",
    "name": "Arduino Cloud",
    "category": "Making and Hardware",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Arduino Cloud is an IoT platform for managing devices and dashboards. ORIRO connects via its REST API for device and data management.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Arduino Cloud API Key",
          "type": "password",
          "help": "https://docs.arduino.cc/arduino-cloud/"
        }
      ]
    }
  },
  {
    "slug": "home-assistant",
    "name": "Home Assistant",
    "category": "Making and Hardware",
    "authType": "token",
    "mcpUrl": "https://github.com/tevonsb/homeassistant-mcp",
    "description": "Access Home Assistant data and control devices (lights, switches, thermostats, etc).",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Home Assistant Access Token",
          "type": "password",
          "help": "https://developers.home-assistant.io/docs/api/rest/"
        }
      ]
    }
  }
];
function connectorBySlug(slug) {
  return CONNECTOR_CATALOG.find((c) => c.slug === slug);
}

// src/connectors/connectors.ts
function file2() {
  return join21(oriroDir(), "connectors.json");
}
function readAdded() {
  try {
    const v = JSON.parse(readFileSync19(file2(), "utf8"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeAdded(slugs) {
  writeFileSync14(join21(ensureOriroDir(), "connectors.json"), JSON.stringify([...new Set(slugs)], null, 2), "utf8");
}
function listConnectors(category) {
  return category ? CONNECTOR_CATALOG.filter((c) => c.category === category) : CONNECTOR_CATALOG;
}
function connectorCategories() {
  return [...new Set(CONNECTOR_CATALOG.map((c) => c.category))].sort();
}
function isConnectorAdded(slug) {
  return readAdded().includes(slug);
}
function addConnector(slug) {
  const entry = connectorBySlug(slug);
  if (!entry) return { ok: false, error: `unknown connector '${slug}' \u2014 run \`oriro connectors list\`` };
  if (!entry.mcpUrl) return { ok: false, error: `'${slug}' has no MCP source` };
  if (!entry.configSchema || typeof entry.configSchema !== "object") return { ok: false, error: `'${slug}' has no config schema` };
  writeAdded([...readAdded(), slug]);
  return { ok: true };
}
function addedConnectors() {
  const added = new Set(readAdded());
  return CONNECTOR_CATALOG.filter((c) => added.has(c.slug));
}
function removeConnector(slug) {
  const before = readAdded();
  if (!before.includes(slug)) return false;
  writeAdded(before.filter((s) => s !== slug));
  return true;
}

// src/connectors/custom.ts
import { readFileSync as readFileSync20, writeFileSync as writeFileSync15 } from "fs";
import { join as join22 } from "path";
function file3() {
  return join22(oriroDir(), "mcp-custom.json");
}
function readCustomServers() {
  try {
    const v = JSON.parse(readFileSync20(file3(), "utf8"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function saveCustomServer(server) {
  const rest = readCustomServers().filter((s) => s.name.toLowerCase() !== server.name.toLowerCase());
  writeFileSync15(join22(ensureOriroDir(), "mcp-custom.json"), JSON.stringify([...rest, server], null, 2), "utf8");
}
function removeCustomServer(name) {
  const before = readCustomServers();
  const after = before.filter((s) => s.name.toLowerCase() !== name.toLowerCase());
  if (after.length === before.length) return false;
  writeFileSync15(join22(ensureOriroDir(), "mcp-custom.json"), JSON.stringify(after, null, 2), "utf8");
  return true;
}
function trustedServerNames() {
  return readCustomServers().filter((s) => s.trusted).map((s) => s.name);
}
function isServerTrusted(name) {
  return trustedServerNames().some((n) => n.toLowerCase() === name.toLowerCase());
}

// src/connectors/setup.ts
function buildServerConfig(i) {
  if (i.url) return { type: "http", url: i.url, ...i.headers && Object.keys(i.headers).length ? { headers: i.headers } : {} };
  return {
    type: "stdio",
    command: i.command ?? "",
    ...i.args && i.args.length ? { args: i.args } : {},
    ...i.env && Object.keys(i.env).length ? { env: i.env } : {}
  };
}
function vetServer(i) {
  const alreadyTrusted = isServerTrusted(i.name);
  const v = vetMcpServer(i.name, { command: i.command, args: i.args, url: i.url, env: i.env });
  let decision = v.decision;
  if (decision === "ask" && alreadyTrusted) decision = "allow";
  return { decision, reason: v.reason, alreadyTrusted };
}
function parsePairs(s) {
  const out = {};
  for (const part of (s ?? "").split(",")) {
    const t = part.trim();
    if (!t) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

// src/connectors/mcp-client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
function assertSafeUrl(raw, allowLocal = false) {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error(`unsupported scheme: ${u.protocol}`);
  const host = u.hostname.toLowerCase();
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
  const isPrivate = /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host) || /^fe80:/i.test(host) || /^f[cd][0-9a-f]{2}:/i.test(host) || host === "169.254.169.254" || host === "metadata.google.internal";
  if ((isLoopback || isPrivate) && !allowLocal) {
    throw new Error(`blocked SSRF target ${host} (use --allow-local for loopback/LAN MCP servers)`);
  }
  if (u.protocol === "http:" && !isLoopback && !allowLocal) throw new Error(`refusing plaintext http to ${host} \u2014 use https`);
  return u;
}

// src/commands/connectors.ts
function registerConnectorsCommand(program2) {
  const connectors = program2.command("connectors").description("MCP connectors \u2014 add external tools/services (inert until used)");
  connectors.command("list [category]").description("list the connector catalog (optionally filtered by category)").action((category) => {
    if (category && !connectorCategories().includes(category)) {
      die(`unknown category '${category}' \u2014 categories: ${connectorCategories().join(", ")}`);
    }
    const entries = listConnectors(category);
    const added = new Set(addedConnectors().map((c) => c.slug));
    heading(category ? `Connectors \xB7 ${category}` : "Connectors");
    let addable = 0;
    for (const c of entries) {
      const canAdd = !!c.mcpUrl;
      if (canAdd) addable++;
      const mark = !canAdd ? dim("\xB7") : added.has(c.slug) ? accent("\u25CF") : dim("\u25CB");
      const name = canAdd ? c.name.padEnd(22) : dim(`${c.name} (coming soon)`.padEnd(22));
      process.stdout.write(`  ${mark} ${(canAdd ? accent : dim)(c.slug.padEnd(20))} ${name} ${dim(c.category)}
`);
    }
    info(`${addable} addable${category ? ` in '${category}'` : ""} \xB7 ${added.size} added \xB7 ${entries.length - addable} coming soon`);
  });
  connectors.command("add <slug>").description("add a connector (validate + record; connects only when used)").action((slug) => {
    if (isConnectorAdded(slug)) {
      info(`${slug} is already added`);
      return;
    }
    const res = addConnector(slug);
    if (!res.ok) die(res.error ?? `could not add '${slug}'`);
    ok(`added ${accent(slug)} \u2014 recorded locally`);
  });
  connectors.command("remove <slug>").description("remove a connector").action((slug) => {
    if (removeConnector(slug)) ok(`removed ${accent(slug)}`);
    else info(`'${slug}' is not in your added list \u2014 nothing to remove`);
  });
  connectors.command("setup").description("guided setup of a CUSTOM MCP server \u2014 Guardian-vetted, no JSON").option("--name <name>", "a short name for the server").option("--command <cmd>", "stdio launch command, e.g. 'npx -y @scope/mcp'").option("--args <args>", "space-separated args for --command").option("--env <pairs>", "comma-separated KEY=VAL env vars").option("--url <url>", "http(s) MCP endpoint (instead of --command)").option("--header <pairs>", "comma-separated KEY=VAL headers (with --url)").option("--allow-local", "permit loopback/LAN URL targets").option("-y, --yes", "trust and save when Guardian says 'ask'").action(async (opts) => {
    const interactive = !!stdin6.isTTY && !!stdout7.isTTY;
    let { name, command, url } = opts;
    let argsStr = opts.args;
    let envStr = opts.env;
    if (!name || !command && !url) {
      if (!interactive) {
        heading("ORIRO MCP setup \u{1F6E1}");
        info("Describe a custom MCP server; Guardian vets it before it's saved \u2014 no JSON.");
        process.stdout.write(
          `
  ${accent('oriro connectors setup --name <n> --command "npx -y @scope/mcp"')}
  ${accent("oriro connectors setup --name <n> --url https://host/mcp")}
  ${dim('optional: --args "a b"  --env K=V,K2=V2  --header K=V  --allow-local  --yes')}

  ${dim("On a real terminal, run it with no flags for a guided Q&A.")}
`
        );
        return;
      }
      const rl = createInterface6({ input: stdin6, output: stdout7 });
      try {
        name = name || (await rl.question("Server name: ")).trim();
        if (!command && !url) {
          const t = (await rl.question("Transport \u2014 [s]tdio command or [u]rl? ")).trim().toLowerCase();
          if (t.startsWith("u")) {
            url = (await rl.question("URL: ")).trim();
          } else {
            command = (await rl.question("Command (e.g. npx -y @scope/mcp): ")).trim();
            argsStr = (await rl.question("Args (space-separated, optional): ")).trim() || void 0;
            envStr = (await rl.question("Env KEY=VAL,comma-separated (optional): ")).trim() || void 0;
          }
        }
      } finally {
        rl.close();
      }
    }
    if (!name) die("a server name is required");
    if (!command && !url) die("either --command or --url is required");
    const args = argsStr ? argsStr.split(/\s+/).filter(Boolean) : void 0;
    const env = envStr ? parsePairs(envStr) : void 0;
    const headers = opts.header ? parsePairs(opts.header) : void 0;
    if (url) {
      try {
        assertSafeUrl(url, !!opts.allowLocal);
      } catch (e) {
        die(e instanceof Error ? e.message : String(e));
      }
    }
    const input = { name, command, args, env, url, headers };
    const config = buildServerConfig(input);
    const outcome = vetServer(input);
    heading("ORIRO MCP setup \xB7 Guardian \u{1F6E1}");
    if (outcome.decision === "block") {
      die(`Guardian BLOCKED "${name}": ${outcome.reason}. Not saved.`);
    }
    let trusted = outcome.decision === "allow";
    if (outcome.decision === "ask") {
      info(`Guardian: ${outcome.reason}`);
      if (opts.yes) {
        trusted = true;
      } else if (interactive) {
        const rl = createInterface6({ input: stdin6, output: stdout7 });
        try {
          const ans = (await rl.question(`Trust and save "${name}"? [y/N] `)).trim().toLowerCase();
          trusted = ans === "y" || ans === "yes";
        } finally {
          rl.close();
        }
      } else {
        info(`Not saved \u2014 re-run with --yes to trust "${name}".`);
        return;
      }
      if (!trusted) {
        info("Not saved.");
        return;
      }
    }
    saveCustomServer({ name, config, trusted });
    ok(`saved MCP server ${accent(name)} \u2014 ${trusted ? "trusted" : "untrusted"} (${config.type})`);
    if (outcome.alreadyTrusted) info("already trusted \u2014 Guardian did not re-ask");
  });
  connectors.command("custom").description("list the custom MCP servers you've set up").action(() => {
    const servers = readCustomServers();
    heading("Custom MCP servers");
    if (!servers.length) {
      info("none yet \u2014 add one with `oriro connectors setup`");
      return;
    }
    for (const s of servers) {
      const where = s.config.type === "stdio" ? s.config.command : s.config.url;
      const mark = s.trusted ? accent("\u25CF") : dim("\u25CB");
      process.stdout.write(`  ${mark} ${accent(s.name.padEnd(20))} ${dim(`${s.config.type} \xB7 ${where}`)}
`);
    }
    info(`${servers.length} custom \xB7 ${servers.filter((s) => s.trusted).length} trusted`);
  });
  connectors.command("forget <name>").description("remove a custom MCP server you set up").action((name) => {
    if (removeCustomServer(name)) ok(`forgot ${accent(name)}`);
    else info(`'${name}' is not a custom server \u2014 nothing to forget`);
  });
}

// src/channels/config.ts
import { readFileSync as readFileSync21, writeFileSync as writeFileSync16 } from "fs";
import { join as join23 } from "path";
function file4() {
  return join23(oriroDir(), "channels.json");
}
function readChannels() {
  try {
    const v = JSON.parse(readFileSync21(file4(), "utf8"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function saveChannel(cfg) {
  const all = readChannels().filter((c) => c.kind !== cfg.kind);
  all.push(cfg);
  writeFileSync16(join23(ensureOriroDir(), "channels.json"), JSON.stringify(all, null, 2), "utf8");
}
function removeChannel(kind) {
  writeFileSync16(join23(ensureOriroDir(), "channels.json"), JSON.stringify(readChannels().filter((c) => c.kind !== kind), null, 2), "utf8");
}

// src/channels/telegram.ts
import { Bot } from "grammy";

// src/channels/host.ts
var OriroChannelHost = class {
  session = null;
  starting = null;
  async ensure() {
    if (this.session) return this.session;
    if (!this.starting) {
      this.starting = assembleOriroSession().then((a) => {
        this.session = a.session;
        return a.session;
      });
    }
    return this.starting;
  }
  /** Dispatch one inbound message → ORIRO reply. Never throws — a channel must not crash on a turn. */
  async dispatch(text) {
    try {
      const session = await this.ensure();
      let out = "";
      const unsub = session.subscribe((e) => {
        if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") out += e.assistantMessageEvent.delta ?? "";
      });
      try {
        noteUserInput(text);
        await session.prompt(text);
      } finally {
        unsub();
      }
      return scrubIdentity(out).trim() || "(ORIRO had no reply)";
    } catch (e) {
      return `ORIRO error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  dispose() {
    this.session?.dispose();
    this.session = null;
    this.starting = null;
  }
};

// src/channels/telegram.ts
var TELEGRAM_TOKEN = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;
async function validateTelegramToken(token) {
  if (!TELEGRAM_TOKEN.test(token)) throw new Error("malformed token (get one from @BotFather)");
  const me = await new Bot(token).api.getMe();
  return me.username;
}
async function startTelegram(token) {
  if (!TELEGRAM_TOKEN.test(token)) throw new Error("invalid Telegram bot token (get one from @BotFather)");
  const bot = new Bot(token);
  const host = new OriroChannelHost();
  bot.on("message:text", async (ctx) => {
    const reply = await host.dispatch(ctx.message.text);
    await ctx.reply(reply);
  });
  bot.catch((err) => {
    process.stderr.write(`telegram error: ${err instanceof Error ? err.message : String(err)}
`);
  });
  void bot.start({ drop_pending_updates: true });
  return {
    stop: async () => {
      await bot.stop();
      host.dispose();
    }
  };
}

// src/channels/discord.ts
var DISCORD_TOKEN = /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}$/;
var MAX_DISCORD = 2e3;
async function validateDiscordToken(token) {
  if (!DISCORD_TOKEN.test(token)) throw new Error("malformed token (Discord Developer Portal \u2192 Bot \u2192 Reset Token)");
  const res = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bot ${token}` } });
  if (!res.ok) throw new Error(`Discord rejected the token (HTTP ${res.status})`);
  const me = await res.json();
  return me.username ?? me.id ?? "unknown";
}
async function startDiscord(token) {
  const { Client: Client2, GatewayIntentBits, Events } = await import("discord.js");
  const host = new OriroChannelHost();
  const client = new Client2({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages
    ]
  });
  client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot || !msg.content) return;
    const reply = await host.dispatch(msg.content);
    try {
      await msg.reply(reply.slice(0, MAX_DISCORD));
    } catch (e) {
      process.stderr.write(`discord reply failed: ${e instanceof Error ? e.message : String(e)}
`);
    }
  });
  client.on(Events.Error, (err) => process.stderr.write(`discord error: ${err.message}
`));
  await client.login(token);
  return {
    stop: async () => {
      await client.destroy();
      host.dispose();
    }
  };
}

// src/channels/whatsapp.ts
import { join as join24 } from "path";
function whatsappAuthDir() {
  return join24(oriroDir(), "whatsapp-auth");
}
async function startWhatsApp() {
  let baileys;
  let qrcode;
  try {
    baileys = await import("@whiskeysockets/baileys");
    qrcode = (await import("qrcode-terminal")).default;
  } catch {
    throw new Error("WhatsApp needs Baileys \u2014 install it:\n  npm i @whiskeysockets/baileys qrcode-terminal");
  }
  const { state, saveCreds } = await baileys.useMultiFileAuthState(whatsappAuthDir());
  const host = new OriroChannelHost();
  const sock = baileys.makeWASocket({ auth: state });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (u) => {
    if (u.qr) {
      process.stdout.write("\nScan this QR in WhatsApp \u2192 Settings \u2192 Linked devices:\n");
      qrcode.generate(u.qr, { small: true });
    }
    if (u.connection === "open") process.stdout.write("WhatsApp linked \u2713 \u2014 message the linked number to talk to ORIRO.\n");
  });
  sock.ev.on("messages.upsert", async (m) => {
    if (m.type !== "notify") return;
    for (const msg of m.messages ?? []) {
      if (msg.key?.fromMe) continue;
      const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text;
      const jid = msg.key?.remoteJid;
      if (!text || !jid) continue;
      const reply = await host.dispatch(text);
      await sock.sendMessage(jid, { text: reply });
    }
  });
  return {
    stop: async () => {
      try {
        await sock.logout();
      } catch {
      }
      host.dispose();
    }
  };
}

// src/commands/channels.ts
var KINDS = ["telegram", "discord", "whatsapp"];
var isKind = (s) => KINDS.includes(s);
function hold(name, running) {
  ok(`${name} host running \u2014 message it to talk to ORIRO. Ctrl-C to stop.`);
  const shutdown = () => void running.stop().finally(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
function registerChannelsCommand(program2) {
  const channels = program2.command("channels").description("run ORIRO from Telegram/Discord/WhatsApp with your own bot");
  channels.command("add <kind> <token>").description("store your own bot token (telegram/discord validated live; whatsapp pairs at start)").action(async (kind, token) => {
    if (!isKind(kind)) die(`unknown channel '${kind}' \u2014 one of: ${KINDS.join(", ")}`);
    try {
      if (kind === "telegram") {
        const me = await validateTelegramToken(token);
        saveChannel({ kind, token, enabled: true });
        ok(`telegram added \u2014 bot @${me} (your token, stored locally at ~/.oriro/channels.json)`);
        return;
      }
      if (kind === "discord") {
        const me = await validateDiscordToken(token);
        saveChannel({ kind, token, enabled: true });
        ok(`discord added \u2014 bot ${me} (your token, stored locally). Enable the MESSAGE CONTENT intent in the Dev Portal.`);
        return;
      }
      info("WhatsApp has no token \u2014 it pairs by QR. Run: `oriro channels start whatsapp --accept-risk`");
    } catch (e) {
      die(`${kind} token rejected: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  channels.command("list").description("list configured channels").action(() => {
    const all = readChannels();
    heading("Channels");
    if (!all.length) {
      info("none configured \u2014 add one with `oriro channels add telegram <token>`");
      return;
    }
    for (const c of all) {
      process.stdout.write(`  ${accent(c.kind.padEnd(10))} ${c.enabled ? "enabled" : dim("disabled")}  ${dim("token " + c.token.slice(0, 4) + "\u2026")}
`);
    }
  });
  channels.command("start <kind>").description("run the always-on host for a channel").option("--accept-risk", "WhatsApp only: acknowledge the ToS/ban risk of using Baileys").action(async (kind, opts) => {
    if (!isKind(kind)) die(`unknown channel '${kind}' \u2014 one of: ${KINDS.join(", ")}`);
    if (kind === "whatsapp") {
      if (!opts.acceptRisk) {
        info("WhatsApp uses Baileys, which pairs a REAL WhatsApp account and may violate WhatsApp's ToS (ban risk).");
        info("If you accept that risk, re-run: `oriro channels start whatsapp --accept-risk`");
        return;
      }
      try {
        hold("whatsapp", await startWhatsApp());
      } catch (e) {
        die(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    const cfg = readChannels().find((c) => c.kind === kind);
    if (!cfg) die(`no ${kind} bot configured \u2014 run \`oriro channels add ${kind} <token>\` first`);
    hold(kind, kind === "discord" ? await startDiscord(cfg.token) : await startTelegram(cfg.token));
  });
  channels.command("remove <kind>").description("remove a configured channel").action((kind) => {
    if (!isKind(kind)) die(`unknown channel '${kind}' \u2014 one of: ${KINDS.join(", ")}`);
    if (!readChannels().some((c) => c.kind === kind)) {
      info(`no ${kind} channel configured \u2014 nothing to remove`);
      return;
    }
    removeChannel(kind);
    ok(`removed ${accent(kind)}`);
  });
}

// src/commands/skills.ts
function registerSkillsCommand(program2) {
  const skills = program2.command("skills").description("the bundled ORIRO skill library (Option-B tiered)");
  skills.command("list").description("show CORE / TAIL skill counts (use --all to list names)").option("-a, --all", "list every skill name").action(async (opts) => {
    const s = await loadOriroSkills();
    heading("Skills");
    info(`${accent(String(s.all.length))} loaded \xB7 ${accent(String(s.core.length))} CORE (model-visible) \xB7 ${accent(String(s.tail.length))} TAIL (/name-only)`);
    if (opts.all) {
      for (const sk of s.all) {
        const tag = sk.disableModelInvocation ? dim("TAIL") : accent("CORE");
        process.stdout.write(`  ${tag}  ${sk.name}
`);
      }
    }
  });
}

// src/commands/language.ts
import { stdin as stdin7 } from "process";
function resolveLanguage(input) {
  return languageByCode(input) ?? LANGUAGES.find((l) => l.name.toLowerCase() === input.trim().toLowerCase());
}
function registerLanguageCommand(program2) {
  program2.command("language").description("show or change your terminal language").argument("[code]", "switch directly to this language (ISO code or name, e.g. es)").option("-a, --all", "list every available language").action(async (code, opts) => {
    if (opts.all) {
      heading(`Languages (${LANGUAGES.length})`);
      for (const l of LANGUAGES) {
        const star = l.neuralVoice ? accent("\u2605") : " ";
        process.stdout.write(`  ${star} ${l.name} ${dim(`(${l.code})`)}
`);
      }
      return;
    }
    if (code) {
      const lang = resolveLanguage(code);
      if (!lang) die(`unknown language '${code}' \u2014 run \`oriro language --all\` to see the list`);
      setTerminalLanguage(lang);
      ok(`${accent(lang.name)} is now your terminal language.`);
      return;
    }
    if (stdin7.isTTY) {
      const lang = await selectLanguageInteractive();
      setTerminalLanguage(lang);
      ok(`${accent(lang.name)} is now your terminal language.`);
    } else {
      const cur = getTerminalLanguage();
      info(`terminal language: ${accent(cur.name)} ${dim(`(${cur.code})`)}`);
      info(dim("change it with `oriro language <code>` (e.g. `oriro language es`) or `oriro language --all`"));
    }
  });
}

// src/commands/avatar.ts
import { stdin as stdin8 } from "process";
function registerAvatarCommand(program2) {
  program2.command("avatar").description("show or change your terminal avatar").argument("[slug]", "set directly to this avatar slug").option("-l, --list", "list every avatar by category").action(async (slug, opts) => {
    if (opts.list) {
      for (const cat of avatarCategories()) {
        heading(cat);
        for (const a of avatarsInCategory(cat)) process.stdout.write(`  ${accent(a.slug)}
`);
      }
      return;
    }
    if (slug) {
      const avatar = avatarBySlug(slug);
      if (!avatar) die(`unknown avatar '${slug}' \u2014 run \`oriro avatar --list\` to see the faces`);
      setSelectedAvatar(avatar, { speak: true });
      ok(`${accent(avatar.slug)} is now your terminal face.`);
      return;
    }
    if (stdin8.isTTY) {
      const chosen = await selectAvatarInteractive();
      if (!chosen) {
        info("no change.");
        return;
      }
      setSelectedAvatar(chosen, { speak: true });
      await previewAvatar(chosen);
    } else {
      const cur = getSelectedAvatar();
      info(cur ? `terminal face: ${accent(cur.slug)}` : "no avatar set yet");
      info(dim("change it with `oriro avatar <slug>` or `oriro avatar --list`"));
    }
  });
}

// src/commands/head.ts
function usage() {
  heading("ORIRO Head \u{1F9ED}");
  info("Go out to a live site and SEE it \u2014 structure, gaps, or a full rebuild. Keyless, on-device.");
  process.stdout.write(
    `
  ${accent("oriro head <url> [competitor ...]")}   ${dim("structural read + gap analysis (no browser)")}
  ${accent("oriro head <url> --html")}              ${dim("also write the visual HTML report")}
  ${accent("oriro head <url> --code")}              ${dim("reverse-engineer clean, runnable code")}
  ${accent("oriro head <url> --spec")}              ${dim("reverse-engineer a YAML build spec")}
  ${accent("oriro head <url> [url ...] --shots")}   ${dim("full-page screenshots \u2192 visual flow HTML")}
  ${accent("oriro head --video <path>")}            ${dim("rebuild a UI from a screen recording (experimental)")}

  ${dim("--goal <text>  --stack <text>  --out <dir>")}
  ${dim("code/spec/shots need Chromium once: npm i playwright && npx playwright install chromium")}
`
  );
}
function registerHeadCommand(program2) {
  program2.command("head").description("go out to a live site and SEE it \u2014 structure, code, spec, or screenshots").argument("[url]", "the target URL (or omit when using --video)").argument("[competitors...]", "optional competitor/reference URLs").option("--code", "reverse-engineer the page into clean, runnable code").option("--spec", "reverse-engineer the page into a YAML build spec").option("--shots", "capture full-page screenshots into one visual flow HTML").option("--html", "also write the visual HTML report (structural read)").option("--video <path>", "rebuild a UI from a screen recording (experimental)").option("--goal <text>", "natural-language goal for the rebuild").option("--stack <text>", "target stack for generated code").option("--out <dir>", "directory to write artifacts into (default: current dir)").action(async (url, competitors, opts) => {
    const outDir = opts.out;
    if (opts.video) {
      heading("ORIRO Head \xB7 video\u2192code");
      const res = await runVideoToCode(opts.video, { goal: opts.goal, stack: opts.stack, outDir });
      process.stdout.write(`${res.summary}
`);
      for (const f of res.files) ok(`wrote ${f}`);
      return;
    }
    if (!url) {
      usage();
      return;
    }
    const looksLikeUrl = /^https?:\/\//i.test(url) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)+/i.test(url);
    let target = url;
    let refs = competitors;
    if (!looksLikeUrl) {
      const parsed = parseHeadTargets([url, ...competitors].join(" "));
      if (!parsed.target) {
        usage();
        return;
      }
      target = parsed.target;
      refs = parsed.competitors;
    }
    heading("ORIRO Head \u{1F9ED}");
    try {
      let res;
      if (opts.code) res = await runUrlToCode(target, { goal: opts.goal, stack: opts.stack, outDir });
      else if (opts.spec) res = await runUrlToSpec(target, { goal: opts.goal, outDir });
      else if (opts.shots) res = await runCapture([target, ...refs], { outDir });
      else res = await runInspect(target, refs, { html: opts.html, outDir });
      process.stdout.write(`${res.summary}
`);
      for (const f of res.files) ok(`wrote ${f}`);
    } catch (e) {
      die(`head failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}

// src/commands/voice.ts
import { stdin as stdin9, stdout as stdout8 } from "process";
function registerVoiceCommand(program2) {
  program2.command("voice").description("speech-to-text \u2014 transcribe an audio file or the mic (on-device Whisper, experimental)").argument("[file]", "audio file to transcribe (omit to record from the mic on a real terminal)").option("--translate", "translate speech to English (Whisper translate task)").option("--seconds <n>", "mic recording length in seconds", "6").action(async (file5, opts) => {
    const interactive = !!stdin9.isTTY && !!stdout8.isTTY;
    heading("ORIRO voice \u{1F399}");
    let audio = file5;
    if (!audio) {
      if (!interactive) {
        info("On-device speech-to-text (experimental \u2014 needs ffmpeg + the transformers voice peer).");
        process.stdout.write(
          `
  ${accent("oriro voice <audiofile>")}         ${dim("transcribe an audio file")}
  ${accent("oriro voice --translate <file>")}  ${dim("transcribe + translate to English")}
  ${dim("On a real terminal, run `oriro voice` with no file to record from the mic.")}
`
        );
        return;
      }
      info(`Recording ${opts.seconds ?? "6"}s from the mic\u2026 (speak now)`);
      const clip = await recordMic(Number(opts.seconds ?? 6));
      if (!clip) die("no microphone recorder found \u2014 install ffmpeg (or sox/arecord) to record.");
      audio = clip;
    }
    try {
      const t = await transcribeAudioFile(audio, { translate: !!opts.translate });
      if (!t.text) {
        info("(no speech recognized)");
        return;
      }
      process.stdout.write(`  ${dim(`[${t.language}]`)} ${t.text}
`);
    } catch (e) {
      die(`voice: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}

// src/cli.ts
var version = createRequire(import.meta.url)("../package.json").version;
var program = new Command();
program.name("oriro").description("ORIRO \u2014 a free, on-device-friendly terminal AI agent.").version(version, "-v, --version").action(async (_options, command) => {
  if (command.args.length > 0) {
    const arg = command.args[0];
    if (arg === "help") {
      command.outputHelp();
      return;
    }
    process.stderr.write(`error: unknown command '${arg}'
Run 'oriro --help' to see available commands.
`);
    process.exitCode = 1;
    return;
  }
  await runRepl();
});
registerRoutersCommand(program);
registerScribeCommand(program);
registerConnectorsCommand(program);
registerChannelsCommand(program);
registerSkillsCommand(program);
registerLanguageCommand(program);
registerAvatarCommand(program);
registerHeadCommand(program);
registerVoiceCommand(program);
program.parseAsync().catch((e) => {
  if (e instanceof DieError) return;
  process.stderr.write(`
ORIRO error: ${e instanceof Error ? e.stack ?? e.message : String(e)}
`);
  process.exitCode = 1;
});
//# sourceMappingURL=cli.js.map