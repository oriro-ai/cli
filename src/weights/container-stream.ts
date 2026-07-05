// Streaming .orx pack/unpack — the memory-bounded companion to container.ts. The buffer pack/unpack in
// container.ts load the WHOLE GGUF into memory; at 8.29 GB that is a ~16-24 GB RAM spike, fatal on the
// machines that can just barely run the model. These stream through a 4 MiB window so memory is bounded
// regardless of model size. The on-disk format is byte-identical to container.ts::packOrx(), so a file
// written by either can be read by either.
//
// This lives in a SEPARATE file (not appended to container.ts) so the committed container.ts stays
// pristine — the format constants below mirror it exactly.
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { open, stat } from "node:fs/promises";
import type { OrxHeader, OrxMeta } from "./container.js";

const MAGIC = Buffer.from("ORX1", "ascii"); // mirrors container.ts
const VERSION = 1;
const IO_CHUNK = 4 * 1024 * 1024; // 4 MiB streaming window

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

/** Stream-encrypt a GGUF file into a device/license-bound, watermarked .orx file. Memory-bounded. */
export async function packOrxToFile(
  srcGgufPath: string,
  destOrxPath: string,
  opts: { kek: Buffer; watermark: string; meta: OrxMeta },
): Promise<OrxHeader> {
  if (opts.kek.length !== 32) throw new Error("KEK must be 32 bytes (AES-256)");
  const { size } = await stat(srcGgufPath);

  // Pass 1 — hash the plaintext (sha256 is part of the AAD + header, so it must be known before writing).
  const hash = createHash("sha256");
  {
    const fh = await open(srcGgufPath, "r");
    try {
      const b = Buffer.alloc(IO_CHUNK);
      let pos = 0;
      for (;;) {
        const { bytesRead } = await fh.read(b, 0, IO_CHUNK, pos);
        if (!bytesRead) break;
        hash.update(b.subarray(0, bytesRead));
        pos += bytesRead;
      }
    } finally {
      await fh.close();
    }
  }
  const sha256 = hash.digest("hex");

  const cek = randomBytes(32);
  const payloadNonce = randomBytes(12);
  const aad = Buffer.from(
    JSON.stringify({ v: VERSION, modelId: opts.meta.modelId, version: opts.meta.version, watermark: opts.watermark, sha256 }),
    "utf8",
  );
  const wrapNonce = randomBytes(12);
  const wc = createCipheriv("aes-256-gcm", opts.kek, wrapNonce);
  wc.setAAD(aad);
  const wrappedCek = Buffer.concat([wc.update(cek), wc.final()]);
  const wrapTag = wc.getAuthTag();

  const header: OrxHeader = {
    ...opts.meta,
    cipher: "AES-256-GCM",
    wrapNonce: wrapNonce.toString("base64"),
    wrappedCek: wrappedCek.toString("base64"),
    wrapTag: wrapTag.toString("base64"),
    payloadNonce: payloadNonce.toString("base64"),
    watermark: opts.watermark,
    sha256,
    payloadLen: size, // GCM ciphertext length == plaintext length
  };
  const headerJson = Buffer.from(JSON.stringify(header), "utf8");

  const out = await open(destOrxPath, "w");
  try {
    await out.write(Buffer.concat([MAGIC, Buffer.from([VERSION]), u32(headerJson.length), headerJson]));
    const pc = createCipheriv("aes-256-gcm", cek, payloadNonce);
    pc.setAAD(aad);
    const fh = await open(srcGgufPath, "r");
    try {
      const b = Buffer.alloc(IO_CHUNK);
      let pos = 0;
      for (;;) {
        const { bytesRead } = await fh.read(b, 0, IO_CHUNK, pos);
        if (!bytesRead) break;
        const enc = pc.update(b.subarray(0, bytesRead));
        if (enc.length) await out.write(enc);
        pos += bytesRead;
      }
    } finally {
      await fh.close();
    }
    const fin = pc.final(); // empty for GCM
    await out.write(Buffer.concat([fin, pc.getAuthTag()])); // trailing 16-byte tag
  } finally {
    await out.close();
  }
  return header;
}

/** Stream-decrypt an .orx file straight to a cleartext file. Memory-bounded; verifies GCM tag + sha256. */
export async function unpackOrxToFile(srcOrxPath: string, destGgufPath: string, kek: Buffer): Promise<OrxHeader> {
  if (kek.length !== 32) throw new Error("KEK must be 32 bytes (AES-256)");
  const src = await open(srcOrxPath, "r");
  try {
    const pre = Buffer.alloc(9);
    const { bytesRead: pr } = await src.read(pre, 0, 9, 0);
    if (pr < 9 || !pre.subarray(0, 4).equals(MAGIC)) throw new Error("not an ORX container");
    if (pre[4] !== VERSION) throw new Error(`unsupported ORX version ${pre[4]}`);
    const headerLen = pre.readUInt32BE(5);
    const hbuf = Buffer.alloc(headerLen);
    await src.read(hbuf, 0, headerLen, 9);
    const header = JSON.parse(hbuf.toString("utf8")) as OrxHeader;

    const aad = Buffer.from(
      JSON.stringify({ v: VERSION, modelId: header.modelId, version: header.version, watermark: header.watermark, sha256: header.sha256 }),
      "utf8",
    );
    const wc = createDecipheriv("aes-256-gcm", kek, Buffer.from(header.wrapNonce, "base64"));
    wc.setAAD(aad);
    wc.setAuthTag(Buffer.from(header.wrapTag, "base64"));
    let cek: Buffer;
    try {
      cek = Buffer.concat([wc.update(Buffer.from(header.wrappedCek, "base64")), wc.final()]);
    } catch {
      throw new Error("ORX unlock failed — wrong device/license, or the container was tampered with");
    }

    const cipherStart = 9 + headerLen;
    const cipherLen = header.payloadLen;
    const tag = Buffer.alloc(16);
    await src.read(tag, 0, 16, cipherStart + cipherLen); // trailing tag

    const pc = createDecipheriv("aes-256-gcm", cek, Buffer.from(header.payloadNonce, "base64"));
    pc.setAAD(aad);
    pc.setAuthTag(tag);
    const hash = createHash("sha256");
    const out = await open(destGgufPath, "w");
    try {
      const b = Buffer.alloc(IO_CHUNK);
      let pos = cipherStart;
      let remaining = cipherLen;
      while (remaining > 0) {
        const { bytesRead } = await src.read(b, 0, Math.min(IO_CHUNK, remaining), pos);
        if (!bytesRead) break;
        const dec = pc.update(b.subarray(0, bytesRead));
        if (dec.length) { await out.write(dec); hash.update(dec); }
        pos += bytesRead;
        remaining -= bytesRead;
      }
      let fin: Buffer;
      try {
        fin = pc.final(); // verifies the GCM tag
      } catch {
        throw new Error("ORX payload decryption failed — container corrupt or tampered");
      }
      if (fin.length) { await out.write(fin); hash.update(fin); }
    } finally {
      await out.close();
    }
    if (hash.digest("hex") !== header.sha256) {
      throw new Error("ORX integrity check failed — decrypted weights do not match the manifest");
    }
    return header;
  } finally {
    await src.close();
  }
}
