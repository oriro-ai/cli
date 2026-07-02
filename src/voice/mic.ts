// ORIRO CLI — microphone capture for the voice loop. Records a short clip via a SYSTEM recorder
// (ffmpeg's platform audio input, or sox/arecord as fallbacks) into a temp WAV, so speech-to-text
// (stt.ts) can transcribe it. No npm dep — reuses tools the user already has. Every path is
// best-effort and graceful: if no recorder is available, recordMic() resolves null and the voice
// seam simply stays unavailable (the CLI never breaks). On-device, $0, nothing leaves the machine.
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, statSync } from "node:fs";

/** Candidate recorder commands per platform (first that produces audio wins). */
function recorders(outFile: string, seconds: number): Array<{ cmd: string; args: string[] }> {
  const dur = String(seconds);
  if (process.platform === "darwin") {
    return [
      { cmd: "ffmpeg", args: ["-hide_banner", "-loglevel", "error", "-f", "avfoundation", "-i", ":0", "-t", dur, "-y", outFile] },
      { cmd: "sox", args: ["-d", outFile, "trim", "0", dur] },
    ];
  }
  if (process.platform === "win32") {
    // dshow needs a device NAME; "default" works on many setups. Best-effort — falls through if not.
    return [
      { cmd: "ffmpeg", args: ["-hide_banner", "-loglevel", "error", "-f", "dshow", "-i", "audio=default", "-t", dur, "-y", outFile] },
    ];
  }
  return [
    { cmd: "arecord", args: ["-q", "-f", "cd", "-d", dur, outFile] },
    { cmd: "ffmpeg", args: ["-hide_banner", "-loglevel", "error", "-f", "alsa", "-i", "default", "-t", dur, "-y", outFile] },
    { cmd: "sox", args: ["-d", outFile, "trim", "0", dur] },
  ];
}

/** Record ~`seconds` of mic audio to a temp WAV. Resolves the path, or null if no recorder worked. */
export async function recordMic(seconds = 6): Promise<string | null> {
  const outFile = join(tmpdir(), `oriro-voice-${process.pid}-${seconds}.wav`);
  for (const r of recorders(outFile, seconds)) {
    const okFile = await new Promise<boolean>((resolve) => {
      const child = spawn(r.cmd, r.args, { stdio: "ignore" });
      child.on("error", () => resolve(false)); // command not found → try next recorder
      child.on("close", (code) => resolve(code === 0 && existsSync(outFile) && statSync(outFile).size > 44));
    });
    if (okFile) return outFile;
  }
  return null;
}
