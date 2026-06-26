// `oriro avatar` — show or change the terminal avatar (the face that speaks). This is the
// command the avatar confirmation points users to: "Change anytime with `oriro avatar`".
// Bare form re-picks interactively at a TTY (and previews + greets in the avatar's voice);
// `oriro avatar <slug>` sets directly (scriptable, smoke-tested, no voice); `--list` shows
// the catalogue. On-device, owned faces, reversible.
import type { Command } from "commander";
import { stdin } from "node:process";
import {
  avatarBySlug,
  avatarCategories,
  avatarsInCategory,
  getSelectedAvatar,
  setSelectedAvatar,
  selectAvatarInteractive,
  previewAvatar,
} from "../avatar/index.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

export function registerAvatarCommand(program: Command): void {
  program
    .command("avatar")
    .description("show or change your terminal avatar")
    .argument("[slug]", "set directly to this avatar slug")
    .option("-l, --list", "list every avatar by category")
    .action(async (slug: string | undefined, opts: { list?: boolean }) => {
      if (opts.list) {
        for (const cat of avatarCategories()) {
          heading(cat);
          for (const a of avatarsInCategory(cat)) process.stdout.write(`  ${accent(a.slug)}\n`);
        }
        return;
      }
      if (slug) {
        const avatar = avatarBySlug(slug);
        if (!avatar) die(`unknown avatar '${slug}' — run \`oriro avatar --list\` to see the faces`);
        setSelectedAvatar(avatar, { speak: true });
        ok(`${accent(avatar.slug)} is now your terminal face.`);
        return;
      }
      // No argument: re-pick at a TTY (with preview + spoken greeting); otherwise report current.
      if (stdin.isTTY) {
        const chosen = await selectAvatarInteractive();
        if (!chosen) {
          info("no change.");
          return;
        }
        setSelectedAvatar(chosen, { speak: true });
        await previewAvatar(chosen);
      } else {
        const cur = getSelectedAvatar();
        info(cur ? `terminal face: ${accent(cur.slug)}` : "no avatar set yet");
        info(dim("change it with `oriro avatar <slug>` or `oriro avatar --list`"));
      }
    });
}
