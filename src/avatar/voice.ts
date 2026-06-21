// ORIRO CLI — avatar voice seam. The avatar is the FACE; the voice comes from the voice
// package (#3, on-device Kokoro/Piper TTS + Whisper STT). This is the seam the voice
// package registers into: speak(text) → synth WAV (in the avatar's voice_id) → play via
// OS audio; listen() → mic → STT. Until the voice runtime is wired, speak() degrades to
// text (never-silent) and listen() is unavailable — the avatar still renders and the CLI
// never breaks. All on-device, $0.

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, rmSync } from "node:fs";

/** TTS: text (+ the avatar's voice/lang) → WAV bytes. Provided by the voice package. */
export type VoiceSynth = (text: string, opts: { voiceId?: string; lang?: string }) => Promise<Uint8Array>;
/** STT: mic → recognized text + detected language. Provided by the voice package. */
export type VoiceListen = () => Promise<{ text: string; language: string }>;

let synth: VoiceSynth | null = null;
let listener: VoiceListen | null = null;

export function registerVoiceSynth(fn: VoiceSynth): void {
  synth = fn;
}
export function registerVoiceListen(fn: VoiceListen): void {
  listener = fn;
}
export function hasVoice(): boolean {
  return synth != null;
}
export function hasMic(): boolean {
  return listener != null;
}

/** Pick an OS audio player command for the platform (first that exists wins at runtime). */
function audioPlayers(file: string): Array<{ cmd: string; args: string[] }> {
  if (process.platform === "darwin") return [{ cmd: "afplay", args: [file] }];
  if (process.platform === "win32")
    return [
      { cmd: "powershell", args: ["-NoProfile", "-c", `(New-Object Media.SoundPlayer '${file}').PlaySync()`] },
    ];
  return [
    { cmd: "aplay", args: ["-q", file] },
    { cmd: "ffplay", args: ["-nodisp", "-autoexit", "-loglevel", "quiet", file] },
    { cmd: "paplay", args: [file] },
  ];
}

/** Play a WAV buffer through the OS audio. Resolves false if no player is available. */
export function playWav(wav: Uint8Array): Promise<boolean> {
  const file = join(tmpdir(), `oriro-avatar-${process.pid}-${wav.length}.wav`);
  writeFileSync(file, wav);
  const players = audioPlayers(file);
  return new Promise<boolean>((resolve) => {
    const tryPlayer = (i: number) => {
      if (i >= players.length) {
        rmSync(file, { force: true });
        return resolve(false);
      }
      const p = players[i];
      const child = spawn(p.cmd, p.args, { stdio: "ignore" });
      child.on("error", () => tryPlayer(i + 1)); // command not found → next player
      child.on("close", (code) => {
        rmSync(file, { force: true });
        resolve(code === 0);
      });
    };
    tryPlayer(0);
  });
}

/**
 * Speak text in the avatar's voice. Returns true if it was actually voiced; false if the
 * voice runtime isn't wired or no audio device — the caller then just shows the text
 * (never-silent). Never throws into the turn.
 */
export async function speak(text: string, opts: { voiceId?: string; lang?: string } = {}): Promise<boolean> {
  if (!synth || !text.trim()) return false;
  try {
    const wav = await synth(text, opts);
    return await playWav(wav);
  } catch {
    return false;
  }
}

/** Listen via the mic (if the voice runtime is wired). Returns null when unavailable. */
export async function listen(): Promise<{ text: string; language: string } | null> {
  if (!listener) return null;
  try {
    return await listener();
  } catch {
    return null;
  }
}
