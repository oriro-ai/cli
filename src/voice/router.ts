// oro-voice/router.ts — ORO-VOICE engine routing (CODER B / C1)
//
// PURE FUNCTION. No I/O, no network, no side effects. Given a BCP-47 / ISO
// language code, decide which on-device TTS engine renders it.
//
// Priority (NO cascading fallback — a code maps to exactly ONE engine):
//   1. KOKORO — highest-quality streaming engine, 10 flagship langs (incl. Hindi).
//   2. PIPER  — the real multilingual floor: runtime-loads a rhasspy Piper VITS
//               voice per language (piper-engine.ts), covering ~39 languages incl.
//               the Indic langs rhasspy ships (hi via Kokoro; ml/te/ur via Piper).
//
// ════════════════════════════════════════════════════════════════════════════
// DELTA-PIPER-2026-06-20 — Supertonic + Svara are DEAD; do NOT route to them.
// ════════════════════════════════════════════════════════════════════════════
//   • Supertonic (`@supertone/supertonic-web`) never existed on npm and its engine
//     here is a stub that throws `supertonic_helper_pending_vendor`. Routing a real
//     language to it produced no audio (only degraded). Every language Supertonic
//     used to "own" is now served by the REAL runtime-loading Piper engine, so
//     routeTTS NEVER returns 'supertonic'. The 'supertonic' member stays in the
//     TTSEngine union (Coder C's shared contract) and the stub class remains, but it
//     is unreachable via routing.
//   • Svara (HD Indic) was dropped (6.6B params = browser-impossible) and never had
//     assets. The 13 Indic languages now route to Kokoro (hi) or Piper (the rest);
//     the 9 Indic langs rhasspy lacks (ta/bn/mr/kn/gu/pa/as/or/sa) fall through Piper
//     → PiperUnsupportedLangError → the driver's Web Speech tier (never silent).
//
// Shared-lang rule: if a language is in the Kokoro set it wins (checked first).
//
// Engine errors are NOT silently swallowed here. This function only ROUTES. If the
// chosen engine fails at synth time, tts-worker.ts surfaces the error explicitly,
// and the main-thread driver degrades to the Web Speech API (the never-silent tier).

import type { TTSEngine } from './types.js';

// Flagship Kokoro languages (kokoro-js / Kokoro-82M-v1.0-ONNX voices).
// Checked FIRST — wins every shared-language tie. Hindi (hi) has a native Kokoro
// voice, so it stays on Kokoro; the other Indic langs route to Piper.
//
// DELTA-KO-FIX-2026-06-20 — Korean (ko) is intentionally NOT here. The Kokoro-82M
// v1.0 pack ships NO Korean voice (verified: kokoroDefaultVoiceForLang('ko') would
// fall back to the English 'af_heart' → Korean text spoken in an ENGLISH voice).
// rhasspy/piper-voices also ships NO Korean voice (HEAD 404, voices.json has no
// ko_* entry). So `ko` now routes to Piper, Piper finds no real voice and throws
// PiperUnsupportedLangError, and the driver degrades to the OS Korean Web Speech
// voice — never an English voice, never silent. Add `ko` back here ONLY if a real
// Korean Kokoro voice ships (and add a ko entry to PIPER_VOICE_MAP if Piper ships one).
// NOTE (DELTA-PIPER-2026-06-20): hi + zh REMOVED from Kokoro. The vendored
// kokoro-js@1.2.1 phonemizer is English-only, so Devanagari/Hanzi sent to Kokoro
// produced no usable audio. Both now route to PIPER, where REAL voices exist and
// are HF-verified (hi → hi_IN-pratham, zh → zh_CN-huayan; piper-phonemize does the
// correct G2P).
// BUG-V2 FIX (DELTA-PIPER-2026-06-20): fr/es/it/pt/ja REMOVED from Kokoro for the
// same reason — kokoro-js@1.2.1 G2P is English-only, so French/Spanish/Italian/
// Portuguese/Japanese text routed to Kokoro phonemized as English → garbled/silent
// audio. fr/es/it/pt now route to PIPER, where real HF-verified rhasspy voices exist
// (fr → fr_FR-siwis, es → es_ES-davefx, it → it_IT-paola, pt → pt_BR-faber). ja has
// NO Piper voice anywhere on rhasspy (voices.json has zero ja_* entries), so it is
// left OUT of both sets and degrades to the OS Japanese Web Speech voice — never
// silent, never an English voice. KOKORO_LANGS is now ONLY the langs kokoro-js can
// actually phonemize: English (en) and British English (en-gb).
export const KOKORO_LANGS = new Set<string>([
  'en', 'en-gb',
]);

// RETAINED FOR REFERENCE ONLY — the languages Supertonic was *intended* to cover.
// These now route to PIPER (the real engine), NOT Supertonic. Kept exported so any
// consumer that imported the set still resolves, but routeTTS no longer reads it.
export const SUPERTONIC_LANGS = new Set<string>([
  'ar', 'bg', 'hr', 'cs', 'da', 'nl', 'de', 'et', 'fi', 'el', 'hu',
  'id', 'lv', 'lt', 'pl', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'vi',
]);

/**
 * Normalize a language tag for lookup.
 * - lowercases (so "EN-GB" === "en-gb")
 * - keeps the full tag for an exact-match probe (lets "en-gb" route distinctly)
 * - also derives the base subtag ("pt-BR" → "pt") for the broad probe
 */
function normalize(langCode: string): { full: string; base: string } {
  const full = (langCode || '').trim().toLowerCase();
  const base = full.split('-')[0] ?? full;
  return { full, base };
}

/**
 * routeTTS — decide the engine for a language code.
 *
 * Kokoro is probed first on BOTH the full tag (so "en-gb" matches its own British
 * voice) and the base subtag (so "pt-BR" still routes to Kokoro 'pt'). EVERYTHING
 * else routes to Piper — the real runtime-loading multilingual engine. Piper itself
 * decides at init whether a real rhasspy voice exists for the language; if not it
 * throws and the driver degrades to Web Speech (handled in tts-worker.ts, not here).
 *
 * @param langCode BCP-47 / ISO code, any case, e.g. "en", "EN-GB", "pt-BR", "ta".
 * @returns the engine name: 'kokoro' | 'piper' (never 'supertonic').
 */
export function routeTTS(langCode: string): TTSEngine {
  const { full, base } = normalize(langCode);

  // 1. KOKORO first — exact tag OR base subtag. Guarantees shared-lang → kokoro.
  if (KOKORO_LANGS.has(full) || KOKORO_LANGS.has(base)) {
    return 'kokoro';
  }

  // 2. PIPER — the universal floor for every non-Kokoro language (Indic + world).
  //    Supertonic is never selected (dead stub). Unsupported-by-Piper langs degrade
  //    to Web Speech inside the driver, not via a different route here.
  return 'piper';
}
