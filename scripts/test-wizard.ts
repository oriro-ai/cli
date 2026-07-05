// Headless integration test for the premium TUI wizard (src/onboarding/tui-wizard.ts). tsx.
// A raw-mode TUI normally needs a PTY — but pi-tui's TUI takes an injectable Terminal, so we drive
// the WHOLE wizard with a mock terminal: feed keystrokes, capture rendered frames, and assert it runs
// to completion and persists the same config the linear flow would. This is what lets the wizard be
// the DEFAULT first-run with confidence. Run: tsx scripts/test-wizard.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "oriro-wizard-"));
process.env.ORIRO_STATE_DIR = tmp; // isolate all config writes BEFORE importing anything that reads it

const { runTuiWizard } = await import("../src/onboarding/tui-wizard.js");
const { isLanguageConfigured, getTerminalLanguage } = await import("../src/language/config.js");
const { hasScribeChoice, isScribeEnabled } = await import("../src/scribe/consent.js");

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// ── Mock Terminal: captures render output + exposes the input callback so we can inject keys ──────
class MockTerminal {
  buffer = "";
  private onInput: ((d: string) => void) | null = null;
  start(onInput: (d: string) => void): void { this.onInput = onInput; }
  stop(): void {}
  async drainInput(): Promise<void> {}
  write(data: string): void { this.buffer += data; }
  get columns(): number { return 100; }
  get rows(): number { return 30; }
  get kittyProtocolActive(): boolean { return false; }
  moveBy(): void {} hideCursor(): void {} showCursor(): void {}
  clearLine(): void {} clearFromCursor(): void {} clearScreen(): void {}
  setTitle(): void {} setProgress(): void {}
  send(data: string): void { this.onInput?.(data); }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred: () => boolean, ms = 5000): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (pred()) return true; await sleep(10); }
  return pred();
}

const term = new MockTerminal();
// Drive the wizard: at each step wait for its header to render, then send the key.
// Step 1 language → Enter (first row = English) · 2 notice → Enter · 3 avatar → Esc (skip) ·
// 4 skills → Enter · 5 connectors → Enter (empty) · 6 routers → Enter · 7 models → Enter · 8 scribe → 'n'.
const script: Array<{ waitText: string; key: string }> = [
  { waitText: "Step 1/8", key: "\r" },
  { waitText: "Step 2/8", key: "\r" },
  { waitText: "Step 3/8", key: "\x1b" },
  { waitText: "Step 4/8", key: "\r" },
  { waitText: "Step 5/8", key: "\r" },
  { waitText: "Step 6/8", key: "\r" },
  { waitText: "Step 7/8", key: "\r" },
  { waitText: "Step 8/8", key: "n" },
];

const wizard = runTuiWizard(term as never); // floating; we drive it via the mock
let threw: string | null = null;
wizard.catch((e) => { threw = e instanceof Error ? e.message : String(e); });

for (const step of script) {
  const seen = await waitFor(() => term.buffer.includes(step.waitText));
  ok(seen, `rendered ${step.waitText}`);
  if (!seen) break;
  term.send(step.key);
  await sleep(20); // let the screen transition + next render settle
}

await Promise.race([wizard, sleep(4000)]);

ok(threw === null, `wizard completed without throwing${threw ? ` (threw: ${threw})` : ""}`);
ok(isLanguageConfigured() && getTerminalLanguage().code === "en", "persisted language = English (first row picked)");
ok(hasScribeChoice() && isScribeEnabled() === false, "persisted scribe consent = false ('n')");
ok(term.buffer.includes("ORIRO setup"), "progress rail rendered ('ORIRO setup')");

rmSync(tmp, { recursive: true, force: true });
process.stdout.write(fails === 0 ? "\nwizard: ALL PASS\n" : `\nwizard: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
