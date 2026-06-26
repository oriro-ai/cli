// ORIRO Scribe — defense-in-depth redaction. Runs BEFORE any byte reaches disk.
// Raw secrets/PII are never written; each match becomes a stable marker so the
// journal stays useful and auditable. This is the gate that stops the scribe from
// becoming the exact leak we exist to prevent.

export interface RedactionSummary {
  label: string;
  count: number;
}

export interface RedactionResult {
  text: string;
  redactions: RedactionSummary[];
}

interface Rule {
  label: string;
  re: RegExp;
}

// Specific → generic. Provider key shapes first, then identifiers, then contact PII.
const RULES: Rule[] = [
  {
    label: "private-key",
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
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
  { label: "phone", re: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g },
];

function marker(label: string): string {
  return `⟨REDACTED:${label}⟩`;
}

/** Shannon entropy (bits/char) of a string. */
function entropy(s: string): number {
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

// Conservative backstop for unknown secret shapes: only very long, high-entropy,
// mixed-charset tokens. Excludes pure-hex (git SHAs/hashes are useful, not secret)
// and anything already containing a redaction marker.
function looksLikeUnknownSecret(token: string): boolean {
  if (token.length < 32) return false; // real bearer/session tokens are frequently 32–39 chars
  if (token.includes("⟨REDACTED:")) return false;
  if (/^[0-9a-f]+$/i.test(token)) return false; // hex hashes/SHAs — not secrets
  // Need ≥2 distinct charset classes — catches all-UPPERCASE+digit tokens (e.g. some API/bot
  // tokens) that an all-3-classes rule would miss, while still excluding plain words.
  const classes =
    (/[a-z]/.test(token) ? 1 : 0) + (/[A-Z]/.test(token) ? 1 : 0) + (/[0-9]/.test(token) ? 1 : 0);
  if (classes < 2) return false;
  return entropy(token) >= 4.2;
}

/** Redact secrets/PII. Returns the safe text plus a per-label tally. */
export function redact(input: string): RedactionResult {
  const counts = new Map<string, number>();
  let text = input;

  for (const rule of RULES) {
    text = text.replace(rule.re, () => {
      counts.set(rule.label, (counts.get(rule.label) ?? 0) + 1);
      return marker(rule.label);
    });
  }

  // Entropy backstop over whitespace-delimited tokens.
  text = text
    .split(/(\s+)/)
    .map((tok) => {
      if (looksLikeUnknownSecret(tok)) {
        counts.set("high-entropy", (counts.get("high-entropy") ?? 0) + 1);
        return marker("high-entropy");
      }
      return tok;
    })
    .join("");

  const redactions: RedactionSummary[] = [...counts.entries()].map(([label, count]) => ({
    label,
    count,
  }));
  return { text, redactions };
}

/** True if the text still contains a raw secret/PII pattern (post-redaction self-audit). */
export function containsSecret(text: string): boolean {
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    if (rule.re.test(text)) return true;
  }
  for (const tok of text.split(/\s+/)) {
    if (looksLikeUnknownSecret(tok)) return true;
  }
  return false;
}
