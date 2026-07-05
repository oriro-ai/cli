// ORIRO CLI — entry point. A thin command dispatcher built on commander:
//   • `oriro` (no subcommand) → the first-run onboarding journey, then the assembled keyless chat REPL
//   • `oriro routers|scribe|connectors|channels|skills <verb>` → manage the built-in capabilities
// All heavy lifting lives in the modules; this file only wires them to the command line.
// Built on Pi as a library; zero OpenClaw footprint.
import { createRequire } from "node:module";
import { Command } from "commander";
import { runRepl } from "./repl.js";
import { runHeadless, isOutputFormatMode } from "./headless.js";
import { registerSessionsCommand } from "./commands/sessions.js";
import { registerProjectCommands } from "./commands/project.js";
import { registerServeCommand } from "./commands/serve.js";
import { registerGatewayCommand } from "./commands/gateway.js";
import type { ResumeOpts } from "./sessions/store.js";
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
import { registerConfigCommand } from "./commands/config.js";
import { registerSetupCommand } from "./commands/setup.js";
import { registerLoginCommand } from "./commands/login.js";
import { registerModelsCommand } from "./commands/models.js";
import { registerImportCommand } from "./commands/import.js";
import { enableHelpOnError, didYouMean } from "./commands/help-on-error.js";
import { DieError } from "./commands/ui.js";

const version = (createRequire(import.meta.url)("../package.json") as { version: string }).version;

const program = new Command();
program
  .name("oriro")
  .description("ORIRO — a free, on-device-friendly terminal AI agent.")
  .version(version, "-v, --version")
  .option("-p, --print <prompt>", "headless one-shot: run a single prompt, print the answer, exit (CI-friendly)")
  .option("--output-format <fmt>", "with --print: text | json | stream-json", "text")
  // Session continuity (V0.3.4): sessions persist locally under ~/.oriro/sessions; resume on launch.
  .option("-c, --continue", "resume your most recent session in this folder")
  .option("--resume <id>", "resume a specific saved session (id or unique prefix — see: oriro sessions)")
  .option("--fork <id>", "start a new session branched from an existing one")
  .option("--no-session", "don't save this session to disk (ephemeral)")
  // no subcommand → onboarding + chat REPL; an UNKNOWN command must error (not silently open the REPL).
  .action(async (options: { print?: string; outputFormat?: string; continue?: boolean; resume?: string; fork?: string; session?: boolean }, command: Command) => {
    // Headless one-shot (scriptable / CI). Everything else on the root stays interactive.
    if (options.print !== undefined) {
      const fmt = options.outputFormat ?? "text";
      if (!isOutputFormatMode(fmt)) { process.stderr.write(`error: --output-format must be text | json | stream-json\n`); process.exitCode = 1; return; }
      await runHeadless(options.print, fmt);
      return;
    }
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
    // commander maps --no-session → options.session === false (negatable). Build the resume intent.
    const resume: ResumeOpts = {
      continue: options.continue,
      resumeId: options.resume,
      forkId: options.fork,
      ephemeral: options.session === false,
    };
    await runRepl({ resume });
  });

registerSessionsCommand(program);
registerProjectCommands(program); // V0.3.7 — oriro init / oriro compact (shell twins of /init · /compact)
registerServeCommand(program, version); // V0.3.8 — oriro serve acp|mcp (expose ORIRO to editors + other agents)
registerGatewayCommand(program); // V0.6 Phase 2a — oriro gateway: channels + scheduled agents in one control plane
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
registerConfigCommand(program);
registerSetupCommand(program);
registerLoginCommand(program);
registerModelsCommand(program);
registerImportCommand(program);
registerCompletionCommand(program); // last: introspects the fully-built command tree
enableHelpOnError(program); // self-teaching errors across the whole command tree

program.parseAsync().catch((e: unknown) => {
  // DieError already printed its message and set exitCode — just let the process drain & exit.
  if (e instanceof DieError) return;
  process.stderr.write(`\nORIRO error: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exitCode = 1;
});
