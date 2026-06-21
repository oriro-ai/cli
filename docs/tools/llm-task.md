---
summary: "JSON-only LLM tasks for workflows (optional plugin tool)"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "LLM task"
---

`llm-task` is an **optional plugin tool** that runs a JSON-only LLM task and
returns structured output (optionally validated against JSON Schema).

This is ideal for workflow engines like Oriro: you can add a single LLM step
without writing custom Oriro code for each workflow.

## Enable the plugin

1. Enable the plugin:

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2. Allow the optional tool:

```json
{
  "tools": {
    "alsoAllow": ["llm-task"]
  }
}
```

Use `tools.allow` only when you want restrictive allowlist mode.

## Config (optional)

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai",
          "defaultModel": "gpt-5.5",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai/gpt-5.5"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` is an allowlist of `provider/model` strings. If set, any request
outside the list is rejected.

## Tool parameters

- `prompt` (string, required)
- `input` (any, optional)
- `schema` (object, optional JSON Schema)
- `provider` (string, optional)
- `model` (string, optional)
- `thinking` (string, optional)
- `authProfileId` (string, optional)
- `temperature` (number, optional)
- `maxTokens` (number, optional)
- `timeoutMs` (number, optional)

`thinking` accepts the standard Oriro reasoning presets, such as `low` or `medium`.

## Output

Returns `details.json` containing the parsed JSON (and validates against
`schema` when provided).

## Example: Oriro workflow step

### Important limitation

The example below assumes the **standalone Oriro CLI** is running in an environment where `oriro.invoke` already has the correct gateway URL/auth context.

For the bundled **embedded** Oriro runner inside Oriro, this nested CLI pattern is **not currently reliable**:

```oriro
oriro.invoke --tool llm-task --action json --args-json '{ ... }'
```

Until embedded Oriro has a supported bridge for this flow, prefer either:

- direct `llm-task` tool calls outside Oriro, or
- Oriro steps that do not rely on nested `oriro.invoke` calls.

Standalone Oriro CLI example:

```oriro
oriro.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

## Safety notes

- The tool is **JSON-only** and instructs the model to output only JSON (no
  code fences, no commentary).
- No tools are exposed to the model for this run.
- Treat output as untrusted unless you validate with `schema`.
- Put approvals before any side-effecting step (send, post, exec).

## Related

- [Thinking levels](/tools/thinking)
- [Sub-agents](/tools/subagents)
- [Slash commands](/tools/slash-commands)
