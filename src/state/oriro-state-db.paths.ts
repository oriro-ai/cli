// State database path helpers resolve shared Oriro state DB paths.
import os from "node:os";
import path from "node:path";
import { isMainThread, threadId } from "node:worker_threads";
import { resolveStateDir } from "../config/paths.js";
import { parseStrictNonNegativeInteger } from "../infra/parse-finite-number.js";

/**
 * Path helpers for the shared Oriro SQLite state database.
 *
 * Tests get worker-scoped temp state roots unless they explicitly provide
 * `ORIRO_STATE_DIR`, which prevents parallel Vitest workers from sharing WAL files.
 */
function resolveOriroStateRootDir(env: NodeJS.ProcessEnv): string {
  if (env.ORIRO_STATE_DIR?.trim()) {
    return resolveStateDir(env);
  }
  if (env.VITEST || env.NODE_ENV === "test") {
    const workerId = parseStrictNonNegativeInteger(
      env.VITEST_WORKER_ID ?? env.VITEST_POOL_ID ?? "",
    );
    const shardSuffix =
      workerId !== undefined
        ? `${process.pid}-${workerId}`
        : isMainThread
          ? String(process.pid)
          : `${process.pid}-${threadId}`;
    return path.join(os.tmpdir(), "oriro-test-state", shardSuffix);
  }
  return resolveStateDir(env);
}

/** Resolve the directory that contains the shared state SQLite file. */
export function resolveOriroStateSqliteDir(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveOriroStateRootDir(env), "state");
}

/** Resolve the shared state SQLite file path. */
export function resolveOriroStateSqlitePath(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveOriroStateSqliteDir(env), "oriro.sqlite");
}
