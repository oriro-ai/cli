// ORIRO channels — WhatsApp, built on Baileys (multi-device Web protocol). UNLIKE Telegram/Discord
// there is NO bot token: it pairs to a REAL WhatsApp account via a QR scan, and carries a ToS / ban
// risk — so it is gated behind an explicit `--accept-risk` opt-in in the command layer. Baileys +
// qrcode-terminal are OPTIONAL deps, lazy-imported; absence is handled gracefully. Zero OpenClaw footprint.
import { join } from "node:path";
import { oriroDir } from "../config/paths.js";
import { OriroChannelHost } from "./host.js";
import type { RunningChannel } from "./telegram.js";

/** Where Baileys persists the linked-device session (so re-pairing isn't needed each start). */
export function whatsappAuthDir(): string {
  return join(oriroDir(), "whatsapp-auth");
}

type QrCode = { generate: (text: string, opts: { small: boolean }) => void };

/** Start WhatsApp: shows a QR to scan (WhatsApp → Linked devices), then each inbound text → ORIRO
 *  → reply. Throws a friendly message if the optional Baileys deps are not installed.
 *  Baileys' types churn between releases, so the socket is intentionally loosely typed. */
export async function startWhatsApp(): Promise<RunningChannel> {
  let baileys: { makeWASocket: (cfg: unknown) => WaSocket; useMultiFileAuthState: (dir: string) => Promise<{ state: unknown; saveCreds: () => Promise<void> }> };
  let qrcode: QrCode;
  try {
    baileys = (await import("@whiskeysockets/baileys")) as unknown as typeof baileys;
    qrcode = ((await import("qrcode-terminal")) as { default: QrCode }).default;
  } catch {
    throw new Error("WhatsApp needs Baileys — install it:\n  npm i @whiskeysockets/baileys qrcode-terminal");
  }

  const { state, saveCreds } = await baileys.useMultiFileAuthState(whatsappAuthDir());
  const host = new OriroChannelHost();
  const sock = baileys.makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (u: WaConnectionUpdate) => {
    if (u.qr) {
      process.stdout.write("\nScan this QR in WhatsApp → Settings → Linked devices:\n");
      qrcode.generate(u.qr, { small: true });
    }
    if (u.connection === "open") process.stdout.write("WhatsApp linked ✓ — message the linked number to talk to ORIRO.\n");
  });
  sock.ev.on("messages.upsert", async (m: WaUpsert) => {
    if (m.type !== "notify") return;
    for (const msg of m.messages ?? []) {
      if (msg.key?.fromMe) continue;
      const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text;
      const jid = msg.key?.remoteJid;
      if (!text || !jid) continue;
      const reply = await host.dispatch(text);
      await sock.sendMessage(jid, { text: reply });
    }
  });

  return {
    stop: async () => {
      try {
        await sock.logout();
      } catch {
        /* already disconnected */
      }
      host.dispose();
    },
  };
}

// Minimal structural types for the slices of Baileys we touch (avoids depending on its churning types).
interface WaSocket {
  // Baileys' event payloads are loosely typed here on purpose (its types churn between releases).
  ev: { on: (event: string, cb: (arg: any) => void) => void };
  sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
  logout: () => Promise<void>;
}
interface WaConnectionUpdate {
  qr?: string;
  connection?: string;
}
interface WaUpsert {
  type: string;
  messages?: Array<{
    key?: { fromMe?: boolean; remoteJid?: string };
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
  }>;
}
