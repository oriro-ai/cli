// ORIRO CLI — language module (the multilingual layer).
//
// Step 1 of the CLI experience: the user picks one of 100 languages at first run;
// that becomes the terminal's language. They type/read in it; the AI/coder always
// receives ENGLISH (on-device translate). Replies render back to their language.
//
// INTEGRATION SEAM (where the CLI wires this in):
//   1. onboarding: `oriro onboard` step 1 → `await runLanguageOnboarding()`
//   2. input  (user → AI):  `const { english } = await inputForCoder(line, lang.code);`
//                           feed `english` to the agent/coder.
//   3. output (AI → user):  `const shown = await translateForUser(reply, lang.code);`
//                           print `shown` (and speak it in voice mode).
//   4. translator backend:  the on-device model port calls `registerTranslator()`
//                           with NLLB-200 (typed) / Whisper-translate (voice).
//
// OR-LOCAL-ONLY: everything is on-device. English path needs no model; other
// languages use free on-device models (lazy first-use download), nothing leaves
// the machine. Built on the ORO-VOICE engine (C2, apps/web/src/lib/oro-voice).

export type { OriroLanguage } from './languages.js';
export {
  LANGUAGES,
  ENGLISH,
  languageByCode,
  searchLanguages,
  NEURAL_VOICE_COUNT,
} from './languages.js';

export type { LanguageConfig } from './config.js';
export {
  readLanguageConfig,
  writeLanguageConfig,
  isLanguageConfigured,
  getTerminalLanguage,
  setTerminalLanguage,
} from './config.js';

export type { OriroInput, Translator } from './translate.js';
export {
  registerTranslator,
  hasTranslator,
  translateForCoder,
  translateForUser,
  inputForCoder,
} from './translate.js';

export { selectLanguageInteractive, runLanguageOnboarding } from './onboarding.js';
