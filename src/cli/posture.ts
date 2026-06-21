// ORIRO CLI — permission postures (shift+tab cycle). Four Claude-Code-style safety
// postures presented as ONE cycle, mapped onto the fork's real enforcement primitives
// (exec-approvals ExecMode + plan mode + edit auto-approval). Cycle order:
//   Manual → Accept-Edits → Auto → Plan → Manual
//
// ORIRO floor: Guardian V3 is ALWAYS on underneath — even "Auto" cannot run a call
// Guardian blocks (wipes, exfil, curl|sh, untrusted MCP). Auto means "don't ask me for
// low-risk", never "run anything". Plan means read-only (no edits, no commands).

import type { ExecMode } from "../infra/exec-approvals.js";

export type PostureId = "manual" | "acceptEdits" | "auto" | "plan";

export interface Posture {
  id: PostureId;
  label: string;
  /** Indicator glyph for the footer/status line. */
  glyph: string;
  description: string;
  /** Maps onto the fork's exec enforcement (resolveExecPolicyForMode). */
  execMode: ExecMode;
  /** Auto-approve file edits (Write/Edit) without asking. */
  autoAcceptEdits: boolean;
  /** Plan mode — read-only; writes/commands are blocked outside the plan. */
  plan: boolean;
}

export const POSTURES: readonly Posture[] = [
  {
    id: "manual",
    label: "Manual",
    glyph: "●",
    description: "Ask before every edit and command",
    execMode: "ask",
    autoAcceptEdits: false,
    plan: false,
  },
  {
    id: "acceptEdits",
    label: "Accept Edits",
    glyph: "✎",
    description: "Auto-accept file edits; still ask before commands",
    execMode: "ask",
    autoAcceptEdits: true,
    plan: false,
  },
  {
    id: "auto",
    label: "Auto",
    glyph: "⏵⏵",
    description: "Auto-approve low-risk edits + commands (Guardian still blocks dangerous ones)",
    execMode: "auto",
    autoAcceptEdits: true,
    plan: false,
  },
  {
    id: "plan",
    label: "Plan",
    glyph: "▢",
    description: "Read-only — plan and analyze without executing",
    execMode: "deny",
    autoAcceptEdits: false,
    plan: true,
  },
];

export const DEFAULT_POSTURE: PostureId = "manual";

export function postureById(id: PostureId): Posture {
  return POSTURES.find((p) => p.id === id) ?? POSTURES[0];
}

/** The next posture in the shift+tab cycle (wraps around). */
export function nextPosture(current: PostureId): Posture {
  const i = POSTURES.findIndex((p) => p.id === current);
  return POSTURES[(i + 1 + POSTURES.length) % POSTURES.length];
}

/** The footer/status indicator, e.g. "⏵⏵ Auto". */
export function postureIndicator(p: Posture): string {
  return `${p.glyph} ${p.label}`;
}

/** The one-line hint shown when the posture changes, e.g. "⏵⏵ Auto — auto-approve low-risk…". */
export function postureHint(p: Posture): string {
  return `${p.glyph} ${p.label} — ${p.description}  (shift+tab to cycle)`;
}
