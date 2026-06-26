// `oriro language` — show or change the terminal language (the command the first-run
// confirmation points users to: "Change it anytime with `oriro language`"). Bare form
// re-picks interactively at a TTY; `oriro language <code>` switches directly (scriptable,
// and what the smoke gate exercises); `--all` lists every language. Local-only, reversible.
import type { Command } from "commander";
import { stdin } from "node:process";
import { LANGUAGES, languageByCode, getTerminalLanguage, setTerminalLanguage, selectLanguageInteractive } from "../language/index.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

export function registerLanguageCommand(program: Command): void {
  program
    .command("language")
    .description("show or change your terminal language")
    .argument("[code]", "switch directly to this language (ISO code or name, e.g. es)")
    .option("-a, --all", "list every available language")
    .action(async (code: string | undefined, opts: { all?: boolean }) => {
      if (opts.all) {
        heading(`Languages (${LANGUAGES.length})`);
        for (const l of LANGUAGES) {
          const star = l.neuralVoice ? accent("★") : " ";
          process.stdout.write(`  ${star} ${l.name} ${dim(`(${l.code})`)}\n`);
        }
        return;
      }
      if (code) {
        const lang = languageByCode(code);
        if (!lang) die(`unknown language '${code}' — run \`oriro language --all\` to see the list`);
        setTerminalLanguage(lang);
        ok(`${accent(lang.name)} is now your terminal language.`);
        return;
      }
      // No argument: re-pick at a TTY; otherwise just report the current setting (never hang on a pipe).
      if (stdin.isTTY) {
        const lang = await selectLanguageInteractive();
        setTerminalLanguage(lang);
        ok(`${accent(lang.name)} is now your terminal language.`);
      } else {
        const cur = getTerminalLanguage();
        info(`terminal language: ${accent(cur.name)} ${dim(`(${cur.code})`)}`);
        info(dim("change it with `oriro language <code>` (e.g. `oriro language es`) or `oriro language --all`"));
      }
    });
}
