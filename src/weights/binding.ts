// ORIRO weight binding (2026-07-04) — derives the KEK that unlocks a .orx from things that live on
// THIS machine + an ORIRO license, so a copied container can't decrypt elsewhere (protection tier 2).
//
//   KEK = scrypt( installSecret ‖ licenseKey , salt = deviceSalt )
//
// - installSecret: a 32-byte random secret generated ONCE per machine and stored chmod-600 under
//   ~/.oriro/weights/.install. It never leaves the device. A .orx moved to another machine has no
//   matching installSecret → the KEK differs → GCM unwrap fails. This is the device binding.
// - licenseKey: issued by ORIRO per install/device (the license server binds it to the deviceFingerprint
//   the CLI submits). Absent/invalid license → no KEK → no decrypt.
// - deviceSalt: derived from stable machine attributes; also mixed in so the KEK is machine-specific
//   even before the license exists (defense in depth).
import { randomBytes, scryptSync, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { hostname, userInfo, platform, arch } from "node:os";
import { join } from "node:path";
import { oriroDir } from "../config/paths.js";

const SCRYPT_N = 1 << 15; // 32768 — CPU/mem hard enough to slow brute force, fast enough for one unlock
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function weightsDir(): string {
  const d = join(oriroDir(), "weights");
  mkdirSync(d, { recursive: true });
  return d;
}

/** Get-or-create the per-machine install secret (32 bytes). Stored chmod-600, never transmitted. */
export function installSecret(): Buffer {
  const p = join(weightsDir(), ".install");
  if (existsSync(p)) {
    const b = Buffer.from(readFileSync(p, "utf8").trim(), "hex");
    if (b.length === 32) return b;
  }
  const secret = randomBytes(32);
  writeFileSync(p, secret.toString("hex"), "utf8");
  try { chmodSync(p, 0o600); } catch { /* best-effort on filesystems without POSIX perms (Windows) */ }
  return secret;
}

/** A stable-ish device fingerprint (submitted to the license server to bind a license to this machine). */
export function deviceFingerprint(): string {
  const u = userInfo();
  return createHash("sha256")
    .update([hostname(), u.username, platform(), arch(), String(u.uid)].join("|"))
    .digest("hex");
}

/** Derive the 32-byte AES KEK from the machine's install secret + the ORIRO license key. */
export function deriveKek(licenseKey: string): Buffer {
  const salt = createHash("sha256").update("oriro-orx-v1|" + deviceFingerprint()).digest();
  const material = Buffer.concat([installSecret(), Buffer.from(licenseKey, "utf8")]);
  return scryptSync(material, salt, 32, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 128 * 1024 * 1024 });
}
