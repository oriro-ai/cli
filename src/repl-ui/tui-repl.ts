// ORIRO TUI REPL — a focused, fully-ORIRO terminal UI built on the pi-tui toolkit (NOT Pi's
// InteractiveMode, so zero Pi branding/surface). It adds the thing the readline loop couldn't: a
// PERSISTENT bottom FOOTER showing the permission postures with a Shift+Tab cycle —
//   ● Manual · ✎ Accept Edits · ⏵⏵ Auto · ▢ Plan
// Guardian stays the floor (blocks wipes/exfil/curl|sh in every posture); Plan is read-only.
//
// Only used on a real TTY. When stdin/stdout isn't a terminal (pipes, CI, the QA harness), the
// caller falls back to the plain readline loop — so non-interactive use is unaffected.
//
// NOTE: a raw-mode TUI cannot be auto-verified without a PTY; the rendering is confirmed in a real
// terminal. The posture logic it drives (permission.ts) is unit-tested separately.

import { ProcessTerminal, TUI, Editor, Text, Container, type EditorTheme } from "@earendil-works/pi-tui";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { accent, dim } from "../ui/theme.js";
import { cycleMode, getMode, MODE_META, MODES } from "./permission.js";
import { getTerminalLanguage } from "../language/index.js";
import { translateIncoming, translateOutgoing } from "../language/gateway.js";
import { noteUserInput } from "../scribe/scribe-pi.js";

const editorTheme: EditorTheme = {
  borderColor: (s) => dim(s),
  selectList: {
    selectedPrefix: (s) => accent(s),
    selectedText: (s) => accent(s),
    description: (s) => dim(s),
    scrollInfo: (s) => dim(s),
    noMatch: (s) => dim(s),
  },
};

/** The posture bar: ● Manual · ✎ Accept Edits · ⏵⏵ Auto · ▢ Plan  + the Shift+Tab hint. */
function footerText(): string {
  const cur = getMode();
  const bar = MODES.map((m) => {
    const meta = MODE_META[m];
    const s = `${meta.indicator} ${meta.label}`;
    return m === cur ? accent(s) : dim(s);
  }).join(dim(" · "));
  return `${bar}   ${dim("Shift+Tab to switch · /exit")}`;
}

export async function runTuiRepl(session: AgentSession): Promise<void> {
  const isEnglish = getTerminalLanguage().code.toLowerCase().startsWith("en");
  const term = new ProcessTerminal();
  const tui = new TUI(term, true);

  const chat = new Container();
  const editor = new Editor(tui, editorTheme, { paddingX: 1 });
  const sep = new Text(dim("─".repeat(Math.max(8, term.columns))), 0, 0);
  const footer = new Text(footerText(), 0, 0);

  tui.addChild(chat);
  tui.addChild(editor);
  tui.addChild(sep);
  tui.addChild(footer);
  tui.setFocus(editor);

  const refreshFooter = (): void => {
    sep.setText(dim("─".repeat(Math.max(8, term.columns))));
    footer.setText(footerText());
    tui.requestRender();
  };

  // Shift+Tab cycles the posture. (ProcessTerminal emits \x1b[Z for Shift+Tab, incl. on Windows.)
  const removeListener = tui.addInputListener((data) => {
    if (data === "\x1b[Z") {
      cycleMode();
      refreshFooter();
      return { consume: true };
    }
    return undefined;
  });

  let stopped = false;
  const cleanup = (): void => {
    if (stopped) return;
    stopped = true;
    try { removeListener(); } catch { /* */ }
    try { session.dispose(); } catch { /* */ }
    try { tui.stop(); } catch { /* */ }
    process.stdout.write(dim("\nBye.\n"));
    process.exit(0);
  };
  process.on("SIGINT", cleanup);

  let busy = false;
  editor.onSubmit = (raw: string): void => {
    const text = raw.trim();
    if (!text || busy) return;
    const slash = text.toLowerCase();
    if (slash === "/exit" || slash === "/quit") return cleanup();
    if (slash === "/help" || slash === "/?") {
      chat.addChild(new Text(dim("  Just type to chat. Shift+Tab cycles posture. /exit to leave."), 0, 0));
      editor.setText("");
      tui.requestRender();
      return;
    }

    editor.addToHistory(text);
    editor.setText("");
    chat.addChild(new Text(`${accent("›")} ${text}`, 0, 1));
    const streaming = new Text(dim("…"), 0, 0);
    chat.addChild(streaming);
    tui.requestRender();

    busy = true;
    void (async () => {
      const english = await translateIncoming(text);
      noteUserInput(text);
      let out = "";
      const unsub = session.subscribe(
        (e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
          if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
            out += e.assistantMessageEvent.delta ?? "";
            if (isEnglish) {
              streaming.setText(out);
              tui.requestRender();
            }
          }
        },
      );
      try {
        await session.prompt(english);
      } catch {
        streaming.setText(dim("(every free router is busy right now — give it a moment and try again)"));
        tui.requestRender();
        busy = false;
        unsub();
        return;
      }
      unsub();
      const finalText = isEnglish ? out.trim() : await translateOutgoing(out.trim());
      streaming.setText(finalText || dim("(no response)"));
      tui.requestRender();
      busy = false;
    })();
  };

  tui.start();
  refreshFooter();
  // Keep the process alive; the TUI is event-driven and cleanup() exits.
  await new Promise<void>(() => {});
}
