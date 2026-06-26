// ORIRO Scribe — the 3-role supervised writer (5A.3). Deterministic, in-process, free:
//   Primary  = first write attempt.
//   Standby  = instant retry if Primary throws (zero loss; entry already in the WAL).
//   Medic    = logs the fault, heals the backlog by replaying any pending WAL entries,
//              and (since each entry stays in the WAL until committed) recovers across
//              crashes/restarts — no human, no LLM.
// It NEVER throws to the caller: a scribe failure can never break the user's turn.
import { captureTurn, redactRecord, type CaptureResult, type TurnRecord } from "./capture.js";
import { recordFault, recordHealth } from "./health.js";
import { walAppend, walCommit, walCompact, walPending } from "./wal.js";

let draining = false;

function uid(ts: string): string {
  return `${ts}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Medic + Standby: replay any uncommitted WAL entries (prior/crash failures) first. */
function drainBacklog(): void {
  if (draining) return;
  draining = true;
  try {
    let drained = 0;
    for (const e of walPending()) {
      try {
        captureTurn(e.rec);
        walCommit(e.id);
        drained++;
      } catch (err) {
        recordFault("standby-replay", err);
        break; // stop on first failure; retried next turn
      }
    }
    if (drained > 0) walCompact();
  } finally {
    draining = false;
  }
}

/** Supervised, durable, self-healing capture. Returns null on (logged) failure; never throws. */
export function supervisedCapture(rec: TurnRecord): CaptureResult | null {
  try {
    drainBacklog();
    const id = uid(rec.ts);
    // Redact BEFORE the WAL append — the WAL must never hold raw secrets (it persists the record
    // for crash replay). Redaction is idempotent, so captureTurn re-redacting the same record is a
    // no-op; replay stays correct.
    const safe = redactRecord(rec).rec;
    walAppend(id, safe);
    try {
      const res = captureTurn(safe); // Primary
      walCommit(id);
      walCompact(); // prune the just-committed entry so the WAL never grows into a plaintext transcript
      recordHealth();
      return res;
    } catch (primaryErr) {
      recordFault("primary", primaryErr);
      try {
        const res = captureTurn(safe); // Standby retry
        walCommit(id);
        walCompact();
        recordHealth();
        return res;
      } catch (standbyErr) {
        recordFault("standby", standbyErr);
        return null; // stays pending in WAL → Medic replays next turn
      }
    }
  } catch (fatal) {
    recordFault("supervisor", fatal);
    return null; // absolute guarantee: a scribe fault never breaks the turn
  }
}
