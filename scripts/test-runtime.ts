// Unit tests for the on-device local-runtime core (src/weights/*). Plain tsx assertions (repo convention).
// Exercises the PURE + streaming logic — no 9B model and no native engine needed (engine.ts is validated
// at app-integration where the native binary is present). Run: tsx scripts/test-runtime.ts
import { existsSync, statSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { platform, tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { planContext, DEFAULT_CTX } from "../src/weights/preflight.js";
import { buildPrompt, systemFor, STOP_SEQUENCES } from "../src/weights/template.js";
import { thinkFilter, stripThink } from "../src/weights/think-strip.js";
import { writeSecureFile } from "../src/weights/secure-load.js";
import { packOrxToFile, unpackOrxToFile } from "../src/weights/container-stream.js";
import { nextRange } from "../src/weights/pull.js";
import { normalizeModel, deltaChunk, sseData } from "../src/weights/serve.js";
import { modelIdFromFilename } from "../src/commands/models.js";
import { readSetupToken, readLicense } from "../src/config/session.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

const GiB = 1024 * 1024 * 1024;

// ── preflight: sizes context to free RAM, refuses instead of OOM ──────────────────────────────────
const fp9b = { paramsB: 9, fileBytes: 8 * GiB };
ok(planContext(fp9b, DEFAULT_CTX, 32 * GiB).decision === "ok", "preflight: ample RAM → requested context granted");
const big = planContext(fp9b, 262144, 16 * GiB);
ok(big.decision === "reduced" && big.nCtx > 0 && big.nCtx < 262144, "preflight: 256K request capped to fit RAM");
ok(planContext(fp9b, DEFAULT_CTX, 6 * GiB).decision === "refuse", "preflight: too little RAM → refuse (never OOM)");

// ── template: ChatML (Coder-2 V2.4 confirm), <|im_end|> stop, ORIRO identity (Cardinal Rule 1) ────
const gauss = buildPrompt("gauss", [{ role: "user", content: "hello" }]);
ok(gauss.prompt.includes("<|im_start|>system\n") && gauss.prompt.includes("<|im_start|>user\nhello<|im_end|>"), "template: ChatML framing");
ok(gauss.prompt.endsWith("<|im_start|>assistant\n"), "template: ends with the assistant turn open");
ok(gauss.stops.includes("<|im_end|>") && !gauss.stops.includes("### Instruction") && !gauss.stops.includes("</s>"), "template: stop is <|im_end|>, not Alpaca/Llama");
ok(STOP_SEQUENCES.includes("<|im_end|>"), "template: exported STOP_SEQUENCES has <|im_end|>");
ok(/You are Gauss/.test(gauss.prompt) && !/(mistral|qwen|llama)/i.test(gauss.prompt), "template: identity, no base-model name");
ok(/You are Avila/.test(systemFor("avila")), "template: avila system prompt");

// ── think-strip: hides the model's <think>…</think> reasoning, streaming-safe ─────────────────────
ok(stripThink("<think>secret reasoning</think>The answer.") === "The answer.", "think: strips a leading think block");
ok(stripThink("  \n<think>r</think>\n\nHi") === "Hi", "think: strips surrounding whitespace + block");
ok(stripThink("no think here at all") === "no think here at all", "think: passes through when there is no block");
// split across chunks (tags arrive in pieces)
{
  const f = thinkFilter();
  let out = "";
  for (const c of ["<thi", "nk>hidden ", "reasoning", "</thin", "k>visible ", "answer"]) out += f.push(c);
  out += f.end();
  ok(out === "visible answer", "think: reassembles tags split across stream chunks");
}
ok(stripThink("<think>only reasoning, never closed") === "", "think: unterminated think block yields no answer");

// ── streaming .orx: pack→unpack round-trip is byte-identical; wrong KEK fails ──────────────────────
{
  const dir = join(tmpdir(), `orx-test-${randomBytes(4).toString("hex")}`);
  mkdirSync(dir, { recursive: true });
  const src = join(dir, "m.gguf");
  const orx = join(dir, "m.orx");
  const outp = join(dir, "out.gguf");
  const bytes = randomBytes(300 * 1024); // spans multiple 4 MiB-less chunks; content-agnostic codec
  writeFileSync(src, bytes);
  const kekA = scryptSync("license-A|install-A", "salt", 32);
  const kekB = scryptSync("license-B|install-B", "salt", 32);
  const header = await packOrxToFile(src, orx, { kek: kekA, watermark: "orx:test", meta: { modelId: "gauss", version: "2.4", createdTs: 1_700_000_000_000 } });
  ok(header.modelId === "gauss" && header.payloadLen === bytes.length, "orx-stream: header carries modelId + payloadLen");
  await unpackOrxToFile(orx, outp, kekA);
  ok(readFileSync(outp).equals(bytes), "orx-stream: pack→unpack is byte-identical");
  let wrongKekThrew = false;
  try { await unpackOrxToFile(orx, join(dir, "bad.gguf"), kekB); } catch { wrongKekThrew = true; }
  ok(wrongKekThrew, "orx-stream: wrong device/license KEK fails to unlock");
  rmSync(dir, { recursive: true, force: true });
}

// ── secure-load: locked cleartext file, shredded on dispose ───────────────────────────────────────
{
  const sm = writeSecureFile(randomBytes(64 * 1024), "gauss");
  ok(existsSync(sm.path), "secure-load: cleartext file written");
  if (platform() !== "win32") ok((statSync(sm.path).mode & 0o777) === 0o600, "secure-load: 0600 on POSIX");
  else ok(true, "secure-load: perms skipped on Windows");
  sm.dispose();
  ok(!existsSync(sm.path), "secure-load: dispose() shreds + unlinks");
}

// ── pull: next Range is correct + terminates ──────────────────────────────────────────────────────
ok(JSON.stringify(nextRange(0, 100, 40)) === JSON.stringify({ start: 0, end: 39 }), "pull: first range");
ok(JSON.stringify(nextRange(80, 100, 40)) === JSON.stringify({ start: 80, end: 99 }), "pull: last (clamped) range");
ok(nextRange(100, 100, 40) === null, "pull: complete → null (terminates)");

// ── import: model id inferred from a downloaded GGUF's filename ────────────────────────────────────
ok(modelIdFromFilename("C:/Users/x/Downloads/gauss.gguf") === "gauss", "import: gauss.gguf → gauss");
ok(modelIdFromFilename("/home/u/avila-v2.4.gguf") === "avila", "import: avila-*.gguf → avila");
ok(modelIdFromFilename("gauss-mmproj.gguf") === "gauss-mmproj", "import: projector → own slot (not the LM)");
ok(modelIdFromFilename("random.gguf") === null, "import: unknown filename → null (rejected)");

// ── serve: OpenAI-compatible shaping + model normalization ─────────────────────────────────────────
ok(normalizeModel("oriro/Gauss") === "gauss" && normalizeModel("avila-v2.4") === "avila" && normalizeModel(undefined) === "gauss", "serve: model id normalized");
ok(sseData({ a: 1 }).startsWith("data: ") && sseData({ a: 1 }).endsWith("\n\n"), "serve: SSE line framing");
{
  const c = deltaChunk("gauss", "id1", "hi") as { choices: { delta: { content: string } }[]; object: string };
  ok(c.object === "chat.completion.chunk" && c.choices[0].delta.content === "hi", "serve: delta chunk shape");
}

// ── session: setup-token + license resolution (env path, no file writes) ──────────────────────────
process.env.ORIRO_SETUP_TOKEN = "a".repeat(48);
ok(readSetupToken() === "a".repeat(48), "session: setup token from env");
ok(readLicense() === "oriro-local-v1", "session: default device-local license");
process.env.ORIRO_LICENSE_KEY = "lic-123";
ok(readLicense() === "lic-123", "session: ORIRO_LICENSE_KEY overrides license");
delete process.env.ORIRO_SETUP_TOKEN;
delete process.env.ORIRO_LICENSE_KEY;

process.stdout.write(fails === 0 ? "\nAll runtime tests passed.\n" : `\n${fails} runtime test(s) FAILED.\n`);
process.exit(fails === 0 ? 0 : 1);
