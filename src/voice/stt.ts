// ORIRO CLI — Voice STT (ported from oro-voice stt-worker.ts, runtime swapped to Node).
// Whisper-base (multilingual, 99-lang auto-detect, ~75 MB) via @huggingface/transformers
// (onnxruntime). Two tasks: 'transcribe' (the spoken language) and 'translate' (→ English
// for the coder — the multilingual claim, free, no extra model). On-device, $0, weights
// cache under ~/.oriro/voice-models/. Input is 16 kHz mono Float32 (the mic adapter's
// output); the Worker shell is dropped (runs inline in Node).

import { homedir } from "node:os";
import { join } from "node:path";
import type { STTResult } from "./types.js";

const VOICE_MODELS_DIR = join(homedir(), ".oriro", "voice-models");
const WHISPER_MODEL = "Xenova/whisper-base";
export const STT_SAMPLE_RATE = 16000;

type ASRPipeline = (
  audio: Float32Array,
  opts: { task?: "transcribe" | "translate"; language?: string | null; chunk_length_s?: number },
) => Promise<{ text?: string; language?: string }>;

let asr: ASRPipeline | null = null;
let loading: Promise<ASRPipeline> | null = null;

/** Lazy-load Whisper once (first-use download + cache). Idempotent. */
async function loadWhisper(): Promise<ASRPipeline> {
  if (asr) return asr;
  if (loading) return loading;
  loading = (async () => {
    // @ts-ignore — transformers env: point the model cache at ~/.oriro/voice-models
    const { pipeline, env } = await import("@huggingface/transformers");
    env.cacheDir = VOICE_MODELS_DIR;
    asr = (await pipeline("automatic-speech-recognition", WHISPER_MODEL)) as unknown as ASRPipeline;
    return asr;
  })();
  return loading;
}

/** Transcribe 16 kHz mono Float32 audio. task 'transcribe' = spoken language; 'translate' = English. */
export async function transcribe(
  audio16k: Float32Array,
  opts: { task?: "transcribe" | "translate"; language?: string } = {},
): Promise<{ text: string; language: string }> {
  const w = await loadWhisper();
  const out = await w(audio16k, {
    task: opts.task ?? "transcribe",
    language: opts.language ?? null,
    chunk_length_s: 30,
  });
  return { text: (out.text ?? "").trim(), language: out.language ?? "en" };
}

/**
 * Full STT for the coder: the spoken-language text (for the screen) PLUS the English
 * rendering (for the AI) when translate mode is on and the speaker isn't already English.
 * This is the "speak in any of 99 languages → English to the coder" path.
 */
export async function recognize(audio16k: Float32Array, translateToEnglish = true): Promise<STTResult> {
  const spoken = await transcribe(audio16k, { task: "transcribe" });
  let english: string | undefined;
  if (translateToEnglish) {
    english = spoken.language.startsWith("en")
      ? spoken.text
      : (await transcribe(audio16k, { task: "translate" })).text;
  }
  return { text: spoken.text, language: spoken.language, english, isFinal: true };
}

export function sttReady(): boolean {
  return asr !== null;
}

export { WHISPER_MODEL };
