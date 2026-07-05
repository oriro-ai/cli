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
import { cycleMode, getMode, setMode, MODE_META, MODES, getThinking, toggleThinking, THINKING_PRIMER } from "./permission.js";
import { parsePlanSlash, enterPlan, approvePlan, rejectPlan, notePlanOutput, PLAN_PRIMER } from "./plan-mode.js";
import { armPostureGate } from "./posture-gate.js";
import { getTerminalLanguage } from "../language/index.js";
import { translateIncoming, translateOutgoing } from "../language/gateway.js";
import { noteUserInput } from "../scribe/scribe-pi.js";
import { listen } from "../avatar/voice.js";
import { scrubOutput } from "../identity/filter.js";
import { phantomFileWarning } from "./verify-actions.js";
import { isRouterSlash, handleRouterSlash } from "./slash-routers.js";
import { isUsageSlash, handleUsage } from "./slash-usage.js";
import { isArtifactSlash, handleArtifactSlash } from "./slash-artifacts.js";
import { isCompactSlash, handleCompact } from "./slash-compact.js";
import { isInitSlash, handleInit } from "./slash-init.js";
import { isSessionsSlash, handleSessions, isUndoSlash, handleUndo } from "./slash-sessions.js";
import { isAgentsSlash, handleAgents } from "./slash-agents.js";
import { extractArtifacts, setArtifacts } from "./artifacts.js";
import { bumpTurns, getTrace, toggleTrace } from "./repl-state.js";
import { onRaceStatus } from "../routers/race-status.js";

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

/** The posture bar: ● Manual · ✎ Accept Edits · ⏵⏵ Auto · ▢ Plan  + Thinking + the key hints. */
function footerText(): string {
  const cur = getMode();
  const bar = MODES.map((m) => {
    const meta = MODE_META[m];
    const s = `${meta.indicator} ${meta.label}`;
    return m === cur ? accent(s) : dim(s);
  }).join(dim(" · "));
  const think = getThinking() ? accent("🧠 Thinking") : dim("🧠 Thinking");
  return `${bar}   ${think}   ${dim("Shift+Tab posture · Alt+Shift+T thinking · /exit")}`;
}

export async function runTuiRepl(session: AgentSession): Promise<void> {
  armPostureGate(); // interactive TUI → posture "ask" decisions are enforced (readline/CI never arm)
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

  // Shift+Tab cycles the posture (\x1b[Z). Alt+Shift+T toggles the thinking cycle: Alt sends an
  // ESC prefix and Shift makes the letter uppercase, so the sequence is ESC + 'T' (\x1bT). Accept
  // the lowercase Alt+t (\x1bt) as an alias so it fires on terminals that don't uppercase.
  const removeListener = tui.addInputListener((data) => {
    if (data === "\x1b[Z") {
      const before = getMode();
      if (cycleMode() === "plan") enterPlan(before); // remember the posture to restore on /approve
      refreshFooter();
      return { consume: true };
    }
    if (data === "\x1bT" || data === "\x1bt") {
      toggleThinking();
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
      // Discoverable list of every in-chat command (kept in sync with repl.ts replHelp).
      const help = [
        "  Just type to chat — ORIRO writes and runs code for you (keyless, free).",
        `  ${accent("/routers")} pool add·rotate   ${accent("/model")} <id…> switch   ${accent("/usage")} health   ${accent("/trace")} tool+router activity   ${accent("/compact")} free context`,
        `  ${accent("/review")} artifacts   ${accent("/save")} <n> [path]   ${accent("/init")} AGENTS.md   ${accent("/skills")}   ${accent("/connectors")}   ${accent("/voice")}`,
        `  ${accent("/sessions")} list saved   ${accent("/undo")} rewind a turn   ${dim("resume:")} ${accent("oriro -c")} / ${accent("oriro --resume <id>")}`,
        `  ${accent("/plan")} <task> plan read-only   ${accent("/approve")} execute it   ${accent("/reject")} discard   ${accent("/agents")} parallel worktree fan-out`,
        `  ${dim("Shift+Tab")} posture   ${dim("Alt+Shift+T")} thinking   ${accent("/help")}   ${accent("/exit")}`,
      ].join("\n");
      chat.addChild(new Text(help, 0, 0));
      editor.setText("");
      tui.requestRender();
      return;
    }
    if (slash === "/skill" || slash === "/skills") {
      chat.addChild(new Text(dim("  326 skills bundled & active. Browse them: `oriro skills list --all` in your shell."), 0, 0));
      editor.setText(""); tui.requestRender();
      return;
    }
    if (slash === "/connector" || slash === "/connectors") {
      chat.addChild(new Text(dim("  59 MCP connectors. Add your own: `oriro connectors setup` · or `oriro connectors add <slug>`."), 0, 0));
      editor.setText(""); tui.requestRender();
      return;
    }
    if (isRouterSlash(slash)) {
      editor.setText("");
      const pending = new Text(dim("  …"), 0, 0);
      chat.addChild(pending);
      tui.requestRender();
      void (async () => {
        const lines = await handleRouterSlash(text);
        pending.setText(lines.join("\n"));
        tui.requestRender();
      })();
      return;
    }
    if (isUsageSlash(slash)) {
      chat.addChild(new Text(handleUsage().join("\n"), 0, 0));
      editor.setText(""); tui.requestRender();
      return;
    }
    if (slash === "/trace") {
      const on = toggleTrace();
      chat.addChild(new Text(dim(`  trace ${on ? "ON — showing tool + router activity" : "off"}`), 0, 0));
      editor.setText(""); tui.requestRender();
      return;
    }
    if (isArtifactSlash(slash)) {
      chat.addChild(new Text(handleArtifactSlash(text).join("\n"), 0, 0));
      editor.setText(""); tui.requestRender();
      return;
    }
    if (isCompactSlash(slash)) {
      editor.setText("");
      const pending = new Text(dim("  compacting…"), 0, 0);
      chat.addChild(pending);
      tui.requestRender();
      void (async () => {
        const lines = await handleCompact(session, text);
        pending.setText(lines.join("\n"));
        tui.requestRender();
      })();
      return;
    }
    if (isInitSlash(slash)) {
      chat.addChild(new Text(handleInit(text).join("\n"), 0, 0));
      editor.setText(""); tui.requestRender();
      return;
    }
    if (isSessionsSlash(slash) || isUndoSlash(slash)) {
      editor.setText("");
      const pending = new Text(dim("  …"), 0, 0);
      chat.addChild(pending);
      tui.requestRender();
      void (async () => {
        const lines = isUndoSlash(slash) ? await handleUndo(session) : await handleSessions();
        pending.setText(lines.join("\n"));
        tui.requestRender();
      })();
      return;
    }
    if (isAgentsSlash(slash)) {
      editor.setText("");
      const pending = new Text(dim("  ⚒ deploying agents…"), 0, 0);
      chat.addChild(pending);
      tui.requestRender();
      void (async () => {
        const lines = await handleAgents(text);
        pending.setText(lines.join("\n"));
        tui.requestRender();
      })();
      return;
    }

    // V0.3.5 Plan mode — /plan [task] · /approve · /reject (plan → approve → execute).
    const plan = parsePlanSlash(text);
    let internalPrompt: string | undefined; // fixed English prompt (skips translation)
    let turnText = text;
    if (plan) {
      if (plan.cmd === "reject") {
        const had = rejectPlan();
        chat.addChild(new Text(dim(had ? "  ▢ plan discarded — refine the request (still in Plan) or Shift+Tab out" : "  ▢ nothing to reject — no plan is waiting"), 0, 0));
        editor.setText(""); tui.requestRender();
        return;
      }
      if (plan.cmd === "approve") {
        const r = approvePlan();
        if (!r.ok) {
          chat.addChild(new Text(dim(`  ▢ ${r.reason}`), 0, 0));
          editor.setText(""); tui.requestRender();
          return;
        }
        setMode(r.restoreMode); // leave read-only BEFORE executing
        refreshFooter();
        internalPrompt = r.prompt;
      } else {
        // /plan — enter the posture; with a task, plan it this turn; without, explain the loop.
        enterPlan(getMode());
        setMode("plan");
        refreshFooter();
        if (!plan.task) {
          chat.addChild(new Text(dim("  ▢ Plan mode — describe the task and I'll plan it (read-only). Then ") + accent("/approve") + dim(" to execute · ") + accent("/reject") + dim(" to discard."), 0, 0));
          editor.setText(""); tui.requestRender();
          return;
        }
        turnText = plan.task;
      }
    }

    if (slash === "/voice") {
      // Speak a turn: record the mic + transcribe on-device, then drop the text into the editor to review + send.
      editor.setText("");
      const status = new Text(dim("  🎙 listening… (needs ffmpeg + the transformers voice peer)"), 0, 0);
      chat.addChild(status);
      tui.requestRender();
      void (async () => {
        const heard = await listen();
        if (heard?.text) {
          status.setText(dim(`  🎙 heard [${heard.language}]:`));
          editor.setText(heard.text);
        } else {
          status.setText(dim("  🎙 voice input unavailable (install ffmpeg + `npm i @huggingface/transformers`)."));
        }
        tui.requestRender();
      })();
      return;
    }

    editor.addToHistory(text);
    editor.setText("");
    chat.addChild(new Text(`${accent("›")} ${text}`, 0, 1));
    // Live race line: shows the router NAMES competing this turn and which one won.
    const raceLine = new Text("", 0, 0);
    chat.addChild(raceLine);
    const streaming = new Text(dim("…"), 0, 0);
    chat.addChild(streaming);
    const unsubRace = onRaceStatus((s) => {
      if (s.phase === "racing" && s.racers.length > 1) {
        raceLine.setText(dim(`  ⏱ racing: ${s.racers.join(" · ")}`));
      } else if (s.phase === "won" && s.winner && s.racers.length > 1) {
        raceLine.setText(dim(`  ⏱ ${s.racers.join(" · ")} → won: `) + accent(s.winner));
      } else {
        raceLine.setText("");
      }
      tui.requestRender();
    });
    tui.requestRender();

    busy = true;
    bumpTurns(); // /usage turn counter
    void (async () => {
      let english = internalPrompt ?? (await translateIncoming(turnText));
      if (getMode() === "plan") english = `${PLAN_PRIMER}\n\n${english}`; // every plan-mode turn plans, read-only
      if (getThinking()) english = `${THINKING_PRIMER}\n\n${english}`; // plan-first when thinking is on
      noteUserInput(text);
      let out = "";
      const unsub = session.subscribe(
        (e: { type: string; assistantMessageEvent?: { type: string; delta?: string }; toolName?: string }) => {
          if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
            out += e.assistantMessageEvent.delta ?? "";
            if (isEnglish) {
              streaming.setText(out);
              tui.requestRender();
            }
          } else if (getTrace() && (e.type === "tool_start" || e.type === "tool_end" || e.type === "toolcall_start")) {
            // /trace: surface tool activity (normally hidden) — a lightweight trace line per tool event.
            chat.addChild(new Text(dim(`  ⚙ ${e.type.replace("_", " ")}${e.toolName ? `: ${e.toolName}` : ""}`), 0, 0));
            tui.requestRender();
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
        unsubRace();
        return;
      }
      unsub();
      unsubRace();
      const cleaned = scrubOutput(out); // strip any third-party router ad/promo before the final render
      const finalText = isEnglish ? cleaned.trim() : await translateOutgoing(cleaned.trim());
      const warn = phantomFileWarning(finalText); // flag claimed-but-absent file writes (weak-router hallucination)
      const arts = extractArtifacts(finalText); // capture code/SVG artifacts for /review + /save
      setArtifacts(arts);
      const hint = arts.length ? dim(`\n  ⎘ ${arts.length} artifact${arts.length === 1 ? "" : "s"} — /review to save`) : "";
      streaming.setText((finalText || dim("(no response)")) + (warn ? dim(warn) : "") + hint);
      if (getMode() === "plan" && notePlanOutput(finalText)) {
        chat.addChild(new Text(dim("  ▢ plan ready — ") + accent("/approve") + dim(" to execute · ") + accent("/reject") + dim(" to discard"), 0, 0));
      }
      tui.requestRender();
      busy = false;
    })();
  };

  tui.start();
  refreshFooter();
  // Keep the process alive; the TUI is event-driven and cleanup() exits.
  await new Promise<void>(() => {});
}
