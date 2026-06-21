// ORIRO CLI — language registry (the 99 Whisper-base auto-detect languages).
//
// One pick at onboarding becomes the terminal's language. The user reads/types/
// speaks in this language; the AI/coder always receives ENGLISH (translate layer).
// `neuralVoice` marks the 42 languages with a built-in on-device neural TTS voice
// for speak-back (Kokoro EN + 41 Piper, per the oro-voice piper-voices map); the
// rest speak back via the device's system voice. STT is universal (one Whisper).
//
// Ported verbatim from ORO-VOICE-CLI-PACKAGE-MAP.md §8 (source of truth: C2's
// apps/web/src/lib/oro-voice). OR-LOCAL-ONLY — pure data, no network.

export interface OriroLanguage {
  /** Display name (English endonym label). */
  name: string;
  /** ISO-639-1 (or Whisper code) — routed to STT/TTS/translate. */
  code: string;
  /** True when a built-in on-device neural voice exists for speak-back. */
  neuralVoice: boolean;
}

export const LANGUAGES: OriroLanguage[] = [
  { name: 'English', code: 'en', neuralVoice: true },
  { name: 'Chinese', code: 'zh', neuralVoice: true },
  { name: 'German', code: 'de', neuralVoice: true },
  { name: 'Spanish', code: 'es', neuralVoice: true },
  { name: 'Russian', code: 'ru', neuralVoice: true },
  { name: 'Korean', code: 'ko', neuralVoice: false },
  { name: 'French', code: 'fr', neuralVoice: true },
  { name: 'Japanese', code: 'ja', neuralVoice: false },
  { name: 'Portuguese', code: 'pt', neuralVoice: true },
  { name: 'Turkish', code: 'tr', neuralVoice: true },
  { name: 'Polish', code: 'pl', neuralVoice: true },
  { name: 'Catalan', code: 'ca', neuralVoice: false },
  { name: 'Dutch', code: 'nl', neuralVoice: true },
  { name: 'Arabic', code: 'ar', neuralVoice: true },
  { name: 'Swedish', code: 'sv', neuralVoice: true },
  { name: 'Italian', code: 'it', neuralVoice: true },
  { name: 'Indonesian', code: 'id', neuralVoice: true },
  { name: 'Hindi', code: 'hi', neuralVoice: true },
  { name: 'Finnish', code: 'fi', neuralVoice: true },
  { name: 'Vietnamese', code: 'vi', neuralVoice: true },
  { name: 'Hebrew', code: 'he', neuralVoice: false },
  { name: 'Ukrainian', code: 'uk', neuralVoice: true },
  { name: 'Greek', code: 'el', neuralVoice: true },
  { name: 'Malay', code: 'ms', neuralVoice: false },
  { name: 'Czech', code: 'cs', neuralVoice: true },
  { name: 'Romanian', code: 'ro', neuralVoice: true },
  { name: 'Danish', code: 'da', neuralVoice: true },
  { name: 'Hungarian', code: 'hu', neuralVoice: true },
  { name: 'Tamil', code: 'ta', neuralVoice: false },
  { name: 'Norwegian', code: 'no', neuralVoice: true },
  { name: 'Thai', code: 'th', neuralVoice: false },
  { name: 'Urdu', code: 'ur', neuralVoice: true },
  { name: 'Croatian', code: 'hr', neuralVoice: true },
  { name: 'Bulgarian', code: 'bg', neuralVoice: true },
  { name: 'Lithuanian', code: 'lt', neuralVoice: false },
  { name: 'Latin', code: 'la', neuralVoice: false },
  { name: 'Maori', code: 'mi', neuralVoice: false },
  { name: 'Malayalam', code: 'ml', neuralVoice: true },
  { name: 'Welsh', code: 'cy', neuralVoice: true },
  { name: 'Slovak', code: 'sk', neuralVoice: true },
  { name: 'Telugu', code: 'te', neuralVoice: true },
  { name: 'Persian', code: 'fa', neuralVoice: true },
  { name: 'Latvian', code: 'lv', neuralVoice: true },
  { name: 'Bengali', code: 'bn', neuralVoice: false },
  { name: 'Serbian', code: 'sr', neuralVoice: true },
  { name: 'Azerbaijani', code: 'az', neuralVoice: false },
  { name: 'Slovenian', code: 'sl', neuralVoice: true },
  { name: 'Kannada', code: 'kn', neuralVoice: false },
  { name: 'Estonian', code: 'et', neuralVoice: false },
  { name: 'Macedonian', code: 'mk', neuralVoice: false },
  { name: 'Breton', code: 'br', neuralVoice: false },
  { name: 'Basque', code: 'eu', neuralVoice: true },
  { name: 'Icelandic', code: 'is', neuralVoice: true },
  { name: 'Armenian', code: 'hy', neuralVoice: false },
  { name: 'Nepali', code: 'ne', neuralVoice: true },
  { name: 'Mongolian', code: 'mn', neuralVoice: false },
  { name: 'Bosnian', code: 'bs', neuralVoice: false },
  { name: 'Kazakh', code: 'kk', neuralVoice: true },
  { name: 'Albanian', code: 'sq', neuralVoice: true },
  { name: 'Swahili', code: 'sw', neuralVoice: true },
  { name: 'Galician', code: 'gl', neuralVoice: false },
  { name: 'Marathi', code: 'mr', neuralVoice: false },
  { name: 'Punjabi', code: 'pa', neuralVoice: false },
  { name: 'Sinhala', code: 'si', neuralVoice: false },
  { name: 'Khmer', code: 'km', neuralVoice: false },
  { name: 'Shona', code: 'sn', neuralVoice: false },
  { name: 'Yoruba', code: 'yo', neuralVoice: false },
  { name: 'Somali', code: 'so', neuralVoice: false },
  { name: 'Afrikaans', code: 'af', neuralVoice: false },
  { name: 'Occitan', code: 'oc', neuralVoice: false },
  { name: 'Georgian', code: 'ka', neuralVoice: true },
  { name: 'Belarusian', code: 'be', neuralVoice: false },
  { name: 'Tajik', code: 'tg', neuralVoice: false },
  { name: 'Sindhi', code: 'sd', neuralVoice: false },
  { name: 'Gujarati', code: 'gu', neuralVoice: false },
  { name: 'Amharic', code: 'am', neuralVoice: false },
  { name: 'Yiddish', code: 'yi', neuralVoice: false },
  { name: 'Lao', code: 'lo', neuralVoice: false },
  { name: 'Uzbek', code: 'uz', neuralVoice: false },
  { name: 'Faroese', code: 'fo', neuralVoice: false },
  { name: 'Haitian Creole', code: 'ht', neuralVoice: false },
  { name: 'Pashto', code: 'ps', neuralVoice: false },
  { name: 'Turkmen', code: 'tk', neuralVoice: false },
  { name: 'Norwegian Nynorsk', code: 'nn', neuralVoice: false },
  { name: 'Maltese', code: 'mt', neuralVoice: false },
  { name: 'Sanskrit', code: 'sa', neuralVoice: false },
  { name: 'Luxembourgish', code: 'lb', neuralVoice: true },
  { name: 'Burmese', code: 'my', neuralVoice: false },
  { name: 'Tibetan', code: 'bo', neuralVoice: false },
  { name: 'Tagalog', code: 'tl', neuralVoice: false },
  { name: 'Malagasy', code: 'mg', neuralVoice: false },
  { name: 'Assamese', code: 'as', neuralVoice: false },
  { name: 'Tatar', code: 'tt', neuralVoice: false },
  { name: 'Hawaiian', code: 'haw', neuralVoice: false },
  { name: 'Lingala', code: 'ln', neuralVoice: false },
  { name: 'Hausa', code: 'ha', neuralVoice: false },
  { name: 'Bashkir', code: 'ba', neuralVoice: false },
  { name: 'Javanese', code: 'jw', neuralVoice: false },
  { name: 'Sundanese', code: 'su', neuralVoice: false },
  { name: 'Cantonese', code: 'yue', neuralVoice: false },
];

export const ENGLISH: OriroLanguage = LANGUAGES[0];

/** Lookup by ISO code (case-insensitive). */
export function languageByCode(code: string): OriroLanguage | undefined {
  const c = (code || '').toLowerCase();
  return LANGUAGES.find((l) => l.code.toLowerCase() === c);
}

/** Type-to-filter search over name + code (for the onboarding picker). */
export function searchLanguages(query: string): OriroLanguage[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return LANGUAGES;
  return LANGUAGES.filter(
    (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().startsWith(q),
  );
}

export const NEURAL_VOICE_COUNT = LANGUAGES.filter((l) => l.neuralVoice).length;
