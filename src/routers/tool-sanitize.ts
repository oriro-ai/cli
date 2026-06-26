// ORIRO Step 0 — tool-call sanitizer (keyless-floor robustness backstop).
//
// The keyless routers are someone else's models on someone else's OpenAI-compatible
// endpoints. Some serve Harmony-format models (GPT-OSS family) through proxies that
// don't fully parse Harmony — so chat-template control tokens LEAK into the tool-call
// function name: the model means to call `bash`, but the name arrives as
// `bash<|channel|>commentary` (or, recipient-first, `<|channel|>commentary to=functions.bash`).
// Pi's dispatcher can't resolve that name → the tool call fails, the model has to
// self-correct ("the tool name is 'bash', let's run again"), and the turn is muddled.
//
// ORIRO can't fix every upstream endpoint, so — exactly like the identity scrub — it
// normalizes the untrusted output at the mux seam: strip the control tokens and recover
// the INTENDED tool name before it ever reaches dispatch. Clean names pass through
// untouched (no `<|` ⇒ no change), so this can never rename a legitimate tool.
import type { AssistantMessage } from "@earendil-works/pi-ai";

// Harmony control token, e.g. `<|channel|>`, `<|message|>`, `<|call|>`, `<|constrain|>`.
const CONTROL_TOKEN = /<\|[^|]*\|>/g;
// A leaked Harmony recipient PREFIX: `functions.`, `tools.`, `to=functions.`, `recipient.`.
// OpenAI/Pi/MCP never name a tool `functions.X`, so this prefix is always a parsing artifact.
const RECIPIENT_PREFIX = /^(?:to=)?(?:functions?|tools?|recipient)[.=]/i;
// A Harmony recipient embedded mid-string (recipient-first leak): `… to=functions.bash`.
const RECIPIENT = /(?:to=)?(?:functions?|tools?|recipient)[.=]([A-Za-z0-9_.:-]+)/i;
// A bare, well-formed tool identifier (covers Pi tools `bash`/`write` and MCP `mcp__a__b`).
const CLEAN_NAME = /^[A-Za-z0-9_.:-]+$/;

/**
 * Recover the intended tool name from a possibly Harmony-polluted one. Pure + idempotent.
 * Returns the original string unchanged when it's already a clean identifier (the common case).
 */
export function sanitizeToolName(raw: string): string {
  if (!raw) return raw;
  // Fast path: a clean name with no control token and no recipient prefix — never touch it.
  if (!raw.includes("<|") && !RECIPIENT_PREFIX.test(raw)) return raw;
  // 1) Prefer the part before the first control token (the model usually emits `bash<|…`),
  //    minus any leaked recipient namespace (`functions.bash` → `bash`).
  const base = (raw.split("<|")[0] ?? "").replace(RECIPIENT_PREFIX, "").trim();
  if (base && CLEAN_NAME.test(base)) return base;
  // 2) Recipient-first leak (`<|channel|>commentary to=functions.bash`) — use the recipient.
  const recip = raw.match(RECIPIENT);
  if (recip?.[1]) return recip[1];
  // 3) Last resort: drop all control tokens, keep the first identifier-ish run.
  const m = raw.replace(CONTROL_TOKEN, " ").match(/[A-Za-z_][A-Za-z0-9_.:-]*/);
  return m ? m[0] : raw; // never return empty — fall back to the original
}

/** Return a copy of the message with every tool-call name sanitized (or the same ref if clean). */
export function sanitizeMessageToolCalls(msg: AssistantMessage): AssistantMessage {
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

/**
 * Sanitize tool names on a streamed AssistantMessageEvent: its running `partial` message and,
 * for `toolcall_end`, the full `toolCall` (what the agent loop dispatches). Returns the same
 * ref when nothing needed fixing, so the hot path stays allocation-free for clean streams.
 */
export function sanitizeEventToolCalls<E extends { type: string }>(ev: E): E {
  let next = ev as E & { partial?: AssistantMessage; toolCall?: { name: string } };
  if ("partial" in next && next.partial) {
    const partial = sanitizeMessageToolCalls(next.partial);
    if (partial !== next.partial) next = { ...next, partial };
  }
  if (next.type === "toolcall_end" && next.toolCall) {
    const name = sanitizeToolName(next.toolCall.name);
    if (name !== next.toolCall.name) next = { ...next, toolCall: { ...next.toolCall, name } };
  }
  return next as E;
}
