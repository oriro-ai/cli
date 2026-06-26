// ORIRO Scribe — the Pi wiring (5A.2). Connects the deterministic Scriber to a Pi session:
//   • capture  — scribe each turn (gated on consent; supervisedCapture guarantees no throw),
//   • inject   — a no-fail context blob (timeline + digest) read DIRECTLY from disk, so it
//                works even mid-failover (read is decoupled from writer health),
//   • recall   — a tool any router can call to pull past context on demand.
// Off until the user consents (consent.ts default = false). Zero OpenClaw footprint.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { Type } from "typebox";
import { isScribeEnabled } from "./consent.js";
import { supervisedCapture } from "./supervisor.js";
import { readDigest } from "./capture.js";
import { timelineFile } from "./paths.js";
import { searchScribe, readDay, listDays } from "./retrieval.js";

export interface ScribeTurnInput {
  user?: string;
  router?: string;
  tools?: string[];
  files?: string[];
  note?: string;
  context?: string;
}

/** Scribe one turn — gated on consent; never throws (supervisedCapture guarantees it). */
export function scribeTurn(input: ScribeTurnInput): void {
  if (!isScribeEnabled()) return;
  const ts = new Date().toISOString();
  supervisedCapture({ ts, date: ts.slice(0, 10), ...input });
}

// The caller (REPL / channel host) knows the user's exact input — Pi's session events don't
// reliably surface it — so it records it here just before prompting; attachScribe pairs it with
// the assistant reply on agent_end. Without this the journal/digest captured only the AI's reply,
// so user-stated facts were never recalled across sessions.
let pendingUserInput = "";
export function noteUserInput(text: string): void {
  pendingUserInput = text;
}
function takePendingUserInput(): string {
  const u = pendingUserInput;
  pendingUserInput = "";
  return u;
}

/** No-fail injection: full-history timeline + rolling digest, read straight off disk
 *  (decoupled from writer health). Empty string when consent is off. */
export function buildScribeContext(): string {
  if (!isScribeEnabled()) return "";
  const parts: string[] = [];
  try {
    const t = timelineFile();
    if (existsSync(t)) parts.push(`# Work history — every day so far\n${readFileSync(t, "utf8").trim()}`);
  } catch {
    /* read must never break the turn */
  }
  try {
    const d = readDigest();
    if (d?.trim()) parts.push(`# Current context (recent)\n${d.trim()}`);
  } catch {
    /* idem */
  }
  if (!parts.length) return "";
  return `${parts.join("\n\n")}\n\n(Call scribe_recall to fetch the full text of any past day or topic.)`;
}

/** Register the scribe_recall tool so any router can pull past context on demand. */
export function registerScribe(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "scribe_recall",
    label: "ORIRO Scribe",
    description:
      "Recall the user's past work from the on-device journal: search by keyword, or read a " +
      "specific day (YYYY-MM-DD). Use to recover decisions, code, files, and context from earlier sessions.",
    parameters: Type.Object({
      query: Type.Optional(Type.String({ description: "Keyword/topic to search across all journals." })),
      day: Type.Optional(Type.String({ description: "A specific day YYYY-MM-DD to read in full." })),
    }),
    async execute(_id, params) {
      let text: string;
      const details: Record<string, unknown> = {};
      if (!isScribeEnabled()) {
        text = "Scribe is off (the user has not enabled it).";
      } else if (params.day) {
        text = readDay(params.day) || `No journal for ${params.day}. Days: ${listDays().join(", ") || "none"}`;
        details.day = params.day;
      } else {
        const hits = params.query ? searchScribe(params.query) : [];
        details.hits = hits;
        text = hits.length
          ? hits.map((h) => `${h.date}:${h.line}  ${h.text}`).join("\n")
          : `No matches${params.query ? ` for "${params.query}"` : ""}. Days recorded: ${listDays().join(", ") || "none"}`;
      }
      return { content: [{ type: "text" as const, text }], details };
    },
  });
}

/** Attach the scribe to a live Pi session — capture each completed turn (gated). Thin glue. */
export function attachScribe(session: { subscribe: (l: (e: any) => void) => unknown }): void {
  let user = "";
  let assistant = "";
  const tools = new Set<string>();
  session.subscribe((e: any) => {
    if (!isScribeEnabled()) return;
    if (e?.type === "user_message" || e?.type === "session_user_message") user = String(e.text ?? e.message ?? user);
    if (e?.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") assistant += e.assistantMessageEvent.delta ?? "";
    if ((e?.type === "tool_call" || e?.type === "tool_execution_start") && e.toolName) tools.add(String(e.toolName));
    if (e?.type === "agent_end") {
      const userText = takePendingUserInput() || user; // caller-supplied is authoritative; fall back to sniffed
      scribeTurn({ user: userText || undefined, router: "oriro-free", tools: [...tools], note: assistant.slice(0, 4000) || undefined });
      user = "";
      assistant = "";
      tools.clear();
    }
  });
}
