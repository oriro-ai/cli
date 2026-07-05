// V0.3.7 — `oriro init` + `oriro compact` as SHELL commands (they were REPL-only slashes; Kimi and
// Grok expose both ways). Thin wrappers — the real logic stays in the slash handlers / Pi engine:
//   oriro init [--force]                      → scaffold AGENTS.md before ever starting a session
//   oriro compact [--resume <id>] [focus…]    → compact a SAVED session's history (default: the most
//                                               recent for this cwd), so a long project chat stays
//                                               resumable without hitting the context window.
import type { Command } from "commander";
import { handleInit } from "../repl-ui/slash-init.js";
import { handleCompact } from "../repl-ui/slash-compact.js";
import { assembleOriroSession } from "../onboarding/assemble.js";
import { dim } from "../ui/theme.js";
import { die } from "./ui.js";

export function registerProjectCommands(program: Command): void {
  program
    .command("init")
    .description("write a starter AGENTS.md for this project (same as the in-chat /init)")
    .option("--force", "overwrite an existing AGENTS.md")
    .action((opts: { force?: boolean }) => {
      process.stdout.write(handleInit(`/init${opts.force ? " --force" : ""}`).join("\n") + "\n");
    });

  program
    .command("compact [focus...]")
    .description("summarize + free a saved session's history (default: most recent here; same as /compact)")
    .option("--resume <id>", "compact a specific saved session (id or unique prefix)")
    .action(async (focus: string[], opts: { resume?: string }) => {
      let session;
      let sessionNote: string | undefined;
      try {
        ({ session, sessionNote } = await assembleOriroSession({
          resume: opts.resume ? { resumeId: opts.resume } : { continue: true },
        }));
      } catch (e) {
        die(e instanceof Error ? e.message : String(e));
        return;
      }
      if (sessionNote) process.stdout.write(`  ${dim(sessionNote)}\n`);
      const lines = await handleCompact(session, `/compact${focus.length ? ` ${focus.join(" ")}` : ""}`);
      process.stdout.write(lines.join("\n") + "\n");
      try { session.dispose(); } catch { /* best-effort */ }
    });
}
