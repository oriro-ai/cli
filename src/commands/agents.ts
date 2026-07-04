// `oriro agents` — your workflow-automation agents (first-class, same as skills & routers).
//   list                 → your saved agents (router, schedule, last run)
//   make <name> --task   → create/update an agent (bind a router, set a schedule)
//   show <name>          → print the definition
//   run <name>           → run it now — comes alive on its router, full tools behind Guardian
//   add <path|url>       → import a shared/community agent (dynamic catalog)
//   remove <name>        → delete it
//   tick                 → run every DUE scheduled agent once, then exit (wire to OS cron/Task Scheduler)
//   daemon               → stay resident and run scheduled agents as they come due
import type { Command } from "commander";
import {
  listAgents, loadAgent, saveAgent, removeAgent, markRun, loadState, isDue,
  parseScheduleMs, isValidAgentName, type AgentDef,
} from "../agents/store.js";
import { runAgent } from "../agents/run.js";
import { addAgentFromSource } from "../agents/catalog.js";
import { registeredRouters } from "../routers/router-pool.js";
import { ok, info, heading, die, confirmDestructive } from "./ui.js";
import { renderList, isMachineOutput } from "./output.js";
import { accent, dim } from "../ui/theme.js";

function nowIso(): string {
  return new Date().toISOString();
}

function printAgent(a: AgentDef): void {
  const brain = a.router ? accent(a.router) : dim("active pool");
  const sched = a.schedule ? accent(a.schedule) : dim("manual");
  process.stdout.write(`  ${accent(a.name.padEnd(22))} brain:${brain}  schedule:${sched}\n`);
  if (a.description) process.stdout.write(`  ${dim(a.description)}\n`);
}

/** Run one agent, record it, and report. Shared by `run`, `tick`, and `daemon`. */
async function runAndReport(def: AgentDef, opts: { cwd?: string; input?: string } = {}): Promise<boolean> {
  info(`running ${accent(def.name)} ${dim(`(brain: ${def.router ?? "active pool"})`)}…`);
  const res = await runAgent(def, opts);
  markRun(def.name, res.ok, Date.now());
  if (res.output) process.stdout.write(`\n${res.output}\n\n`);
  if (res.ok) ok(`${def.name} done`);
  else info(`${def.name} produced no output${res.output ? "" : " (router unavailable?)"}`);
  return res.ok;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function registerAgentsCommand(program: Command): void {
  const agents = program
    .command("agents")
    .description("your workflow-automation agents — run on a router, full tools behind Guardian")
    // Bare `oriro agents` → a short guide (never silently do nothing).
    .action(() => {
      heading("Agents");
      const all = listAgents();
      info(`${accent(String(all.length))} saved · an agent = a saved workflow that runs on a router (its brain)`);
      info(`make one: ${accent('oriro agents make <name> --task "…" [--router <id>] [--schedule 1h]')}`);
      info(`then: ${accent("oriro agents run <name>")} ${dim("· or")} ${accent("oriro agents tick")} ${dim("for scheduled ones")}`);
    });

  agents
    .command("list")
    .description("list your saved agents")
    .option("-o, --output <fmt>", "output format: text (default) | json | csv")
    .option("-q, --query <expr>", "filter/select: 'field', 'field=value', or 'field=value:selectField'")
    .action((opts: { output?: string; query?: string }) => {
      const all = listAgents();
      const state = loadState();
      if (isMachineOutput(opts) || opts.query) {
        const rows = all.map((a) => ({
          name: a.name,
          brain: a.router ?? "pool",
          schedule: a.schedule ?? "manual",
          description: a.description ?? "",
          lastRun: state[a.name]?.lastRunAt ? new Date(state[a.name]!.lastRunAt as number).toISOString() : "",
          lastOk: state[a.name]?.lastOk ?? null,
        }));
        process.stdout.write(renderList(rows, {
          output: opts.output, query: opts.query,
          columns: ["name", "brain", "schedule", "lastRun", "lastOk"],
        }) + "\n");
        return;
      }
      heading("Agents");
      if (!all.length) {
        info(`no agents yet — make one: ${accent('oriro agents make my-agent --task "…"')}`);
        return;
      }
      for (const a of all) {
        printAgent(a);
        const last = state[a.name]?.lastRunAt;
        if (last) process.stdout.write(`  ${dim(`last run: ${new Date(last).toISOString()}${state[a.name]?.lastOk === false ? " (failed)" : ""}`)}\n`);
      }
    });

  agents
    .command("make <name>")
    .description("create or update an agent")
    .requiredOption("-t, --task <text>", "the workflow / instructions the agent carries out")
    .option("-d, --desc <text>", "a short description")
    .option("-r, --router <id>", "bind a router as the brain (default: your active pool)")
    .option("-s, --schedule <spec>", "automation cadence: Nm | Nh | Nd | hourly | daily")
    .option("-c, --cwd <path>", "working directory for the automation")
    .action((name: string, opts: { task: string; desc?: string; router?: string; schedule?: string; cwd?: string }) => {
      if (!isValidAgentName(name)) die(`invalid agent name '${name}' — use lowercase letters, digits and hyphens`);
      if (opts.schedule && parseScheduleMs(opts.schedule) === undefined) {
        die(`invalid --schedule '${opts.schedule}' — use Nm, Nh, Nd, hourly or daily`);
      }
      if (opts.router && !registeredRouters().some((r) => r.id === opts.router)) {
        info(`note: router '${opts.router}' isn't added yet — add it with \`oriro routers add ${opts.router}\` or it falls back to your active pool`);
      }
      const existing = loadAgent(name);
      const now = nowIso();
      const def: AgentDef = {
        name,
        task: opts.task,
        ...(opts.desc ? { description: opts.desc } : {}),
        ...(opts.router ? { router: opts.router } : {}),
        ...(opts.schedule ? { schedule: opts.schedule } : {}),
        ...(opts.cwd ? { cwd: opts.cwd } : {}),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      saveAgent(def);
      ok(`${existing ? "updated" : "created"} agent ${accent(name)}`);
      if (def.schedule) info(`scheduled ${accent(def.schedule)} — run \`oriro agents tick\` (or \`daemon\`) to fire it when due`);
      else info(`run it: ${accent(`oriro agents run ${name}`)}`);
    });

  agents
    .command("show <name>")
    .description("print an agent's definition")
    .action((name: string) => {
      const def = loadAgent(name);
      if (!def) die(`no agent named '${name}' — run \`oriro agents list\``);
      process.stdout.write(`${JSON.stringify(def, null, 2)}\n`);
    });

  agents
    .command("run <name>")
    .description("run an agent now (comes alive on its router, full tools behind Guardian)")
    .option("-c, --cwd <path>", "working directory for this run")
    .option("-i, --input <text>", "input to pass to the agent")
    .action(async (name: string, opts: { cwd?: string; input?: string }) => {
      const def = loadAgent(name);
      if (!def) die(`no agent named '${name}' — run \`oriro agents list\``);
      await runAndReport(def as AgentDef, { ...(opts.cwd ? { cwd: opts.cwd } : {}), ...(opts.input ? { input: opts.input } : {}) });
    });

  agents
    .command("add <path-or-url>")
    .description("import a shared/community agent from a JSON file or URL")
    .action(async (src: string) => {
      const res = await addAgentFromSource(src, nowIso());
      if (!res.ok) die(`could not add agent: ${res.error}`);
      ok(`${res.overwrote ? "updated" : "added"} agent ${accent(res.name ?? "")} ${dim("→ ~/.oriro/agents")}`);
      info(`run it: ${accent(`oriro agents run ${res.name}`)}`);
    });

  agents
    .command("remove <name>")
    .description("delete an agent")
    .option("-f, --force", "skip the confirmation prompt")
    .action(async (name: string, opts: { force?: boolean }) => {
      if (!loadAgent(name)) { info(`'${name}' is not a saved agent — nothing to remove`); return; }
      if (!(await confirmDestructive(`remove agent '${name}'`, opts))) { info("cancelled"); return; }
      if (!removeAgent(name)) { info(`'${name}' is not a saved agent — nothing to remove`); return; }
      ok(`removed ${accent(name)}`);
    });

  agents
    .command("tick")
    .description("run every DUE scheduled agent once, then exit (wire to OS cron / Task Scheduler)")
    .action(async () => {
      const state = loadState();
      const now = Date.now();
      const due = listAgents().filter((a) => isDue(a, state, now));
      heading("Agents · tick");
      if (!due.length) { info("0 agents due"); return; }
      info(`${accent(String(due.length))} due: ${due.map((d) => d.name).join(", ")}`);
      for (const def of due) await runAndReport(def);
    });

  agents
    .command("daemon")
    .description("stay resident and run scheduled agents as they come due (Ctrl-C to stop)")
    .option("-i, --interval <seconds>", "how often to check for due agents", "60")
    .action(async (opts: { interval: string }) => {
      const everyMs = Math.max(5, Number(opts.interval) || 60) * 1000;
      heading("Agents · daemon");
      info(`checking every ${accent(`${everyMs / 1000}s`)} — Ctrl-C to stop`);
      let stop = false;
      process.on("SIGINT", () => { stop = true; info("\nstopping…"); });
      while (!stop) {
        const state = loadState();
        const now = Date.now();
        const due = listAgents().filter((a) => isDue(a, state, now));
        for (const def of due) { if (stop) break; await runAndReport(def); }
        // Sleep in short slices so Ctrl-C is responsive.
        for (let waited = 0; waited < everyMs && !stop; waited += 500) await sleep(500);
      }
    });
}
