// ORIRO Scribe — health + fault log for the supervised writer (5A.3). Deterministic,
// local, no LLM. The Medic records faults here and the heartbeat proves liveness.
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";
import { scribeDir } from "./paths.js";

interface Health {
  lastWriteAt?: string;
  faultCount: number;
  lastFault?: string;
}

function healthFile(): string {
  return join(scribeDir(), "_health.json");
}
function faultLogFile(): string {
  return join(scribeDir(), "_faults.log");
}

function read(): Health {
  try {
    return JSON.parse(readFileSync(healthFile(), "utf8")) as Health;
  } catch {
    return { faultCount: 0 };
  }
}

function write(h: Health): void {
  mkdirSync(scribeDir(), { recursive: true });
  writeFileSync(healthFile(), `${JSON.stringify(h, null, 2)}\n`, "utf8");
}

/** Heartbeat: a successful write happened just now. */
export function recordHealth(): void {
  const h = read();
  h.lastWriteAt = new Date().toISOString();
  write(h);
}

/** Medic: append a fault to the durable fault log and bump the count. Never throws. */
export function recordFault(role: string, err: unknown): void {
  try {
    mkdirSync(scribeDir(), { recursive: true });
    const msg = `${new Date().toISOString()} [${role}] ${err instanceof Error ? err.message : String(err)}`;
    const fd = openSync(faultLogFile(), "a");
    try {
      writeSync(fd, `${msg}\n`);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    const h = read();
    h.faultCount = (h.faultCount ?? 0) + 1;
    h.lastFault = msg;
    write(h);
  } catch {
    /* health logging must never break the writer */
  }
}

export function readHealth(): Health {
  return read();
}
