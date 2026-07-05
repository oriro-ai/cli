// ORIRO onboarding — the added first-run steps (skills, connectors, and the ORIRO Gauss + Avila
// V2.4 preview) plus the localized welcome. Each step is skip-friendly and persists a settled
// marker under ~/.oriro so it is offered ONCE. Keyless-first: skipping anything still leaves a
// fully working CLI. Dependency-light (node:readline), same posture as the language/router steps.
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { oriroDir } from "../config/paths.js";
import { loadOriroSkills } from "../skills/loader.js";
import { listConnectors, addConnector } from "../connectors/connectors.js";
import { accent, dim, bold } from "../ui/theme.js";
import { ask } from "./prompt.js";

// ── settled markers ─────────────────────────────────────────────────────────
function markerFile(name: string): string {
  return join(oriroDir(), name);
}
function settled(name: string): boolean {
  try { return existsSync(markerFile(name)); } catch { return false; }
}
function settle(name: string, data: Record<string, unknown> = {}): void {
  try {
    mkdirSync(oriroDir(), { recursive: true });
    writeFileSync(markerFile(name), `${JSON.stringify({ at: new Date().toISOString(), ...data }, null, 2)}\n`, "utf8");
  } catch { /* marker is a convenience; never fatal */ }
}

// ── localized welcome ────────────────────────────────────────────────────────
const WELCOME: Record<string, string> = {
  en: "Welcome to ORIRO-CLI", es: "Bienvenido a ORIRO-CLI", fr: "Bienvenue sur ORIRO-CLI",
  de: "Willkommen bei ORIRO-CLI", pt: "Bem-vindo ao ORIRO-CLI", it: "Benvenuto in ORIRO-CLI",
  nl: "Welkom bij ORIRO-CLI", hi: "ORIRO-CLI में आपका स्वागत है", zh: "欢迎使用 ORIRO-CLI",
  ja: "ORIRO-CLI へようこそ", ko: "ORIRO-CLI에 오신 것을 환영합니다", ru: "Добро пожаловать в ORIRO-CLI",
  ar: "مرحبًا بك في ORIRO-CLI", tr: "ORIRO-CLI'ye hoş geldiniz", pl: "Witamy w ORIRO-CLI",
  uk: "Ласкаво просимо до ORIRO-CLI", vi: "Chào mừng đến với ORIRO-CLI", id: "Selamat datang di ORIRO-CLI",
  th: "ยินดีต้อนรับสู่ ORIRO-CLI", sv: "Välkommen till ORIRO-CLI", bn: "ORIRO-CLI তে স্বাগতম",
  ta: "ORIRO-CLI க்கு வரவேற்கிறோம்", te: "ORIRO-CLI కి స్వాగతం", mr: "ORIRO-CLI मध्ये आपले स्वागत आहे",
};
export function welcomeIn(code: string): string {
  return WELCOME[(code || "en").toLowerCase().slice(0, 2)] ?? WELCOME.en ?? "Welcome to ORIRO-CLI";
}

// ── Step 5: skills (all bundled; browse/keep) ────────────────────────────────
export function hasSkillsChoice(): boolean { return settled("skills-onboarded.json"); }

export async function runSkillsStep(): Promise<void> {
  const s = await loadOriroSkills();
  stdout.write(
    `\n  ${accent("Skills")} — ${accent(String(s.all.length))} are bundled and ${accent("already active")} ` +
    `${dim(`(${s.core.length} model-visible · ${s.tail.length} on-demand via /name)`)}.\n` +
    `  ${dim("Nothing to install. Browse them anytime with ")}${accent("oriro skills list")}${dim(" or ")}${accent("/skill")}${dim(" in chat.")}\n`,
  );
  const rl = createInterface({ input: stdin, output: stdout });
  try { await ask(rl, `  ${dim("Press Enter to keep all active…")} `); } finally { rl.close(); }
  settle("skills-onboarded.json", { count: s.all.length });
}

// ── Step 6: connectors (add one or skip) ─────────────────────────────────────
export function hasConnectorsChoice(): boolean { return settled("connectors-onboarded.json"); }

export async function runConnectorsStep(): Promise<void> {
  const addable = listConnectors().filter((c) => c.mcpUrl).length;
  stdout.write(
    `\n  ${accent("Connectors")} — ${accent(String(addable))} MCP integrations available ${dim("(e.g. ")}${accent("slack")}${dim(", ")}${accent("github")}${dim(", ")}${accent("notion")}${dim(", ")}${accent("linear")}${dim(").")}\n` +
    `  ${dim("Type a name to add one now, or press Enter to skip — add anytime with ")}${accent("oriro connectors add <name>")}${dim(".")}\n`,
  );
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    // Accept a leading "/" (people type "/connector" out of habit) and a stray "add " prefix.
    const slug = (await ask(rl, `  ${accent("›")} Connector name ${dim("(or Enter to skip)")}: `))
      .trim().replace(/^\/+/, "").replace(/^add\s+/i, "").trim();
    if (slug && !/^connectors?$/i.test(slug)) {
      const res = addConnector(slug);
      stdout.write(res.ok
        ? `  ${accent("✓")} added ${accent(slug)} — recorded locally.\n`
        : `  ${dim(`${res.error ?? "not a known connector"} — see the full list with `)}${accent("oriro connectors list")}${dim(". Skipping for now.")}\n`);
    } else {
      stdout.write(`  ${dim("Skipped — none added. You can add your own MCP server with `oriro connectors setup`.")}\n`);
    }
  } finally { rl.close(); }
  settle("connectors-onboarded.json", {});
}

// ── Step 8: ORIRO Gauss + Avila (V2.4) — READY to download to this machine ────
export function hasModelsChoice(): boolean { return settled("models-onboarded.json"); }

export async function runModelsStep(): Promise<void> {
  stdout.write(
    `\n  ${bold(accent("ORIRO Gauss + Avila"))} ${dim("(V2.4)")} — your own ${accent("on-device")} models, ${accent("ready now")}.\n` +
    `    ${dim("•")} run ${accent("fully on this machine")} ${dim("— $0, no key, private (no Ollama needed)")}\n` +
    `    ${dim("•")} join your ${accent("router race")} alongside the free routers ${dim("(and your BYOK)")}\n` +
    `    ${dim("•")} device-locked on download ${dim("— the weights never leave this machine")}\n` +
    `  ${dim("Download them (≈8 GB each, resumable):")}\n` +
    `    ${accent("1.")} ${dim("get a one-time code on")} ${accent("oriro.app → Download → “Connect this computer”")}\n` +
    `    ${accent("2.")} ${accent("oriro login <code>")}  ${dim("then")}  ${accent("oriro models pull")}\n` +
    `  ${dim("Already downloaded the GGUFs from oriro.app? ")}${accent("oriro models import <files>")}${dim(" — no login needed.")}\n`,
  );
  const rl = createInterface({ input: stdin, output: stdout });
  try { await ask(rl, `  ${dim("Press Enter to continue…")} `); } finally { rl.close(); }
  settle("models-onboarded.json", { status: "ready", version: "2.4" });
}
