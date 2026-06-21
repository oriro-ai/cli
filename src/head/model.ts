// ORIRO CLI — ORIRO Head model adapter. Connects Head's injected CoderModel
// (`(prompt) => Promise<string>`) to the CLI's OWN configured model via the same
// one-shot completion path the exec-reviewer uses. So url→code / video→code work the
// instant ANY model is available — the user's BYOK key today, or our free Gauss/Avila
// when they ship — with NO separate setup. If no model is configured yet, the adapter
// throws a clear "connect a model" message and the Head's structural report still works.

import type { OriroConfig } from "../config/types.oriro.js";
import {
  prepareSimpleCompletionModelForAgent,
  completeWithPreparedSimpleCompletionModel,
} from "../agents/simple-completion-runtime.js";
import type { CoderModel, HtmlToCodeModels } from "./video-to-code.js";

const HEAD_CODER_SYSTEM =
  "You are ORIRO Head's senior front-end engineer. Reproduce UIs faithfully and output exactly " +
  "what the instruction asks for (clean, working code or a structured spec). No preamble.";

function extractText(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** A CoderModel backed by the CLI's configured model (BYOK now, Gauss/Avila later). */
export function buildHeadCoderModel(cfg: OriroConfig, agentId = "main", modelRef?: string): CoderModel {
  return async (prompt: string): Promise<string> => {
    const prepared = await prepareSimpleCompletionModelForAgent({
      cfg,
      agentId,
      modelRef,
      allowMissingApiKeyModes: ["aws-sdk"],
    });
    if ("error" in prepared) {
      throw new Error(
        `ORIRO Head needs a model — connect your BYOK key (oriro onboard) or wait for the free Gauss/Avila plugin. (${prepared.error})`,
      );
    }
    const result = await completeWithPreparedSimpleCompletionModel({
      model: prepared.model,
      auth: prepared.auth,
      cfg,
      context: {
        systemPrompt: HEAD_CODER_SYSTEM,
        messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
      },
      options: { maxTokens: 8192 },
    });
    return extractText(result);
  };
}

/** The models bundle Head's urlToCode/videoToCode consume, sourced from the CLI config. */
export function headModelsFromConfig(cfg: OriroConfig, agentId = "main"): HtmlToCodeModels {
  return { code: buildHeadCoderModel(cfg, agentId) };
}
