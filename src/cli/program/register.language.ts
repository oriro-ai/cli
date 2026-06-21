// ORIRO CLI — `oriro language` command. Pick or change the terminal's language at
// any time (the same 99-language picker shown at onboarding). The choice persists to
// ~/.oriro/language.json and every agent turn becomes multilingual from then on.
import type { Command } from "commander";
import { formatDocsLink } from "../../../packages/terminal-core/src/links.js";
import { theme } from "../../../packages/terminal-core/src/theme.js";

/** Register the `language` command (interactive picker + non-interactive --set). */
export function registerLanguageCommand(program: Command): void {
  program
    .command("language")
    .description("Choose the terminal's language (99 supported; you type/read in it, the AI works in English)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/language", "docs.oriro.ai/cli/language")}\n`,
    )
    .option("--set <code>", "Set language non-interactively by ISO code (e.g. hi, es, zh)")
    .option("--list", "List supported languages and exit", false)
    .action(async (opts) => {
      const lang = await import("../../language/index.js");
      if (opts.list === true) {
        for (const l of lang.LANGUAGES) {
          process.stdout.write(`  ${l.code.padEnd(6)} ${l.name}${l.neuralVoice ? "  ★" : ""}\n`);
        }
        return;
      }
      if (typeof opts.set === "string" && opts.set.trim()) {
        const chosen = lang.languageByCode(opts.set.trim());
        if (!chosen) {
          process.stderr.write(`Unknown language code: ${opts.set}. Try 'oriro language --list'.\n`);
          process.exitCode = 1;
          return;
        }
        lang.setTerminalLanguage(chosen);
        process.stdout.write(`\n  ◯ ${chosen.name} is now your terminal language.\n\n`);
        return;
      }
      const chosen = await lang.selectLanguageInteractive();
      lang.setTerminalLanguage(chosen);
      process.stdout.write(`\n  ◯ ${chosen.name} is now your terminal language.\n\n`);
    });
}
