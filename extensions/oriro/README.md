# Oriro (plugin)

Adds the `oriro` agent tool as an **optional** plugin tool.

## Install

```bash
oriro plugins install @oriro-ai/cli
```

Restart the Gateway after installing or updating the plugin.

## What this is

- Oriro is a standalone workflow shell (typed JSON-first pipelines + approvals/resume).
- This plugin integrates Oriro with Oriro _without core changes_.

## Enable

Because this tool can trigger side effects (via workflows), it is registered with `optional: true`.

Enable it in an agent allowlist:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": [
            "oriro" // plugin id (enables all tools from this plugin)
          ]
        }
      }
    ]
  }
}
```

## Using `oriro.invoke` (Oriro → Oriro tools)

Some Oriro pipelines may include a `oriro.invoke` step to call back into Oriro tools/plugins (for example: `gog` for Google Workspace, `gh` for GitHub, `message.send`, etc.).

For this to work, the Oriro Gateway must expose the tool bridge endpoint and the target tool must be allowed by policy:

- Oriro provides an HTTP endpoint: `POST /tools/invoke`.
- The request is gated by **gateway auth** (e.g. `Authorization: Bearer …` when token auth is enabled).
- The invoked tool is gated by **tool policy** (global + per-agent + provider + group policy). If the tool is not allowed, Oriro returns `404 Tool not available`.

### Allowlisting recommended

To avoid letting workflows call arbitrary tools, set a tight allowlist on the agent that will be used by `oriro.invoke`.

Example (allow only a small set of tools):

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": ["oriro", "web_fetch", "web_search", "gog", "gh"],
          "deny": ["gateway"],
        },
      },
    ],
  },
}
```

Notes:

- If `tools.allow` is omitted or empty, it behaves like "allow everything (except denied)". For a real allowlist, set a **non-empty** `allow`.
- Tool names depend on which plugins you have installed/enabled.

## Security

- Runs Oriro in process via the published `@clawdbot/lobster/core` runtime.
- Does not manage OAuth/tokens.
- Uses timeouts, stdout caps, and strict JSON envelope parsing.

## Docs

- https://docs.oriro.ai/tools/oriro

## Package

- Plugin id: `oriro`
- Tool: `oriro`
- Package: `@oriro-ai/cli`
- Minimum Oriro host: `2026.4.25`
