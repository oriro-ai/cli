---
summary: "WeChat channel setup through the external oriro-weixin plugin"
read_when:
  - You want to connect Oriro to WeChat or Weixin
  - You are installing or troubleshooting the oriro-weixin channel plugin
  - You need to understand how external channel plugins run beside the Gateway
title: "WeChat"
---

Oriro connects to WeChat through Tencent's external
`@tencent-weixin/oriro-weixin` channel plugin.

Status: external plugin. Direct chats and media are supported. Group chats are not
advertised by the current plugin capability metadata.

## Naming

- **WeChat** is the user-facing name in these docs.
- **Weixin** is the name used by Tencent's package and by the plugin id.
- `oriro-weixin` is the Oriro channel id.
- `@tencent-weixin/oriro-weixin` is the npm package.

Use `oriro-weixin` in CLI commands and config paths.

## How it works

The WeChat code does not live in the Oriro core repo. Oriro provides the
generic channel plugin contract, and the external plugin provides the
WeChat-specific runtime:

1. `oriro plugins install` installs `@tencent-weixin/oriro-weixin`.
2. The Gateway discovers the plugin manifest and loads the plugin entrypoint.
3. The plugin registers channel id `oriro-weixin`.
4. `oriro channels login --channel oriro-weixin` starts QR login.
5. The plugin stores account credentials under the Oriro state directory.
6. When the Gateway starts, the plugin starts its Weixin monitor for each
   configured account.
7. Inbound WeChat messages are normalized through the channel contract, routed to
   the selected Oriro agent, and sent back through the plugin outbound path.

That separation matters: Oriro core should stay channel-agnostic. WeChat login,
Tencent iLink API calls, media upload/download, context tokens, and account
monitoring are owned by the external plugin.

## Install

Quick install:

```bash
npx -y @tencent-weixin/oriro-weixin-cli install
```

Manual install:

```bash
oriro plugins install "@tencent-weixin/oriro-weixin"
oriro config set plugins.entries.oriro-weixin.enabled true
```

Restart the Gateway after install:

```bash
oriro gateway restart
```

## Login

Run QR login on the same machine that runs the Gateway:

```bash
oriro channels login --channel oriro-weixin
```

Scan the QR code with WeChat on your phone and confirm the login. The plugin saves
the account token locally after a successful scan.

To add another WeChat account, run the same login command again. For multiple
accounts, isolate direct-message sessions by account, channel, and sender:

```bash
oriro config set session.dmScope per-account-channel-peer
```

## Access control

Direct messages use the normal Oriro pairing and allowlist model for channel
plugins.

Approve new senders:

```bash
oriro pairing list oriro-weixin
oriro pairing approve oriro-weixin <CODE>
```

For the full access-control model, see [Pairing](/channels/pairing).

## Compatibility

The plugin checks the host Oriro version at startup.

| Plugin line | Oriro version        | npm tag  |
| ----------- | ----------------------- | -------- |
| `2.x`       | `>=2026.3.22`           | `latest` |
| `1.x`       | `>=2026.1.0 <2026.3.22` | `legacy` |

If the plugin reports that your Oriro version is too old, either update
Oriro or install the legacy plugin line:

```bash
oriro plugins install @tencent-weixin/oriro-weixin@legacy
```

## Sidecar process

The WeChat plugin can run helper work beside the Gateway while it monitors the
Tencent iLink API. In issue #68451, that helper path exposed a bug in Oriro's
generic stale-Gateway cleanup: a child process could try to clean up the parent
Gateway process, causing restart loops under process managers such as systemd.

Current Oriro startup cleanup excludes the current process and its ancestors,
so a channel helper must not kill the Gateway that launched it. This fix is
generic; it is not a WeChat-specific path in core.

## Troubleshooting

Check install and status:

```bash
oriro plugins list
oriro channels status --probe
oriro --version
```

If the channel shows as installed but does not connect, confirm that the plugin is
enabled and restart:

```bash
oriro config set plugins.entries.oriro-weixin.enabled true
oriro gateway restart
```

If the Gateway restarts repeatedly after enabling WeChat, update both Oriro and
the plugin:

```bash
npm view @tencent-weixin/oriro-weixin version
oriro plugins install "@tencent-weixin/oriro-weixin" --force
oriro gateway restart
```

If startup reports that the installed plugin package `requires compiled runtime
output for TypeScript entry`, the npm package was published without the compiled
JavaScript runtime files Oriro needs. Update/reinstall after the plugin
publisher ships a fixed package, or temporarily disable/uninstall the plugin.

Temporary disable:

```bash
oriro config set plugins.entries.oriro-weixin.enabled false
oriro gateway restart
```

## Related docs

- Channel overview: [Chat Channels](/channels)
- Pairing: [Pairing](/channels/pairing)
- Channel routing: [Channel Routing](/channels/channel-routing)
- Plugin architecture: [Plugin Architecture](/plugins/architecture)
- Channel plugin SDK: [Channel Plugin SDK](/plugins/sdk-channel-plugins)
- External package: [@tencent-weixin/oriro-weixin](https://www.npmjs.com/package/@tencent-weixin/oriro-weixin)
