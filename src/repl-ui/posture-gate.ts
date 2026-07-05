// ORIRO posture gate — V0.3.5. Wires the (previously display-only) permission postures into Pi's
// native `tool_call` gate, alongside Guardian. Guardian remains the FLOOR (dangerous actions are
// blocked in every posture); this gate adds the posture semantics on top:
//   ▢ Plan         — read-only: edit/exec/other tools are BLOCKED in every surface (deterministic,
//                    no UI needed) so a plan turn can never mutate anything.
//   ● Manual / ✎ Accept Edits — their "ask" decisions are enforced only when the interactive TUI
//                    has ARMED the gate (armPostureGate()). Non-TTY surfaces (pipes, CI, the QA
//                    harness) never armed it, so their behaviour is unchanged — no hangs, no
//                    fail-closed surprises in automation.
// Register as an extension factory next to registerGuardian in onboarding/assemble.ts.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { decideTool, getMode } from "./permission.js";

let armed = false;

/** Arm ask-enforcement — called by the interactive TUI (the only surface with the posture footer). */
export function armPostureGate(): void {
  armed = true;
}

/**
 * Sub-agent sessions (in-REPL `/agents` fan-out, `oriro agents run` recursion) share this process's
 * posture state but must NOT inherit the main session's posture — they'd be crippled by Plan/Manual
 * while working headless in their own worktrees. ORIRO_AGENT_DEPTH > 0 marks them; Guardian remains
 * their floor. Pure (unit-tested).
 */
export function bypassPosture(depthEnv: string | undefined): boolean {
  const d = Number(depthEnv);
  return Number.isFinite(d) && d > 0;
}

export function registerPostureGate(pi: ExtensionAPI): void {
  pi.on("tool_call", async (event, ctx) => {
    if (bypassPosture(process.env.ORIRO_AGENT_DEPTH)) return undefined; // sub-agent: Guardian-only
    // Guardian runs as its own extension and blocks independently — so guardianBlocked=false here.
    const d = decideTool({ toolName: event.toolName, guardianBlocked: false });

    if (d.decision === "block") {
      // Plan mode read-only. The reason goes back to the model: steer it to plan, not to retry.
      return {
        block: true,
        reason: `▢ ${d.reason ?? "blocked by posture"} — present the plan as text; the user will /approve to execute`,
      };
    }

    if (d.decision === "ask" && armed) {
      if (!ctx.hasUI) {
        return { block: true, reason: `posture '${getMode()}' requires approval and no UI is available` };
      }
      const choice = await ctx.ui.select(
        `● Posture '${getMode()}' — approve this action?\nTool: ${event.toolName}\n\n(Shift+Tab cycles postures; ⏵⏵ Auto stops asking)`,
        ["Allow once", "Deny"],
      );
      return choice === "Allow once" ? undefined : { block: true, reason: "Denied by user (posture gate)" };
    }

    return undefined;
  });
}
