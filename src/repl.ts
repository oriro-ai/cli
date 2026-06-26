// ORIRO REPL — the default (no-subcommand) experience: first-run onboarding → assemble the full
// keyless session (Mux + Guardian + Head + Scriber + Orchestrator + skills) → a language-wrapped
// readline chat loop. Extracted from cli.ts so the entry point is a thin command dispatcher.
//   (v1 REPL is a clean readline loop with the language seam; swapping in Pi's rich pi-tui
//    InteractiveMode — editor / @files / !bash — is a flagged polish follow-up.)
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { banner } from "./ui/banner.js";
import { isFirstRun, runOnboarding } from "./onboarding/wrapper.js";
import { assembleOriroSession } from "./onboarding/assemble.js";
import { noteUserInput } from "./scribe/scribe-pi.js";
import { getTerminalLanguage } from "./language/index.js";
import { translateIncoming, translateOutgoing } from "./language/gateway.js";
import { dim, accent } from "./ui/theme.js";

/** In-REPL help — real, not LLM-fabricated. Lists the chat-loop commands and the shell subcommands. */
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

  const isEnglish = getTerminalLanguage().code.toLowerCase().startsWith("en");

  const { session } = await assembleOriroSession();
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    for (;;) {
      let line: string;
      try {
        line = (await rl.question("› ")).trim();
      } catch {
        break; // stdin closed (Ctrl-D or piped-input EOF) → exit cleanly, not a crash
      }
      if (!line) continue;
      const slash = line.toLowerCase();
      if (slash === "/exit" || slash === "/quit") break;
      if (slash === "/help" || slash === "/?") { stdout.write(replHelp()); continue; }

      // Route through the language gateway: it lazily wires + warms the on-device NLLB translator
      // on first non-English use (the direct translate path never loaded it) and passes through for
      // English / slash inputs. Degrades to passthrough if the model runtime is absent.
      const english = await translateIncoming(line); // user's language → English for the model
      noteUserInput(line); // record the user's exact words so the Scriber journals them (recall across sessions)
      let out = "";
      const unsub = session.subscribe((e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
        if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
          const d = e.assistantMessageEvent.delta ?? "";
          out += d;
          if (isEnglish) stdout.write(d); // stream live for English; non-English buffers to translate
        }
      });
      try {
        await session.prompt(english);
      } finally {
        unsub();
      }
      if (isEnglish) stdout.write("\n\n");
      else stdout.write(`${await translateOutgoing(out.trim())}\n\n`); // English reply → user's language
    }
  } finally {
    rl.close();
    session.dispose();
    stdout.write(dim("\nBye.\n"));
  }
}
