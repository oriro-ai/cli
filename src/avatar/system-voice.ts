// ORIRO CLI — on-device system-TTS VoiceSynth. Wires the OS speech engine (Windows
// SAPI / macOS `say` / Linux espeak) into the avatar's voice seam so speak() works out
// of the box: $0, no model download, nothing leaves the machine (cardinal-clean). The
// nicer on-device neural voice (Kokoro) can register over this later.
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { registerVoiceSynth, type VoiceSynth } from "./voice.js";

function tmpWav(): string {
  return join(tmpdir(), `oriro-tts-${process.pid}-${Date.now()}-${Math.floor(performance.now())}.wav`);
}

function readAndClean(file: string): Uint8Array {
  const buf = readFileSync(file);
  rmSync(file, { force: true });
  return new Uint8Array(buf);
}

// Windows SAPI via PowerShell System.Speech → WAV file. Picks a voice matching the
// language hint when available; text is piped on stdin so quoting can't break it.
function winSapi(text: string, lang?: string): Promise<Uint8Array> {
  const out = tmpWav();
  const culture = lang ? `'${lang.replace(/'/g, "")}'` : "$null";
  const ps =
    "Add-Type -AssemblyName System.Speech; " +
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
    `$c = ${culture}; ` +
    "if ($c) { try { $s.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, (New-Object System.Globalization.CultureInfo($c))) } catch {} } " +
    `$s.SetOutputToWaveFile('${out}'); ` +
    "$s.Speak([Console]::In.ReadToEnd()); $s.Dispose();";
  return new Promise((resolve, reject) => {
    const p = spawn("powershell", ["-NoProfile", "-Command", ps], { stdio: ["pipe", "ignore", "ignore"] });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0 && existsSync(out)) resolve(readAndClean(out));
      else reject(new Error("SAPI synth failed"));
    });
    p.stdin.write(text);
    p.stdin.end();
  });
}

function macSay(text: string): Promise<Uint8Array> {
  const out = tmpWav();
  return new Promise((resolve, reject) => {
    const p = spawn("say", ["-o", out, "--data-format=LEI16@22050", text], { stdio: "ignore" });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 && existsSync(out) ? resolve(readAndClean(out)) : reject(new Error("say failed")),
    );
  });
}

function linuxEspeak(text: string): Promise<Uint8Array> {
  const out = tmpWav();
  return new Promise((resolve, reject) => {
    const p = spawn("espeak", ["-w", out, text], { stdio: "ignore" });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 && existsSync(out) ? resolve(readAndClean(out)) : reject(new Error("espeak failed")),
    );
  });
}

/** The on-device OS speech engine as a VoiceSynth (text + lang → WAV bytes). */
export const systemVoiceSynth: VoiceSynth = async (text, opts) => {
  if (process.platform === "win32") return winSapi(text, opts.lang);
  if (process.platform === "darwin") return macSay(text);
  return linuxEspeak(text);
};

let wired = false;
/** Register the OS speech engine as the avatar's voice (idempotent). Safe to call eagerly. */
export function setupSystemVoice(): void {
  if (wired) return;
  registerVoiceSynth(systemVoiceSynth);
  wired = true;
}
