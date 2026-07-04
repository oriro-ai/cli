// Unit test for the protected weight container (src/weights/*). Plain tsx assertions (repo convention).
// Exercises the crypto end-to-end with a small dummy payload (the codec is content-agnostic — no 8GB
// model or native runtime needed). Run: tsx scripts/test-weights.ts
import { randomBytes, scryptSync } from "node:crypto";
import { packOrx, unpackOrx, readOrxHeader } from "../src/weights/container.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}
function throws(fn: () => unknown, label: string): void {
  let threw = false;
  try { fn(); } catch { threw = true; }
  ok(threw, label);
}

// Two distinct 32-byte KEKs standing in for two different device/license derivations.
const kekA = scryptSync("license-A|install-secret-A", "salt", 32);
const kekB = scryptSync("license-B|install-secret-B", "salt", 32);
const meta = { modelId: "gauss", version: "2.4", createdTs: 1_700_000_000_000 };
const gguf = randomBytes(4096); // stand-in for the GGUF bytes

// ── Round-trip: pack with kekA, unpack with kekA → identical bytes, watermark preserved. ──
const orx = packOrx(gguf, { kek: kekA, watermark: "orx:gauss-v24:abc123", meta });
const opened = unpackOrx(orx, kekA);
ok(opened.gguf.equals(gguf), "round-trip: decrypted GGUF is byte-identical");
ok(opened.header.watermark === "orx:gauss-v24:abc123", "round-trip: watermark preserved");
ok(opened.header.modelId === "gauss" && opened.header.version === "2.4", "round-trip: metadata preserved");

// ── Device/license binding: the WRONG KEK cannot unlock (a copied .orx on another machine). ──
throws(() => unpackOrx(orx, kekB), "wrong device/license (kekB) fails to unlock");

// ── Watermark authenticated: tampering the watermark in the header breaks decryption. ──
{
  const tampered = Buffer.from(orx);
  const idx = tampered.indexOf(Buffer.from("abc123", "utf8"));
  ok(idx > 0, "watermark bytes located in header");
  tampered[idx] = tampered[idx] === 0x78 ? 0x79 : 0x78; // flip a char inside the watermark
  throws(() => unpackOrx(tampered, kekA), "tampered watermark fails (authenticated as AAD)");
}

// ── Payload integrity: flipping a ciphertext byte breaks the GCM tag. ──
{
  const tampered = Buffer.from(orx);
  tampered[tampered.length - 20] ^= 0xff; // inside the payload/tag region
  throws(() => unpackOrx(tampered, kekA), "tampered payload fails GCM auth");
}

// ── Truncation is rejected, not silently mis-read. ──
throws(() => unpackOrx(orx.subarray(0, orx.length - 40), kekA), "truncated container rejected");
throws(() => unpackOrx(Buffer.from("not an orx file at all"), kekA), "non-ORX buffer rejected");

// ── Provenance: the watermark is readable WITHOUT the KEK (leak-tracing an opaque file). ──
ok(readOrxHeader(orx).watermark === "orx:gauss-v24:abc123", "watermark readable without decrypting (leak-tracing)");

// ── Determinism: same inputs → same KEK (so a valid unlock is reproducible across runs). ──
ok(scryptSync("license-A|install-secret-A", "salt", 32).equals(kekA), "KEK derivation is deterministic");

// ── Two packs of the same GGUF differ (random CEK/nonce) — no static ciphertext fingerprint. ──
{
  const orx2 = packOrx(gguf, { kek: kekA, watermark: "orx:gauss-v24:abc123", meta });
  ok(!orx2.equals(orx), "re-pack produces different ciphertext (random CEK/nonce)");
  ok(unpackOrx(orx2, kekA).gguf.equals(gguf), "…and still decrypts correctly");
}

process.stdout.write(fails === 0 ? "\nweights: ALL PASS\n" : `\nweights: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
