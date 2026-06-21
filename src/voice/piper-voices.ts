// oro-voice/piper-voices.ts — ORO-VOICE: the language → real Piper voice map.
//
// SINGLE SOURCE OF TRUTH for which BCP-47 language code maps to which concrete
// `rhasspy/piper-voices` voice. EVERY entry below was HEAD-verified to EXIST on
// HuggingFace (`huggingface.co/rhasspy/piper-voices/resolve/main/<path>` →
// 302/307, i.e. the LFS object resolves). No fabricated voice ids: a language with
// no real Piper voice is simply ABSENT here, so the engine throws
// PiperUnsupportedLangError and the driver degrades to the Web Speech API.
//
// Verified against rhasspy `voices.json` (pulled 2026-06-20) + per-voice HEAD checks.
//
// `path`   — the .onnx object path under resolve/main (its config is `${path}.json`).
// `espeak` — the espeak-ng voice the config declares (DOCUMENTED fallback; the engine
//            reads the live config's `espeak.voice` at synth time, so this is belt-and-
//            braces, not the source of truth).
// `sizeMB` — approximate on-the-wire .onnx size for the honest download bar.
//
// IMPORTANT — INDIC REALITY (do not "fix" by guessing more ids):
//   Of the 13 requested Indic languages, rhasspy/piper-voices ONLY ships:
//     hi (Hindi), ml (Malayalam), te (Telugu), ur (Urdu).
//   The other 9 — ta, bn, mr, kn, gu, pa, as, or, sa — DO NOT EXIST as Piper voices
//   anywhere on rhasspy (verified 404). They are intentionally omitted here and will
//   degrade to the browser Web Speech API (which, if the user's OS ships that voice,
//   still speaks them — never silent). When/if rhasspy publishes them, add a verified
//   entry here and the engine picks it up with zero code change.

export interface PiperVoiceEntry {
  /** Full rhasspy voice key (e.g. 'hi_IN-pratham-medium'). */
  key: string;
  /** .onnx object path under resolve/main; config is `${path}.json`. */
  path: string;
  /** espeak-ng voice id the config declares (documented fallback). */
  espeak: string;
  /** Approx .onnx size in MB (honest download bar). */
  sizeMB: number;
}

// Keyed by lowercase BCP-47. Both the base subtag (e.g. 'hi') and any meaningful
// region variant (e.g. 'pt-br') may appear; resolvePiperVoice() probes the full tag
// first, then the base subtag.
export const PIPER_VOICE_MAP: Record<string, PiperVoiceEntry> = {
  // ── Indic (the 4 that REALLY exist on rhasspy) ──────────────────────────────
  hi: { key: 'hi_IN-pratham-medium', path: 'hi/hi_IN/pratham/medium/hi_IN-pratham-medium.onnx', espeak: 'hi', sizeMB: 64 },
  ml: { key: 'ml_IN-arjun-medium', path: 'ml/ml_IN/arjun/medium/ml_IN-arjun-medium.onnx', espeak: 'ml', sizeMB: 73 },
  te: { key: 'te_IN-maya-medium', path: 'te/te_IN/maya/medium/te_IN-maya-medium.onnx', espeak: 'te', sizeMB: 60 },
  ur: { key: 'ur_PK-fasih-medium', path: 'ur/ur_PK/fasih/medium/ur_PK-fasih-medium.onnx', espeak: 'ur', sizeMB: 64 },

  // ── Displaced from Kokoro (BUG-V2 fix, DELTA-PIPER-2026-06-20) ───────────────
  // kokoro-js@1.2.1 G2P is English-only, so fr/es/it/pt were removed from
  // KOKORO_LANGS and now render here on real HF-verified rhasspy Piper voices
  // (piper-phonemize does the correct per-language G2P). ja has NO Piper voice on
  // rhasspy (voices.json has zero ja_* entries) so it is intentionally absent and
  // degrades to the OS Japanese Web Speech voice — never silent.
  fr: { key: 'fr_FR-siwis-medium', path: 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx', espeak: 'fr', sizeMB: 60 },
  es: { key: 'es_ES-davefx-medium', path: 'es/es_ES/davefx/medium/es_ES-davefx-medium.onnx', espeak: 'es', sizeMB: 60 },
  it: { key: 'it_IT-paola-medium', path: 'it/it_IT/paola/medium/it_IT-paola-medium.onnx', espeak: 'it', sizeMB: 61 },
  pt: { key: 'pt_BR-faber-medium', path: 'pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx', espeak: 'pt-br', sizeMB: 60 },

  // ── World languages (Kokoro/Supertonic-independent floor) ───────────────────
  ar: { key: 'ar_JO-kareem-medium', path: 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx', espeak: 'ar', sizeMB: 64 },
  bg: { key: 'bg_BG-dimitar-medium', path: 'bg/bg_BG/dimitar/medium/bg_BG-dimitar-medium.onnx', espeak: 'bg', sizeMB: 60 },
  cs: { key: 'cs_CZ-jirka-medium', path: 'cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium.onnx', espeak: 'cs', sizeMB: 64 },
  cy: { key: 'cy_GB-bu_tts-medium', path: 'cy/cy_GB/bu_tts/medium/cy_GB-bu_tts-medium.onnx', espeak: 'cy', sizeMB: 60 },
  da: { key: 'da_DK-talesyntese-medium', path: 'da/da_DK/talesyntese/medium/da_DK-talesyntese-medium.onnx', espeak: 'da', sizeMB: 64 },
  de: { key: 'de_DE-thorsten-medium', path: 'de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx', espeak: 'de', sizeMB: 64 },
  el: { key: 'el_GR-rapunzelina-low', path: 'el/el_GR/rapunzelina/low/el_GR-rapunzelina-low.onnx', espeak: 'el', sizeMB: 28 },
  eu: { key: 'eu_ES-antton-medium', path: 'eu/eu_ES/antton/medium/eu_ES-antton-medium.onnx', espeak: 'eu', sizeMB: 60 },
  fa: { key: 'fa_IR-amir-medium', path: 'fa/fa_IR/amir/medium/fa_IR-amir-medium.onnx', espeak: 'fa', sizeMB: 60 },
  fi: { key: 'fi_FI-harri-medium', path: 'fi/fi_FI/harri/medium/fi_FI-harri-medium.onnx', espeak: 'fi', sizeMB: 64 },
  hu: { key: 'hu_HU-anna-medium', path: 'hu/hu_HU/anna/medium/hu_HU-anna-medium.onnx', espeak: 'hu', sizeMB: 64 },
  id: { key: 'id_ID-news_tts-medium', path: 'id/id_ID/news_tts/medium/id_ID-news_tts-medium.onnx', espeak: 'id', sizeMB: 64 },
  is: { key: 'is_IS-bui-medium', path: 'is/is_IS/bui/medium/is_IS-bui-medium.onnx', espeak: 'is', sizeMB: 60 },
  ka: { key: 'ka_GE-natia-medium', path: 'ka/ka_GE/natia/medium/ka_GE-natia-medium.onnx', espeak: 'ka', sizeMB: 60 },
  kk: { key: 'kk_KZ-issai-high', path: 'kk/kk_KZ/issai/high/kk_KZ-issai-high.onnx', espeak: 'kk', sizeMB: 110 },
  lb: { key: 'lb_LU-marylux-medium', path: 'lb/lb_LU/marylux/medium/lb_LU-marylux-medium.onnx', espeak: 'lb', sizeMB: 60 },
  lv: { key: 'lv_LV-aivars-medium', path: 'lv/lv_LV/aivars/medium/lv_LV-aivars-medium.onnx', espeak: 'lv', sizeMB: 60 },
  ne: { key: 'ne_NP-google-medium', path: 'ne/ne_NP/google/medium/ne_NP-google-medium.onnx', espeak: 'ne', sizeMB: 64 },
  nl: { key: 'nl_NL-mls-medium', path: 'nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx', espeak: 'nl', sizeMB: 64 },
  no: { key: 'no_NO-talesyntese-medium', path: 'no/no_NO/talesyntese/medium/no_NO-talesyntese-medium.onnx', espeak: 'nb', sizeMB: 64 },
  pl: { key: 'pl_PL-gosia-medium', path: 'pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx', espeak: 'pl', sizeMB: 61 },
  ro: { key: 'ro_RO-mihai-medium', path: 'ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx', espeak: 'ro', sizeMB: 64 },
  ru: { key: 'ru_RU-denis-medium', path: 'ru/ru_RU/denis/medium/ru_RU-denis-medium.onnx', espeak: 'ru', sizeMB: 61 },
  sk: { key: 'sk_SK-lili-medium', path: 'sk/sk_SK/lili/medium/sk_SK-lili-medium.onnx', espeak: 'sk', sizeMB: 60 },
  sl: { key: 'sl_SI-artur-medium', path: 'sl/sl_SI/artur/medium/sl_SI-artur-medium.onnx', espeak: 'sl', sizeMB: 64 },
  sq: { key: 'sq_AL-edon-medium', path: 'sq/sq_AL/edon/medium/sq_AL-edon-medium.onnx', espeak: 'sq', sizeMB: 60 },
  sr: { key: 'sr_RS-serbski_institut-medium', path: 'sr/sr_RS/serbski_institut/medium/sr_RS-serbski_institut-medium.onnx', espeak: 'sr', sizeMB: 60 },
  sv: { key: 'sv_SE-nst-medium', path: 'sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx', espeak: 'sv', sizeMB: 64 },
  sw: { key: 'sw_CD-lanfrica-medium', path: 'sw/sw_CD/lanfrica/medium/sw_CD-lanfrica-medium.onnx', espeak: 'sw', sizeMB: 60 },
  tr: { key: 'tr_TR-dfki-medium', path: 'tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx', espeak: 'tr', sizeMB: 61 },
  uk: { key: 'uk_UA-ukrainian_tts-medium', path: 'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx', espeak: 'uk', sizeMB: 64 },
  vi: { key: 'vi_VN-vais1000-medium', path: 'vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx', espeak: 'vi', sizeMB: 64 },
  // Chinese: config declares espeak voice 'cmn' (Mandarin). Kokoro normally owns zh,
  // so this is the floor only if Kokoro is unavailable / a piper: voice is forced.
  zh: { key: 'zh_CN-huayan-medium', path: 'zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx', espeak: 'cmn', sizeMB: 64 },
};

/** All base language codes this Piper engine can actually serve (HF-verified). */
export const PIPER_SUPPORTED_LANGS: ReadonlySet<string> = new Set(Object.keys(PIPER_VOICE_MAP));
