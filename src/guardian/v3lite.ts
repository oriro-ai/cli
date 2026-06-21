// ORIRO CLI — Guardian V3 Lite (VENDORED, self-contained).
//
// Source of truth: @oriro/guardian (packages/@oriro/guardian/src/index.ts) in the
// ORIRO monorepo. Per Vinay's ownership directive, the CLI does NOT depend on that
// workspace package at runtime — this is a vendored COPY so oriro-cli is fully
// self-contained (no external repo/process/build dependency). If the canonical
// patterns change, re-sync this file. Pure / deterministic / ZERO deps / ZERO network
// / ZERO model / $0 / no key — runs anywhere, default-on by construction.
//
// What it adds on top of the CLI's exec-focused gate (rules.ts): PII/secret redaction,
// prompt-injection detection, an IOC threat catalog (exfil / dropper / obfuscated
// loader / RCE-pipe), hidden-unicode defang, and post-turn output scoring.

// ─── PII / secret redaction ──────────────────────────────────────────────────

export interface GuardianResult {
  text: string;
  redacted: boolean;
}

const PII_PATTERNS: RegExp[] = [
  /\b(?:\d{4}[ -]?){3}\d{1,4}\b/g, // credit card (formatted)
  /\b\d{3}-\d{2}-\d{4}\b/g, // US SSN
  /\b(?:pass(?:word)?|secret|token|api[_-]?key)\s*[:=]\s*\S+/gi, // key:value / key=value
  /\bsk-ant-[A-Za-z0-9_-]{16,}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\bAIza[A-Za-z0-9_-]{20,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
];

/** Redact PII/secrets in a string. Returns the cleaned text and whether anything fired. */
export function stripPII(text: string): GuardianResult {
  let redacted = false;
  let out = text;
  for (const re of PII_PATTERNS) {
    out = out.replace(re, () => {
      redacted = true;
      return "[REDACTED]";
    });
  }
  return { text: out, redacted };
}

/** Spec-named alias: guardianStrip(text) -> { cleaned, fired }. */
export function guardianStrip(text: string): { cleaned: string; fired: boolean } {
  const r = stripPII(text);
  return { cleaned: r.text, fired: r.redacted };
}

/** Redact every message's content in place (defense-in-depth). Returns whether any fired. */
export function guardMessages<T extends { content: string }>(messages: T[]): boolean {
  let any = false;
  for (const m of messages) {
    const g = stripPII(m.content);
    if (g.redacted) {
      m.content = g.text;
      any = true;
    }
  }
  return any;
}

// ─── Prompt-injection patterns ───────────────────────────────────────────────

export const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|previous\s+|prior\s+)*instructions/i,
  /you are now (a |an )?different/i,
  /print (your )?system prompt/i,
  /forget (everything|all) (you|above)/i,
  /\[INST\]|<<SYS>>/,
];

// ─── IOC signatures (exfil / dropper / obfuscated-loader / RCE pipe) ──────────
export const IOC_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["ioc:secret_read", /\bread\b[^\n]*(\.ssh|\.env\b|id_rsa)/i],
  ["ioc:exfil_post", /\bsend\b[^\n]*\bto\s+https?:\/\//i],
  ["ioc:env_exfil", /process\.env[^\n]{0,40}https?:\/\//i],
  ["ioc:pipe_shell", /(curl|wget)[^\n]*\|\s*(sh|bash|node)\b/i],
  ["ioc:pipe_exfil", /(cat|type|read)[^\n]*(\.ssh|id_rsa|\.env\b)[^\n]*\|\s*(curl|wget|nc)\b/i],
  ["ioc:exfiltrate", /exfiltrat/i],
  ["ioc:obf_loader", /eval\(\s*(atob|Buffer\.from)\(/i],
  ["ioc:cp_loader", /child_process[\s\S]{0,40}(atob|fromCharCode)/i],
];

function firstIOC(text: string): string | null {
  for (const [id, re] of IOC_PATTERNS) {
    if (re.test(text)) return id;
  }
  return null;
}

// ─── Hidden / smuggled unicode ───────────────────────────────────────────────
const HIDDEN_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x200b, 0x200f], // zero-width space … RTL/LTR marks
  [0x202a, 0x202e], // bidi embedding/override
  [0x2060, 0x2064], // word-joiner … invisible separators
  [0xfeff, 0xfeff], // BOM / zero-width no-break space
];

function hasHiddenUnicode(s: string): boolean {
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    for (const [lo, hi] of HIDDEN_RANGES) if (c >= lo && c <= hi) return true;
  }
  return false;
}

/** Remove hidden-format chars (BOM/zero-width/bidi). Defangs rather than blocks. */
export function stripHiddenUnicode(s: string): { text: string; stripped: boolean } {
  let stripped = false;
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (HIDDEN_RANGES.some(([lo, hi]) => c >= lo && c <= hi)) {
      stripped = true;
      continue;
    }
    out += ch;
  }
  return { text: out, stripped };
}

// ─── Scan / score ────────────────────────────────────────────────────────────

export interface ScanResult {
  safe: boolean;
  threat?: string;
}

export interface ScoreResult {
  safe: boolean;
  score: number;
  flags: string[];
}

function firstInjection(text: string): string | null {
  for (const re of INJECTION_PATTERNS) {
    const m = re.exec(text);
    if (m) return m[0].slice(0, 80);
  }
  return null;
}

/** Scan file/upload/pasted text before it enters model context (first 10 KB). */
export function scanFileInput(textContent: string): ScanResult {
  const slice = (textContent || "").slice(0, 10_240);
  const hit = firstInjection(slice);
  if (hit) return { safe: false, threat: `injection:${hit}` };
  const ioc = firstIOC(slice);
  if (ioc) return { safe: false, threat: ioc };
  if (hasHiddenUnicode(slice)) return { safe: false, threat: "hidden_unicode" };
  return { safe: true };
}

/** Scan a tool/MCP invocation (name + description + params) before execution. */
export function scanToolCall(name: string, description: string, params: unknown): ScanResult {
  const blob = `${name}\n${description}\n${typeof params === "string" ? params : JSON.stringify(params ?? "")}`;
  const hit = firstInjection(blob);
  if (hit) return { safe: false, threat: `injection:${hit}` };
  const ioc = firstIOC(blob);
  if (ioc) return { safe: false, threat: ioc };
  if (hasHiddenUnicode(blob)) return { safe: false, threat: "hidden_unicode" };
  return { safe: true };
}

/** Alias matching the worker/CLI call-site name (scanMCPCall === scanToolCall). */
export const scanMCPCall = scanToolCall;

/** Score a completed prompt/response pair (system-prompt leak / echoed injection / empty answer). */
export function scoreInteractionPair(prompt: string, response: string): ScoreResult {
  const flags: string[] = [];
  const resp = response || "";
  if (/BUILD MODE —|CONVERSATION DISCIPLINE:|=== RELEVANT SKILLS ===|=== Active skills/.test(resp)) {
    flags.push("system_prompt_leak");
  }
  if (firstInjection(resp)) flags.push("injection_echo");
  if (prompt && prompt.trim().length > 0 && resp.trim().length === 0) flags.push("empty_response");
  const score = flags.length === 0 ? 1 : Math.max(0, 1 - flags.length * 0.5);
  return { safe: flags.length === 0, score, flags };
}

// ─── Full pre-flight ─────────────────────────────────────────────────────────

export interface GuardOutcome {
  text: string;
  safe: boolean;
  threat?: string;
  redacted: boolean;
  strippedHidden: boolean;
}

/** Defang hidden unicode → scan for injection + IOC → redact PII. One call. */
export function guardPrompt(prompt: string): GuardOutcome {
  const dehidden = stripHiddenUnicode(prompt);
  const inj = firstInjection(dehidden.text);
  if (inj) {
    return { text: dehidden.text, safe: false, threat: `injection:${inj}`, redacted: false, strippedHidden: dehidden.stripped };
  }
  const ioc = firstIOC(dehidden.text);
  if (ioc) {
    return { text: dehidden.text, safe: false, threat: ioc, redacted: false, strippedHidden: dehidden.stripped };
  }
  const pii = stripPII(dehidden.text);
  return { text: pii.text, safe: true, redacted: pii.redacted, strippedHidden: dehidden.stripped };
}

// ─── In-memory quarantine log (optional "threats caught" view) ────────────────

export interface QuarantineEntry {
  ts: number;
  threat_type: string;
  raw_input: string;
}

const QUARANTINE_CAP = 100;
const quarantineLog: QuarantineEntry[] = [];

export function recordQuarantine(threat_type: string, raw_input = "", ts = Date.now()): QuarantineEntry {
  const entry: QuarantineEntry = { ts, threat_type, raw_input: (raw_input ?? "").slice(0, 2000) };
  quarantineLog.push(entry);
  if (quarantineLog.length > QUARANTINE_CAP) quarantineLog.splice(0, quarantineLog.length - QUARANTINE_CAP);
  return entry;
}
export function getQuarantineLog(): readonly QuarantineEntry[] {
  return quarantineLog.slice();
}
export function clearQuarantineLog(): void {
  quarantineLog.length = 0;
}
