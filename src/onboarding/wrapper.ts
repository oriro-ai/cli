// ORIRO onboarding — the JOURNEY. A thin ORIRO flow that owns first-run order and rides our
// own (folded) interactive pieces. NONE of the OpenClaw wizard is used. Order (your spec):
//   banner → language → Guardian + Head (auto, default-on) → avatar → skills (all bundled) →
//   Scriber consent (Yes/No, off by default) → [channels offered later] → ready.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { banner } from "../ui/banner.js";
import { isLanguageConfigured, runLanguageOnboarding } from "../language/index.js";
import { getTerminalLanguage } from "../language/config.js";
import { activateGuardian } from "../guardian/index.js";
import { isAvatarConfigured, runAvatarOnboarding } from "../avatar/index.js";
import { hasScribeChoice, setScribeConsent } from "../scribe/consent.js";
import { hasRouterChoice, runRouterOnboarding } from "../routers/onboarding.js";
import {
  welcomeIn,
  hasSkillsChoice, runSkillsStep,
  hasConnectorsChoice, runConnectorsStep,
  hasModelsChoice, runModelsStep,
} from "./steps.js";
import { dim, accent, bold } from "../ui/theme.js";
import { ask } from "./prompt.js";

/** First run = a required onboarding step is still unsettled. Keying only on language meant an
 *  interrupted onboarding (quit after language) stranded the Scriber-consent step forever; now the
 *  remaining steps are re-offered until both language AND the Scriber Yes/No are settled. */
export function isFirstRun(): boolean {
  return !isLanguageConfigured() || !hasScribeChoice();
}

async function askYesNo(question: string): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const a = (await ask(rl, `${question} ${dim("[Y/n]")} `)).trim().toLowerCase();
    return a === "" || a === "y" || a === "yes";
  } finally {
    rl.close();
  }
}

/** Run the ORIRO first-run journey. Persists every choice; safe to re-run (skips settled steps). */
export async function runOnboarding(): Promise<void> {
  stdout.write(banner());

  // Step 1 — language (the first choice)
  await runLanguageOnboarding();

  // Steps 2 & 4 — Guardian V3 + Head install by default (Guardian no opt-out; Head is a tool).
  await activateGuardian();
  stdout.write(`  ${accent("🛡 Guardian V3")} is on by default. ${accent("🧭 Head")} is ready.\n\n`);

  // Step 3 — avatar (optional; on-device voice), then a localized welcome in the chosen language.
  if (!isAvatarConfigured()) await runAvatarOnboarding();
  stdout.write(`\n  ${bold(accent(welcomeIn(getTerminalLanguage().code)))}\n`);

  // Step 5 — skills (all bundled; browse/keep).
  if (!hasSkillsChoice()) await runSkillsStep();

  // Step 6 — connectors (add one or skip).
  if (!hasConnectorsChoice()) await runConnectorsStep();

  // Step 7 — routers: the free keyless pool races by default; offer BYOK for a private lane.
  if (!hasRouterChoice()) await runRouterOnboarding();

  // Step 8 — ORIRO Gauss + Avila (V2.4) preview — coming soon (in training).
  if (!hasModelsChoice()) await runModelsStep();

  // Step 9 — Scriber consent (off by default; after the models step, per your ordering).
  if (!hasScribeChoice()) {
    const yes = await askYesNo(
      "Remember with me? The Scriber keeps your work in context on THIS machine only — it never leaves it.",
    );
    setScribeConsent(yes);
    stdout.write(yes ? `  ${accent("📓 Scriber")} on.\n` : `  ${dim("Scriber off — `oriro scribe on` anytime.")}\n`);
  }

  stdout.write(`\n  ${accent("ORIRO is ready.")} ${dim("Type to chat · /exit to leave")}\n\n`);
}
