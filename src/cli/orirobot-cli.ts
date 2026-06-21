// Legacy orirobot command namespace kept for QR/linking aliases.
import type { Command } from "commander";
import { formatDocsLink } from "../../packages/terminal-core/src/links.js";
import { theme } from "../../packages/terminal-core/src/theme.js";
import { registerQrCli } from "./qr-cli.js";

export function registerOrirobotCli(program: Command) {
  const orirobot = program
    .command("orirobot")
    .description("Legacy orirobot command aliases")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/orirobot", "docs.oriro.ai/cli/orirobot")}\n`,
    );
  registerQrCli(orirobot);
}
