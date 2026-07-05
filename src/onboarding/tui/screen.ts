// ORIRO premium wizard — raw-mode SCREEN primitives (V0.5.0), built on the same pi-tui toolkit the
// chat REPL uses (TUI · Container · Text · addInputListener). Each primitive renders into a shared
// root Container and resolves a Promise on the user's choice. Selection math lives in the tested
// SelectState; these are thin renderers + key handling. A raw-mode TUI can't be auto-verified without
// a PTY — so the wizard that composes these is wrapped in a hard fallback to the linear onboarding.
import { TUI, Container, Text } from "@earendil-works/pi-tui";
import { accent, dim, bold, fgHex, PALETTE } from "../../ui/theme.js";
import { SelectState } from "./select-state.js";

// Raw key sequences (matched directly, like tui-repl's Shift+Tab handling — no Key-name guessing).
const UP = "\x1b[A", DOWN = "\x1b[B", ENTER1 = "\r", ENTER2 = "\n";
const BS1 = "\x7f", BS2 = "\b", ESC = "\x1b", CTRLC = "\x03";
const isPrintable = (d: string): boolean => d.length === 1 && d >= " " && d !== "\x7f";

/** A titled progress header line: "◯ ORIRO setup · Step 3/9 — Avatar". */
function headerLine(step: number, total: number, title: string): string {
  const rail = Array.from({ length: total }, (_, i) => (i < step ? accent("●") : dim("○"))).join("");
  return `  ${accent("◯")} ${bold("ORIRO setup")}  ${rail}  ${dim(`Step ${step}/${total} —`)} ${bold(title)}`;
}

export interface ListScreen<T> {
  step: number; total: number; title: string;
  subtitle?: string;
  items: T[];
  label: (t: T) => string;
  height?: number;
  filter?: (all: T[], q: string) => T[]; // provide → type-to-filter
  filterHint?: string;
}

/** Arrow-key (↑/↓) selectable list with optional type-to-filter. Enter selects; Esc/Ctrl-C cancels. */
export function pickList<T>(tui: TUI, root: Container, s: ListScreen<T>): Promise<T | null> {
  const state = new SelectState(s.items, { height: s.height ?? 12, filter: s.filter });
  return new Promise<T | null>((resolve) => {
    let done = false;
    const render = (): void => {
      root.clear();
      root.addChild(new Text(headerLine(s.step, s.total, s.title), 0, 1));
      if (s.subtitle) root.addChild(new Text(`  ${dim(s.subtitle)}`, 0, 1));
      const w = state.window();
      if (s.filter) {
        const q = state.filter ? accent(state.filter) : dim(s.filterHint ?? "type to filter");
        root.addChild(new Text(`  ${dim("search:")} ${q}${dim(w.total ? `   ${w.total} match${w.total === 1 ? "" : "es"}` : "   no matches")}`, 0, 1));
      }
      if (w.above > 0) root.addChild(new Text(`  ${dim(`↑ ${w.above} more`)}`, 0, 0));
      w.rows.forEach((row, i) => {
        const on = i === w.cursorInWindow;
        const text = s.label(row);
        root.addChild(new Text(on ? `  ${accent("›")} ${accent(text)}` : `    ${dim(text)}`, 0, 0));
      });
      if (w.below > 0) root.addChild(new Text(`  ${dim(`↓ ${w.below} more`)}`, 0, 0));
      root.addChild(new Text(`\n  ${dim("↑/↓ move · Enter select" + (s.filter ? " · type to filter" : "") + " · Esc skip")}`, 0, 1));
      tui.requestRender();
    };
    const finish = (val: T | null): void => {
      if (done) return; done = true;
      remove();
      resolve(val);
    };
    const remove = tui.addInputListener((data): { consume: true } | undefined => {
      if (done) return undefined;
      if (data === UP) { state.move(-1); render(); return { consume: true }; }
      if (data === DOWN) { state.move(1); render(); return { consume: true }; }
      if (data === ENTER1 || data === ENTER2) { finish(state.selected() ?? null); return { consume: true }; }
      if (data === ESC || data === CTRLC) { finish(null); return { consume: true }; }
      if (s.filter && (data === BS1 || data === BS2)) { state.setFilter(state.filter.slice(0, -1)); render(); return { consume: true }; }
      if (s.filter && isPrintable(data)) { state.setFilter(state.filter + data); render(); return { consume: true }; }
      return undefined;
    });
    render();
  });
}

export interface NoticeScreen {
  step: number; total: number; title: string;
  lines: string[]; // already-styled body lines
  prompt?: string;
}

/** An info panel; any key (Enter) continues. */
export function notice(tui: TUI, root: Container, s: NoticeScreen): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    root.clear();
    root.addChild(new Text(headerLine(s.step, s.total, s.title), 0, 1));
    for (const l of s.lines) root.addChild(new Text(l, 0, 0));
    root.addChild(new Text(`\n  ${dim(s.prompt ?? "Press Enter to continue…")}`, 0, 1));
    tui.requestRender();
    const remove = tui.addInputListener((data): { consume: true } | undefined => {
      if (done) return undefined;
      if (data === ENTER1 || data === ENTER2 || data === ESC || data === CTRLC || isPrintable(data)) {
        done = true; remove(); resolve();
        return { consume: true };
      }
      return undefined;
    });
  });
}

/** A yes/no confirm. Default is applied on Enter. y/n set explicitly. */
export function confirmYesNo(tui: TUI, root: Container, s: { step: number; total: number; title: string; lines: string[]; def: boolean }): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let done = false;
    root.clear();
    root.addChild(new Text(headerLine(s.step, s.total, s.title), 0, 1));
    for (const l of s.lines) root.addChild(new Text(l, 0, 0));
    root.addChild(new Text(`\n  ${dim(`[${s.def ? "Y/n" : "y/N"}]  y = yes · n = no · Enter = ${s.def ? "yes" : "no"}`)}`, 0, 1));
    tui.requestRender();
    const finish = (v: boolean): void => { if (done) return; done = true; remove(); resolve(v); };
    const remove = tui.addInputListener((data): { consume: true } | undefined => {
      if (done) return undefined;
      const c = data.toLowerCase();
      if (c === "y") { finish(true); return { consume: true }; }
      if (c === "n") { finish(false); return { consume: true }; }
      if (data === ENTER1 || data === ENTER2) { finish(s.def); return { consume: true }; }
      if (data === ESC || data === CTRLC) { finish(s.def); return { consume: true }; }
      return undefined;
    });
  });
}

/** A single-line text input (e.g. a connector name). Enter submits; empty is allowed. */
export function promptLine(tui: TUI, root: Container, s: { step: number; total: number; title: string; lines: string[]; label: string }): Promise<string> {
  return new Promise<string>((resolve) => {
    let done = false; let buf = "";
    const render = (): void => {
      root.clear();
      root.addChild(new Text(headerLine(s.step, s.total, s.title), 0, 1));
      for (const l of s.lines) root.addChild(new Text(l, 0, 0));
      root.addChild(new Text(`\n  ${accent("›")} ${s.label}: ${bold(buf)}${fgHex(PALETTE.gold, "▏")}`, 0, 1));
      root.addChild(new Text(`  ${dim("Enter to continue · empty to skip")}`, 0, 0));
      tui.requestRender();
    };
    const finish = (): void => { if (done) return; done = true; remove(); resolve(buf.trim()); };
    const remove = tui.addInputListener((data): { consume: true } | undefined => {
      if (done) return undefined;
      if (data === ENTER1 || data === ENTER2) { finish(); return { consume: true }; }
      if (data === ESC || data === CTRLC) { buf = ""; finish(); return { consume: true }; }
      if (data === BS1 || data === BS2) { buf = buf.slice(0, -1); render(); return { consume: true }; }
      if (isPrintable(data)) { buf += data; render(); return { consume: true }; }
      return undefined;
    });
    render();
  });
}
