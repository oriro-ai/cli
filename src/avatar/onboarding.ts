// ORIRO CLI — first-run avatar onboarding (`oriro onboard` step 3, after language +
// Guardian). Offer one of the ORIRO faces; the chosen avatar floats in the terminal and
// speaks in its paired voice. Dependency-free (node:readline) so it works the moment the
// CLI lands. Shared by `oriro avatar` (forces a re-pick) and onboarding (skips if set).

import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { ensureAvatarImage, readCachedAvatar } from "./cache.js";
import { isAvatarConfigured, setSelectedAvatar } from "./config.js";
import { AVATAR_COUNT, avatarCategories, avatarsInCategory, type AvatarEntry } from "./manifest.js";
import { renderAvatar } from "./render.js";
import { setupSystemVoice } from "./system-voice.js";
import { speak } from "./voice.js";
import { ask } from "../onboarding/prompt.js";

// ORIRO palette (teal → purple, matching the logo gradient).
const C = {
  teal: "\x1b[38;2;34;184;166m",
  purple: "\x1b[38;2;155;93;229m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

/** Render the chosen avatar (inline image when the terminal supports it, ASCII card otherwise). */
export async function previewAvatar(avatar: AvatarEntry): Promise<void> {
  stdout.write(
    `\n  ${C.teal}◯${C.reset} ${C.bold}${avatar.slug}${C.reset} is now your terminal face. ` +
      `${C.dim}Change anytime with ${C.reset}${C.teal}oriro avatar${C.reset}\n`,
  );
  let png: Uint8Array | null = null;
  try {
    await ensureAvatarImage(avatar);
    png = readCachedAvatar(avatar.slug);
  } catch {
    /* offline → ASCII card */
  }
  stdout.write("\n" + renderAvatar(avatar, png) + "\n");
  // Actually speak: wire the on-device OS voice and greet in the avatar's voice.
  setupSystemVoice();
  const spoke = await speak(`Hi, I'm ${avatar.slug}, your ORIRO terminal face. I'll speak your replies.`, {
    voiceId: avatar.slug,
    lang: "en-US",
  });
  if (spoke) stdout.write(`  ${C.dim}(spoken aloud in your terminal's voice)${C.reset}\n`);
}

/** Interactive picker: category → avatar. Returns the chosen avatar, or null if cancelled. */
export async function selectAvatarInteractive(): Promise<AvatarEntry | null> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    stdout.write(
      `\n  ${C.teal}◯${C.reset} ${C.bold}Choose your ORIRO avatar${C.reset} ${C.dim}— ${AVATAR_COUNT} faces, it floats in your terminal and speaks.${C.reset}\n\n`,
    );
    const cats = avatarCategories();
    cats.forEach((cat, i) =>
      stdout.write(
        `  ${C.teal}${String(i + 1).padStart(2)}${C.reset}  ${cat} ${C.dim}(${avatarsInCategory(cat).length})${C.reset}\n`,
      ),
    );
    let cat: string | undefined;
    for (;;) {
      const ans = (await ask(rl, `\n  ${C.teal}›${C.reset} Pick a category number ${C.dim}(or Enter to skip)${C.reset}: `)).trim();
      if (!ans) { stdout.write(`  ${C.dim}Skipped — no avatar.${C.reset}\n`); return null; }
      const n = Number(ans);
      cat = Number.isInteger(n) ? cats[n - 1] : undefined;
      if (cat) break;
      stdout.write(`  ${C.dim}Please enter a number from the list.${C.reset}\n`);
    }
    const list = avatarsInCategory(cat);
    stdout.write("\n");
    list.forEach((a, i) =>
      stdout.write(`  ${C.teal}${String(i + 1).padStart(2)}${C.reset}  ${a.slug}\n`),
    );
    for (;;) {
      const ans = (await ask(rl, `\n  ${C.teal}›${C.reset} Pick an avatar number ${C.dim}(or Enter to skip)${C.reset}: `)).trim();
      if (!ans) { stdout.write(`  ${C.dim}Skipped — no avatar.${C.reset}\n`); return null; }
      const n = Number(ans);
      const chosen = Number.isInteger(n) ? list[n - 1] : undefined;
      if (chosen) return chosen;
      stdout.write(`  ${C.dim}Please enter a number from the list.${C.reset}\n`);
    }
  } finally {
    rl.close();
  }
}

/**
 * Run on first launch (`oriro onboard` step 3). If an avatar is already chosen, returns
 * without prompting. Otherwise offers the picker, persists the choice with speaking ON by
 * default (so it talks when you talk), and previews the face. Best-effort: a cancel or a
 * non-TTY simply leaves the avatar unset and onboarding continues.
 */
export async function runAvatarOnboarding(): Promise<void> {
  if (isAvatarConfigured()) {
    return;
  }
  const chosen = await selectAvatarInteractive();
  if (!chosen) {
    return;
  }
  setSelectedAvatar(chosen, { speak: true });
  await previewAvatar(chosen);
}
