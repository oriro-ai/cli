// ORIRO Scribe — Claude Code adapter. Turns a Claude Code session into Scribe turns:
//   • parseHookStdin   — read the Stop-hook JSON the harness writes to stdin,
//   • lastTurnFromTranscript — distil the latest user↔assistant exchange from the
//     session transcript JSONL into a TurnRecord (user text, assistant note, tool
//     names, touched files),
//   • shouldCapture    — scope guard (consent is the real gate; ORIRO_SCRIBE_ONLY
//     optionally restricts to ORIRO project paths).
// Pure node:fs/path — never imports the Pi harness, so it stays in the thin CLI bundle.
// Redaction is NOT done here: supervisedCapture redacts every field before any byte
// reaches disk, so raw secrets parsed out of a transcript never persist.
import { existsSync, readFileSync } from "node:fs";

export interface HookInput {
  transcriptPath?: string;
  cwd?: string;
  sessionId?: string;
  stopHookActive: boolean;
}

/** Parse the Stop-hook JSON delivered on stdin. Tolerant of missing fields / junk. */
export function parseHookStdin(raw: string): HookInput {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    return {
      transcriptPath: typeof j.transcript_path === "string" ? j.transcript_path : undefined,
      cwd: typeof j.cwd === "string" ? j.cwd : undefined,
      sessionId: typeof j.session_id === "string" ? j.session_id : undefined,
      stopHookActive: j.stop_hook_active === true,
    };
  } catch {
    return { stopHookActive: false };
  }
}

/** A capture is in scope when consent is ON (the user-controlled gate). ORIRO_SCRIBE_ONLY=1
 *  additionally restricts capture to ORIRO project paths; default = capture all sessions. */
export function shouldCapture(cwd: string | undefined): boolean {
  if (process.env.ORIRO_SCRIBE_ONLY !== "1") return true;
  if (!cwd) return false;
  return /oriro/i.test(cwd.replace(/\\/g, "/"));
}

interface ContentBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}
interface Entry {
  type?: string;
  timestamp?: string;
  message?: { role?: string; content?: string | ContentBlock[] };
}

function textOf(content: string | ContentBlock[] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim();
}

/** True for a genuine human turn — a user message that is plain text (not a tool_result echo). */
function isHumanUser(e: Entry): boolean {
  if (e.type !== "user" && e.message?.role !== "user") return false;
  const c = e.message?.content;
  if (typeof c === "string") return c.trim().length > 0;
  if (Array.isArray(c)) return c.some((b) => b.type === "text" && (b.text ?? "").trim().length > 0);
  return false;
}

const FILE_KEYS = ["file_path", "path", "notebook_path", "filePath"];

/** Distil the latest turn (from the last human user message to the end of the transcript)
 *  into TurnRecord fields. Returns null if the file is missing/empty or yields no content. */
export function lastTurnFromTranscript(
  path: string,
): { user?: string; note?: string; tools?: string[]; files?: string[]; ts?: string } | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  const entries: Entry[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line) as Entry);
    } catch {
      /* skip a torn/partial line */
    }
  }
  if (entries.length === 0) return null;

  // Anchor on the last human user message; everything after it is the current turn.
  let anchor: Entry | undefined;
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
  const noteParts: string[] = [];
  const tools = new Set<string>();
  const files = new Set<string>();
  let ts: string | undefined;

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
    user: user || undefined,
    note: note || undefined,
    tools: tools.size ? [...tools] : undefined,
    files: files.size ? [...files] : undefined,
    ts,
  };
}
