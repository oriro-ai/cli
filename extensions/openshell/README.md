# @oriro/openshell-sandbox

Official NVIDIA OpenShell sandbox backend for Oriro.

This plugin lets Oriro use OpenShell-managed sandboxes with mirrored local workspaces and SSH command execution.

## Install

```bash
oriro plugins install @oriro/openshell-sandbox
```

Restart the Gateway after installing or updating the plugin.

## Configure

Use the OpenShell docs for credentials, workspace mirroring, runtime selection, and troubleshooting:

- https://docs.oriro.ai/gateway/openshell

## Package

- Plugin id: `openshell`
- Package: `@oriro/openshell-sandbox`
- Minimum Oriro host: `2026.5.12-beta.1`
