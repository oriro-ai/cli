// `oriro setup` (UX-9) — an explicit entry point to the guided first-run wizard (cli-microsoft365's
// `m365 setup` gap; our onboarding otherwise only auto-runs on first launch). `--reset` clears settled
// choices so every step is re-asked. NOTE: ORIRO is keyless by design — there is NO account/login step
// (no device-code auth); the wizard sets up language, routers, connectors, skills, avatar, and models.
import { rmSync } from "node:fs";
import { join } from "node:path";
import { stdin, stdout } from "node:process";
import type { Command } from "commander";
import { runOnboarding } from "../onboarding/wrapper.js";
import { oriroDir } from "../config/paths.js";
import { info, heading, ok } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

// Settled-choice markers under ~/.oriro that gate each wizard step (see onboarding/steps.ts + configs).
const MARKERS = [
  "language.json",
  "avatar.json",
  "skills-onboarded.json",
  "connectors-onboarded.json",
  "models-onboarded.json",
  join("routers", "onboarded.json"),
];

export function registerSetupCommand(program: Command): void {
  program
    .command("setup")
    .description("run the guided setup wizard (language · routers · connectors · skills · avatar)")
    .option("--reset", "clear your settled choices and re-ask every step")
    .action(async (opts: { reset?: boolean }) => {
      if (opts.reset) {
        for (const m of MARKERS) {
          try { rmSync(join(oriroDir(), m), { force: true }); } catch { /* absent = already default */ }
        }
        ok("reset — every step will be asked again");
      }
      // The wizard is interactive (y/N prompts). In a non-interactive shell it would hang on stdin,
      // so guide instead of blocking.
      if (!stdin.isTTY || !stdout.isTTY) {
        heading("ORIRO setup");
        info(`ORIRO is ${accent("keyless")} — no login, no API keys. Run ${accent("oriro setup")} in a real terminal for the guided wizard.`);
        info(dim("or configure directly: oriro language <code> · oriro routers add <id> · oriro connectors add <slug> · oriro config set <k> <v>"));
        return;
      }
      await runOnboarding();
    });
}
