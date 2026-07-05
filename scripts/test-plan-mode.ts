// Unit test for V0.3.5 Plan mode (src/repl-ui/plan-mode.ts) — the plan → approve → execute state
// machine + slash parsing. Pure logic, fully verifiable. Run: tsx scripts/test-plan-mode.ts
import {
  parsePlanSlash, enterPlan, notePlanOutput, isPlanReady, approvePlan, rejectPlan, resetPlanState,
  PLAN_PRIMER, EXECUTE_PROMPT,
} from "../src/repl-ui/plan-mode.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// ── slash parsing ──────────────────────────────────────────────────────────────────────────────
ok(parsePlanSlash("/plan")?.cmd === "plan" && parsePlanSlash("/plan")?.task === undefined, "parses bare /plan");
{
  const p = parsePlanSlash("/plan add dark mode to the settings page");
  ok(p?.cmd === "plan" && p.task === "add dark mode to the settings page", "parses /plan <task>");
}
ok(parsePlanSlash("  /PLAN Fix the bug  ")?.task === "Fix the bug", "case-insensitive + trims");
ok(parsePlanSlash("/approve")?.cmd === "approve", "parses /approve");
ok(parsePlanSlash("/reject")?.cmd === "reject", "parses /reject");
ok(parsePlanSlash("/planet") === undefined && parsePlanSlash("/approved") === undefined && parsePlanSlash("/rejecting") === undefined, "word-boundary: no false matches");
ok(parsePlanSlash("plan the release") === undefined, "plain text is not a slash");
{
  const multi = parsePlanSlash("/plan step one\nstep two");
  ok(multi?.cmd === "plan" && multi.task === "step one\nstep two", "multi-line task preserved");
}

// ── state machine: the happy loop ──────────────────────────────────────────────────────────────
resetPlanState();
ok(!isPlanReady(), "starts idle");
ok(approvePlan().ok === false, "approve with no plan → refused with reason");

enterPlan("auto"); // user was in Auto, switches to Plan
ok(!isPlanReady(), "entering plan does not arm approval by itself");
ok(notePlanOutput("1. edit a.ts\n2. run tests"), "a real plan output arms approval");
ok(isPlanReady(), "plan is ready");
{
  const r = approvePlan();
  ok(r.ok === true, "approve consumes the armed plan");
  if (r.ok) {
    ok(r.restoreMode === "auto", "approve restores the pre-plan posture");
    ok(r.prompt === EXECUTE_PROMPT, "approve returns the execute prompt");
  }
  ok(!isPlanReady(), "ready cleared after approve");
  ok(approvePlan().ok === false, "second approve is refused (no double-execute)");
}

// ── re-entry + edge cases ──────────────────────────────────────────────────────────────────────
resetPlanState();
enterPlan("accept_edits");
enterPlan("plan"); // re-entry while already in plan (e.g. /plan typed twice)
notePlanOutput("plan text");
{
  const r = approvePlan();
  ok(r.ok && r.restoreMode === "accept_edits", "re-entry keeps the ORIGINAL restore posture (never 'plan')");
}

resetPlanState();
enterPlan("manual");
ok(!notePlanOutput("   \n  "), "empty/whitespace output does NOT arm approval");
ok(!isPlanReady(), "still idle after empty output");
notePlanOutput("a plan");
ok(rejectPlan(), "reject discards an armed plan");
ok(!isPlanReady() && !rejectPlan(), "reject is idempotent (second reject reports nothing to do)");
ok(approvePlan().ok === false, "approve after reject is refused");

// a rejected plan can be refined: the next plan-mode turn re-arms
notePlanOutput("a better plan");
ok(isPlanReady(), "next plan turn after reject re-arms approval");

// ── primers ────────────────────────────────────────────────────────────────────────────────────
ok(PLAN_PRIMER.includes("read-only") && PLAN_PRIMER.toLowerCase().includes("do not make any changes"), "plan primer forbids mutation");
ok(EXECUTE_PROMPT.includes("APPROVED") && EXECUTE_PROMPT.toLowerCase().includes("execute"), "execute prompt is explicit");

process.stdout.write(fails ? `\n${fails} FAILED\n` : "\nALL PASS\n");
process.exit(fails ? 1 : 0);
