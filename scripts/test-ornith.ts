// Unit test for the Ornith keyless racer (src/routers/ornith-stream.ts). tsx.
// Pure parts always run; a LIVE proxy probe runs only with ORIRO_LIVE_ORNITH=1 (network, opt-in).
// Run: tsx scripts/test-ornith.ts
import { flattenContent, toOrnithMessages, stripThinkingPreamble, parseSseData, ornithStream } from "../src/routers/ornith-stream.js";
import type { Context } from "@earendil-works/pi-ai";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// flattenContent
ok(flattenContent("hi there") === "hi there", "flatten: plain string");
ok(flattenContent([{ type: "text", text: "a" }, { type: "text", text: "b" }] as never) === "ab", "flatten: text blocks joined");
ok(flattenContent([{ type: "image", image: "x" }] as never) === "", "flatten: non-text blocks dropped");

// toOrnithMessages
{
  const ctx = { systemPrompt: "You are ORIRO.", messages: [
    { role: "user", content: "hello" },
    { role: "assistant", content: [{ type: "text", text: "hi" }] },
    { role: "user", content: "" }, // empty → filtered
  ] } as unknown as Context;
  const m = toOrnithMessages(ctx);
  ok(m.length === 3 && m[0]!.role === "system" && m[0]!.content === "You are ORIRO.", "messages: system prompt first");
  ok(m[1]!.role === "user" && m[2]!.role === "assistant", "messages: roles mapped, empty dropped");
}

// stripThinkingPreamble
ok(stripThinkingPreamble("Just the answer.") === "Just the answer.", "strip: no preamble passthrough");
ok(stripThinkingPreamble("Thinking Process: reasoning here\n\nThe answer.") === "The answer.", "strip: blank-line boundary → answer");
ok(stripThinkingPreamble("Thinking Process: quick\nThe answer.") === "The answer.", "strip: single newline boundary");
ok(stripThinkingPreamble("thinking process: only label") === "only label", "strip: label-only, case-insensitive");
{
  // multi-paragraph reasoning then answer: first blank-line boundary keeps subsequent content (never drops answer)
  const out = stripThinkingPreamble("Thinking Process: step 1\n\nstep 2\n\nFinal answer.");
  ok(out.includes("Final answer."), "strip: never drops the answer");
}

// parseSseData
ok((parseSseData('data: {"choices":[{"delta":{"content":"He"}}]}') as { content: string }).content === "He", "sse: content delta");
ok(parseSseData("data: [DONE]") === "done", "sse: [DONE]");
ok((parseSseData('data: {"object":"error","error":{"code":"capacity_exhausted"}}') as { error: string }).error === "capacity_exhausted", "sse: in-stream error code");
ok(parseSseData(": FEATHERLESS PROCESSING") === null, "sse: keep-alive comment ignored");
ok(parseSseData('data: {"choices":[{"delta":{}}]}') === null, "sse: empty delta → null");
ok(parseSseData("event: message") === null, "sse: non-data line ignored");

// fail-soft: an unreachable proxy yields exactly one error event, never throws
{
  const prev = process.env.ORIRO_API_BASE;
  process.env.ORIRO_API_BASE = "http://127.0.0.1:1"; // nothing listening
  const ctx = { messages: [{ role: "user", content: "hi" }] } as unknown as Context;
  const events: string[] = [];
  for await (const ev of ornithStream(ctx, undefined)) events.push(ev.type);
  ok(events.length === 1 && events[0] === "error", "fail-soft: unreachable proxy → single error event");
  if (prev === undefined) delete process.env.ORIRO_API_BASE; else process.env.ORIRO_API_BASE = prev;
}

// opt-in LIVE probe against the real proxy
if (process.env.ORIRO_LIVE_ORNITH === "1") {
  const ctx = { systemPrompt: "You are ORIRO.", messages: [{ role: "user", content: "Reply with exactly one word: ready" }] } as unknown as Context;
  let text = ""; let sawError = false;
  for await (const ev of ornithStream(ctx, undefined)) {
    if (ev.type === "error") sawError = true;
    if (ev.type === "done") text = ev.message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  }
  ok(sawError || text.length > 0, "live: proxy streamed an answer OR failed soft (both acceptable)");
  process.stdout.write(`  live ornith → ${sawError ? "(failed soft)" : JSON.stringify(text.slice(0, 60))}\n`);
} else {
  process.stdout.write("⏭  live proxy probe skipped (set ORIRO_LIVE_ORNITH=1 to run it)\n");
}

process.stdout.write(fails === 0 ? "\nornith: ALL PASS\n" : `\nornith: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
