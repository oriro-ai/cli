// Identifies Oriro-authored assistant rows that are transcript bookkeeping,
// not provider model output. Some history surfaces keep gateway-injected rows
// visible, so use the narrower delivery-mirror predicate when visibility matters.
const TRANSCRIPT_ONLY_ORIRO_ASSISTANT_MODELS = new Set<string>([
  "delivery-mirror",
  "gateway-injected",
]);

export function isTranscriptOnlyOriroAssistantModel(provider: unknown, model: unknown): boolean {
  return (
    provider === "oriro" &&
    typeof model === "string" &&
    TRANSCRIPT_ONLY_ORIRO_ASSISTANT_MODELS.has(model)
  );
}

export function isTranscriptOnlyOriroAssistantMessage(message: unknown): boolean {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return false;
  }
  const entry = message as { role?: unknown; provider?: unknown; model?: unknown };
  return (
    entry.role === "assistant" &&
    isTranscriptOnlyOriroAssistantModel(entry.provider, entry.model)
  );
}

export function isOriroDeliveryMirrorAssistantMessage(message: unknown): boolean {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return false;
  }
  const entry = message as { role?: unknown; provider?: unknown; model?: unknown };
  return (
    entry.role === "assistant" && entry.provider === "oriro" && entry.model === "delivery-mirror"
  );
}
