/**
 * `Agent` on-device orchestration tool (Kimi-style thin wrapper).
 *
 * Model-facing tool that spawns a scoped sub-agent via the existing
 * `spawnSubagentDirect` engine. Three fixed roles (`coder`, `explore`, `plan`)
 * each carry a scoped tool allowlist. Multiple calls per turn run in parallel;
 * `run_in_background` keeps the parent turn going without waiting for the child.
 *
 * OR-FREE hard requirement: on-device sub-agents always run on the requester's
 * configured local/free model. This tool never passes a paid model override and
 * never selects the ACP runtime (paid external CLIs claude/gemini/codex), so a
 * sub-agent can never silently call a paid external provider.
 */
import { Type } from "typebox";
import type { OriroConfig } from "../../config/types.oriro.js";
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
import { stringEnum } from "../schema/typebox.js";
import type { SpawnedToolContext } from "../spawned-context.js";
import { spawnSubagentDirect } from "../subagent-spawn.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam, ToolInputError } from "./common.js";

/** Fixed Agent roles. Each maps to a scoped tool allowlist below. */
const AGENT_ROLES = ["coder", "explore", "plan"] as const;
type AgentRole = (typeof AGENT_ROLES)[number];

/**
 * Per-role tool allowlist, applied as the child's inherited tool allowlist.
 * `explore`/`plan` are read-only investigators; `coder` may edit and run shells.
 * Spawn/control/messaging tools are intentionally omitted so on-device children
 * stay leaves (depth/children caps in spawnSubagentDirect still apply on top).
 */
const AGENT_ROLE_TOOL_ALLOWLIST: Record<AgentRole, readonly string[]> = {
  coder: ["read", "write", "edit", "apply_patch", "exec", "process", "web_search", "web_fetch"],
  explore: ["read", "web_search", "web_fetch"],
  plan: ["read", "web_search", "web_fetch"],
} as const;

const AGENT_TOOL_DESCRIPTION = [
  "Spawn a scoped on-device sub-agent for a focused task. Roles:",
  "- coder: implement/edit code (read/write/edit/apply_patch/exec/process).",
  "- explore: read-only investigation/search across the codebase.",
  "- plan: read-only analysis to produce an implementation plan.",
  "Call multiple times in one turn to run sub-agents in parallel.",
  "Set run_in_background=true to start the sub-agent without blocking this turn.",
  "Sub-agents always run on your configured local/free model; no paid external is used.",
].join("\n");

function resolveRoleAllowlist(role: AgentRole): string[] {
  return [...AGENT_ROLE_TOOL_ALLOWLIST[role]];
}

/** Creates the model-facing `Agent` tool bound to the requester's spawn context. */
export function createAgentTool(
  opts?: {
    agentSessionKey?: string;
    completionOwnerKey?: string;
    agentChannel?: GatewayMessageChannel;
    agentAccountId?: string;
    agentTo?: string;
    agentThreadId?: string | number;
    config?: OriroConfig;
    requesterAgentIdOverride?: string;
  } & SpawnedToolContext,
): AnyAgentTool {
  return {
    label: "Agent",
    name: "Agent",
    displaySummary: "Spawn a scoped on-device sub-agent.",
    description: AGENT_TOOL_DESCRIPTION,
    parameters: Type.Object({
      subagent_type: stringEnum(AGENT_ROLES, {
        description:
          "Sub-agent role: coder (edit code), explore (read-only search), plan (analysis).",
      }),
      prompt: Type.String({
        description: "Self-contained task for the sub-agent. Include all context it needs.",
      }),
      description: Type.Optional(
        Type.String({ description: "Short label for this sub-agent run." }),
      ),
      run_in_background: Type.Optional(
        Type.Boolean({
          description:
            "Start the sub-agent without blocking this turn; completion is reported back asynchronously.",
        }),
      ),
    }),
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const roleRaw = readStringParam(params, "subagent_type", { required: true });
      if (!AGENT_ROLES.includes(roleRaw as AgentRole)) {
        throw new ToolInputError(
          `Unknown subagent_type "${roleRaw}". Use one of: ${AGENT_ROLES.join(", ")}.`,
        );
      }
      const role = roleRaw as AgentRole;
      const task = readStringParam(params, "prompt", { required: true });
      const label = readStringParam(params, "description") ?? role;
      const runInBackground = params.run_in_background === true;

      // Scope the child to the role's tool allowlist. Merge with any inherited
      // allowlist already in effect so a restricted parent cannot be widened.
      const inheritedAllow = opts?.inheritedToolAllowlist;
      const roleAllow = resolveRoleAllowlist(role);
      const scopedAllow =
        inheritedAllow && inheritedAllow.length > 0
          ? roleAllow.filter((name) => inheritedAllow.includes(name))
          : roleAllow;

      const result = await spawnSubagentDirect(
        {
          task,
          label,
          // OR-FREE: never pass a model override — the child inherits the
          // requester's configured local/free model via spawnSubagentDirect.
          mode: "run",
          cleanup: "delete",
          // run_in_background maps to fire-and-forget: do not require the child
          // to deliver a completion message back through the channel.
          expectsCompletionMessage: !runInBackground,
        },
        {
          agentSessionKey: opts?.agentSessionKey,
          completionOwnerKey: opts?.completionOwnerKey,
          agentChannel: opts?.agentChannel,
          agentAccountId: opts?.agentAccountId,
          agentTo: opts?.agentTo,
          agentThreadId: opts?.agentThreadId,
          agentGroupId: opts?.agentGroupId,
          agentGroupChannel: opts?.agentGroupChannel,
          agentGroupSpace: opts?.agentGroupSpace,
          agentMemberRoleIds: opts?.agentMemberRoleIds,
          requesterAgentIdOverride: opts?.requesterAgentIdOverride,
          workspaceDir: opts?.workspaceDir,
          inheritedToolAllowlist: scopedAllow,
          inheritedToolDenylist: opts?.inheritedToolDenylist,
        },
      );

      return jsonResult({ ...result, role });
    },
  };
}

export const __testing = {
  AGENT_ROLES,
  AGENT_ROLE_TOOL_ALLOWLIST,
  resolveRoleAllowlist,
};
