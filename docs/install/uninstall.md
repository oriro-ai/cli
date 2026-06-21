---
summary: "Uninstall Oriro completely (CLI, service, state, workspace)"
read_when:
  - You want to remove Oriro from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

Two paths:

- **Easy path** if `oriro` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
oriro uninstall
```

When using the CLI, state removal preserves configured workspace directories unless you also select `--workspace`.

Preview what will be removed (safe):

```bash
oriro uninstall --dry-run --all
```

Non-interactive (automation / npx). Use with caution and only after confirming scopes:

```bash
oriro uninstall --all --yes --non-interactive
npx -y oriro uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
oriro gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
oriro gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${ORIRO_STATE_DIR:-$HOME/.oriro}"
```

If you set `ORIRO_CONFIG_PATH` to a custom location outside the state dir, delete that file too.
If you want to keep a workspace inside the state dir, such as `~/.oriro/workspace`, move it aside before running `rm -rf` or delete state contents selectively.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.oriro/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g oriro
pnpm remove -g oriro
bun remove -g oriro
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/Oriro.app
```

Notes:

- If you used profiles (`--profile` / `ORIRO_PROFILE`), repeat step 3 for each state dir (defaults are `~/.oriro-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `oriro` is missing.

### macOS (launchd)

Default label is `ai.oriro.gateway` (or `ai.oriro.<profile>`; legacy `com.oriro.*` may still exist):

```bash
launchctl bootout gui/$UID/ai.oriro.gateway
rm -f ~/Library/LaunchAgents/ai.oriro.gateway.plist
```

If you used a profile, replace the label and plist name with `ai.oriro.<profile>`. Remove any legacy `com.oriro.*` plists if present.

### Linux (systemd user unit)

Default unit name is `oriro-gateway.service` (or `oriro-gateway-<profile>.service`):

```bash
systemctl --user disable --now oriro-gateway.service
rm -f ~/.config/systemd/user/oriro-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `Oriro Gateway` (or `Oriro Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "Oriro Gateway"
Remove-Item -Force "$env:USERPROFILE\.oriro\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.oriro-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://oriro.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g oriro@latest`.
Remove it with `npm rm -g oriro` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `oriro ...` / `bun run oriro ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.

## Related

- [Install overview](/install)
- [Migration guide](/install/migrating)
