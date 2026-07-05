// ORIRO REPL — the default (no-subcommand) experience: first-run onboarding → assemble the full
// keyless session (Mux + Guardian + Head + Scriber + Orchestrator + skills) → an interactive loop.
//
// On a real terminal we run the rich pi-tui REPL (`repl-ui/tui-repl`) — a persistent posture FOOTER
// (● Manual · ✎ Accept Edits · ⏵⏵ Auto · ▢ Plan) with a Shift+Tab cycle, fully ORIRO-branded.
// When stdin/stdout is NOT a TTY (pipes, CI, the QA harness), we fall back to a plain readline loop
// with the same language seam — so non-interactive use is unaffected.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { banner } from "./ui/banner.js";
import { isFirstRun, runOnboarding } from "./onboarding/wrapper.js";
import { assembleOriroSession } from "./onboarding/assemble.js";
import { noteUserInput } from "./scribe/scribe-pi.js";
import { getTerminalLanguage } from "./language/index.js";
import { translateIncoming, translateOutgoing } from "./language/gateway.js";
import { runTuiRepl } from "./repl-ui/tui-repl.js";
import { setupVoiceInput } from "./voice/setup.js";
import { scrubOutput } from "./identity/filter.js";
import { phantomFileWarning } from "./repl-ui/verify-actions.js";
import { isRouterSlash, handleRouterSlash } from "./repl-ui/slash-routers.js";
import { isUsageSlash, handleUsage } from "./repl-ui/slash-usage.js";
import { isArtifactSlash, handleArtifactSlash } from "./repl-ui/slash-artifacts.js";
import { isCompactSlash, handleCompact } from "./repl-ui/slash-compact.js";
import { isInitSlash, handleInit } from "./repl-ui/slash-init.js";
import { isSessionsSlash, handleSessions, isUndoSlash, handleUndo } from "./repl-ui/slash-sessions.js";
import type { ResumeOpts } from "./sessions/store.js";
import { extractArtifacts, setArtifacts } from "./repl-ui/artifacts.js";
import { parsePlanSlash, enterPlan, approvePlan, rejectPlan, notePlanOutput, PLAN_PRIMER } from "./repl-ui/plan-mode.js";
import { getMode, setMode } from "./repl-ui/permission.js";
import { bumpTurns, toggleTrace } from "./repl-ui/repl-state.js";
import { dim, accent } from "./ui/theme.js";

/** In-REPL help — real, not LLM-fabricated. */
function replHelp(): string {
  // Every in-chat command is listed here so a user can DISCOVER them all from /help — never needs to
  // know a hidden command. (Kept in sync with the slash handlers below + tui-repl's /help.)
  return (
    `\n  ${accent("ORIRO terminal — help")}\n` +
    `  ${dim("Just type to chat; ORIRO writes and runs code for you (keyless, free).")}\n\n` +
    `  ${dim("Models & routers")}   ${accent("/routers")} list·add·rotate the racing pool   ${accent("/model")} <id…> switch\n` +
    `  ${dim("This session")}       ${accent("/usage")} pool health & turns   ${accent("/trace")} activity   ${accent("/compact")} free context   ${accent("/undo")} rewind a turn\n` +
    `  ${dim("Continuity")}         ${accent("/sessions")} list saved sessions   ${dim("resume:")} ${accent("oriro -c")} ${dim("or")} ${accent("oriro --resume <id>")}\n` +
    `  ${dim("Plan loop")}          ${accent("/plan")} <task> read-only plan   ${accent("/approve")} execute it   ${accent("/reject")} discard\n` +
    `  ${dim("Artifacts")}          ${accent("/review")} code/SVG from the last reply   ${accent("/save")} <n> [path] write one\n` +
    `  ${dim("Project")}            ${accent("/init")} write a starter AGENTS.md ORIRO reads each session\n` +
    `  ${dim("Capabilities")}       ${accent("/skills")}   ${accent("/connectors")}   ${accent("/voice")} speak a turn\n` +
    `  ${dim("General")}           ${accent("/help")} this   ${accent("/exit")} / ${accent("/quit")} leave   ${dim("(Ctrl-D / Ctrl-C also exit)")}\n\n` +
    `  ${dim("Full command list outside the chat:")} ${accent("oriro --help")}\n\n`
  );
}

export async function runRepl(opts: { resume?: ResumeOpts } = {}): Promise<void> {
  if (isFirstRun()) await runOnboarding();
  else stdout.write(banner());

  const { session, sessionNote } = await assembleOriroSession({ resume: opts.resume });
  if (sessionNote) stdout.write(`  ${dim(sessionNote)}\n`);
  setupVoiceInput(); // wire the on-device Whisper listener into the voice seam (graceful if absent)

  // Rich TUI (posture footer + Shift+Tab) on a real terminal; plain readline loop otherwise.
  if (stdin.isTTY && stdout.isTTY) {
    await runTuiRepl(session);
    return;
  }
  await runReadlineRepl(session);
}

/** The plain, non-TTY loop (pipes / CI / QA). Same language seam; no footer (no raw-mode terminal). */
async function runReadlineRepl(session: AgentSession): Promise<void> {
  const isEnglish = getTerminalLanguage().code.toLowerCase().startsWith("en");
  const rl = createInterface({ input: stdin, output: stdout });

  let closing = false;
  const onSigint = (): void => {
    if (closing) return;
    closing = true;
    stdout.write(dim("\nBye.\n"));
    try { rl.close(); } catch { /* */ }
    try { session.dispose(); } catch { /* */ }
    process.exit(0);
  };
  process.on("SIGINT", onSigint);

  try {
    for (;;) {
      let line: string;
      try {
        line = (await rl.question("› ")).trim();
      } catch {
        break; // stdin closed (Ctrl-D / piped EOF) → exit cleanly
      }
      if (!line) continue;
      const slash = line.toLowerCase();
      if (slash === "/exit" || slash === "/quit") break;
      if (slash === "/help" || slash === "/?") { stdout.write(replHelp()); continue; }
      if (slash === "/skill" || slash === "/skills") { stdout.write(`  ${dim("326 skills bundled & active. Browse: oriro skills list --all")}\n`); continue; }
      if (slash === "/connector" || slash === "/connectors") { stdout.write(`  ${dim("59 MCP connectors. Add: oriro connectors setup · or oriro connectors add <slug>")}\n`); continue; }
      if (isRouterSlash(slash)) { stdout.write((await handleRouterSlash(line)).join("\n") + "\n"); continue; }
      if (isUsageSlash(slash)) { stdout.write(handleUsage().join("\n") + "\n"); continue; }
      if (slash === "/trace") { stdout.write(`  ${dim(`trace ${toggleTrace() ? "ON" : "off"}`)}\n`); continue; }
      if (isCompactSlash(slash)) { stdout.write((await handleCompact(session, line)).join("\n") + "\n"); continue; }
      if (isInitSlash(slash)) { stdout.write(handleInit(line).join("\n") + "\n"); continue; }
      if (isSessionsSlash(slash)) { stdout.write((await handleSessions()).join("\n") + "\n"); continue; }
      if (isUndoSlash(slash)) { stdout.write((await handleUndo(session)).join("\n") + "\n"); continue; }
      if (isArtifactSlash(slash)) { stdout.write(handleArtifactSlash(line).join("\n") + "\n"); continue; }

      // V0.3.5 Plan mode — the same plan → approve → execute loop as the TUI; the posture gate
      // keeps plan-mode turns read-only here too (deterministic block, no UI needed).
      const plan = parsePlanSlash(line);
      let internalPrompt: string | undefined; // fixed English prompt (skips translation)
      let turnText = line;
      if (plan) {
        if (plan.cmd === "reject") {
          stdout.write(`  ${dim(rejectPlan() ? "▢ plan discarded — refine the request (still in Plan) or /approve a new plan later" : "▢ nothing to reject — no plan is waiting")}\n`);
          continue;
        }
        if (plan.cmd === "approve") {
          const r = approvePlan();
          if (!r.ok) { stdout.write(`  ${dim(`▢ ${r.reason}`)}\n`); continue; }
          setMode(r.restoreMode); // leave read-only BEFORE executing
          internalPrompt = r.prompt;
        } else {
          enterPlan(getMode());
          setMode("plan");
          if (!plan.task) {
            stdout.write(`  ${dim("▢ Plan mode — describe the task and I'll plan it (read-only). Then")} ${accent("/approve")} ${dim("to execute ·")} ${accent("/reject")} ${dim("to discard.")}\n`);
            continue;
          }
          turnText = plan.task;
        }
      }

      bumpTurns();
      let english = internalPrompt ?? (await translateIncoming(turnText));
      if (getMode() === "plan") english = `${PLAN_PRIMER}\n\n${english}`; // every plan-mode turn plans, read-only
      noteUserInput(line);
      let out = "";
      const unsub = session.subscribe(
        (e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
          if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
            out += e.assistantMessageEvent.delta ?? "";
          }
        },
      );
      try {
        await session.prompt(english);
      } finally {
        unsub();
      }
      // Emit the full reply once, scrubbed of any third-party router ad/promo (non-TTY: no live stream).
      const cleaned = scrubOutput(out);
      const shown = isEnglish ? cleaned.trim() : await translateOutgoing(cleaned.trim());
      const arts = extractArtifacts(shown); setArtifacts(arts); // capture code/SVG for /review + /save
      const hint = arts.length ? `  ${dim(`⎘ ${arts.length} artifact${arts.length === 1 ? "" : "s"} — /review to save`)}\n` : "";
      stdout.write(`${shown}${phantomFileWarning(shown)}\n${hint}\n`);
      if (getMode() === "plan" && notePlanOutput(shown)) {
        stdout.write(`  ${dim("▢ plan ready —")} ${accent("/approve")} ${dim("to execute ·")} ${accent("/reject")} ${dim("to discard")}\n`);
      }
    }
  } finally {
    process.removeListener("SIGINT", onSigint);
    if (!closing) {
      rl.close();
      session.dispose();
      stdout.write(dim("\nBye.\n"));
    }
  }
}
