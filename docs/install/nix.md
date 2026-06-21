---
summary: "Install Oriro declaratively with Nix"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

Install Oriro declaratively with **[nix-oriro](https://github.com/oriro/nix-oriro)** - the first-party, batteries-included Home Manager module.

<Info>
The [nix-oriro](https://github.com/oriro/nix-oriro) repo is the source of truth for Nix installation. This page is a quick overview.
</Info>

## What you get

- Gateway + macOS app + tools (whisper, spotify, cameras) -- all pinned
- Launchd service that survives reboots
- Plugin system with declarative config
- Instant rollback: `home-manager switch --rollback`

## Quick start

<Steps>
  <Step title="Install Determinate Nix">
    If Nix is not already installed, follow the [Determinate Nix installer](https://github.com/DeterminateSystems/nix-installer) instructions.
  </Step>
  <Step title="Create a local flake">
    Use the agent-first template from the nix-oriro repo:
    ```bash
    mkdir -p ~/code/oriro-local
    # Copy templates/agent-first/flake.nix from the nix-oriro repo
    ```
  </Step>
  <Step title="Configure secrets">
    Set up your messaging bot token and model provider API key. Plain files at `~/.secrets/` work fine.
  </Step>
  <Step title="Fill in template placeholders and switch">
    ```bash
    home-manager switch
    ```
  </Step>
  <Step title="Verify">
    Confirm the launchd service is running and your bot responds to messages.
  </Step>
</Steps>

See the [nix-oriro README](https://github.com/oriro/nix-oriro) for full module options and examples.

## Nix-mode runtime behavior

When `ORIRO_NIX_MODE=1` is set (automatic with nix-oriro), Oriro enters a deterministic mode for Nix-managed installs. Other Nix packages can set the same mode; nix-oriro is the first-party reference.

You can also set it manually:

```bash
export ORIRO_NIX_MODE=1
```

On macOS, the GUI app does not automatically inherit shell environment variables. Enable Nix mode via defaults instead:

```bash
defaults write ai.oriro.mac oriro.nixMode -bool true
```

### What changes in Nix mode

- Auto-install and self-mutation flows are disabled
- `oriro.json` is treated as immutable. Startup-derived defaults stay runtime-only, and config writers such as setup, onboarding, mutating `oriro update`, plugin install/update/uninstall/enable, `doctor --fix`, `doctor --generate-gateway-token`, and `oriro config set` refuse to edit the file.
- Agents should edit the Nix source instead. For nix-oriro, use the agent-first [Quick Start](https://github.com/oriro/nix-oriro#quick-start) and set config under `programs.oriro.config` or `instances.<name>.config`.
- Missing dependencies surface Nix-specific remediation messages
- UI surfaces a read-only Nix mode banner

### Config and state paths

Oriro reads JSON5 config from `ORIRO_CONFIG_PATH` and stores mutable data in `ORIRO_STATE_DIR`. When running under Nix, set these explicitly to Nix-managed locations so runtime state and config stay out of the immutable store.

| Variable               | Default                                 |
| ---------------------- | --------------------------------------- |
| `ORIRO_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `ORIRO_STATE_DIR`   | `~/.oriro`                           |
| `ORIRO_CONFIG_PATH` | `$ORIRO_STATE_DIR/oriro.json`     |

### Service PATH discovery

The launchd/systemd gateway service auto-discovers Nix-profile binaries so
plugins and tools that shell out to `nix`-installed executables work without
manual PATH setup:

- When `NIX_PROFILES` is set, every entry is added to the service PATH in
  right-to-left precedence (matches Nix shell precedence - rightmost wins).
- When `NIX_PROFILES` is unset, `~/.nix-profile/bin` is added as a fallback.

This applies to both macOS launchd and Linux systemd service environments.

## Related

<CardGroup cols={2}>
  <Card title="nix-oriro" href="https://github.com/oriro/nix-oriro" icon="arrow-up-right-from-square">
    Source-of-truth Home Manager module and full setup guide.
  </Card>
  <Card title="Setup wizard" href="/start/wizard" icon="wand-magic-sparkles">
    Non-Nix CLI setup walkthrough.
  </Card>
  <Card title="Docker" href="/install/docker" icon="docker">
    Containerized setup as a non-Nix alternative.
  </Card>
  <Card title="Updating" href="/install/updating" icon="arrow-up-right-from-square">
    Updating Home Manager-managed installs alongside the package.
  </Card>
</CardGroup>
