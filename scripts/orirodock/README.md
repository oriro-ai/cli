# OriroDock <!-- omit in toc -->

Stop typing `docker-compose` commands. Just type `orirodock-start`.

Inspired by Simon Willison's [Running Oriro in Docker](https://til.simonwillison.net/llms/oriro-docker).

- [Quickstart](#quickstart)
- [Available Commands](#available-commands)
  - [Basic Operations](#basic-operations)
  - [Container Access](#container-access)
  - [Web UI \& Devices](#web-ui--devices)
  - [Setup \& Configuration](#setup--configuration)
  - [Maintenance](#maintenance)
  - [Utilities](#utilities)
- [Configuration \& Secrets](#configuration--secrets)
  - [Docker Files](#docker-files)
  - [Config Files](#config-files)
  - [Initial Setup](#initial-setup)
  - [How It Works in Docker](#how-it-works-in-docker)
  - [Env Precedence](#env-precedence)
- [Common Workflows](#common-workflows)
  - [Check Status and Logs](#check-status-and-logs)
  - [Set Up WhatsApp Bot](#set-up-whatsapp-bot)
  - [Troubleshooting Device Pairing](#troubleshooting-device-pairing)
  - [Fix Token Mismatch Issues](#fix-token-mismatch-issues)
  - [Permission Denied](#permission-denied)
- [Requirements](#requirements)
- [Development](#development)

## Quickstart

**Install:**

```bash
mkdir -p ~/.orirodock && curl -sL https://raw.githubusercontent.com/oriro/oriro/main/scripts/orirodock/orirodock-helpers.sh -o ~/.orirodock/orirodock-helpers.sh
```

```bash
echo 'source ~/.orirodock/orirodock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Canonical docs page: https://docs.oriro.ai/install/orirodock

If you previously installed OriroDock from `scripts/shell-helpers/orirodock-helpers.sh`, rerun the install command above. The old raw GitHub path has been removed.

**See what you get:**

```bash
orirodock-help
```

On first command, OriroDock auto-detects your Oriro directory:

- Checks common paths (`~/oriro`, `~/workspace/oriro`, etc.)
- If found, asks you to confirm
- Saves to `~/.orirodock/config`

**First time setup:**

```bash
orirodock-start
```

```bash
orirodock-fix-token
```

```bash
orirodock-dashboard
```

If you see "pairing required":

```bash
orirodock-devices
```

And approve the request for the specific device:

```bash
orirodock-approve <request-id>
```

## Available Commands

### Basic Operations

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `orirodock-start`   | Start the gateway               |
| `orirodock-stop`    | Stop the gateway                |
| `orirodock-restart` | Restart the gateway             |
| `orirodock-status`  | Check container status          |
| `orirodock-logs`    | View live logs (follows output) |

### Container Access

| Command                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `orirodock-shell`          | Interactive shell inside the gateway container |
| `orirodock-cli <command>`  | Run Oriro CLI commands                      |
| `orirodock-exec <command>` | Execute arbitrary commands in the container    |

### Web UI & Devices

| Command                 | Description                                |
| ----------------------- | ------------------------------------------ |
| `orirodock-dashboard`    | Open web UI in browser with authentication |
| `orirodock-devices`      | List device pairing requests               |
| `orirodock-approve <id>` | Approve a device pairing request           |

### Setup & Configuration

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `orirodock-fix-token` | Configure gateway authentication token (run once) |

### Maintenance

| Command            | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `orirodock-update`  | Pull latest, rebuild image, and restart (one command) |
| `orirodock-rebuild` | Rebuild the Docker image only                         |
| `orirodock-clean`   | Remove all containers and volumes (destructive!)      |

### Utilities

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `orirodock-health`      | Run gateway health check                  |
| `orirodock-token`       | Display the gateway authentication token  |
| `orirodock-cd`          | Jump to the Oriro project directory    |
| `orirodock-config`      | Open the Oriro config directory        |
| `orirodock-show-config` | Print config files with redacted values   |
| `orirodock-workspace`   | Open the workspace directory              |
| `orirodock-help`        | Show all available commands with examples |

## Configuration & Secrets

The Docker setup uses three config files on the host. The container never stores secrets — everything is bind-mounted from local files.

### Docker Files

| File                          | Purpose                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `Dockerfile`                  | Builds the `oriro:local` image (Node 22, pnpm, non-root `node` user)        |
| `docker-compose.yml`          | Defines `oriro-gateway` and `oriro-cli` services, bind-mounts, ports     |
| `docker-compose.override.yml` | Standard Docker Compose overrides — auto-loaded by OriroDock helpers if present |
| `docker-compose.extra.yml`    | Additional overrides — loaded after the standard override if present           |
| `scripts/docker/setup.sh`     | First-time setup — builds image, creates `.env` from `.env.example`            |
| `.env.example`                | Template for `<project>/.env` with all supported vars and docs                 |

### Config Files

| File                        | Purpose                                          | Examples                                                                                                |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `<project>/.env`            | **Docker infra** — image, ports, gateway token   | `ORIRO_GATEWAY_TOKEN`, `ORIRO_IMAGE`, `ORIRO_GATEWAY_PORT`, `ORIRO_AUTH_PROFILE_SECRET_DIR` |
| `~/.oriro/.env`          | **Secrets** — API keys and bot tokens            | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`                                             |
| `~/.oriro/oriro.json` | **Behavior config** — models, channels, policies | Model selection, WhatsApp allowlists, agent settings                                                    |

**Do NOT** put API keys or bot tokens in `oriro.json`. Use `~/.oriro/.env` for all secrets.

### Initial Setup

`./scripts/docker/setup.sh` handles first-time Docker configuration:

- Builds the `oriro:local` image from `Dockerfile`
- Creates `<project>/.env` from `.env.example` with a generated gateway token
- Creates the auth-profile secret key directory
- Sets up `~/.oriro` directories if they don't exist

```bash
./scripts/docker/setup.sh
```

After setup, add your API keys:

```bash
vim ~/.oriro/.env
```

See `.env.example` for all supported keys.

The `Dockerfile` supports optional build args:

- `ORIRO_IMAGE_APT_PACKAGES` — extra apt packages to install (e.g. `ffmpeg`); also accepts legacy `ORIRO_DOCKER_APT_PACKAGES`
- `ORIRO_IMAGE_PIP_PACKAGES` — extra Python packages to install (e.g. `requests==2.32.5`); pin versions and use only package indexes you trust
- `ORIRO_INSTALL_BROWSER=1` — pre-install Chromium for browser automation (adds ~300MB, but skips the 60-90s Playwright install on each container start)

### How It Works in Docker

`docker-compose.yml` bind-mounts both config and workspace from the host:

```yaml
volumes:
  - ${ORIRO_CONFIG_DIR}:/home/node/.oriro
  - ${ORIRO_WORKSPACE_DIR}:/home/node/.oriro/workspace
  - ${ORIRO_AUTH_PROFILE_SECRET_DIR}:/home/node/.config/oriro
```

This means:

- `~/.oriro/.env` is available inside the container at `/home/node/.oriro/.env` — Oriro loads it automatically as the global env fallback
- `~/.oriro/oriro.json` is available at `/home/node/.oriro/oriro.json` — the gateway watches it and hot-reloads most changes
- `~/.oriro-auth-profile-secrets` is available at `/home/node/.config/oriro` — Oriro stores the auth-profile encryption key there
- Downloadable external plugin packages and install records live under the mounted Oriro home
- Bundled Oriro channel plugins, such as Discord when present in the image,
  should normally load from the image-matched bundled copy. Avoid installing
  pinned `@oriro/*` channel packages into the mounted home unless you
  deliberately want an external npm override.
- No need to add API keys to `docker-compose.yml` or configure anything inside the container
- Keys survive `orirodock-update`, `orirodock-rebuild`, and `orirodock-clean` because they live on the host

The project `.env` feeds Docker Compose directly (gateway token, image name, ports). The `~/.oriro/.env` feeds the Oriro process inside the container.

### Example `~/.oriro/.env`

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABCDEF...
```

### Example `<project>/.env`

```bash
ORIRO_CONFIG_DIR=/Users/you/.oriro
ORIRO_WORKSPACE_DIR=/Users/you/.oriro/workspace
ORIRO_GATEWAY_PORT=18789
ORIRO_BRIDGE_PORT=18790
ORIRO_GATEWAY_BIND=lan
ORIRO_GATEWAY_TOKEN=<generated-by-docker-setup>
ORIRO_AUTH_PROFILE_SECRET_DIR=/Users/you/.oriro-auth-profile-secrets
ORIRO_IMAGE=oriro:local
```

### Env Precedence

Oriro loads env vars in this order (highest wins, never overrides existing):

1. **Process environment** — `docker-compose.yml` `environment:` block (gateway token, session keys)
2. **`.env` in CWD** — project root `.env` (Docker infra vars)
3. **`~/.oriro/.env`** — global secrets (API keys, bot tokens)
4. **`oriro.json` `env` block** — inline vars, applied only if still missing
5. **Shell env import** — optional login-shell scrape (`ORIRO_LOAD_SHELL_ENV=1`)

## Common Workflows

### Update Oriro

> **Important:** `oriro update` does not work inside Docker.
> The container runs as a non-root user with a source-built image, so `npm i -g` fails with EACCES.
> Use `orirodock-update` instead — it pulls, rebuilds, and restarts from the host.

```bash
orirodock-update
```

This runs `git pull` → `docker compose build` → `docker compose down/up` in one step.

If you only want to rebuild without pulling:

```bash
orirodock-rebuild && orirodock-stop && orirodock-start
```

### Check Status and Logs

**Restart the gateway:**

```bash
orirodock-restart
```

**Check container status:**

```bash
orirodock-status
```

**View live logs:**

```bash
orirodock-logs
```

### Set Up WhatsApp Bot

**Shell into the container:**

```bash
orirodock-shell
```

**Inside the container, login to WhatsApp:**

```bash
oriro channels login --channel whatsapp --verbose
```

Scan the QR code with WhatsApp on your phone.

**Verify connection:**

```bash
oriro status
```

### Troubleshooting Device Pairing

**Check for pending pairing requests:**

```bash
orirodock-devices
```

**Copy the Request ID from the "Pending" table, then approve:**

```bash
orirodock-approve <request-id>
```

Then refresh your browser.

### Fix Token Mismatch Issues

If you see "gateway token mismatch" errors:

```bash
orirodock-fix-token
```

This will:

1. Read the token from your `.env` file
2. Configure it in the Oriro config
3. Restart the gateway
4. Verify the configuration

### Permission Denied

**Ensure Docker is running and you have permission:**

```bash
docker ps
```

## Requirements

- Docker and Docker Compose installed
- Bash or Zsh shell
- Oriro project (run `scripts/docker/setup.sh`)

## Development

**Test with fresh config (mimics first-time install):**

```bash
unset ORIRODOCK_DIR && rm -f ~/.orirodock/config && source scripts/orirodock/orirodock-helpers.sh
```

Then run any command to trigger auto-detect:

```bash
orirodock-start
```
