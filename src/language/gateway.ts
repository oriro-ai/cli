// ORIRO CLI — language gateway. The single seam the CLI calls so every agent turn
// is multilingual: the user's typed message → English for the coder; the coder's
// English reply → the user's language for the screen.
//
// English / unconfigured users hit a PURE PASSTHROUGH — no model, no cost, no
// behavior change — so wiring this into the agent path is risk-free for the
// existing (English) flow. Slash-commands (/compact, /new, …) are never translated.
//
// On first non-English use it lazily wires the on-device NLLB-200 translator
// (transformers.js, WASM, $0, OR-LOCAL-ONLY) and awaits the one-time model load so
// the FIRST message already translates. If the model runtime is unavailable the
// layer degrades to passthrough — a turn never breaks.

import { getTerminalLanguage } from './config.js';
import { translateForCoder, translateForUser } from './translate.js';
import { setupNllbTranslator } from './nllb-translator.js';

const isEnglish = (code: string): boolean => !code || code.toLowerCase().startsWith('en');
const isCommand = (text: string): boolean => text.trimStart().startsWith('/');

/** Wire + warm the on-device translator once; await readiness so the first turn translates. */
async function ensureReady(): Promise<void> {
  try {
    await setupNllbTranslator().load();
  } catch {
    /* model runtime unavailable — layer stays in English passthrough */
  }
}

/** User's typed message → English for the coder. Passthrough for English / commands / unconfigured. */
export async function translateIncoming(message: string): Promise<string> {
  const lang = getTerminalLanguage().code;
  if (isEnglish(lang) || !message.trim() || isCommand(message)) return message;
  await ensureReady();
  return translateForCoder(message, lang);
}

/** Coder's English reply → the user's language for the screen. Passthrough for English. */
export async function translateOutgoing(text: string): Promise<string> {
  const lang = getTerminalLanguage().code;
  if (isEnglish(lang) || !text.trim()) return text;
  await ensureReady();
  return translateForUser(text, lang);
}
