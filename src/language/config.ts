// ORIRO CLI — language config. The language picked at onboarding is persisted and
// becomes the terminal's language for every session (until changed). Stored on the
// user's machine only (~/.oriro/language.json) — OR-LOCAL-ONLY.

import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ENGLISH, languageByCode, type OriroLanguage } from './languages.js';

const DIR = join(homedir(), '.oriro');
const FILE = join(DIR, 'language.json');

export interface LanguageConfig {
  /** ISO code of the terminal's language. */
  code: string;
  /** Translate the user's input to English before it reaches the AI/coder. */
  translateToEnglish: boolean;
  /** Speak replies back (voice mode); off = text only. */
  voice: boolean;
}

export function readLanguageConfig(): LanguageConfig | null {
  try {
    return JSON.parse(readFileSync(FILE, 'utf8')) as LanguageConfig;
  } catch {
    return null;
  }
}

export function writeLanguageConfig(cfg: LanguageConfig): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

export function isLanguageConfigured(): boolean {
  return readLanguageConfig() !== null;
}

/** The active terminal language (falls back to English if unset/unknown). */
export function getTerminalLanguage(): OriroLanguage {
  const cfg = readLanguageConfig();
  return (cfg && languageByCode(cfg.code)) || ENGLISH;
}

/** Persist a chosen language as the terminal's language. */
export function setTerminalLanguage(lang: OriroLanguage, opts?: { voice?: boolean }): LanguageConfig {
  const cfg: LanguageConfig = {
    code: lang.code,
    // English speakers need no translation; everyone else gets it on by default.
    translateToEnglish: lang.code.toLowerCase() !== 'en',
    voice: opts?.voice ?? false,
  };
  writeLanguageConfig(cfg);
  return cfg;
}
