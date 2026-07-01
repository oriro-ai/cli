// ORIRO onboarding — the JOURNEY. A thin ORIRO flow that owns first-run order and rides our
// own (folded) interactive pieces. NONE of the OpenClaw wizard is used. Order (your spec):
//   banner → language → Guardian + Head (auto, default-on) → avatar → skills (all bundled) →
//   Scriber consent (Yes/No, off by default) → [channels offered later] → ready.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { banner } from "../ui/banner.js";
import { isLanguageConfigured, runLanguageOnboarding } from "../language/index.js";
import { activateGuardian } from "../guardian/index.js";
import { isAvatarConfigured, runAvatarOnboarding } from "../avatar/index.js";
import { hasScribeChoice, setScribeConsent } from "../scribe/consent.js";
import { hasRouterChoice, runRouterOnboarding } from "../routers/onboarding.js";
import { dim, accent } from "../ui/theme.js";
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

  // Step 3 — avatar (optional; on-device voice)
  if (!isAvatarConfigured()) await runAvatarOnboarding();

  // Step 5 — skills: all 322 are bundled (CORE model-visible, TAIL via /name) — nothing to pick.

  // Step 5A — Scriber consent (off by default; only after Skills, per your call).
  if (!hasScribeChoice()) {
    const yes = await askYesNo(
      "Remember with me? The Scriber keeps your work in context on THIS machine only — it never leaves it.",
    );
    setScribeConsent(yes);
    stdout.write(yes ? `  ${accent("📓 Scriber")} on.\n` : `  ${dim("Scriber off — `oriro scribe on` anytime.")}\n`);
  }

  // Step 6 — routers / BYOK (offered ONCE; keyless floor stays the zero-config default, so a fresh
  // user can always chat). This is the step that was previously missing from the journey.
  if (!hasRouterChoice()) await runRouterOnboarding();

  // (Channels — BYO bot creds — are offered in the channels milestone.)
  stdout.write(`\n  ${accent("ORIRO is ready.")} ${dim("Type to chat · /exit to leave")}\n\n`);
}
