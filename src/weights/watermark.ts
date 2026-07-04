// ORIRO distribution watermark (2026-07-04) — protection tier 3. Can't PREVENT a copy (nothing local
// can), but ties every .orx to the install/build it was issued for, so a leaked container is traceable
// and attributable for takedowns. Authenticated in the container header (AAD), so stripping it breaks
// decryption. This is the deliberate backstop for the accepted 1% (copy-by-a-determined-attacker).
import { createHash } from "node:crypto";
import { deviceFingerprint } from "./binding.js";

/**
 * A per-issue distribution fingerprint. `buildId` identifies the model build; `issueId` (a license id
 * or user id) identifies WHO it was issued to. Bound to this device's fingerprint so a re-pack for a
 * different machine gets a different mark. Short, opaque, and greppable in a leaked file's header.
 */
export function distributionWatermark(buildId: string, issueId: string): string {
  const h = createHash("sha256").update([buildId, issueId, deviceFingerprint()].join("|")).digest("hex");
  return `orx:${buildId}:${h.slice(0, 20)}`;
}

/** Does a container's watermark match an expected build/issue? (leak-tracing / verification) */
export function watermarkMatches(watermark: string, buildId: string, issueId: string): boolean {
  return watermark === distributionWatermark(buildId, issueId);
}
