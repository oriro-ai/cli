// ORIRO Gateway — OS service install (Phase 2a-2). Turns `oriro gateway` into a real always-on
// background service that starts on login and restarts on crash — the OpenClaw daemon parity.
// Cross-platform, and PURE (returns the exact command; the command layer prints by default and only
// runs it with --apply, so the user always sees what will touch their machine). Mirrors the
// print-then-apply pattern of `agents cron` (schedule.ts). Unit-tested per platform.

export const GATEWAY_TASK = "ORIRO_Gateway";        // Windows Task Scheduler name
export const GATEWAY_LABEL = "ai.oriro.gateway";    // macOS launchd label
export const GATEWAY_UNIT = "oriro-gateway";        // linux systemd unit name

export interface ServiceInvocation {
  node: string; // process.execPath
  bin: string;  // the CLI entry (process.argv[1])
}

export interface ServiceCommand {
  cmd: string;   // the shell command to install/remove the service
  note: string;  // human label of the mechanism
}

function systemdUnit(inv: ServiceInvocation): string {
  return [
    "[Unit]",
    "Description=ORIRO Gateway (channels + scheduled agents)",
    "After=network-online.target",
    "",
    "[Service]",
    `ExecStart="${inv.node}" "${inv.bin}" gateway`,
    "Restart=always",
    "RestartSec=5",
    "",
    "[Install]",
    "WantedBy=default.target",
  ].join("\n");
}

function launchdPlist(inv: ServiceInvocation): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0"><dict>',
    `  <key>Label</key><string>${GATEWAY_LABEL}</string>`,
    "  <key>ProgramArguments</key>",
    `  <array><string>${inv.node}</string><string>${inv.bin}</string><string>gateway</string></array>`,
    "  <key>RunAtLoad</key><true/>",
    "  <key>KeepAlive</key><true/>",
    "</dict></plist>",
  ].join("\n");
}

/**
 * Build the platform-specific install (or --remove) command for the gateway service. Pure.
 * Windows → Task Scheduler ONLOGON; macOS → launchd LaunchAgent (RunAtLoad+KeepAlive);
 * Linux → systemd user service (Restart=always). Each install is a single compound shell command so
 * the command layer can print it verbatim and run it only on --apply.
 */
export function buildServiceCommand(plat: NodeJS.Platform, opts: { remove: boolean; inv: ServiceInvocation }): ServiceCommand {
  const { node, bin } = opts.inv;

  if (plat === "win32") {
    if (opts.remove) return { cmd: `schtasks /Delete /TN ${GATEWAY_TASK} /F`, note: "Windows Task Scheduler" };
    return {
      cmd: `schtasks /Create /TN ${GATEWAY_TASK} /TR "\\"${node}\\" \\"${bin}\\" gateway" /SC ONLOGON /RL LIMITED /F`,
      note: "Windows Task Scheduler (starts at logon)",
    };
  }

  if (plat === "darwin") {
    const plistPath = `"$HOME/Library/LaunchAgents/${GATEWAY_LABEL}.plist"`;
    if (opts.remove) return { cmd: `launchctl unload ${plistPath} 2>/dev/null; rm -f ${plistPath}`, note: "launchd LaunchAgent" };
    return {
      cmd:
        `mkdir -p "$HOME/Library/LaunchAgents" && cat > ${plistPath} <<'ORIRO_PLIST'\n${launchdPlist(opts.inv)}\nORIRO_PLIST\n` +
        `launchctl unload ${plistPath} 2>/dev/null; launchctl load ${plistPath}`,
      note: "launchd LaunchAgent (RunAtLoad + KeepAlive)",
    };
  }

  // Linux (+ other unix): systemd user service.
  const unitPath = `"$HOME/.config/systemd/user/${GATEWAY_UNIT}.service"`;
  if (opts.remove) {
    return {
      cmd: `systemctl --user disable --now ${GATEWAY_UNIT} 2>/dev/null; rm -f ${unitPath}; systemctl --user daemon-reload`,
      note: "systemd user service",
    };
  }
  return {
    cmd:
      `mkdir -p "$HOME/.config/systemd/user" && cat > ${unitPath} <<'ORIRO_UNIT'\n${systemdUnit(opts.inv)}\nORIRO_UNIT\n` +
      `systemctl --user daemon-reload && systemctl --user enable --now ${GATEWAY_UNIT}`,
    note: "systemd user service (Restart=always)",
  };
}
