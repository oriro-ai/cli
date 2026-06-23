// Env path guidance tests cover user-facing guidance for skill path environment config.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

type GuidanceCase = {
  file: string;
  required?: string[];
  forbidden?: string[];
};

const CASES: GuidanceCase[] = [
  {
    file: "skills/session-logs/SKILL.md",
    required: ["ORIRO_STATE_DIR"],
    forbidden: [
      "for f in ~/.oriro/agents/<agentId>/sessions/*.jsonl",
      'rg -l "phrase" ~/.oriro/agents/<agentId>/sessions/*.jsonl',
      "~/.oriro/agents/<agentId>/sessions/<id>.jsonl",
    ],
  },
  {
    file: "skills/gh-issues/SKILL.md",
    required: ["ORIRO_CONFIG_PATH"],
    forbidden: ["cat ~/.oriro/oriro.json"],
  },
  {
    file: "skills/canvas/SKILL.md",
    required: ["ORIRO_CONFIG_PATH"],
    forbidden: ["cat ~/.oriro/oriro.json"],
  },
  {
    file: "skills/openai-whisper-api/SKILL.md",
    required: ["ORIRO_CONFIG_PATH"],
  },
  {
    file: "skills/sherpa-onnx-tts/SKILL.md",
    required: [
      "ORIRO_STATE_DIR",
      "ORIRO_CONFIG_PATH",
      'STATE_DIR="${ORIRO_STATE_DIR:-$HOME/.oriro}"',
    ],
    forbidden: [
      'SHERPA_ONNX_RUNTIME_DIR: "~/.oriro/tools/sherpa-onnx-tts/runtime"',
      'SHERPA_ONNX_MODEL_DIR: "~/.oriro/tools/sherpa-onnx-tts/models/vits-piper-en_US-lessac-high"',
      "<state-dir>",
    ],
  },
  {
    file: "skills/coding-agent/SKILL.md",
    required: ["ORIRO_STATE_DIR"],
    forbidden: ["NEVER start Codex in ~/.oriro/"],
  },
];

describe("bundled skill env-path guidance", () => {
  it.each(CASES)(
    "keeps $file aligned with ORIRO env overrides",
    ({ file, required, forbidden }) => {
      const content = fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
      for (const needle of required ?? []) {
        expect(content).toContain(needle);
      }
      for (const needle of forbidden ?? []) {
        expect(content).not.toContain(needle);
      }
    },
  );
});
