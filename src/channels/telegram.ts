// ORIRO channels — Telegram, built FRESH on grammY (official Bot API, MIT). The donor's telegram
// extension is deeply plugin-SDK-coupled (not folded). Connects on the USER's OWN bot token, runs
// each text message through the ORIRO host, replies. Minimal always-on host = grammY long-polling
// (runs while the process lives). Zero OpenClaw footprint.
import { Bot } from "grammy";
import { OriroChannelHost } from "./host.js";

export interface RunningChannel {
  stop: () => Promise<void>;
}

const TELEGRAM_TOKEN = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;

/** Start a Telegram bot on the user's own token. Each text message → ORIRO → reply. */
export async function startTelegram(token: string): Promise<RunningChannel> {
  if (!TELEGRAM_TOKEN.test(token)) throw new Error("invalid Telegram bot token (get one from @BotFather)");

  const bot = new Bot(token);
  const host = new OriroChannelHost();

  bot.on("message:text", async (ctx) => {
    const reply = await host.dispatch(ctx.message.text);
    await ctx.reply(reply);
  });
  bot.catch((err) => {
    process.stderr.write(`telegram error: ${err instanceof Error ? err.message : String(err)}\n`);
  });

  // Long-poll in the background (drop a backlog so a freshly-started bot doesn't replay old messages).
  void bot.start({ drop_pending_updates: true });

  return {
    stop: async () => {
      await bot.stop();
      host.dispose();
    },
  };
}
