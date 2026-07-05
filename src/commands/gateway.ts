// `oriro gateway` — Phase 2a. Run ORIRO's control plane: host all configured channels + fire scheduled
// agents, in ONE resident process (the OpenClaw-style always-on gateway). `status` shows what it will
// run without starting anything; `tick` runs a single agent pass (for wiring to OS cron / Task Scheduler).
import { spawnSync } from "node:child_process";
import { platform } from "node:process";
import type { Command } from "commander";
import { planGateway, runGateway } from "../gateway/gateway.js";
import { buildServiceCommand } from "../gateway/service.js";
import { heading, info, ok, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

/** Run a shell command; on failure print the trimmed stderr/stdout and return false. */
function runShell(cmd: string): boolean {
  const r = platform === "win32"
    ? spawnSync("cmd", ["/c", cmd], { encoding: "utf8" })
    : spawnSync("sh", ["-c", cmd], { encoding: "utf8" });
  if (r.status !== 0) { info(dim((r.stderr || r.stdout || "").trim().slice(0, 400))); return false; }
  return true;
}

export function registerGatewayCommand(program: Command): void {
  const gateway = program
    .command("gateway")
    .description("run ORIRO's control plane — all channels + scheduled agents in one resident process");

  gateway
    .command("status")
    .description("show what the gateway will run (channels + scheduled agents) — starts nothing")
    .action(() => {
      const plan = planGateway();
      heading("ORIRO Gateway — plan");
      if (!plan.channels.length) info(dim("channels: none configured — add with `oriro channels add telegram <token>`"));
      else for (const c of plan.channels) ok(`channel: ${accent(c.kind)} (will host)`);
      if (!plan.scheduledAgents.length) info(dim("agents: none scheduled — create with `oriro agents make <name> --task … --schedule …`"));
      else info(`agents scheduled: ${accent(plan.scheduledAgents.join(", "))}`);
      info(dim("run it: `oriro gateway` (Ctrl-C to stop)"));
    });

  gateway
    .command("tick")
    .description("fire every DUE scheduled agent once, then exit (wire to OS cron / Task Scheduler)")
    .action(async () => {
      heading("ORIRO Gateway — tick");
      await runGateway({ once: true, log: (l) => process.stdout.write(`  ${dim(l)}\n`) });
    });

  gateway
    .command("install")
    .description("install the gateway as an always-on OS service (starts on login, restarts on crash)")
    .option("--remove", "remove the installed service instead")
    .option("--apply", "actually apply it (default: print the exact command so you see what runs)")
    .action((opts: { remove?: boolean; apply?: boolean }) => {
      const inv = { node: process.execPath, bin: process.argv[1] ?? "oriro" };
      const { cmd, note } = buildServiceCommand(platform, { remove: Boolean(opts.remove), inv });
      heading(opts.remove ? "Remove gateway service" : "Install gateway service");
      info(`${note}: ${opts.remove ? "removes" : "runs"} ${accent("oriro gateway")}${opts.remove ? "" : " on login (auto-restart)"}`);
      if (!opts.apply) {
        process.stdout.write(`\n${cmd}\n\n`);
        info(dim("printed only — re-run with --apply to make this change, or run it yourself"));
        return;
      }
      if (runShell(cmd)) ok(opts.remove ? "gateway service removed" : "gateway installed — it will start on next login (start now: `oriro gateway`)");
      else die("could not apply (see the message above) — you can run the printed command manually");
    });

  // Default action: `oriro gateway` with no subcommand → run the resident control plane.
  gateway.action(async () => {
    const plan = planGateway();
    if (!plan.channels.length && !plan.scheduledAgents.length) {
      die("nothing to run — configure a channel (`oriro channels add …`) or schedule an agent (`oriro agents make … --schedule …`) first.");
    }
    heading("ORIRO Gateway");
    info(dim("one control plane: channels + scheduled agents. Ctrl-C to stop."));
    await runGateway({ log: (l) => process.stdout.write(`  ${dim(l)}\n`) });
  });
}
