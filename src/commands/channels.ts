// `oriro channels` — drive ORIRO from a chat channel using YOUR OWN bot credentials (never ORIRO's).
//   add <kind> <token>  → validate + store the user's bot token (telegram validated live)
//   list                → configured channels
//   start <kind>        → run the always-on host for that channel (telegram only in v1)
//   remove <kind>       → drop it
// Discord/WhatsApp adapters are not built yet — start prints a clear "not yet available".
import type { Command } from "commander";
import { readChannels, saveChannel, removeChannel, type ChannelKind } from "../channels/config.js";
import { startTelegram, validateTelegramToken } from "../channels/telegram.js";
import { ok, info, heading, fail, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

const KINDS: ChannelKind[] = ["telegram", "discord", "whatsapp"];
const isKind = (s: string): s is ChannelKind => (KINDS as string[]).includes(s);

export function registerChannelsCommand(program: Command): void {
  const channels = program.command("channels").description("run ORIRO from Telegram/Discord/WhatsApp with your own bot");

  channels
    .command("add <kind> <token>")
    .description("store your own bot token for a channel (telegram is validated live)")
    .action(async (kind: string, token: string) => {
      if (!isKind(kind)) die(`unknown channel '${kind}' — one of: ${KINDS.join(", ")}`);
      if (kind === "telegram") {
        try {
          const me = await validateTelegramToken(token);
          saveChannel({ kind, token, enabled: true });
          ok(`telegram added — bot @${me} (your token, stored locally at ~/.oriro/channels.json)`);
        } catch (e) {
          die(`telegram token rejected: ${e instanceof Error ? e.message : String(e)}`);
        }
        return;
      }
      saveChannel({ kind, token, enabled: true });
      ok(`${kind} credentials stored`);
      info(dim(`note: the ${kind} adapter is not built yet — start support is coming`));
    });

  channels
    .command("list")
    .description("list configured channels")
    .action(() => {
      const all = readChannels();
      heading("Channels");
      if (!all.length) {
        info("none configured — add one with `oriro channels add telegram <token>`");
        return;
      }
      for (const c of all) {
        process.stdout.write(`  ${accent(c.kind.padEnd(10))} ${c.enabled ? "enabled" : dim("disabled")}  ${dim("token " + c.token.slice(0, 4) + "…")}\n`);
      }
    });

  channels
    .command("start <kind>")
    .description("run the always-on host for a channel (telegram only in v1)")
    .action(async (kind: string) => {
      if (!isKind(kind)) die(`unknown channel '${kind}' — one of: ${KINDS.join(", ")}`);
      if (kind !== "telegram") {
        fail(`the ${kind} adapter is not yet available — Telegram is the only channel in v1.`);
        return; // exit 0: not an error, just unimplemented
      }
      const cfg = readChannels().find((c) => c.kind === "telegram");
      if (!cfg) die("no telegram bot configured — run `oriro channels add telegram <token>` first");
      const running = await startTelegram(cfg.token);
      ok("telegram host running — message your bot to talk to ORIRO. Ctrl-C to stop.");
      const shutdown = (): void => void running.stop().finally(() => process.exit(0));
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    });

  channels
    .command("remove <kind>")
    .description("remove a configured channel")
    .action((kind: string) => {
      if (!isKind(kind)) die(`unknown channel '${kind}' — one of: ${KINDS.join(", ")}`);
      removeChannel(kind);
      ok(`removed ${accent(kind)}`);
    });
}
