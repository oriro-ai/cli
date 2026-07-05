// `oriro gateway` — Phase 2a. Run ORIRO's control plane: host all configured channels + fire scheduled
// agents, in ONE resident process (the OpenClaw-style always-on gateway). `status` shows what it will
// run without starting anything; `tick` runs a single agent pass (for wiring to OS cron / Task Scheduler).
import type { Command } from "commander";
import { planGateway, runGateway } from "../gateway/gateway.js";
import { heading, info, ok, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

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
