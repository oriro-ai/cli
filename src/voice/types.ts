// ORO-VOICE — shared contract (CODER C owns this file).
//
// THIS IS THE SINGLE SOURCE OF TRUTH that Coders A (STT/mic) and B (TTS/router)
// import. Do not redefine these shapes in stt-worker.ts / mic-capture.ts /
// tts-worker.ts / router.ts — import them from here.
//
// OR-LOCAL-ONLY: every type below describes data that lives and dies on the
// user's machine. The only network any consumer of these types may perform is a
// one-time model download (see ModelSpec). No server, Modal, Gemini, or worker
// callback appears anywhere in the voice loop.

// ── STT (Coder A produces, Coder C consumes) ──────────────────────────────────
// Result of one speech-recognition turn. `language` is ISO-639-1 (e.g. 'en',
// 'es', 'hi') so the SAME language can be routed back to TTS. `isFinal` is true
// only when the turn has settled (silence / end-of-utterance); interim results
// stream with isFinal=false and must NOT trigger the AI/speak loop.
export interface STTResult {
  text: string;
  language: string; // ISO-639-1
  isFinal: boolean;
  /** TRANSLATE-TO-ENGLISH: present only on the FINAL result when translate mode is on.
   *  `text` stays the user's spoken language (what they READ ON SCREEN); `english` is
   *  the same utterance rendered to English (Whisper translate task) to DELIVER TO THE
   *  AI. Undefined when translate mode is off or the translate pass produced nothing. */
  english?: string;
}

// ── TTS (Coder B produces, Coder C consumes) ──────────────────────────────────
// The three on-device neural TTS engines the router may pick. Coder B's router.ts
// selects one per language; Coder C never needs to know which fired.
export type TTSEngine = 'kokoro' | 'supertonic' | 'piper';

// One audio frame emitted by the TTS worker while synthesizing an utterance.
// Streamed so the avatar can start mouthing before the full sentence is ready.
// `samples` are mono PCM Float32; `rate` is the sample rate (e.g. 24000).
export interface TTSAudioChunk {
  samples: Float32Array;
  rate: number;
  isLast: boolean;
}

// ── Models / download (Coder C owns the cache + first-load UI) ─────────────────
// Describes one downloadable on-device model. `sizeMB` is the HONEST on-the-wire
// size shown to the user. `cacheKey` is the persistence key model-cache.ts uses
// to decide whether a download is needed — once cached, it NEVER re-downloads.
export interface ModelSpec {
  id: string;
  name: string;
  sizeMB: number;
  cacheKey: string;
}

// Progress for the first-load download UI. `loaded`/`total` are bytes; `pct` is
// 0..1. Coders A & B forward their worker's `progress` events as these so the
// download UI shows one honest bar per model.
export interface DownloadProgress {
  spec: ModelSpec;
  loaded: number;
  total: number;
  pct: number; // 0..1
}

// ── Voice state machine (Coder C drives, the avatar UI reads) ──────────────────
//   idle        — nothing happening; mic closed.
//   downloading — first-load model fetch in flight (download UI visible).
//   listening   — mic open, waiting for / capturing speech.
//   thinking    — final transcript handed to OROBridge, awaiting response text.
//   speaking    — TTS chunks playing through lip-sync; mic closed.
export type VoiceState = 'idle' | 'downloading' | 'listening' | 'thinking' | 'speaking';

// ── Worker protocols (Coders A & B implement; Coder C imports to drive them) ───
// Coder A's STT worker (stt-worker.ts) speaks this protocol. Coder C lazy-loads
// the worker and adapts mic-capture frames through it, surfacing STTResult.
export interface STTWorker {
  // Resolves once the model is downloaded + ready. Forwards byte progress.
  init(onProgress?: (p: DownloadProgress) => void): Promise<void>;
  // Begin a recognition turn. `onResult` fires for interim + final results.
  // Resolves when the turn ends (isFinal delivered). Coder C calls startMic()
  // from mic-capture.ts to feed this.
  listen(onResult: (r: STTResult) => void): Promise<void>;
  // Force-stop the current turn (e.g. user pressed stop).
  abort(): void;
}

// Coder B's TTS worker + router (tts-worker.ts / router.ts) speak this protocol.
// Coder C calls synth() with the language returned by STT so the reply is spoken
// back in the SAME language; the router picks the TTSEngine internally.
export interface TTSWorker {
  // Resolves once the voice model(s) for `langCode` are downloaded + ready.
  init(langCode: string, onProgress?: (p: DownloadProgress) => void): Promise<void>;
  // Synthesize `text` in `langCode` (ISO-639-1). Streams audio chunks to
  // `onChunk`; resolves on audio_done (after the final chunk).
  synth(text: string, langCode: string, onChunk: (c: TTSAudioChunk) => void): Promise<void>;
  // Stop synthesis + drop any queued chunks.
  abort(): void;
}

// ── Model registry (Coder C owns; A & B reference cacheKeys from here) ─────────
// HONEST sizes per the download-UI spec. cacheKey is what model-cache.ts checks.
export const ORO_MODELS = {
  stt: {
    id: 'whisper-base',
    name: 'Speech recognition',
    sizeMB: 75,
    cacheKey: 'oro-voice:stt:whisper-base',
  } as ModelSpec,
  ttsMajor: {
    id: 'kokoro-82m',
    name: 'Major-language voice',
    sizeMB: 80,
    cacheKey: 'oro-voice:tts:kokoro-82m',
  } as ModelSpec,
  ttsExtended: {
    id: 'supertonic',
    name: 'Extended-language voice',
    sizeMB: 100,
    cacheKey: 'oro-voice:tts:supertonic',
  } as ModelSpec,
} as const;

// A per-language additional voice (Piper) — 30–80MB depending on language. The
// router builds these on demand; sizeMB is filled in by Coder B per voice.
export function piperVoiceSpec(langCode: string, sizeMB: number): ModelSpec {
  return {
    id: `piper-${langCode}`,
    name: 'Additional language voice',
    sizeMB,
    cacheKey: `oro-voice:tts:piper:${langCode}`,
  };
}
