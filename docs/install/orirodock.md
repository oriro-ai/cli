---
summary: "OriroDock shell helpers for Docker-based Oriro installs"
read_when:
  - You run Oriro with Docker often and want shorter day-to-day commands
  - You want a helper layer for dashboard, logs, token setup, and pairing flows
title: "OriroDock"
---

OriroDock is a small shell-helper layer for Docker-based Oriro installs.

It gives you short commands like `orirodock-start`, `orirodock-dashboard`, and `orirodock-fix-token` instead of longer `docker compose ...` invocations.

If you have not set up Docker yet, start with [Docker](/install/docker).

## Install

Use the canonical helper path:

```bash
mkdir -p ~/.orirodock && curl -sL https://raw.githubusercontent.com/oriro-ai/cli/main/scripts/orirodock/orirodock-helpers.sh -o ~/.orirodock/orirodock-helpers.sh
echo 'source ~/.orirodock/orirodock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

If you previously installed OriroDock from `scripts/shell-helpers/orirodock-helpers.sh`, reinstall from the new `scripts/orirodock/orirodock-helpers.sh` path. The old raw GitHub path was removed.

## What you get

### Basic operations

| Command            | Description            |
| ------------------ | ---------------------- |
| `orirodock-start`   | Start the gateway      |
| `orirodock-stop`    | Stop the gateway       |
| `orirodock-restart` | Restart the gateway    |
| `orirodock-status`  | Check container status |
| `orirodock-logs`    | Follow gateway logs    |

### Container access

| Command                   | Description                                   |
| ------------------------- | --------------------------------------------- |
| `orirodock-shell`          | Open a shell inside the gateway container     |
| `orirodock-cli <command>`  | Run Oriro CLI commands in Docker           |
| `orirodock-exec <command>` | Execute an arbitrary command in the container |

### Web UI and pairing

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `orirodock-dashboard`    | Open the Control UI URL      |
| `orirodock-devices`      | List pending device pairings |
| `orirodock-approve <id>` | Approve a pairing request    |

### Setup and maintenance

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `orirodock-fix-token` | Configure the gateway token inside the container |
| `orirodock-update`    | Pull, rebuild, and restart                       |
| `orirodock-rebuild`   | Rebuild the Docker image only                    |
| `orirodock-clean`     | Remove containers and volumes                    |

### Utilities

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `orirodock-health`      | Run a gateway health check              |
| `orirodock-token`       | Print the gateway token                 |
| `orirodock-cd`          | Jump to the Oriro project directory  |
| `orirodock-config`      | Open `~/.oriro`                      |
| `orirodock-show-config` | Print config files with redacted values |
| `orirodock-workspace`   | Open the workspace directory            |

## First-time flow

```bash
orirodock-start
orirodock-fix-token
orirodock-dashboard
```

If the browser says pairing is required:

```bash
orirodock-devices
orirodock-approve <request-id>
```

## Config and secrets

OriroDock works with the same Docker config split described in [Docker](/install/docker):

- `<project>/.env` for Docker-specific values like image name, ports, and the gateway token
- `~/.oriro/.env` for env-backed provider keys and bot tokens
- `~/.oriro/agents/<agentId>/agent/auth-profiles.json` for stored provider OAuth/API-key auth
- `~/.oriro-ai/cli.json` for behavior config

Use `orirodock-show-config` when you want to inspect the `.env` files and `oriro.json` quickly. It redacts `.env` values in its printed output.

## Related

<CardGroup cols={2}>
  <Card title="Docker" href="/install/docker" icon="docker">
    Canonical Docker install for Oriro.
  </Card>
  <Card title="Docker VM runtime" href="/install/docker-vm-runtime" icon="cube">
    Docker-managed VM runtime for hardened isolation.
  </Card>
  <Card title="Updating" href="/install/updating" icon="arrow-up-right-from-square">
    Updating the Oriro package and managed services.
  </Card>
</CardGroup>
