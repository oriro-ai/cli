// ORIRO CLI — on-device speech-to-text (Whisper via @huggingface/transformers). This is the
// "hears" half of the two-way voice loop, mirroring the NLLB translator's posture: transformers.js
// + ONNX, runs fully on-device, $0, nothing leaves the machine; model weights download once and
// cache under ~/.oriro/voice-models/. ffmpeg decodes any audio container → 16 kHz mono PCM (the
// same system ffmpeg the Head uses for frames — no new npm dep). Whisper's `translate` task is the
// doc's "free translate → English path" for the coder.
//
// EXPERIMENTAL / peer-gated: if @huggingface/transformers or ffmpeg isn't present, every entry
// point throws a clear, actionable error and the voice seam stays gracefully unavailable — the
// CLI never breaks.

export interface Transcript {
  text: string;
  /** Detected spoken language (ISO-ish), or "en" when unknown. */
  language: string;
}

/** ffmpeg-decode any audio file → 16 kHz mono float32 PCM (what Whisper expects). */
async function decodePcm(path: string): Promise<Float32Array> {
  const { spawn } = await import("node:child_process");
  return await new Promise<Float32Array>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const p = spawn(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    p.stdout.on("data", (c: Buffer) => chunks.push(c));
    p.on("error", () => reject(new Error("ffmpeg not found — install ffmpeg to decode audio for speech-to-text.")));
    p.on("close", (code: number | null) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code ?? "?"} decoding ${path}`));
      const buf = Buffer.concat(chunks);
      if (!buf.length) return reject(new Error(`no audio decoded from ${path}`));
      resolve(new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4)));
    });
  });
}

// transformers.js ASR pipeline — typed loosely so this file compiles without the peer installed.
type AsrPipeline = (
  audio: Float32Array,
  opts: Record<string, unknown>,
) => Promise<{ text?: string; language?: string; chunks?: unknown }>;

let asr: AsrPipeline | null = null;

/** Lazy-load Whisper once (first-use download + cache). Throws if the peer isn't installed. */
async function loadAsr(modelId = "Xenova/whisper-base"): Promise<AsrPipeline> {
  if (asr) return asr;
  // @ts-ignore — optional peer, present only when the on-device voice runtime is enabled
  const { pipeline } = await import("@huggingface/transformers");
  asr = (await pipeline("automatic-speech-recognition", modelId)) as unknown as AsrPipeline;
  return asr;
}

/**
 * Transcribe an audio file to text. `translate: true` uses Whisper's translate task to return
 * ENGLISH regardless of the spoken language (the coder's path). Needs ffmpeg + the transformers peer.
 */
export async function transcribeAudioFile(path: string, opts: { translate?: boolean } = {}): Promise<Transcript> {
  const pcm = await decodePcm(path);
  const model = await loadAsr();
  const out = await model(pcm, {
    task: opts.translate ? "translate" : "transcribe",
    return_language: true,
    chunk_length_s: 30,
  });
  return { text: (out?.text ?? "").trim(), language: (out?.language as string) ?? "en" };
}
