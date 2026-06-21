import { stdout as procStdout } from "node:process";
// ORIRO CLI — `oriro avatar`. Pick one of 70 ORIRO faces; it becomes the terminal's face
// and (when the voice runtime is wired) speaks replies in its paired voice. Interactive
// picker by category, or non-interactive --set/--list/--show/--speak.
import type { Command } from "commander";
import { formatDocsLink } from "../../../packages/terminal-core/src/links.js";
import { theme } from "../../../packages/terminal-core/src/theme.js";

const C = {
  teal: "\x1b[38;2;34;184;166m",
  purple: "\x1b[38;2;155;93;229m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

export function registerAvatarCommand(program: Command): void {
  program
    .command("avatar")
    .description(
      "Pick an ORIRO avatar that floats in your terminal and speaks replies (70 to choose from)",
    )
    .option("--set <slug>", "Set avatar non-interactively by slug")
    .option("--list", "List all avatars by category and exit", false)
    .option("--show", "Render the current avatar and exit", false)
    .option("--speak <on|off>", "Turn speaking replies aloud on/off")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/avatar", "docs.oriro.ai/cli/avatar")}\n`,
    )
    .action(async (opts: { set?: string; list?: boolean; show?: boolean; speak?: string }) => {
      const av = await import("../../avatar/index.js");

      if (opts.list === true) {
        for (const cat of av.avatarCategories()) {
          procStdout.write(`\n  ${C.bold}${cat}${C.reset}\n`);
          for (const a of av.avatarsInCategory(cat)) procStdout.write(`    ${a.slug}\n`);
        }
        procStdout.write("\n");
        return;
      }

      if (typeof opts.speak === "string") {
        const cfg = av.readAvatarConfig();
        if (!cfg) {
          procStdout.write("  Pick an avatar first: oriro avatar\n");
          return;
        }
        cfg.speak = opts.speak.toLowerCase() === "on";
        av.writeAvatarConfig(cfg);
        procStdout.write(`  🔊 Speaking replies ${cfg.speak ? "ON" : "OFF"}.\n`);
        return;
      }

      if (opts.show === true) {
        const a = av.getSelectedAvatar();
        if (!a) {
          procStdout.write("  No avatar selected yet. Run: oriro avatar\n");
          return;
        }
        let png: Uint8Array | null = null;
        try {
          png = av.readCachedAvatar(a.slug);
        } catch {
          /* not cached → card */
        }
        procStdout.write("\n" + av.renderAvatar(a, png) + "\n");
        return;
      }

      const setSlug = opts.set;
      if (setSlug) {
        const a = av.avatarBySlug(setSlug);
        if (!a) {
          procStdout.write(`  Unknown avatar: ${setSlug}. Try 'oriro avatar --list'.\n`);
          process.exitCode = 1;
          return;
        }
        av.setSelectedAvatar(a);
        await av.previewAvatar(a);
        return;
      }

      // Interactive picker (shared with first-run onboarding): category → avatar.
      const chosen = await av.selectAvatarInteractive();
      if (!chosen) return;
      av.setSelectedAvatar(chosen);
      await av.previewAvatar(chosen);
    });
}
