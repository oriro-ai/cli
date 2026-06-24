// `oriro skills` — inspect the bundled ORIRO skill library and its Option-B tiering.
//   list  → CORE (model-visible) / TAIL (/name-only) counts, with optional names
import type { Command } from "commander";
import { loadOriroSkills } from "../skills/loader.js";
import { info, heading } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

export function registerSkillsCommand(program: Command): void {
  const skills = program.command("skills").description("the bundled ORIRO skill library (Option-B tiered)");

  skills
    .command("list")
    .description("show CORE / TAIL skill counts (use --all to list names)")
    .option("-a, --all", "list every skill name")
    .action(async (opts: { all?: boolean }) => {
      const s = await loadOriroSkills();
      heading("Skills");
      info(`${accent(String(s.all.length))} loaded · ${accent(String(s.core.length))} CORE (model-visible) · ${accent(String(s.tail.length))} TAIL (/name-only)`);
      if (opts.all) {
        for (const sk of s.all) {
          const tag = sk.disableModelInvocation ? dim("TAIL") : accent("CORE");
          process.stdout.write(`  ${tag}  ${sk.name}\n`);
        }
      }
    });
}
