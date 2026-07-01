// `oriro scribe` — the consent gate + control surface for the local work journal (Scriber).
// Off by default; nothing is recorded or injected until the user turns it on. Local-only,
// reversible, redacted. The `capture` verb is what a Claude Code Stop hook (or the /scribe
// skill) calls to feed a turn into the real engine — it NEVER throws in --hook mode so a
// scribe failure can never break a session.
import type { Command } from "commander";
import { readFileSync } from "node:fs";
import {
  isScribeEnabled,
  setScribeConsent,
  supervisedCapture,
  searchScribe,
  readScribeDigest,
  readTimeline,
  readHealth,
  type TurnRecord,
} from "../scribe/index.js";
import { parseHookStdin, lastTurnFromTranscript, shouldCapture } from "../scribe/transcript.js";
import { ok, info, fail, heading } from "./ui.js";
import { dim } from "../ui/theme.js";

/** Read all of stdin synchronously (the Stop hook pipes its JSON here). Empty on any error. */
function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function csv(v: unknown): string[] | undefined {
  if (typeof v !== "string") return undefined;
  const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

function hasContent(rec: TurnRecord): boolean {
  return Boolean(rec.user?.trim() || rec.note?.trim() || rec.tools?.length || rec.files?.length);
}

export function registerScribeCommand(program: Command): void {
  const scribe = program
    .command("scribe")
    .description("the consent-gated local work journal (off by default)");

  scribe
    .command("on")
    .description("enable the journal (recorded locally at ~/.oriro/scribe, never leaves your machine)")
    .action(() => {
      setScribeConsent(true);
      ok("Scriber is ON — turns are journaled locally (redacted) and recalled across sessions.");
      info(dim("everything stays on this machine; turn off any time with `oriro scribe off`"));
    });

  scribe
    .command("off")
    .description("disable the journal")
    .action(() => {
      setScribeConsent(false);
      ok("Scriber is OFF — no new turns are recorded or injected.");
    });

  scribe
    .command("status")
    .description("show whether the journal is on or off")
    .action(() => {
      info(isScribeEnabled() ? "Scriber: ON" : "Scriber: OFF (default)");
    });

  scribe
    .command("capture")
    .description("capture one turn into the journal (used by the Claude Code Stop hook + /scribe skill)")
    .option("--hook", "read the Claude Code Stop-hook JSON from stdin and capture the latest turn")
    .option("--json <record>", "capture an explicit TurnRecord (JSON)")
    .option("--user <text>", "the user/request text for this turn")
    .option("--note <text>", "a note / assistant summary for this turn")
    .option("--router <name>", "which router/model produced the turn")
    .option("--files <list>", "comma-separated file paths touched")
    .option("--tools <list>", "comma-separated tool names used")
    .action((opts) => {
      try {
        // Consent is the master gate. In hook mode we stay silent; manual mode hints.
        if (!isScribeEnabled()) {
          if (!opts.hook) info("Scriber is OFF — run `oriro scribe on` first.");
          return;
        }

        const now = new Date().toISOString();
        let rec: TurnRecord | null = null;

        if (opts.hook) {
          const hook = parseHookStdin(readStdin());
          if (hook.stopHookActive) return; // re-entrancy guard
          if (!shouldCapture(hook.cwd)) return; // scope guard (ORIRO_SCRIBE_ONLY)
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
            context: hook.cwd ? `cwd: ${hook.cwd}` : undefined,
          };
        } else if (opts.json) {
          const parsed = JSON.parse(opts.json) as Partial<TurnRecord>;
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
            tools: csv(opts.tools),
          };
        }

        if (!rec || !hasContent(rec)) {
          if (!opts.hook) info("nothing to capture.");
          return;
        }

        const res = supervisedCapture(rec);
        if (!opts.hook) {
          if (res) {
            const red = res.redactions.length
              ? ` (redacted: ${res.redactions.map((r) => `${r.label}×${r.count}`).join(", ")})`
              : "";
            ok(`captured → ${res.journalDate}.md${red}`);
          } else {
            info("capture deferred (logged); will retry next turn.");
          }
        }
      } catch (err) {
        // A Stop hook must never fail the session; only surface errors in manual mode.
        if (!opts.hook) fail(`scribe capture: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

  scribe
    .command("recall <query>")
    .description("full-text search across every day's journal")
    .option("-n, --limit <n>", "max matches", "50")
    .action((query: string, opts: { limit?: string }) => {
      const limit = Math.max(1, Number(opts.limit) || 50);
      const hits = searchScribe(query, limit);
      if (!hits.length) {
        info(`no matches for "${query}".`);
        return;
      }
      heading(`Scribe — ${hits.length} match(es) for "${query}"`);
      for (const h of hits) info(`${h.date}:${h.line} · ${h.text}`);
    });

  scribe
    .command("digest")
    .description("print the rolling digest (recent context, injectable in a flash)")
    .action(() => {
      const d = readScribeDigest();
      process.stdout.write(d?.trim() ? `${d.trim()}\n` : "· digest empty (nothing captured yet).\n");
    });

  scribe
    .command("timeline")
    .description("print the full-history timeline (one line per day)")
    .action(() => {
      const t = readTimeline();
      process.stdout.write(t?.trim() ? `${t.trim()}\n` : "· timeline empty (nothing captured yet).\n");
    });

  scribe
    .command("health")
    .description("show the scribe writer's health (last write, fault count)")
    .action(() => {
      const h = readHealth();
      info(`last write: ${h.lastWriteAt ?? "never"}`);
      info(`faults: ${h.faultCount}${h.lastFault ? ` (last: ${h.lastFault})` : ""}`);
    });
}
