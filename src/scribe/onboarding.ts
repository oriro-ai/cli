// ORIRO Scribe — first-run consent step (after Skills). The scribe stays dormant
// until the user says Yes here. Local-only, reversible later via `oriro scribe on|off`.
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { setScribeConsent } from "./consent.js";

const C = { teal: "\x1b[38;5;43m", dim: "\x1b[2m", reset: "\x1b[0m" };

/** Ask the user whether to enable the scribe. Returns the chosen state. Interactive only. */
export async function runScribeConsentOnboarding(): Promise<boolean> {
  output.write(
    `\n  ${C.teal}ORIRO Scribe${C.reset} — remember your work with you?\n` +
      `  ${C.dim}It keeps a private journal of your sessions so any model stays in context across\n` +
      `  restarts and router changes. It is stored only on this machine and never leaves it.\n` +
      `  You can turn it off anytime with \`oriro scribe off\`.${C.reset}\n`,
  );
  const rl = createInterface({ input, output });
  try {
    const ans = (await rl.question(`\n  ${C.teal}›${C.reset} Remember with me? [Y/n]: `))
      .trim()
      .toLowerCase();
    const enabled = ans === "" || ans === "y" || ans === "yes";
    setScribeConsent(enabled);
    output.write(
      enabled
        ? `  ${C.teal}✓${C.reset} Scribe on — I'll keep your work in context (this machine only).\n\n`
        : `  ${C.dim}Scribe off — nothing will be recorded. Enable later with \`oriro scribe on\`.${C.reset}\n\n`,
    );
    return enabled;
  } finally {
    rl.close();
  }
}
