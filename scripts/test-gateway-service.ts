// Unit test for the gateway OS-service installer (src/gateway/service.ts) — Phase 2a-2. tsx.
// Pure command builder, so all three platforms are verified here regardless of the host OS.
// Run: tsx scripts/test-gateway-service.ts
import { buildServiceCommand, GATEWAY_TASK, GATEWAY_LABEL, GATEWAY_UNIT } from "../src/gateway/service.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

const inv = { node: "/usr/bin/node", bin: "/opt/oriro/dist/cli.js" };

// Windows — Task Scheduler ONLOGON
{
  const install = buildServiceCommand("win32", { remove: false, inv });
  ok(install.cmd.includes("schtasks /Create") && install.cmd.includes(GATEWAY_TASK) && install.cmd.includes("ONLOGON") && install.cmd.includes("gateway"), "win32 install → schtasks ONLOGON running `gateway`");
  const remove = buildServiceCommand("win32", { remove: true, inv });
  ok(remove.cmd.includes("schtasks /Delete") && remove.cmd.includes(GATEWAY_TASK), "win32 remove → schtasks /Delete");
}

// macOS — launchd LaunchAgent
{
  const install = buildServiceCommand("darwin", { remove: false, inv });
  ok(install.cmd.includes(`${GATEWAY_LABEL}.plist`) && install.cmd.includes("RunAtLoad") && install.cmd.includes("KeepAlive") && install.cmd.includes("launchctl load"), "darwin install → launchd plist (RunAtLoad+KeepAlive)");
  ok(install.cmd.includes(inv.node) && install.cmd.includes(inv.bin) && install.cmd.includes("gateway"), "darwin install → runs node cli gateway");
  const remove = buildServiceCommand("darwin", { remove: true, inv });
  ok(remove.cmd.includes("launchctl unload") && remove.cmd.includes("rm -f"), "darwin remove → unload + rm");
}

// Linux — systemd user service
{
  const install = buildServiceCommand("linux", { remove: false, inv });
  ok(install.cmd.includes(`${GATEWAY_UNIT}.service`) && install.cmd.includes("Restart=always") && install.cmd.includes("systemctl --user enable --now"), "linux install → systemd user unit (Restart=always, enabled)");
  ok(install.cmd.includes("WantedBy=default.target") && install.cmd.includes('gateway'), "linux install → WantedBy default.target, ExecStart gateway");
  const remove = buildServiceCommand("linux", { remove: true, inv });
  ok(remove.cmd.includes("disable --now") && remove.cmd.includes("daemon-reload"), "linux remove → disable + daemon-reload");
}

// invocation is quoted (paths may contain spaces)
{
  const spaced = buildServiceCommand("linux", { remove: false, inv: { node: "/n o/node", bin: "/o r/cli.js" } });
  ok(spaced.cmd.includes('"/n o/node"') && spaced.cmd.includes('"/o r/cli.js"'), "paths with spaces are quoted");
}

process.stdout.write(fails === 0 ? "\ngateway-service: ALL PASS\n" : `\ngateway-service: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
