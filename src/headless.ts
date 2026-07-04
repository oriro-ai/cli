// UX-7 (2026-07-04): headless one-shot mode — `oriro -p "prompt"`. Runs a single prompt through the
// same assembled keyless session as the REPL, prints the answer, and EXITS with a CI-friendly code
// (0 = got an answer, 1 = error / empty). Output formats mirror kimi/antigravity's -p:
//   text        (default) → just the answer
//   json        → one object: { ok, response, error? }
//   stream-json → JSONL: {type:"text_delta",delta} per token, then {type:"done", ok, response, error?}
// The chat capture (text_delta accumulation) is the same proven path the REPL uses; thinking tokens
// are withheld (only the final answer is surfaced), same as the serves.
import { assembleOriroSession } from "./onboarding/assemble.js";
import { scrubOutput } from "./identity/filter.js";

export type OutputFormatMode = "text" | "json" | "stream-json";

export function isOutputFormatMode(s: string): s is OutputFormatMode {
  return s === "text" || s === "json" || s === "stream-json";
}

export async function runHeadless(prompt: string, format: OutputFormatMode): Promise<void> {
  if (!prompt.trim()) { // QA D5: don't spend a router request on an empty prompt
    process.stderr.write("error: empty prompt — pass text after -p, e.g. oriro -p \"summarise this repo\"\n");
    process.exitCode = 1;
    return;
  }
  const { session } = await assembleOriroSession({});
  let text = "";
  const unsub = session.subscribe(
    (e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
      if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
        const d = e.assistantMessageEvent.delta ?? "";
        text += d;
        if (format === "stream-json" && d) process.stdout.write(JSON.stringify({ type: "text_delta", delta: d }) + "\n");
      }
    },
  );

  let error = "";
  try {
    await session.prompt(prompt);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  unsub();

  const response = scrubOutput(text).trim();
  const ok = !error && response.length > 0;

  if (format === "json") {
    process.stdout.write(JSON.stringify({ ok, response, ...(error ? { error } : {}) }) + "\n");
  } else if (format === "stream-json") {
    process.stdout.write(JSON.stringify({ type: "done", ok, response, ...(error ? { error } : {}) }) + "\n");
  } else {
    process.stdout.write((response || (error ? `error: ${error}` : "(no response)")) + "\n");
  }

  // Set the exit code and let the loop DRAIN — an abrupt process.exit() mid-close trips a libuv
  // assertion (UV_HANDLE_CLOSING, exit 127), the same trap die() avoids. Dispose the session, then a
  // last-resort unref'd timer force-exits only if some handle keeps the loop alive past 400ms (the
  // unref means a clean drain still exits immediately).
  process.exitCode = ok ? 0 : 1;
  try { session.dispose(); } catch { /* */ }
  setTimeout(() => process.exit(ok ? 0 : 1), 400).unref();
}
