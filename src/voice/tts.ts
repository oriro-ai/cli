// ORIRO CLI — Voice TTS (ported from oro-voice tts-worker.ts, runtime swapped to Node).
// Kokoro-82M (neural, English + flagship langs) via kokoro-js (which runs on
// @huggingface/transformers / onnxruntime). On-device, $0, weights download once on first
// use and cache under ~/.oriro/voice-models/. Returns WAV bytes ready for OS audio.
//
// Routing (router.ts): Kokoro for the langs its phonemizer covers; everything else falls
// to Piper per-language voices (piper-engine — follow-up). Until Piper lands, non-Kokoro
// langs synth with the Kokoro English voice rather than going silent (never-silent ladder).

import { homedir } from "node:os";
import { join } from "node:path";
import { routeTTS } from "./router.js";

// Cache the downloaded weights under ~/.oriro/voice-models (Node FS, not browser IndexedDB).
const VOICE_MODELS_DIR = join(homedir(), ".oriro", "voice-models");

const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const DEFAULT_VOICE = "af_heart"; // Kokoro default neural voice

type KokoroTTSInstance = {
  generate: (text: string, opts: { voice: string }) => Promise<{ toWav: () => ArrayBuffer }>;
};

let kokoro: KokoroTTSInstance | null = null;
let loading: Promise<KokoroTTSInstance> | null = null;

/** Lazy-load Kokoro once (first-use download + cache). Idempotent. */
async function loadKokoro(): Promise<KokoroTTSInstance> {
  if (kokoro) return kokoro;
  if (loading) return loading;
  loading = (async () => {
    // @ts-ignore — transformers env: point the model cache at ~/.oriro/voice-models
    const { env } = await import("@huggingface/transformers");
    env.cacheDir = VOICE_MODELS_DIR;
    // @ts-ignore — kokoro-js dep added when the voice runtime is enabled
    const { KokoroTTS } = await import("kokoro-js");
    kokoro = (await KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype: "q8" })) as unknown as KokoroTTSInstance;
    return kokoro;
  })();
  return loading;
}

/** Synthesize text → WAV bytes with Kokoro (neural). Throws if the runtime is unavailable. */
export async function synthKokoro(text: string, voice = DEFAULT_VOICE): Promise<Uint8Array> {
  const tts = await loadKokoro();
  const audio = await tts.generate(text, { voice });
  return new Uint8Array(audio.toWav());
}

/**
 * Synthesize text in the given language → WAV bytes. Routes to Kokoro for covered langs;
 * non-Kokoro langs use the Kokoro English voice until the Piper per-language packs land
 * (never-silent). `voice` lets the avatar's paired voice_id override the default.
 */
export async function synthToWavBuffer(text: string, lang = "en", voice?: string): Promise<Uint8Array> {
  const engine = routeTTS(lang);
  // Kokoro path covers 'kokoro'; Piper path is a follow-up — fall back to Kokoro EN for now.
  void engine;
  return synthKokoro(text, voice || DEFAULT_VOICE);
}

/** True once the Kokoro weights are loaded locally. */
export function ttsReady(): boolean {
  return kokoro !== null;
}

export { VOICE_MODELS_DIR, KOKORO_MODEL, DEFAULT_VOICE };
