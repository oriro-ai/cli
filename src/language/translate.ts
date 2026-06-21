// ORIRO CLI — the translate layer (the "99 languages in, English to the AI" seam).
//
// The contract mirrors ORO-VOICE's STTResult (map §7): the user reads/types/speaks
// in their language; the AI/coder always receives ENGLISH. Replies come back in
// English and are rendered to the user's language for the screen / speak-back.
//
//   user input (their language) ──translateForCoder──▶ ENGLISH ──▶ AI / coder
//   AI reply  (English)         ──translateForUser───▶ their language ──▶ screen / voice
//
// English path needs no model (pass-through). Any other language uses an on-device
// translator (Meta NLLB-200 for typed text; Whisper `translate` task for voice) —
// registered via registerTranslator(). $0, on-device, nothing leaves the machine.
// Until the on-device model is wired, both functions pass the text through unchanged
// so the flow is always functional (degrades to "as typed", never breaks).

export interface OriroInput {
  /** What the user wrote/spoke — shown on screen in their language. */
  text: string;
  /** The same content in English — delivered to the AI/coder. */
  english: string;
  /** ISO-639-1 source language. */
  language: string;
}

/** An on-device translator. NLLB-200 (typed) or Whisper-translate (voice) implement this. */
export interface Translator {
  toEnglish(text: string, fromLang: string): Promise<string>;
  fromEnglish(english: string, toLang: string): Promise<string>;
  /** True once the model weights are present locally (lazy first-use download). */
  ready(): boolean;
}

let active: Translator | null = null;

/** Wire the on-device translator (NLLB-200 / Whisper). Done by the voice/model port. */
export function registerTranslator(t: Translator): void {
  active = t;
}

export function hasTranslator(): boolean {
  return active != null && active.ready();
}

const isEnglish = (code: string): boolean => !code || code.toLowerCase().startsWith('en');

/** User's language → English, for the AI/coder. Pass-through for English / no model. */
export async function translateForCoder(text: string, fromLang: string): Promise<string> {
  if (isEnglish(fromLang) || !text.trim()) return text;
  if (active && active.ready()) {
    try {
      return await active.toEnglish(text, fromLang);
    } catch {
      /* fall through to pass-through — never break the user's turn */
    }
  }
  return text;
}

/** English reply → user's language, for the screen / speak-back. Pass-through for English. */
export async function translateForUser(english: string, toLang: string): Promise<string> {
  if (isEnglish(toLang) || !english.trim()) return english;
  if (active && active.ready()) {
    try {
      return await active.fromEnglish(english, toLang);
    } catch {
      /* fall through */
    }
  }
  return english;
}

/** Build the {text, english, language} the coder seam consumes from a typed line. */
export async function inputForCoder(rawText: string, language: string): Promise<OriroInput> {
  const english = await translateForCoder(rawText, language);
  return { text: rawText, english, language };
}
