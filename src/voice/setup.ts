// ORIRO CLI — wire the on-device Whisper STT into the avatar voice seam, completing the two-way
// loop: the seam's listen() (mic → recognized text) now has a runtime. Idempotent + graceful — if
// no recorder or the transformers peer is missing, listen() throws internally and the seam returns
// null (voice input simply unavailable; the CLI never breaks). Whisper's translate task returns the
// English the coder needs, with the detected language reported for the reply path.
import { registerVoiceListen } from "../avatar/voice.js";
import { recordMic } from "./mic.js";
import { transcribeAudioFile } from "./stt.js";

let wired = false;

/** Register the mic → Whisper listener. Call once at CLI startup. */
export function setupVoiceInput(): void {
  if (wired) return;
  wired = true;
  registerVoiceListen(async () => {
    const clip = await recordMic();
    if (!clip) throw new Error("no microphone recorder available");
    const t = await transcribeAudioFile(clip, { translate: true });
    return { text: t.text, language: t.language };
  });
}
