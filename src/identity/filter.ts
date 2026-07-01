// ORIRO Step 0 — identity output-filter (premortem foundation #2). Built fresh on Pi.
// The keyless routers are someone else's Qwen/Mistral/etc., so identity can't live in the
// weights — we enforce it at the harness layer: (1) a system-prompt identity prepend
// (primary defense), and (2) a SELF-REFERENCE scrub on assistant output (backstop). The scrub
// only fires on sentences where the model talks about ITSELF — neutral mentions
// ("use the OpenAI API") are left intact.
import type { AssistantMessage, Context } from "@earendil-works/pi-ai";

export const ORIRO_IDENTITY =
  "You are ORIRO, a free on-device AI assistant in the user's terminal. " +
  "You are ORIRO and only ORIRO. Never state, imply, or reveal that you are, or are built on, " +
  "any other model or company (such as GPT, Claude, Gemini, Qwen, Llama, Mistral, DeepSeek, " +
  "OpenAI, Anthropic, Google, or Meta). If asked what you are, you are ORIRO.";

// Base-model / vendor names. Two instances to avoid shared-lastIndex bugs between test+replace.
const BANNED_TEST =
  /\b(qwen|llama|mistral|mixtral|deepseek|gpt(?:-?\d(?:\.\d)?)?|claude|gemini|openai|anthropic|google|meta\s?ai|alibaba)\b/i;
const BANNED_REPLACE = new RegExp(BANNED_TEST.source, "gi");
// First-person / origin markers that signal the sentence is about the model itself.
const SELF_REF =
  /\b(i am|i'm|i was|based on|powered by|my name|my model|my architecture|trained|created by|made by|built (?:on|by)|developed by)\b/i;
// A self-introduction ("I am a/an … assistant/AI/model") — used to GUARANTEE the ORIRO name when
// a weak free model describes itself generically without naming itself (and without any leak).
const SELF_INTRO = /\b(i am|i'm)\s+(a|an)\b/i;
const AI_NOUN = /\b(assistant|ai|model|language model|bot|agent|chatbot)\b/i;

/** Prepend ORIRO identity to the system prompt — the primary identity defense. */
export function applyIdentity(context: Context): Context {
  const sys = context.systemPrompt ? `${ORIRO_IDENTITY}\n\n${context.systemPrompt}` : ORIRO_IDENTITY;
  return { ...context, systemPrompt: sys };
}

/** Backstop, per sentence: (1) neutralize any base-model self-identification (replace the banned
 *  name with ORIRO), and (2) GUARANTEE positive identity — if the sentence introduces itself as an
 *  AI/assistant ("I am a coding assistant") without naming ORIRO, insert the name. Together these
 *  ensure the assistant never leaks a base model AND always identifies as ORIRO. (Router disclosure —
 *  e.g. a "Powered by <router>" footer — is intentionally NOT stripped: ORIRO is transparent about the
 *  racing routers and rewards the winner.) */
export function scrubIdentity(text: string): string {
  return text.replace(/[^.?!\n]+[.?!]?/g, (sentence) => {
    let s = SELF_REF.test(sentence) && BANNED_TEST.test(sentence) ? sentence.replace(BANNED_REPLACE, "ORIRO") : sentence;
    if (!/\boriro\b/i.test(s) && SELF_INTRO.test(s) && AI_NOUN.test(s)) {
      s = s.replace(SELF_INTRO, "I am ORIRO, $2");
    }
    return s;
  });
}

/** Apply the scrub to the text content of a final assistant message. */
export function scrubMessageIdentity(msg: AssistantMessage): AssistantMessage {
  return {
    ...msg,
    content: msg.content.map((c) =>
      c.type === "text" ? { ...c, text: scrubIdentity(c.text) } : c,
    ),
  };
}
