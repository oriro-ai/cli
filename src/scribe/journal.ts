// ORIRO Scribe — durable journal writer. Append is synchronous + fsync'd so a
// captured turn is never lost (100%, not the 99% an async buffer risks on crash).
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeSync,
} from "node:fs";
import { journalFile, scribeDir } from "./paths.js";

/** Atomically append content to the dated journal and flush to disk. */
export function appendJournal(date: string, content: string): void {
  mkdirSync(scribeDir(), { recursive: true });
  const fd = openSync(journalFile(date), "a");
  try {
    writeSync(fd, content.endsWith("\n") ? content : `${content}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/** Read a dated journal (empty string if none). */
export function readJournal(date: string): string {
  const f = journalFile(date);
  return existsSync(f) ? readFileSync(f, "utf8") : "";
}
