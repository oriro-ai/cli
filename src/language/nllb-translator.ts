// ORIRO CLI — on-device translator (Meta NLLB-200, via @huggingface/transformers).
//
// Implements the Translator contract from translate.ts: any of the 99 languages
// → English for the AI, and English replies → the user's language. NLLB-200 is
// MIT/CC, runs fully on-device (transformers.js + ONNX), $0, nothing leaves the
// machine — same Cardinal posture as ORO-VOICE. Model weights download once on
// first use and cache under ~/.oriro/voice-models/.
//
// Whisper's `translate` task already covers VOICE → English (X→English only);
// NLLB covers TYPED text in BOTH directions (and any non-English coder target).
//
// PROVEN-IN-CODE; the live run is gated on the Node model runtime being present
// (`@huggingface/transformers` + an ONNX backend) — see setupNllbTranslator().

import { registerTranslator, type Translator } from './translate.js';

// ISO-639-1 → NLLB FLORES-200 code (script-qualified). Covers the common set;
// anything unmapped falls back to English pass-through (never breaks a turn).
const NLLB_CODE: Record<string, string> = {
  en: 'eng_Latn', hi: 'hin_Deva', es: 'spa_Latn', fr: 'fra_Latn', de: 'deu_Latn',
  zh: 'zho_Hans', ar: 'arb_Arab', ru: 'rus_Cyrl', pt: 'por_Latn', ja: 'jpn_Jpan',
  ko: 'kor_Hang', it: 'ita_Latn', nl: 'nld_Latn', pl: 'pol_Latn', tr: 'tur_Latn',
  vi: 'vie_Latn', id: 'ind_Latn', th: 'tha_Thai', uk: 'ukr_Cyrl', fa: 'pes_Arab',
  ur: 'urd_Arab', bn: 'ben_Beng', ta: 'tam_Taml', te: 'tel_Telu', mr: 'mar_Deva',
  gu: 'guj_Gujr', kn: 'kan_Knda', ml: 'mal_Mlym', pa: 'pan_Guru', he: 'heb_Hebr',
  el: 'ell_Grek', cs: 'ces_Latn', sv: 'swe_Latn', ro: 'ron_Latn', hu: 'hun_Latn',
  fi: 'fin_Latn', da: 'dan_Latn', no: 'nob_Latn', sw: 'swh_Latn', ms: 'zsm_Latn',
};

const ENG = 'eng_Latn';
const toNllb = (iso: string): string => NLLB_CODE[(iso || '').toLowerCase()] ?? ENG;

// transformers.js translation pipeline — typed loosely so this file compiles
// without the dep installed (the dep is added when the model runtime is enabled).
type TranslationPipeline = (
  text: string,
  opts: { src_lang: string; tgt_lang: string },
) => Promise<Array<{ translation_text: string }>>;

class NllbTranslator implements Translator {
  private pipe: TranslationPipeline | null = null;
  private loading: Promise<void> | null = null;

  ready(): boolean {
    return this.pipe !== null;
  }

  /** Lazy-load NLLB-200 once (first-use download + cache). Idempotent. */
  async load(modelId = 'Xenova/nllb-200-distilled-600M'): Promise<void> {
    if (this.pipe) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      // @ts-ignore — dep is added when the on-device model runtime is enabled
      const { pipeline } = await import('@huggingface/transformers');
      this.pipe = (await pipeline('translation', modelId)) as unknown as TranslationPipeline;
    })();
    return this.loading;
  }

  private async run(text: string, src: string, tgt: string): Promise<string> {
    if (!this.pipe) await this.load();
    if (!this.pipe) return text; // runtime unavailable — pass through
    const out = await this.pipe(text, { src_lang: src, tgt_lang: tgt });
    return out?.[0]?.translation_text?.trim() || text;
  }

  toEnglish(text: string, fromLang: string): Promise<string> {
    return this.run(text, toNllb(fromLang), ENG);
  }

  fromEnglish(english: string, toLang: string): Promise<string> {
    return this.run(english, ENG, toNllb(toLang));
  }
}

let instance: NllbTranslator | null = null;

/**
 * Wire the on-device NLLB translator into the language layer. Call once at CLI
 * startup when the user's language ≠ English. Pre-loading is optional — the first
 * translate triggers the (cached) model download. If `@huggingface/transformers`
 * isn't installed (model runtime not enabled), this throws on load and the layer
 * stays in English pass-through, so the CLI never breaks.
 */
export function setupNllbTranslator(opts?: { preload?: boolean }): NllbTranslator {
  if (!instance) {
    instance = new NllbTranslator();
    registerTranslator(instance);
  }
  if (opts?.preload) void instance.load();
  return instance;
}
