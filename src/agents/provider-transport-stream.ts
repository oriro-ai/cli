/**
 * Transport-aware stream factory selection.
 *
 * Routes models that need Oriro-managed proxy/TLS/local-service semantics onto built-in transport implementations.
 */
import type { OriroConfig } from "../config/types.oriro.js";
import type { Api, Model } from "../llm/types.js";
import { resolveProviderStreamFn } from "../plugins/provider-runtime.js";
import { createAnthropicMessagesTransportStreamFn } from "./anthropic-transport-stream.js";
import {
  createAzureOpenAIResponsesTransportStreamFn,
  createOpenAICompletionsTransportStreamFn,
  createOpenAIResponsesTransportStreamFn,
} from "./openai-transport-stream.js";
import { getModelProviderLocalService } from "./provider-local-service.js";
import { getModelProviderRequestTransport } from "./provider-request-config.js";
import type { StreamFn } from "./runtime/index.js";

const SUPPORTED_TRANSPORT_APIS = new Set<Api>([
  "openai-responses",
  "openai-chatgpt-responses",
  "openai-completions",
  "azure-openai-responses",
  "anthropic-messages",
  "google-generative-ai",
]);

const SIMPLE_TRANSPORT_API_ALIAS: Record<string, Api> = {
  "openai-responses": "oriro-openai-responses-transport",
  "openai-chatgpt-responses": "oriro-openai-responses-transport",
  "openai-completions": "oriro-openai-completions-transport",
  "azure-openai-responses": "oriro-azure-openai-responses-transport",
  "anthropic-messages": "oriro-anthropic-messages-transport",
  "google-generative-ai": "oriro-google-generative-ai-transport",
};

type ProviderTransportStreamContext = {
  cfg?: OriroConfig;
  agentDir?: string;
  workspaceDir?: string;
  env?: NodeJS.ProcessEnv;
};

function createProviderOwnedGoogleTransportStreamFn(
  model: Model,
  ctx?: ProviderTransportStreamContext,
): StreamFn | undefined {
  return (
    resolveProviderStreamFn({
      provider: model.provider,
      config: ctx?.cfg,
      workspaceDir: ctx?.workspaceDir,
      env: ctx?.env,
      context: {
        config: ctx?.cfg,
        agentDir: ctx?.agentDir,
        workspaceDir: ctx?.workspaceDir,
        provider: model.provider,
        modelId: model.id,
        model,
      },
    }) ??
    resolveProviderStreamFn({
      provider: "google",
      config: ctx?.cfg,
      workspaceDir: ctx?.workspaceDir,
      env: ctx?.env,
      context: {
        config: ctx?.cfg,
        agentDir: ctx?.agentDir,
        workspaceDir: ctx?.workspaceDir,
        provider: model.provider,
        modelId: model.id,
        model,
      },
    }) ??
    undefined
  );
}

function createSupportedTransportStreamFn(
  model: Model,
  ctx?: ProviderTransportStreamContext,
): StreamFn | undefined {
  switch (model.api) {
    case "openai-responses":
    case "openai-chatgpt-responses":
      return createOpenAIResponsesTransportStreamFn();
    case "openai-completions":
      return createOpenAICompletionsTransportStreamFn();
    case "azure-openai-responses":
      return createAzureOpenAIResponsesTransportStreamFn();
    case "anthropic-messages":
      return createAnthropicMessagesTransportStreamFn();
    case "google-generative-ai":
      return createProviderOwnedGoogleTransportStreamFn(model, ctx);
    default:
      return undefined;
  }
}

function hasOriroTransportRequirement(model: Model): boolean {
  const request = getModelProviderRequestTransport(model);
  return Boolean(request?.proxy || request?.tls || getModelProviderLocalService(model));
}

/** Returns whether Oriro has a managed transport implementation for this API. */
export function isTransportAwareApiSupported(api: Api): boolean {
  return SUPPORTED_TRANSPORT_APIS.has(api);
}

/** Maps public model APIs to the internal transport API id used by simple runtime dispatch. */
export function resolveTransportAwareSimpleApi(api: Api): Api | undefined {
  return SIMPLE_TRANSPORT_API_ALIAS[api];
}

/** Creates a managed transport stream only when request overrides require it. */
export function createTransportAwareStreamFnForModel(
  model: Model,
  ctx?: ProviderTransportStreamContext,
): StreamFn | undefined {
  if (!hasOriroTransportRequirement(model)) {
    return undefined;
  }
  if (!isTransportAwareApiSupported(model.api)) {
    throw new Error(
      `Model-provider request.proxy/request.tls/localService is not yet supported for api "${model.api}"`,
    );
  }
  return createSupportedTransportStreamFn(model, ctx);
}

/** Creates a managed Oriro transport stream for explicit fallback/runtime callers. */
export function createOriroTransportStreamFnForModel(
  model: Model,
  ctx?: ProviderTransportStreamContext,
): StreamFn | undefined {
  // Explicit fallback callers use this when they need Oriro's HTTP
  // transport semantics regardless of the default embedded-runner strategy.
  // Native OpenAI HTTP still depends on this path for strict tool shaping,
  // attribution, cache-boundary stripping, and runtime credential injection.
  if (!isTransportAwareApiSupported(model.api)) {
    return undefined;
  }
  return createSupportedTransportStreamFn(model, ctx);
}

export function createBoundaryAwareStreamFnForModel(
  model: Model,
  ctx?: ProviderTransportStreamContext,
): StreamFn | undefined {
  // Default embedded-runner fallback. Keep OpenAI-family APIs here while native
  // HTTP streams preserve the same Oriro request contract.
  if (!isTransportAwareApiSupported(model.api)) {
    return undefined;
  }
  return createSupportedTransportStreamFn(model, ctx);
}

export function prepareTransportAwareSimpleModel<TApi extends Api>(
  model: Model<TApi>,
  ctx?: ProviderTransportStreamContext,
): Model {
  const streamFn = createTransportAwareStreamFnForModel(model as Model, ctx);
  const alias = resolveTransportAwareSimpleApi(model.api);
  if (!streamFn || !alias) {
    return model;
  }
  return {
    ...model,
    api: alias,
  };
}

export function buildTransportAwareSimpleStreamFn(
  model: Model,
  ctx?: ProviderTransportStreamContext,
): StreamFn | undefined {
  return createTransportAwareStreamFnForModel(model, ctx);
}
