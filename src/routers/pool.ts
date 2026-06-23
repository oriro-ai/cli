// ORIRO Step 6 — the user's selected router pool (multi-select). Persisted locally so
// the Best-Router Mux routes across exactly the routers the user picked, across sessions.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function poolFile(dir: string): string {
  return join(dir, "routers", "selected.json");
}

export function loadPool(dir: string): string[] {
  const p = poolFile(dir);
  if (!existsSync(p)) return [];
  try {
    const v = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export function savePool(dir: string, ids: string[]): void {
  mkdirSync(join(dir, "routers"), { recursive: true });
  writeFileSync(poolFile(dir), JSON.stringify([...new Set(ids)], null, 2), "utf8");
}
