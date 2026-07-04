// UX-6 (2026-07-04): a small persistent config store at ~/.oriro/config.json. Durable user defaults
// (cli-microsoft365's config store gap) — e.g. a default --output format so list commands don't need
// the flag every time. Known keys are validated on set; unknown keys are rejected (no silent typos).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { oriroDir } from "./paths.js";

export type ConfigKey = "output" | "lang" | "thinking";

interface KeySpec { desc: string; validate?: (v: string) => string | null; }

const KEYS: Record<ConfigKey, KeySpec> = {
  output: {
    desc: "default output format for list commands: text | json | csv",
    validate: (v) => (["text", "json", "csv"].includes(v) ? null : "must be text | json | csv"),
  },
  lang: { desc: "preferred UI language code (e.g. en, hi, es) — overrides terminal detection" },
  thinking: {
    desc: "default REPL thinking mode: on | off",
    validate: (v) => (["on", "off"].includes(v) ? null : "must be on | off"),
  },
};

export function configKeys(): { key: ConfigKey; desc: string }[] {
  return (Object.keys(KEYS) as ConfigKey[]).map((key) => ({ key, desc: KEYS[key].desc }));
}
export function isConfigKey(k: string): k is ConfigKey {
  return k in KEYS;
}
export function validateConfig(key: ConfigKey, value: string): string | null {
  return KEYS[key].validate?.(value) ?? null;
}

function file(): string {
  return join(oriroDir(), "config.json");
}

let cache: Record<string, string> | null = null;

function readAll(): Record<string, string> {
  if (cache) return cache;
  try {
    const v = JSON.parse(readFileSync(file(), "utf8")) as unknown;
    cache = v && typeof v === "object" ? (v as Record<string, string>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export function configGet(key: ConfigKey): string | undefined {
  return readAll()[key];
}
export function configAll(): Record<string, string> {
  return { ...readAll() };
}
export function configSet(key: ConfigKey, value: string): void {
  const all = { ...readAll(), [key]: value };
  mkdirSync(oriroDir(), { recursive: true });
  writeFileSync(file(), JSON.stringify(all, null, 2), "utf8");
  cache = all;
}
export function configUnset(key: ConfigKey): boolean {
  const all = readAll();
  if (!(key in all)) return false;
  const rest = { ...all };
  delete rest[key];
  writeFileSync(file(), JSON.stringify(rest, null, 2), "utf8");
  cache = rest;
  return true;
}
