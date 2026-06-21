/**
 * Policy promotion for Codex app-server runs that can safely use Oriro tool
 * approvals.
 */
import {
  canUseCodexModelBackedApprovalsReviewerForModel,
  type CodexAppServerRuntimeOptions,
  type CodexPluginConfig,
  type OriroExecPolicyForCodexAppServer,
} from "./config.js";

/**
 * Promotes implicit `never` approval policy to `untrusted` only when runtime
 * requirements allow Oriro to handle tool approvals.
 */
export function resolveCodexAppServerForOriroToolPolicy(params: {
  appServer: CodexAppServerRuntimeOptions;
  pluginConfig: CodexPluginConfig;
  env: NodeJS.ProcessEnv;
  shouldPromote: boolean;
  canUseUntrustedApprovalPolicy: boolean;
  execPolicy?: OriroExecPolicyForCodexAppServer;
}): CodexAppServerRuntimeOptions {
  if (
    !params.shouldPromote ||
    !params.canUseUntrustedApprovalPolicy ||
    params.appServer.approvalPolicy !== "never"
  ) {
    return params.appServer;
  }
  const explicitMode =
    params.execPolicy?.mode === "full" ||
    params.pluginConfig.appServer?.mode !== undefined ||
    isCodexAppServerPolicyMode(params.env.ORIRO_CODEX_APP_SERVER_MODE);
  const explicitApprovalPolicy =
    params.pluginConfig.appServer?.approvalPolicy !== undefined ||
    isCodexAppServerApprovalPolicy(params.env.ORIRO_CODEX_APP_SERVER_APPROVAL_POLICY) ||
    params.appServer.approvalPolicySource === "requirements";
  if (explicitMode || explicitApprovalPolicy) {
    return params.appServer;
  }
  return {
    ...params.appServer,
    approvalPolicy: "untrusted",
  };
}

export function resolveCodexAppServerForModelProvider(params: {
  appServer: CodexAppServerRuntimeOptions;
  provider?: string;
  model?: string;
  config?: Parameters<typeof canUseCodexModelBackedApprovalsReviewerForModel>[0]["config"];
  env?: NodeJS.ProcessEnv;
  agentDir?: string;
  codexConfigToml?: string | null;
}): CodexAppServerRuntimeOptions {
  const explicitProvider = normalizeModelBackedReviewerProvider(params.provider);
  if (
    !isCodexModelBackedApprovalsReviewer(params.appServer.approvalsReviewer) ||
    canUseCodexModelBackedApprovalsReviewerForModel({
      modelProvider: explicitProvider,
      model: params.model,
      config: params.config,
      env: params.env,
      agentDir: params.agentDir,
      codexConfigToml: params.codexConfigToml,
    })
  ) {
    return params.appServer;
  }
  return {
    ...params.appServer,
    approvalsReviewer: "user",
  };
}

function isCodexAppServerPolicyMode(value: unknown): boolean {
  return value === "guardian" || value === "yolo";
}

function isCodexAppServerApprovalPolicy(value: unknown): boolean {
  return (
    value === "never" || value === "on-request" || value === "on-failure" || value === "untrusted"
  );
}

function isCodexModelBackedApprovalsReviewer(value: string): boolean {
  return value === "auto_review" || value === "guardian_subagent";
}

function normalizeModelBackedReviewerProvider(provider: string | undefined): string | undefined {
  const normalized = provider?.trim().toLowerCase();
  return normalized || undefined;
}
