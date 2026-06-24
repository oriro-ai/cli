// ORIRO channels — Discord, built FRESH on discord.js (official Bot API, Apache-2.0). Connects on
// the USER's OWN bot token; each text message runs through the ORIRO host → reply. Mirrors the
// Telegram adapter. discord.js is lazy-imported so it never slows a non-Discord run. Zero OpenClaw footprint.
import { OriroChannelHost } from "./host.js";
import type { RunningChannel } from "./telegram.js";

// Discord bot token: three base64url segments. Loose shape-check rejects obvious junk offline.
const DISCORD_TOKEN = /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}$/;
const MAX_DISCORD = 2000; // Discord hard message-length cap

/** Validate a Discord bot token at add-time: shape-check, then a single GET /users/@me (no gateway).
 *  Returns the bot username on success; throws (so the caller refuses to persist) on failure. */
export async function validateDiscordToken(token: string): Promise<string> {
  if (!DISCORD_TOKEN.test(token)) throw new Error("malformed token (Discord Developer Portal → Bot → Reset Token)");
  const res = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bot ${token}` } });
  if (!res.ok) throw new Error(`Discord rejected the token (HTTP ${res.status})`);
  const me = (await res.json()) as { username?: string; id?: string };
  return me.username ?? me.id ?? "unknown";
}

/** Start a Discord bot on the user's own token. Each (non-bot) text message → ORIRO → reply.
 *  Needs the MESSAGE CONTENT intent enabled in the Discord Developer Portal. */
export async function startDiscord(token: string): Promise<RunningChannel> {
  const { Client, GatewayIntentBits, Events } = await import("discord.js");
  const host = new OriroChannelHost();
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot || !msg.content) return; // ignore bots + empty/no-content messages
    const reply = await host.dispatch(msg.content);
    try {
      await msg.reply(reply.slice(0, MAX_DISCORD));
    } catch (e) {
      process.stderr.write(`discord reply failed: ${e instanceof Error ? e.message : String(e)}\n`);
    }
  });
  client.on(Events.Error, (err: Error) => process.stderr.write(`discord error: ${err.message}\n`));

  await client.login(token);
  return {
    stop: async () => {
      await client.destroy();
      host.dispose();
    },
  };
}
