// Unit test for the keyless-floor tool-name sanitizer (the 0.1.3 root-cause fix).
// Run: npx tsx scripts/test-tool-sanitize.ts   (also part of the prepublish gate)
import { sanitizeToolName, sanitizeMessageToolCalls, sanitizeEventToolCalls } from "../src/routers/tool-sanitize.js";
import type { AssistantMessage } from "@earendil-works/pi-ai";

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  process.stdout.write(`${ok ? "✅" : "❌"} ${label}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}\n`);
};

// — sanitizeToolName —
eq("the observed bug: bash<|channel|>commentary → bash", sanitizeToolName("bash<|channel|>commentary"), "bash");
eq("recipient-first leak → bash", sanitizeToolName("<|channel|>commentary to=functions.bash"), "bash");
eq("functions. prefix → bash", sanitizeToolName("functions.bash"), "bash");
eq("constrain token tail → write", sanitizeToolName("write<|constrain|>json"), "write");
eq("clean Pi tool unchanged: bash", sanitizeToolName("bash"), "bash");
eq("clean Pi tool unchanged: write", sanitizeToolName("write"), "write");
eq("clean MCP tool unchanged", sanitizeToolName("mcp__github__create_issue"), "mcp__github__create_issue");
eq("empty stays empty", sanitizeToolName(""), "");
eq("idempotent (run twice)", sanitizeToolName(sanitizeToolName("bash<|channel|>commentary")), "bash");

// — sanitizeMessageToolCalls (message-level) —
const polluted: AssistantMessage = {
  role: "assistant",
  content: [
    { type: "text", text: "Running it." },
    { type: "toolCall", id: "1", name: "bash<|channel|>commentary", arguments: { command: "python x.py" } },
  ],
  api: "openai-completions", provider: "oriro-mux", model: "oriro-free",
  usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
  stopReason: "toolUse", timestamp: 0,
} as AssistantMessage;
const fixed = sanitizeMessageToolCalls(polluted);
eq("message: tool name fixed", (fixed.content[1] as { name: string }).name, "bash");
eq("message: arguments preserved", (fixed.content[1] as { arguments: unknown }).arguments, { command: "python x.py" });
eq("message: text untouched", (fixed.content[0] as { text: string }).text, "Running it.");
eq("message: clean message returns SAME ref (no needless alloc)", sanitizeMessageToolCalls({ ...polluted, content: [{ type: "toolCall", id: "1", name: "bash", arguments: {} }] as AssistantMessage["content"] }) === undefined, false);

// — sanitizeEventToolCalls (streamed events — the path Pi dispatches from) —
const toolcallEnd = {
  type: "toolcall_end",
  contentIndex: 1,
  toolCall: { type: "toolCall", id: "1", name: "bash<|channel|>commentary", arguments: { command: "ls" } },
  partial: { ...polluted, content: [{ type: "toolCall", id: "1", name: "bash<|channel|>commentary", arguments: { command: "ls" } }] as AssistantMessage["content"] },
};
const fixedEv = sanitizeEventToolCalls(toolcallEnd) as typeof toolcallEnd;
eq("event(toolcall_end): dispatched toolCall.name fixed", fixedEv.toolCall.name, "bash");
eq("event(toolcall_end): partial tool name fixed", (fixedEv.partial.content[0] as { name: string }).name, "bash");
const cleanEv = { type: "text_delta", contentIndex: 0, delta: "hi", partial: { ...polluted, content: [{ type: "text", text: "hi" }] as AssistantMessage["content"] } };
eq("event(clean text_delta): returned as SAME ref (hot path no-alloc)", sanitizeEventToolCalls(cleanEv) === cleanEv, true);

process.stdout.write(`\n${fails === 0 ? "TOOL-SANITIZE TESTS: PASS ✅" : `TOOL-SANITIZE TESTS: FAIL ❌ (${fails})`}\n`);
process.exit(fails === 0 ? 0 : 1);
