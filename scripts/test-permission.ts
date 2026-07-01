// Permission-mode gate tests — pure logic, fully verifiable. Part of the prepublish gate.
// Run: npx tsx scripts/test-permission.ts
import { decideTool, cycleMode, getMode, setMode, classifyTool, MODES } from "../src/repl-ui/permission.js";

let fails = 0;
const eq = (label: string, got: unknown, want: unknown): void => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; process.stdout.write(`❌ ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}\n`); }
  else process.stdout.write(`✅ ${label}\n`);
};

// Guardian floor — blocked in EVERY mode, even auto.
for (const m of MODES) {
  eq(`guardian floor blocks in ${m}`, decideTool({ toolName: "bash", guardianBlocked: true, mode: m }).decision, "block");
}

// Plan = read-only.
eq("plan: read allowed", decideTool({ toolName: "read_file", guardianBlocked: false, mode: "plan" }).decision, "allow");
eq("plan: write blocked", decideTool({ toolName: "write_file", guardianBlocked: false, mode: "plan" }).decision, "block");
eq("plan: bash blocked", decideTool({ toolName: "bash", guardianBlocked: false, mode: "plan" }).decision, "block");

// Manual = ask before acting (reads pass).
eq("manual: read allowed", decideTool({ toolName: "grep", guardianBlocked: false, mode: "manual" }).decision, "allow");
eq("manual: edit asks", decideTool({ toolName: "edit_file", guardianBlocked: false, mode: "manual" }).decision, "ask");
eq("manual: bash asks", decideTool({ toolName: "bash", guardianBlocked: false, mode: "manual" }).decision, "ask");

// Accept Edits = auto edits, ask exec.
eq("accept_edits: edit allowed", decideTool({ toolName: "write_file", guardianBlocked: false, mode: "accept_edits" }).decision, "allow");
eq("accept_edits: bash asks", decideTool({ toolName: "bash", guardianBlocked: false, mode: "accept_edits" }).decision, "ask");

// Auto = allow low-risk (Guardian still vetoes dangerous, tested above).
eq("auto: bash allowed (guardian ok)", decideTool({ toolName: "bash", guardianBlocked: false, mode: "auto" }).decision, "allow");

// classifyTool.
eq("classify read", classifyTool("read_file"), "read");
eq("classify edit", classifyTool("str_replace"), "edit");
eq("classify exec", classifyTool("bash"), "exec");

// cycle order manual → accept_edits → auto → plan → manual.
setMode("manual");
eq("cycle 1", cycleMode(), "accept_edits");
eq("cycle 2", cycleMode(), "auto");
eq("cycle 3", cycleMode(), "plan");
eq("cycle 4 wraps", cycleMode(), "manual");
eq("getMode after cycle", getMode(), "manual");

process.stdout.write(`\n${fails === 0 ? "PERMISSION TESTS: PASS ✅" : `PERMISSION TESTS: FAIL ❌ (${fails})`}\n`);
process.exit(fails === 0 ? 0 : 1);
