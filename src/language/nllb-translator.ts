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
// Full FLORES-200 map for every ORIRO UI language NLLB-200 supports (97 of the 100).
// The 3 NLLB-200 does NOT cover — Latin (la), Breton (br), Hawaiian (haw) — fall
// through to English passthrough (toNllb → ENG); honest model limitation, never breaks.
const NLLB_CODE: Record<string, string> = {
  en: 'eng_Latn', zh: 'zho_Hans', de: 'deu_Latn', es: 'spa_Latn', ru: 'rus_Cyrl',
  ko: 'kor_Hang', fr: 'fra_Latn', ja: 'jpn_Jpan', pt: 'por_Latn', tr: 'tur_Latn',
  pl: 'pol_Latn', ca: 'cat_Latn', nl: 'nld_Latn', ar: 'arb_Arab', sv: 'swe_Latn',
  it: 'ita_Latn', id: 'ind_Latn', hi: 'hin_Deva', fi: 'fin_Latn', vi: 'vie_Latn',
  he: 'heb_Hebr', uk: 'ukr_Cyrl', el: 'ell_Grek', ms: 'zsm_Latn', cs: 'ces_Latn',
  ro: 'ron_Latn', da: 'dan_Latn', hu: 'hun_Latn', ta: 'tam_Taml', no: 'nob_Latn',
  th: 'tha_Thai', ur: 'urd_Arab', hr: 'hrv_Latn', bg: 'bul_Cyrl', lt: 'lit_Latn',
  mi: 'mri_Latn', ml: 'mal_Mlym', cy: 'cym_Latn', sk: 'slk_Latn', te: 'tel_Telu',
  fa: 'pes_Arab', lv: 'lvs_Latn', bn: 'ben_Beng', sr: 'srp_Cyrl', az: 'azj_Latn',
  sl: 'slv_Latn', kn: 'kan_Knda', et: 'est_Latn', mk: 'mkd_Cyrl', eu: 'eus_Latn',
  is: 'isl_Latn', hy: 'hye_Armn', ne: 'npi_Deva', mn: 'khk_Cyrl', bs: 'bos_Latn',
  kk: 'kaz_Cyrl', sq: 'als_Latn', sw: 'swh_Latn', gl: 'glg_Latn', mr: 'mar_Deva',
  pa: 'pan_Guru', si: 'sin_Sinh', km: 'khm_Khmr', sn: 'sna_Latn', yo: 'yor_Latn',
  so: 'som_Latn', af: 'afr_Latn', oc: 'oci_Latn', ka: 'kat_Geor', be: 'bel_Cyrl',
  tg: 'tgk_Cyrl', sd: 'snd_Arab', gu: 'guj_Gujr', am: 'amh_Ethi', yi: 'ydd_Hebr',
  lo: 'lao_Laoo', uz: 'uzn_Latn', fo: 'fao_Latn', ht: 'hat_Latn', ps: 'pbt_Arab',
  tk: 'tuk_Latn', nn: 'nno_Latn', mt: 'mlt_Latn', sa: 'san_Deva', lb: 'ltz_Latn',
  my: 'mya_Mymr', bo: 'bod_Tibt', tl: 'tgl_Latn', mg: 'plt_Latn', as: 'asm_Beng',
  tt: 'tat_Cyrl', ln: 'lin_Latn', ha: 'hau_Latn', ba: 'bak_Cyrl', jw: 'jav_Latn',
  su: 'sun_Latn', yue: 'yue_Hant',
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
