// `oriro voice` — on-device speech-to-text (Whisper). Transcribe an audio file, or record from the
// mic on a real terminal. Experimental + peer-gated: needs ffmpeg (audio decode/record) and the
// `@huggingface/transformers` voice peer; both degrade gracefully with a clear message. On-device, $0.
import { stdin, stdout } from "node:process";
import type { Command } from "commander";
import { heading, info, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";
import { transcribeAudioFile } from "../voice/stt.js";
import { recordMic } from "../voice/mic.js";

interface VoiceOpts {
  translate?: boolean;
  seconds?: string;
}

export function registerVoiceCommand(program: Command): void {
  program
    .command("voice")
    .description("speech-to-text — transcribe an audio file or the mic (on-device Whisper, experimental)")
    .argument("[file]", "audio file to transcribe (omit to record from the mic on a real terminal)")
    .option("--translate", "translate speech to English (Whisper translate task)")
    .option("--seconds <n>", "mic recording length in seconds", "6")
    .action(async (file: string | undefined, opts: VoiceOpts) => {
      const interactive = !!stdin.isTTY && !!stdout.isTTY;
      heading("ORIRO voice 🎙");

      let audio = file;
      if (!audio) {
        if (!interactive) {
          info("On-device speech-to-text (experimental — needs ffmpeg + the transformers voice peer).");
          process.stdout.write(
            `\n  ${accent("oriro voice <audiofile>")}         ${dim("transcribe an audio file")}\n` +
            `  ${accent("oriro voice --translate <file>")}  ${dim("transcribe + translate to English")}\n` +
            `  ${dim("On a real terminal, run `oriro voice` with no file to record from the mic.")}\n`,
          );
          return; // clean exit 0 — smoke-safe
        }
        info(`Recording ${opts.seconds ?? "6"}s from the mic… (speak now)`);
        const clip = await recordMic(Number(opts.seconds ?? 6));
        if (!clip) die("no microphone recorder found — install ffmpeg (or sox/arecord) to record.");
        audio = clip;
      }

      try {
        const t = await transcribeAudioFile(audio!, { translate: !!opts.translate });
        if (!t.text) { info("(no speech recognized)"); return; }
        process.stdout.write(`  ${dim(`[${t.language}]`)} ${t.text}\n`);
      } catch (e) {
        die(`voice: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
}
