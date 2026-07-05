// Ornith 1.0 (deepreinforce-ai, MIT) — an ALWAYS-ON free racer in the CLI keyless pool, at parity
// with oriro.app (Vinay 2026-07-05). Ornith is reached KEYLESS via ORIRO's own public proxy
// (POST https://oriro.ai/api/race/ornith → standard OpenAI SSE; the HF token stays server-side, never
// in the CLI). The proxy is a single path, NOT the {baseUrl}/chat/completions shape the openai-completions
// provider assumes — so Ornith rides a CUSTOM streamer (KeylessRouter.stream) that the race/failover
// loops use in place of pi's HTTP. Fail-soft by contract: 503 / non-stream / capacity_exhausted → one
// error event → the mux drops this racer, chat unaffected. Ornith's reasoning leaks into delta.content
// as a "Thinking Process:" preamble (NOT reasoning_content) — stripped before the answer is shown.
import type { AssistantMessage, AssistantMessageEvent, Context, Message, SimpleStreamOptions, TextContent } from "@earendil-works/pi-ai";

function ornithUrl(): string {
  const base = process.env.ORIRO_API_BASE ?? "https://oriro.ai";
  return `${base.replace(/\/+$/, "")}/api/race/ornith`;
}

/** Flatten a pi message's content to plain text for the OpenAI-style body (text blocks only). Pure. */
export function flattenContent(content: Message["content"]): string {
  if (typeof content === "string") return content;
  return content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

/** Build the {role,content}[] body from a pi Context (system prompt + user/assistant/tool text). Pure. */
export function toOrnithMessages(context: Context): Array<{ role: string; content: string }> {
  const out: Array<{ role: string; content: string }> = [];
  if (context.systemPrompt) out.push({ role: "system", content: context.systemPrompt });
  for (const m of context.messages) {
    const role = m.role === "assistant" ? "assistant" : "user"; // tool results fold in as user text
    out.push({ role, content: flattenContent(m.content) });
  }
  return out.filter((m) => m.content.length > 0);
}

/** Strip Ornith's leading "Thinking Process:" reasoning so only the answer shows. Never drops the
 *  answer: takes what follows the first blank-line break, else the first line break, else the label. Pure. */
export function stripThinkingPreamble(text: string): string {
  const t = text.replace(/^\s+/, "");
  if (!/^thinking process:/i.test(t)) return text.trim();
  const dbl = t.indexOf("\n\n");
  if (dbl >= 0) {
    const after = t.slice(dbl + 2).trim();
    if (after) return after;
  }
  const nl = t.indexOf("\n");
  if (nl >= 0) {
    const after = t.slice(nl + 1).trim();
    if (after) return after;
  }
  return t.replace(/^thinking process:\s*/i, "").trim();
}

export type SseParsed = { content: string } | "done" | { error: string } | null;

/** Parse one SSE `data:` line into content / done / error. Pure. */
export function parseSseData(line: string): SseParsed {
  const s = line.trim();
  if (!s.startsWith("data:")) return null; // keep-alive comments (": FEATHERLESS PROCESSING") ignored
  const payload = s.slice(5).trim();
  if (payload === "[DONE]") return "done";
  try {
    const obj = JSON.parse(payload) as { object?: string; error?: { code?: string } | string; choices?: Array<{ delta?: { content?: string } }> };
    if (obj?.object === "error" || obj?.error) {
      const code = typeof obj.error === "object" ? obj.error?.code : obj.error;
      return { error: String(code ?? "error") }; // e.g. capacity_exhausted
    }
    const content = obj?.choices?.[0]?.delta?.content;
    return typeof content === "string" ? { content } : null;
  } catch {
    return null; // partial JSON across chunk boundary — handled by the caller's line buffering
  }
}

function ornithMessage(text: string, stopReason: AssistantMessage["stopReason"], errorMessage?: string): AssistantMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text } as TextContent],
    api: "openai-completions",
    provider: "ornith",
    model: "ornith",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason,
    ...(errorMessage ? { errorMessage } : {}),
    timestamp: Date.now(),
  };
}

/**
 * Custom keyless streamer for Ornith. Buffers the proxy's full SSE response (Ornith is a slow reasoning
 * model — it commits LATE and usually loses to a faster streaming router, exactly as intended), strips
 * the thinking preamble, then emits one text_delta + done. Any failure → a single error event (fail-soft).
 */
export async function* ornithStream(
  context: Context,
  options: SimpleStreamOptions | undefined,
  signal?: AbortSignal,
): AsyncGenerator<AssistantMessageEvent> {
  const fail = (m: string): AssistantMessageEvent => ({ type: "error", reason: "error", error: ornithMessage("", "error", m) });
  const abortSignal = signal ?? options?.signal;

  let res: Response;
  try {
    res = await fetch(ornithUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: toOrnithMessages(context) }),
      ...(abortSignal ? { signal: abortSignal } : {}),
    });
  } catch (e) {
    yield fail(`ornith unreachable: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!res.ok || !ct.includes("text/event-stream") || !res.body) {
    yield fail(`ornith HTTP ${res.status}`); // 503 ornith_unavailable/unconfigured, or a non-stream dud
    return;
  }

  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let inStreamError: string | null = null;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      let stop = false;
      for (const line of lines) {
        const p = parseSseData(line);
        if (p === "done") { stop = true; break; }
        if (p && "error" in p) { inStreamError = p.error; stop = true; break; }
        if (p && "content" in p) full += p.content;
      }
      if (stop) break;
    }
  } catch (e) {
    if (abortSignal?.aborted) { yield fail("aborted"); return; } // lost the race → dropped anyway
    yield fail(`ornith stream error: ${e instanceof Error ? e.message : String(e)}`);
    return;
  } finally {
    try { reader.releaseLock(); } catch { /* */ }
  }

  const answer = stripThinkingPreamble(full);
  if (!answer) { yield fail(inStreamError ?? "ornith returned no answer"); return; }

  const msg = ornithMessage(answer, "stop");
  yield { type: "text_delta", contentIndex: 0, delta: answer, partial: msg };
  yield { type: "done", reason: "stop", message: msg };
}
