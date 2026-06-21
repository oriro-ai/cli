// ORIRO CLI — Voice module (pickup #3). The on-device voice engine ported from
// oro-voice: Kokoro/Piper TTS (speak) + Whisper STT (listen, follow-up), 99 languages,
// normalized to English for the coder. On-device, $0, weights download once + cache under
// ~/.oriro/voice-models/. Wires into the avatar's speak seam so the chosen face talks.

export { synthKokoro, synthToWavBuffer, ttsReady, VOICE_MODELS_DIR, KOKORO_MODEL } from "./tts.js";
export { transcribe, recognize, sttReady, STT_SAMPLE_RATE, WHISPER_MODEL } from "./stt.js";
export { routeTTS } from "./router.js";
export type { TTSEngine, STTResult } from "./types.js";

import { registerVoiceSynth } from "../avatar/voice.js";
import { synthToWavBuffer } from "./tts.js";

/**
 * Wire the on-device TTS into the avatar's speak seam (avatar/voice.ts). After this call,
 * `speak()` (and the avatar's speak-on-reply) produce real audio in the user's language.
 * Idempotent; safe to call at startup when speaking is enabled.
 */
export function setupVoice(): void {
  registerVoiceSynth(async (text: string, opts: { voiceId?: string; lang?: string }) => {
    // voice_id → Kokoro voice mapping is a follow-up (D1 voice_id absent today);
    // default neural voice for now. lang drives routing (Kokoro/Piper).
    return synthToWavBuffer(text, opts.lang ?? "en");
  });
}
