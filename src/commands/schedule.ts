// UX-10 (2026-07-04): make scheduled agents actually FIRE. Agents already have --schedule + `tick`
// (run-due-once) + `daemon` (resident); what was missing is the OS-scheduler entry that runs `tick`
// on an interval without a resident process — the built-in that Antigravity/openclaw have. This
// registers `oriro agents cron`: cross-platform (Windows Task Scheduler / Unix crontab), and PRINTS
// the exact command by default (you see + control what gets scheduled) — `--apply` runs it.
import { spawnSync } from "node:child_process";
import { platform } from "node:process";
import type { Command } from "commander";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

const TASK_NAME = "ORIRO_Agents_Tick";

/** Parse "5m" | "2h" → minutes. */
function intervalMinutes(spec: string): number | null {
  const m = /^(\d+)(m|h)$/.exec(spec.trim());
  if (!m) return null;
  const n = parseInt(m[1] as string, 10);
  if (n <= 0) return null;
  return m[2] === "h" ? n * 60 : n;
}

/** The command that runs a single due-agent sweep: `<node> <cli.js> agents tick`. */
function tickInvocation(): { node: string; bin: string } {
  return { node: process.execPath, bin: process.argv[1] ?? "oriro" };
}

function buildCron(mins: number, remove: boolean): { cmd: string; note: string } {
  const { node, bin } = tickInvocation();
  if (platform === "win32") {
    if (remove) return { cmd: `schtasks /Delete /TN ${TASK_NAME} /F`, note: "Windows Task Scheduler" };
    const sc = mins % 60 === 0 ? `/SC HOURLY /MO ${mins / 60}` : `/SC MINUTE /MO ${mins}`;
    return {
      cmd: `schtasks /Create /TN ${TASK_NAME} /TR "\\"${node}\\" \\"${bin}\\" agents tick" ${sc} /F`,
      note: "Windows Task Scheduler",
    };
  }
  // Unix: edit the crontab, tagged with the task name so we can find/remove our line.
  const line = `*/${mins} * * * * "${node}" "${bin}" agents tick # ${TASK_NAME}`;
  if (remove) {
    return { cmd: `crontab -l 2>/dev/null | grep -v '# ${TASK_NAME}' | crontab -`, note: "crontab" };
  }
  return {
    cmd: `( crontab -l 2>/dev/null | grep -v '# ${TASK_NAME}'; echo '${line}' ) | crontab -`,
    note: "crontab",
  };
}

function runShell(cmd: string): boolean {
  const r = platform === "win32"
    ? spawnSync("cmd", ["/c", cmd], { encoding: "utf8" })
    : spawnSync("sh", ["-c", cmd], { encoding: "utf8" });
  if (r.status !== 0) {
    info(dim((r.stderr || r.stdout || "").trim().slice(0, 300)));
    return false;
  }
  return true;
}

/** Register `oriro agents cron` on the given `agents` command. */
export function registerAgentsCron(agents: Command): void {
  agents
    .command("cron")
    .description("install an OS scheduler that runs `agents tick` on an interval (fires scheduled agents)")
    .option("--every <spec>", "interval: Nm | Nh", "5m")
    .option("--remove", "remove the scheduler entry instead of installing it")
    .option("--apply", "actually apply the change (default: just print the command to run)")
    .action((opts: { every: string; remove?: boolean; apply?: boolean }) => {
      const mins = intervalMinutes(opts.every);
      if (!opts.remove && mins === null) die(`invalid --every '${opts.every}' — use Nm or Nh (e.g. 5m, 2h)`);
      const { cmd, note } = buildCron(mins ?? 5, Boolean(opts.remove));

      heading(opts.remove ? "Remove scheduled agents" : "Schedule agents");
      info(`${note}: runs ${accent("oriro agents tick")} ${opts.remove ? "" : `every ${accent(opts.every)}`}`);
      if (!opts.apply) {
        process.stdout.write(`\n  ${cmd}\n\n`);
        info(dim("printed only — re-run with --apply to make this change, or run the command yourself"));
        return;
      }
      if (runShell(cmd)) ok(opts.remove ? "scheduler entry removed" : `scheduled — agents tick will run every ${opts.every}`);
      else die("could not apply the schedule (see the message above) — you can run the printed command manually");
    });
}
