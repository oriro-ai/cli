// ORIRO Scribe — public API. The 3-role supervision (5A.3), turn-loop auto-capture
// + router context injection (5A.2), and retrieval/search (5A.4) build on this engine.
export { captureTurn, readDigest, type TurnRecord, type CaptureResult } from "./capture.js";
export { redact, containsSecret, type RedactionResult, type RedactionSummary } from "./redact.js";
export { appendJournal, readJournal } from "./journal.js";
export {
  updateDigest,
  updateTimeline,
  readDigest as readScribeDigest,
  readTimeline,
} from "./digest.js";
export { scribeDir, journalFile, digestFile, timelineFile, artifactsDir } from "./paths.js";
export { isScribeEnabled, setScribeConsent, hasScribeChoice } from "./consent.js";
export { supervisedCapture } from "./supervisor.js";
export { readHealth, recordHealth, recordFault } from "./health.js";
export { walAppend, walCommit, walPending, walCompact } from "./wal.js";
export { listDays, readDay, searchScribe, type ScribeHit } from "./retrieval.js";
