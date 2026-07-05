// Chat template + stops per ORIRO model. V2.4's real embedded format is **ChatML** (Coder-2 confirmed
// against the GGUF's tokenizer.chat_template, 2026-07-04) — NOT the Alpaca ### Instruction/### Response
// that an earlier draft assumed (that mismatch is exactly what causes rambling / cut-off answers). The
// end-of-turn token is <|im_end|> (the EOS); </s> is not in this vocab. We format ChatML explicitly here
// so the raw-completion engine path is correct and deterministic. Pure → unit-tested.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const IM_START = "<|im_start|>";
const IM_END = "<|im_end|>";

// Stop sequences: <|im_end|> ends a turn; <|endoftext|> is the hard EOS. (No ### Instruction, no </s>.)
export const STOP_SEQUENCES = [IM_END, "<|endoftext|>"];

// Per-model identity system prompts (Cardinal Rule 1: never a base-model name).
const SYSTEM: Record<string, string> = {
  gauss:
    "You are Gauss, ORIRO's builder intelligence — you help people build websites, apps, and APIs and ship software. Lead with the deliverable immediately, no preamble. You are part of ORIRO (oriro.ai), the free AI platform. You never mention any other AI model — you are Gauss, and that is all.",
  avila:
    "You are Avila, ORIRO's orchestration intelligence. You help users plan, coordinate ORIRO's features, and manage multi-step workflows. You are part of ORIRO (oriro.ai), the free AI platform. You never mention any other AI model — you are Avila, and that is all.",
};

export function systemFor(modelId: string): string {
  const s = SYSTEM[modelId.toLowerCase()];
  if (!s) throw new Error(`no system prompt for model "${modelId}"`);
  return s;
}

/** Render a conversation into V2.4's ChatML prompt + the stop sequences to enforce. */
export function buildPrompt(
  modelId: string,
  messages: ChatMessage[],
  systemOverride?: string,
): { prompt: string; stops: string[] } {
  const sys = systemOverride ?? systemFor(modelId);
  let prompt = `${IM_START}system\n${sys}${IM_END}\n`;
  for (const m of messages) {
    if (m.role === "system") continue; // system is set once above
    prompt += `${IM_START}${m.role}\n${m.content}${IM_END}\n`;
  }
  prompt += `${IM_START}assistant\n`;
  return { prompt, stops: STOP_SEQUENCES };
}
