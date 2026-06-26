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
import { getTerminalLanguage, translateForCoder, translateForUser } from "./language/index.js";
import { setupNllbTranslator } from "./language/nllb-translator.js";
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

  const lang = getTerminalLanguage().code;
  const isEnglish = lang.toLowerCase().startsWith("en");
  if (!isEnglish) setupNllbTranslator(); // wire the on-device translator (passthrough if unavailable)

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
      if (line === "/exit" || line === "/quit") break;
      if (line === "/help" || line === "/?") { stdout.write(replHelp()); continue; }

      const english = await translateForCoder(line, lang); // user's language → English for the model
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
      else stdout.write(`${await translateForUser(out.trim(), lang)}\n\n`); // English reply → user's language
    }
  } finally {
    rl.close();
    session.dispose();
    stdout.write(dim("\nBye.\n"));
  }
}
