// ORIRO REPL — the default (no-subcommand) experience: first-run onboarding → assemble the full
// keyless session (Mux + Guardian + Head + Scriber + Orchestrator + skills) → an interactive loop.
//
// On a real terminal we run the rich pi-tui REPL (`repl-ui/tui-repl`) — a persistent posture FOOTER
// (● Manual · ✎ Accept Edits · ⏵⏵ Auto · ▢ Plan) with a Shift+Tab cycle, fully ORIRO-branded.
// When stdin/stdout is NOT a TTY (pipes, CI, the QA harness), we fall back to a plain readline loop
// with the same language seam — so non-interactive use is unaffected.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { banner } from "./ui/banner.js";
import { isFirstRun, runOnboarding } from "./onboarding/wrapper.js";
import { assembleOriroSession } from "./onboarding/assemble.js";
import { noteUserInput } from "./scribe/scribe-pi.js";
import { getTerminalLanguage } from "./language/index.js";
import { translateIncoming, translateOutgoing } from "./language/gateway.js";
import { runTuiRepl } from "./repl-ui/tui-repl.js";
import { setupVoiceInput } from "./voice/setup.js";
import { scrubOutput } from "./identity/filter.js";
import { phantomFileWarning } from "./repl-ui/verify-actions.js";
import { isRouterSlash, handleRouterSlash } from "./repl-ui/slash-routers.js";
import { dim, accent } from "./ui/theme.js";

/** In-REPL help — real, not LLM-fabricated. */
function replHelp(): string {
  return (
    `\n  ${accent("ORIRO terminal — help")}\n` +
    `  ${dim("Just type to chat; ORIRO writes and runs code for you (keyless, free).")}\n\n` +
    `  ${accent("/help")}  this help     ${accent("/exit")} or ${accent("/quit")}  leave     ${dim("Ctrl-D / Ctrl-C also exit")}\n` +
    `  ${dim("Run these OUTSIDE the chat (in your shell):")}\n` +
    `  ${dim("oriro skills · routers · connectors · channels · scribe · language · avatar")}\n\n`
  );
}

export async function runRepl(): Promise<void> {
  if (isFirstRun()) await runOnboarding();
  else stdout.write(banner());

  const { session } = await assembleOriroSession();
  setupVoiceInput(); // wire the on-device Whisper listener into the voice seam (graceful if absent)

  // Rich TUI (posture footer + Shift+Tab) on a real terminal; plain readline loop otherwise.
  if (stdin.isTTY && stdout.isTTY) {
    await runTuiRepl(session);
    return;
  }
  await runReadlineRepl(session);
}

/** The plain, non-TTY loop (pipes / CI / QA). Same language seam; no footer (no raw-mode terminal). */
async function runReadlineRepl(session: AgentSession): Promise<void> {
  const isEnglish = getTerminalLanguage().code.toLowerCase().startsWith("en");
  const rl = createInterface({ input: stdin, output: stdout });

  let closing = false;
  const onSigint = (): void => {
    if (closing) return;
    closing = true;
    stdout.write(dim("\nBye.\n"));
    try { rl.close(); } catch { /* */ }
    try { session.dispose(); } catch { /* */ }
    process.exit(0);
  };
  process.on("SIGINT", onSigint);

  try {
    for (;;) {
      let line: string;
      try {
        line = (await rl.question("› ")).trim();
      } catch {
        break; // stdin closed (Ctrl-D / piped EOF) → exit cleanly
      }
      if (!line) continue;
      const slash = line.toLowerCase();
      if (slash === "/exit" || slash === "/quit") break;
      if (slash === "/help" || slash === "/?") { stdout.write(replHelp()); continue; }
      if (slash === "/skill" || slash === "/skills") { stdout.write(`  ${dim("326 skills bundled & active. Browse: oriro skills list --all")}\n`); continue; }
      if (slash === "/connector" || slash === "/connectors") { stdout.write(`  ${dim("59 MCP connectors. Add: oriro connectors setup · or oriro connectors add <slug>")}\n`); continue; }
      if (isRouterSlash(slash)) { stdout.write((await handleRouterSlash(line)).join("\n") + "\n"); continue; }

      const english = await translateIncoming(line);
      noteUserInput(line);
      let out = "";
      const unsub = session.subscribe(
        (e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
          if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
            out += e.assistantMessageEvent.delta ?? "";
          }
        },
      );
      try {
        await session.prompt(english);
      } finally {
        unsub();
      }
      // Emit the full reply once, scrubbed of any third-party router ad/promo (non-TTY: no live stream).
      const cleaned = scrubOutput(out);
      const shown = isEnglish ? cleaned.trim() : await translateOutgoing(cleaned.trim());
      stdout.write(`${shown}${phantomFileWarning(shown)}\n\n`);
    }
  } finally {
    process.removeListener("SIGINT", onSigint);
    if (!closing) {
      rl.close();
      session.dispose();
      stdout.write(dim("\nBye.\n"));
    }
  }
}
