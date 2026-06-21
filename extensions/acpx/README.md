# @oriro/acpx

Official ACP runtime backend for Oriro.

ACPx lets Oriro run external coding harnesses through the Agent Client Protocol while Oriro still owns sessions, channels, delivery, permissions, and Gateway state.

## Install

```bash
oriro plugins install @oriro/acpx
```

Restart the Gateway after installing or updating the plugin.

## What it provides

- ACP-backed agent runtime sessions.
- Plugin-owned session and transport management.
- MCP bridge helpers for Oriro tools and plugin tools.
- Static runtime assets used by the ACP process bridge.

## Configure

Use the ACP docs for harness-specific setup, permission modes, and model/runtime selection:

- https://docs.oriro.ai/tools/acp-agents-setup
- https://docs.oriro.ai/tools/acp-agents

## Package

- Plugin id: `acpx`
- Package: `@oriro/acpx`
- Minimum Oriro host: `2026.4.25`
