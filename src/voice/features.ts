// ORO-VOICE — feature flags (CODER C owns).
//
// FIVE on-device voice capabilities, each behind a flag that DEFAULTS OFF.
// PARITY LAW: with every flag false, the voice loop (index.ts + stt-worker.ts)
// behaves byte-for-byte as it did before these seams existed. Nothing here is
// wired into the app shell — the flip is held for Vinay / a real browser run
// with a microphone. Flipping a flag is a one-line edit in this file.
//
// OR-LOCAL-ONLY: pure config + pure-text transforms. No network, no DOM, no
// credentials anywhere in the feature code these flags gate.
//
//   (a) turnTaking      — barge-in (interrupt the assistant mid-speech) + a
//                         short end-of-turn debounce in the STT silence logic.
//   (b) phonetic        — pre-TTS transform mapping brand/domain words to
//                         phonetic spellings so TTS pronounces them correctly.
//   (c) vocabBias       — post-transcription correction of common domain-term
//                         mis-hearings (whisper-base can't take an initial_prompt
//                         via transformers.js, so we correct the text instead).
//   (d) paralinguistic  — pre-TTS parser for inline tags ([chuckle], [sigh],
//                         [pause], *emphasis*): strip cleanly, map to prosody
//                         where the engine supports it.
//   (e) sameLanguageReply — reply in the user's detected language. This already
//                         works today via pendingLang + router.routeTTS, so it
//                         is the ONE flag that defaults ON (it changes nothing —
//                         it documents + guards existing default behaviour).

export interface OroVoiceFeatures {
  /** (a) Barge-in + end-of-turn debounce. OFF by default — flip held. */
  turnTaking: boolean;
  /** (b) Phonetic pronunciation transform (pre-TTS). OFF by default. */
  phonetic: boolean;
  /** (c) Whisper vocab biasing via post-transcription correction. OFF by default. */
  vocabBias: boolean;
  /** (d) Paralinguistic tag parsing/stripping (pre-TTS). OFF by default. */
  paralinguistic: boolean;
  /**
   * (e) Same-language reply. ON by default ONLY because it is already the live
   * default behaviour (index.ts routes the reply in the detected language).
   * Turning it OFF forces replies to a single fixed language ('en').
   */
  sameLanguageReply: boolean;
}

// THE FLAGS. Defaults: all OFF except sameLanguageReply (already-live behaviour).
// Do NOT flip these here as part of this build — the flip is Vinay's / a real run.
export const VOICE_FEATURES: OroVoiceFeatures = {
  turnTaking: false,
  phonetic: false,
  vocabBias: false,
  paralinguistic: false,
  sameLanguageReply: true, // already the live default — see note above
};

// ── (a) Turn-taking tunables ──────────────────────────────────────────────────
// Used only when VOICE_FEATURES.turnTaking is true.
export interface TurnTakingConfig {
  /**
   * Extra end-of-turn debounce (ms) ADDED on top of the worker's existing 500 ms
   * silence window before an utterance is closed. 0 = no extra debounce, i.e.
   * exact legacy timing. Keep small — this is a comfort pause, not a latency tax.
   */
  endOfTurnDebounceMs: number;
  /**
   * RMS energy threshold (0..1 on Float32 PCM) above which mic input during
   * playback counts as the user starting to speak (barge-in candidate).
   */
  bargeInRmsThreshold: number;
  /**
   * How long (ms) sustained above-threshold input must persist before we treat
   * it as a real interruption and abort TTS. Filters coughs / transient noise.
   */
  bargeInSustainMs: number;
}

export const TURN_TAKING: TurnTakingConfig = {
  endOfTurnDebounceMs: 250,
  bargeInRmsThreshold: 0.06,
  bargeInSustainMs: 350,
};

// ── (b) Phonetic pronunciation map ─────────────────────────────────────────────
// Brand/domain words → a phonetic spelling TTS pronounces correctly. Extensible:
// add entries here. Matched case-insensitively on whole words only (see
// applyPhonetic). Values are deliberately hyphenated respellings, NOT IPA, because
// the on-device engines (Kokoro/Piper/Supertonic) read grapheme input, not IPA.
export const PHONETIC_MAP: Record<string, string> = {
  ORIRO: 'oh-REE-roh',
  Avila: 'AH-vee-lah',
  Gauss: 'gowss',
  NARVO: 'NAR-voh',
  // extend with new brand/domain terms as they appear:
  Kokoro: 'koh-KOH-roh',
  Piper: 'PY-per',
  Supertonic: 'SOO-per-TON-ik',
};

/**
 * (b) Replace brand/domain words with phonetic respellings. Whole-word,
 * case-insensitive. Pure text in → text out. No-op on empty/whitespace.
 * The CALLER decides whether to invoke this (gated on VOICE_FEATURES.phonetic).
 */
export function applyPhonetic(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [word, phon] of Object.entries(PHONETIC_MAP)) {
    // \b word boundaries; escape nothing (keys are plain ASCII words).
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    out = out.replace(re, phon);
  }
  return out;
}

// ── (c) Vocab-bias correction map ──────────────────────────────────────────────
// Common whisper-base mis-hearings of domain terms → the correct term. Keys are
// matched case-insensitively as whole phrases; the value is substituted verbatim.
// whisper-base via transformers.js does not accept an initial_prompt, so this is
// the post-transcription correction pass that stands in for vocab biasing.
export const VOCAB_CORRECTIONS: Record<string, string> = {
  'or iro': 'ORIRO',
  'oriro': 'ORIRO',
  'oh riro': 'ORIRO',
  'aurero': 'ORIRO',
  'avilla': 'Avila',
  'aveela': 'Avila',
  'gauss': 'Gauss',
  'gowse': 'Gauss',
  'narvo': 'NARVO',
  'nar vo': 'NARVO',
};

/**
 * (c) Correct common domain-term mis-hearings in a transcript. Whole-phrase,
 * case-insensitive; longer keys applied first so multi-word phrases win over
 * their single-word substrings. Pure text in → text out. The CALLER decides
 * whether to invoke this (gated on VOICE_FEATURES.vocabBias).
 */
export function applyVocabBias(text: string): string {
  if (!text) return text;
  let out = text;
  // Longest keys first → "or iro" wins before a lone "iro"-style fragment.
  const keys = Object.keys(VOCAB_CORRECTIONS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const phrase = VOCAB_CORRECTIONS[key];
    if (phrase === undefined) continue;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    out = out.replace(re, phrase);
  }
  return out;
}

// ── (d) Paralinguistic tag handling ────────────────────────────────────────────
// Inline tags the model may emit. At minimum we STRIP them so they are never
// spoken literally. Where the engine supports prosody, [pause] maps to a short
// silence marker the synth layer can honour; *emphasis* unwraps to the bare word
// (engines render emphasis from punctuation/context, not asterisks).
//
// We expose BOTH a "clean for speech" pass (always safe — strips tags) and the
// raw tag set so a future prosody-aware engine seam can consume them.
export const PARALINGUISTIC_TAGS = ['chuckle', 'sigh', 'pause', 'laugh', 'breath'] as const;
export type ParalinguisticTag = (typeof PARALINGUISTIC_TAGS)[number];

export interface ParalinguisticResult {
  /** Text safe to hand to TTS — all tags removed, *emphasis* unwrapped. */
  text: string;
  /** Tags that were present, in order, for a prosody-aware engine to use later. */
  tags: ParalinguisticTag[];
}

/**
 * (d) Parse inline paralinguistic tags. Removes [chuckle]/[sigh]/[pause]/etc so
 * they are NEVER spoken literally, unwraps *emphasis* to the bare word, and
 * returns the tags found (for an engine that can map them to prosody). For
 * [pause] we insert an ellipsis "… " which every TTS engine renders as a natural
 * short pause (a real prosody hook without engine-specific markup). Pure text in.
 * The CALLER decides whether to invoke this (gated on VOICE_FEATURES.paralinguistic).
 */
export function parseParalinguistic(text: string): ParalinguisticResult {
  if (!text) return { text, tags: [] };
  const tags: ParalinguisticTag[] = [];

  // Capture known tags (any case), recording them, then remove from the spoken text.
  let out = text.replace(/\[([a-zA-Z]+)\]/g, (_match, raw: string) => {
    const tag = raw.toLowerCase() as ParalinguisticTag;
    if ((PARALINGUISTIC_TAGS as readonly string[]).includes(tag)) {
      tags.push(tag);
      // [pause] → an ellipsis so the engine renders a natural pause; others vanish.
      return tag === 'pause' ? '… ' : '';
    }
    // Unknown bracket tag → strip it too (never speak "[foo]" aloud).
    return '';
  });

  // *emphasis* → bare word (engines don't speak asterisks; emphasis comes from
  // punctuation/intonation). Non-greedy, single-line.
  out = out.replace(/\*([^*]+)\*/g, '$1');

  // Collapse any double spaces left by removed tags; trim edges.
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();

  return { text: out, tags };
}

/**
 * Convenience: the full pre-TTS text pipeline, each stage independently gated by
 * VOICE_FEATURES. Used by the synth path. With all flags off this returns `text`
 * unchanged (parity). Order: paralinguistic strip → phonetic respell, so a brand
 * word freed from *emphasis* still gets its phonetic spelling.
 */
export function preTtsTransform(text: string): string {
  let out = text;
  if (VOICE_FEATURES.paralinguistic) out = parseParalinguistic(out).text;
  if (VOICE_FEATURES.phonetic) out = applyPhonetic(out);
  return out;
}
