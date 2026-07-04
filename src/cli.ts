// ORIRO CLI — entry point. A thin command dispatcher built on commander:
//   • `oriro` (no subcommand) → the first-run onboarding journey, then the assembled keyless chat REPL
//   • `oriro routers|scribe|connectors|channels|skills <verb>` → manage the built-in capabilities
// All heavy lifting lives in the modules; this file only wires them to the command line.
// Built on Pi as a library; zero OpenClaw footprint.
import { createRequire } from "node:module";
import { Command } from "commander";
import { runRepl } from "./repl.js";
import { registerRoutersCommand } from "./commands/routers.js";
import { registerScribeCommand } from "./commands/scribe.js";
import { registerConnectorsCommand } from "./commands/connectors.js";
import { registerChannelsCommand } from "./commands/channels.js";
import { registerSkillsCommand } from "./commands/skills.js";
import { registerLanguageCommand } from "./commands/language.js";
import { registerAvatarCommand } from "./commands/avatar.js";
import { registerHeadCommand } from "./commands/head.js";
import { registerVoiceCommand } from "./commands/voice.js";
import { registerAgentsCommand } from "./commands/agents.js";
import { registerCompletionCommand } from "./commands/completion.js";
import { enableHelpOnError, didYouMean } from "./commands/help-on-error.js";
import { DieError } from "./commands/ui.js";

const version = (createRequire(import.meta.url)("../package.json") as { version: string }).version;

const program = new Command();
program
  .name("oriro")
  .description("ORIRO — a free, on-device-friendly terminal AI agent.")
  .version(version, "-v, --version")
  // no subcommand → onboarding + chat REPL; an UNKNOWN command must error (not silently open the REPL).
  .action(async (_options: unknown, command: Command) => {
    if (command.args.length > 0) {
      const arg = command.args[0] ?? "";
      if (arg === "help") { command.outputHelp(); return; } // `oriro help` → top-level help (exit 0)
      // Self-teaching error: name a likely fix, then print the full command list.
      const names = command.commands.map((c) => c.name());
      const guess = didYouMean(arg, names);
      process.stderr.write(`error: unknown command '${arg}'${guess ? ` — did you mean '${guess}'?` : ""}\n\n`);
      command.outputHelp();
      process.exitCode = 1;
      return;
    }
    await runRepl();
  });

registerRoutersCommand(program);
registerScribeCommand(program);
registerConnectorsCommand(program);
registerChannelsCommand(program);
registerSkillsCommand(program);
registerLanguageCommand(program);
registerAvatarCommand(program);
registerHeadCommand(program);
registerVoiceCommand(program);
registerAgentsCommand(program);
registerCompletionCommand(program); // last: introspects the fully-built command tree
enableHelpOnError(program); // self-teaching errors across the whole command tree

program.parseAsync().catch((e: unknown) => {
  // DieError already printed its message and set exitCode — just let the process drain & exit.
  if (e instanceof DieError) return;
  process.stderr.write(`\nORIRO error: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exitCode = 1;
});
