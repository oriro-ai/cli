---
summary: "Run the Oriro Gateway on EasyRunner with Podman and Caddy"
read_when:
  - Deploying Oriro on EasyRunner
  - Running the Gateway behind EasyRunner's Caddy proxy
  - Choosing persistent volumes and auth for a hosted Gateway
title: "EasyRunner"
---

EasyRunner can host the Oriro Gateway as a small containerized app behind its
Caddy proxy. This guide assumes an EasyRunner host that runs Podman-compatible
Compose apps and exposes HTTPS through Caddy.

## Before you begin

- An EasyRunner server with a domain routed to it.
- A built or published Oriro container image.
- A persistent config volume for `/home/node/.oriro`.
- A persistent workspace volume for `/workspace`.
- A strong Gateway token or password.

Keep device auth enabled when possible. If your reverse proxy deployment cannot
carry device identity correctly, fix trusted-proxy settings first; use
dangerous auth bypasses only for a fully private, operator-controlled network.

## Compose app

Create an EasyRunner app with a Compose file shaped like this:

```yaml
services:
  oriro:
    image: ghcr.io/oriro-ai/cli:latest
    restart: unless-stopped
    environment:
      ORIRO_GATEWAY_TOKEN: ${ORIRO_GATEWAY_TOKEN}
      ORIRO_HOME: /home/node
      ORIRO_STATE_DIR: /home/node/.oriro
      ORIRO_CONFIG_PATH: /home/node/.oriro-ai/cli.json
      ORIRO_WORKSPACE_DIR: /workspace
    volumes:
      - oriro-config:/home/node/.oriro
      - oriro-workspace:/workspace
    labels:
      caddy: oriro.example.com
      caddy.reverse_proxy: "{{upstreams 1455}}"
    command: ["oriro", "gateway", "--bind", "lan", "--port", "1455"]

volumes:
  oriro-config:
  oriro-workspace:
```

Replace `oriro.example.com` with your Gateway hostname. Store
`ORIRO_GATEWAY_TOKEN` in EasyRunner's secret/environment manager instead of
committing it to the app definition.

## Configure Oriro

Inside the persistent config volume, keep the Gateway reachable only through
the proxy and require auth:

```json5
{
  gateway: {
    bind: "lan",
    port: 1455,
    auth: {
      token: "${ORIRO_GATEWAY_TOKEN}",
    },
  },
}
```

If Caddy terminates TLS for the Gateway, configure trusted proxy settings for
the exact proxy path rather than disabling auth checks globally. See
[Trusted proxy auth](/gateway/trusted-proxy-auth).

## Verify

From your workstation:

```bash
oriro gateway probe --url https://oriro.example.com --token <token>
oriro gateway status --url https://oriro.example.com --token <token>
```

From the EasyRunner host, check the app logs for a listening Gateway and no
startup SecretRef, plugin, or channel auth failures.

## Updates and backups

- Pull or build the new Oriro image, then redeploy the EasyRunner app.
- Back up the `oriro-config` volume before updates.
- Back up `oriro-workspace` if agents write durable project data there.
- Run `oriro doctor` after major updates to catch config migrations and
  service warnings.

## Troubleshooting

- `gateway probe` cannot connect: confirm the Caddy hostname points at the app
  and that the container listens on `0.0.0.0:1455`.
- Auth fails: rotate the token in EasyRunner secrets and the local client
  command together.
- Files are root-owned after restore: repair the mounted volumes so the
  container user can write `/home/node/.oriro` and `/workspace`.
- Browser or channel plugins fail: check whether the required external
  binaries, network egress, and mounted credentials are available inside the
  container.
