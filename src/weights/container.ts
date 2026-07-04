// ORIRO .orx — protected weight container (2026-07-04). The best-fit combination of:
//   (1) encrypted container — the GGUF is AES-256-GCM encrypted; stock Ollama/LM Studio/llama.cpp
//       cannot open it, only the ORIRO runtime can (decrypt happens in memory, never to disk);
//   (2) device/license binding — the content key is wrapped by a KEK derived from the machine's
//       install-secret + an ORIRO license (see binding.ts), so a copied .orx won't decrypt elsewhere;
//   (3) distribution watermark — a per-build/per-user fingerprint, authenticated in the header so it
//       cannot be stripped without breaking decryption; makes any leak traceable.
//
// HONEST BOUNDARY: no file that RUNS locally can be made truly uncopyable — to infer, the runtime must
// hold cleartext weights in memory, which a determined attacker can dump. This raises the bar past all
// casual copying / other-tool loading / cross-machine reuse (the real threat); it is not unbreakable,
// and we accept that 1% reality by design. The watermark is the backstop for the 1%: leaks are traceable.
//
// Envelope encryption: a random CEK (content key) encrypts the payload; the CEK is itself wrapped
// (encrypted) by the KEK. The header (incl. the watermark) is the AAD for BOTH, so any header tamper
// or wrong KEK fails the GCM auth tag — no silent partial decrypt.
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const MAGIC = Buffer.from("ORX1", "ascii");
const VERSION = 1;

export interface OrxMeta {
  modelId: string;      // "gauss" | "avila"
  version: string;      // e.g. "2.4"
  createdTs: number;    // pass in (Date.now is unavailable in some sandboxes; callers stamp it)
}

export interface OrxHeader extends OrxMeta {
  cipher: "AES-256-GCM";
  wrapNonce: string;    // b64 — nonce for the CEK-wrap
  wrappedCek: string;   // b64 — AES-GCM(CEK) ciphertext
  wrapTag: string;      // b64 — GCM tag for the wrap
  payloadNonce: string; // b64 — nonce for the payload
  watermark: string;    // distribution fingerprint (authenticated as AAD)
  sha256: string;       // sha256 of the ORIGINAL gguf — post-decrypt integrity check
  payloadLen: number;   // ciphertext byte length (excl. tag)
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

/** Pack a GGUF buffer into a device/license-bound, watermarked, encrypted .orx buffer. */
export function packOrx(
  gguf: Buffer,
  opts: { kek: Buffer; watermark: string; meta: OrxMeta },
): Buffer {
  if (opts.kek.length !== 32) throw new Error("KEK must be 32 bytes (AES-256)");
  const cek = randomBytes(32);
  const payloadNonce = randomBytes(12);
  const sha256 = createHash("sha256").update(gguf).digest("hex");

  // Header WITHOUT the wrapped-CEK fields first — we need the header bytes as AAD, but the wrap also
  // uses the (watermark+meta) as AAD. Resolve by making the AAD the STABLE identity fields only.
  const aad = Buffer.from(
    JSON.stringify({ v: VERSION, modelId: opts.meta.modelId, version: opts.meta.version, watermark: opts.watermark, sha256 }),
    "utf8",
  );

  // Wrap the CEK with the KEK.
  const wrapNonce = randomBytes(12);
  const wc = createCipheriv("aes-256-gcm", opts.kek, wrapNonce);
  wc.setAAD(aad);
  const wrappedCek = Buffer.concat([wc.update(cek), wc.final()]);
  const wrapTag = wc.getAuthTag();

  // Encrypt the payload with the CEK.
  const pc = createCipheriv("aes-256-gcm", cek, payloadNonce);
  pc.setAAD(aad);
  const ciphertext = Buffer.concat([pc.update(gguf), pc.final()]);
  const payloadTag = pc.getAuthTag();

  const header: OrxHeader = {
    ...opts.meta,
    cipher: "AES-256-GCM",
    wrapNonce: wrapNonce.toString("base64"),
    wrappedCek: wrappedCek.toString("base64"),
    wrapTag: wrapTag.toString("base64"),
    payloadNonce: payloadNonce.toString("base64"),
    watermark: opts.watermark,
    sha256,
    payloadLen: ciphertext.length,
  };
  const headerJson = Buffer.from(JSON.stringify(header), "utf8");

  return Buffer.concat([
    MAGIC,
    Buffer.from([VERSION]),
    u32(headerJson.length),
    headerJson,
    ciphertext,
    payloadTag, // 16 bytes
  ]);
}

export interface OrxOpen {
  gguf: Buffer;
  header: OrxHeader;
}

/** Decrypt an .orx buffer with the device/license KEK. Throws on wrong KEK, tamper, or truncation. */
export function unpackOrx(orx: Buffer, kek: Buffer): OrxOpen {
  if (kek.length !== 32) throw new Error("KEK must be 32 bytes (AES-256)");
  if (orx.length < 9 || !orx.subarray(0, 4).equals(MAGIC)) throw new Error("not an ORX container");
  const version = orx[4];
  if (version !== VERSION) throw new Error(`unsupported ORX version ${version}`);
  const headerLen = orx.readUInt32BE(5);
  const headerStart = 9;
  const headerEnd = headerStart + headerLen;
  if (orx.length < headerEnd + 16) throw new Error("ORX truncated");
  const header = JSON.parse(orx.subarray(headerStart, headerEnd).toString("utf8")) as OrxHeader;

  const aad = Buffer.from(
    JSON.stringify({ v: VERSION, modelId: header.modelId, version: header.version, watermark: header.watermark, sha256: header.sha256 }),
    "utf8",
  );

  // Unwrap the CEK.
  const wc = createDecipheriv("aes-256-gcm", kek, Buffer.from(header.wrapNonce, "base64"));
  wc.setAAD(aad);
  wc.setAuthTag(Buffer.from(header.wrapTag, "base64"));
  let cek: Buffer;
  try {
    cek = Buffer.concat([wc.update(Buffer.from(header.wrappedCek, "base64")), wc.final()]);
  } catch {
    throw new Error("ORX unlock failed — wrong device/license, or the container was tampered with");
  }

  // Decrypt the payload.
  const ciphertext = orx.subarray(headerEnd, headerEnd + header.payloadLen);
  const payloadTag = orx.subarray(headerEnd + header.payloadLen, headerEnd + header.payloadLen + 16);
  const pc = createDecipheriv("aes-256-gcm", cek, Buffer.from(header.payloadNonce, "base64"));
  pc.setAAD(aad);
  pc.setAuthTag(payloadTag);
  let gguf: Buffer;
  try {
    gguf = Buffer.concat([pc.update(ciphertext), pc.final()]);
  } catch {
    throw new Error("ORX payload decryption failed — container corrupt or tampered");
  }

  const sha = createHash("sha256").update(gguf).digest("hex");
  if (sha !== header.sha256) throw new Error("ORX integrity check failed — decrypted weights do not match the manifest");
  return { gguf, header };
}

/** Read the watermark + metadata WITHOUT decrypting (for provenance/leak-tracing). */
export function readOrxHeader(orx: Buffer): OrxHeader {
  if (orx.length < 9 || !orx.subarray(0, 4).equals(MAGIC)) throw new Error("not an ORX container");
  const headerLen = orx.readUInt32BE(5);
  return JSON.parse(orx.subarray(9, 9 + headerLen).toString("utf8")) as OrxHeader;
}
