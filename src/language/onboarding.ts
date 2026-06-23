// ORIRO CLI — first-run language onboarding. The first thing a user sees: pick
// your language from the 99. Type-to-filter (name or ISO code), ★ marks a built-in
// neural voice. Dependency-free (node:readline) so it works the moment the CLI lands.

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { LANGUAGES, searchLanguages, NEURAL_VOICE_COUNT, languageByCode, type OriroLanguage } from './languages.js';
import { readLanguageConfig, setTerminalLanguage } from './config.js';

// ORIRO brand palette (teal → violet, matching ui/theme.ts). Inline raw codes here because
// this readline picker streams to stdout directly; the full pi-tui screen lands in the wrapper.
const C = {
  teal: '\x1b[38;2;45;212;191m',
  purple: '\x1b[38;2;128;96;222m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

function header(): void {
  stdout.write(`\n  ${C.teal}◯${C.reset} ${C.bold}ORIRO${C.reset} ${C.dim}— your terminal, your language${C.reset}\n`);
  stdout.write(`  ${C.dim}You type and read in your language; the AI works in English for you.${C.reset}\n`);
  stdout.write(`  ${C.dim}${LANGUAGES.length} languages · ${NEURAL_VOICE_COUNT} with a built-in voice (${C.purple}★${C.dim}).${C.reset}\n\n`);
}

function renderList(list: OriroLanguage[]): void {
  const shown = list.slice(0, 15);
  shown.forEach((l, i) => {
    const star = l.neuralVoice ? `${C.purple}★${C.reset}` : ' ';
    stdout.write(`  ${C.teal}${String(i + 1).padStart(2)}${C.reset}  ${star} ${l.name} ${C.dim}(${l.code})${C.reset}\n`);
  });
  if (list.length > shown.length) {
    stdout.write(`  ${C.dim}… ${list.length - shown.length} more — keep typing to narrow.${C.reset}\n`);
  }
}

/** Interactive picker: search by name/code, pick by number. Returns the chosen language. */
export async function selectLanguageInteractive(): Promise<OriroLanguage> {
  header();
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    let list = searchLanguages('');
    renderList(list);
    for (;;) {
      const ans = (await rl.question(`\n  ${C.teal}›${C.reset} Type a language, or a number to pick: `)).trim();
      const n = Number(ans);
      const byNumber = ans && Number.isInteger(n) && n >= 1 && n <= list.length ? list[n - 1] : undefined;
      if (byNumber) return byNumber;
      const direct = languageByCode(ans);
      if (direct) return direct;
      list = searchLanguages(ans);
      if (list.length === 0) {
        stdout.write(`  ${C.dim}No match — try the English name or ISO code.${C.reset}\n`);
        list = searchLanguages('');
      } else {
        const only = list.length === 1 ? list[0] : undefined;
        if (only) return only;
      }
      stdout.write('\n');
      renderList(list);
    }
  } finally {
    rl.close();
  }
}

/**
 * Run on first launch (`oriro onboard` step 1). If a language is already set, returns
 * it without prompting. Otherwise prompts, persists the choice as the terminal's
 * language, and confirms. This is THE first thing the user does after install.
 */
export async function runLanguageOnboarding(): Promise<OriroLanguage> {
  const existing = readLanguageConfig();
  if (existing) {
    const l = languageByCode(existing.code);
    if (l) return l;
  }
  const lang = await selectLanguageInteractive();
  setTerminalLanguage(lang);
  stdout.write(
    `\n  ${C.teal}◯${C.reset} ${C.bold}${lang.name}${C.reset} is now your terminal language. ` +
      `${C.dim}Change it anytime with ${C.reset}${C.teal}oriro language${C.reset}\n\n`,
  );
  return lang;
}
