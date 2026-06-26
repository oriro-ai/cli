// `oriro channels` — drive ORIRO from a chat channel using YOUR OWN credentials (never ORIRO's).
//   add <kind> <token>          → validate + store a bot token (telegram/discord validated live)
//   list                        → configured channels
//   start <kind> [--accept-risk]→ run the always-on host for that channel
//   remove <kind>               → drop it
// Telegram + Discord use official bot APIs (token). WhatsApp pairs a REAL account via Baileys QR and
// carries ToS/ban risk → gated behind --accept-risk. Each adapter: inbound msg → ORIRO host → reply.
import type { Command } from "commander";
import { readChannels, saveChannel, removeChannel, type ChannelKind } from "../channels/config.js";
import { startTelegram, validateTelegramToken, type RunningChannel } from "../channels/telegram.js";
import { startDiscord, validateDiscordToken } from "../channels/discord.js";
import { startWhatsApp } from "../channels/whatsapp.js";
import { ok, info, heading, fail, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

const KINDS: ChannelKind[] = ["telegram", "discord", "whatsapp"];
const isKind = (s: string): s is ChannelKind => (KINDS as string[]).includes(s);

/** Keep the process alive for a running channel; stop cleanly on Ctrl-C. */
function hold(name: string, running: RunningChannel): void {
  ok(`${name} host running — message it to talk to ORIRO. Ctrl-C to stop.`);
  const shutdown = (): void => void running.stop().finally(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export function registerChannelsCommand(program: Command): void {
  const channels = program.command("channels").description("run ORIRO from Telegram/Discord/WhatsApp with your own bot");

  channels
    .command("add <kind> <token>")
    .description("store your own bot token (telegram/discord validated live; whatsapp pairs at start)")
    .action(async (kind: string, token: string) => {
      if (!isKind(kind)) die(`unknown channel '${kind}' — one of: ${KINDS.join(", ")}`);
      try {
        if (kind === "telegram") {
          const me = await validateTelegramToken(token);
          saveChannel({ kind, token, enabled: true });
          ok(`telegram added — bot @${me} (your token, stored locally at ~/.oriro/channels.json)`);
          return;
        }
        if (kind === "discord") {
          const me = await validateDiscordToken(token);
          saveChannel({ kind, token, enabled: true });
          ok(`discord added — bot ${me} (your token, stored locally). Enable the MESSAGE CONTENT intent in the Dev Portal.`);
          return;
        }
        // whatsapp: no token — it pairs by QR at start time
        info("WhatsApp has no token — it pairs by QR. Run: `oriro channels start whatsapp --accept-risk`");
      } catch (e) {
        die(`${kind} token rejected: ${e instanceof Error ? e.message : String(e)}`);
      }
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
    .description("run the always-on host for a channel")
    .option("--accept-risk", "WhatsApp only: acknowledge the ToS/ban risk of using Baileys")
    .action(async (kind: string, opts: { acceptRisk?: boolean }) => {
      if (!isKind(kind)) die(`unknown channel '${kind}' — one of: ${KINDS.join(", ")}`);

      if (kind === "whatsapp") {
        if (!opts.acceptRisk) {
          fail("WhatsApp uses Baileys, which pairs a REAL WhatsApp account and may violate WhatsApp's ToS (ban risk).");
          info("If you accept that risk, re-run: `oriro channels start whatsapp --accept-risk`");
          return; // exit 0 — refused, not an error
        }
        try {
          hold("whatsapp", await startWhatsApp());
        } catch (e) {
          die(e instanceof Error ? e.message : String(e)); // e.g. Baileys not installed
        }
        return;
      }

      const cfg = readChannels().find((c) => c.kind === kind);
      if (!cfg) die(`no ${kind} bot configured — run \`oriro channels add ${kind} <token>\` first`);
      hold(kind, kind === "discord" ? await startDiscord(cfg.token) : await startTelegram(cfg.token));
    });

  channels
    .command("remove <kind>")
    .description("remove a configured channel")
    .action((kind: string) => {
      if (!isKind(kind)) die(`unknown channel '${kind}' — one of: ${KINDS.join(", ")}`);
      if (!readChannels().some((c) => c.kind === kind)) {
        info(`no ${kind} channel configured — nothing to remove`);
        return;
      }
      removeChannel(kind);
      ok(`removed ${accent(kind)}`);
    });
}
