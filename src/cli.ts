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

const version = (createRequire(import.meta.url)("../package.json") as { version: string }).version;

const program = new Command();
program
  .name("oriro")
  .description("ORIRO — a free, on-device-friendly terminal AI agent.")
  .version(version, "-v, --version")
  .action(runRepl); // no subcommand → onboarding + chat REPL

registerRoutersCommand(program);
registerScribeCommand(program);
registerConnectorsCommand(program);
registerChannelsCommand(program);
registerSkillsCommand(program);

program.parseAsync().catch((e: unknown) => {
  process.stderr.write(`\nORIRO error: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exitCode = 1;
});
