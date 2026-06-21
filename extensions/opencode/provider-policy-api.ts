// Opencode API module exposes the plugin public contract.
import { resolveClaudeThinkingProfile } from "oriro/plugin-sdk/provider-model-shared";

export function resolveThinkingProfile(params: { provider?: string; modelId: string }) {
  return resolveClaudeThinkingProfile(params.modelId);
}
