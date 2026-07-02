// `oriro skills` — the ORIRO skill library (bundled + your own).
//   list          → CORE (model-visible) / TAIL (/name-only) counts, with optional names
//   add <path>    → add YOUR skill (a folder with SKILL.md, or a SKILL.md file) into ~/.oriro/skills
//   remove <name> → drop a user-added skill
import { existsSync, statSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import type { Command } from "commander";
import { loadOriroSkills, userSkillsDir } from "../skills/loader.js";
import { info, heading, ok, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

export function registerSkillsCommand(program: Command): void {
  const skills = program.command("skills").description("the ORIRO skill library — bundled + your own");

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
      info(`Add your own: ${accent("oriro skills add <path>")} ${dim(`→ ${userSkillsDir()}`)}`);
    });

  skills
    .command("add <path>")
    .description("add your own skill — a folder containing SKILL.md, or a SKILL.md file")
    .action((p: string) => {
      const src = resolve(p);
      if (!existsSync(src)) die(`not found: ${src}`);
      const dest = userSkillsDir();
      mkdirSync(dest, { recursive: true });
      const st = statSync(src);
      if (st.isDirectory()) {
        if (!existsSync(join(src, "SKILL.md"))) die(`no SKILL.md in ${src} — a skill folder must contain SKILL.md`);
        const name = basename(src);
        cpSync(src, join(dest, name), { recursive: true });
        ok(`added skill ${accent(name)} → ${join(dest, name)}`);
      } else if (basename(src).toLowerCase() === "skill.md") {
        const name = basename(dirname(src)) || "custom-skill";
        mkdirSync(join(dest, name), { recursive: true });
        cpSync(src, join(dest, name, "SKILL.md"));
        ok(`added skill ${accent(name)} → ${join(dest, name)}`);
      } else {
        die("expected a folder containing SKILL.md, or a SKILL.md file");
      }
      info("It loads on next launch — and is available in chat via /skill.");
    });

  skills
    .command("remove <name>")
    .description("remove a skill you added")
    .action((name: string) => {
      const target = join(userSkillsDir(), name);
      if (!existsSync(target)) { info(`'${name}' is not a user-added skill — nothing to remove`); return; }
      rmSync(target, { recursive: true, force: true });
      ok(`removed ${accent(name)}`);
    });
}
