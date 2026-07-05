// ORIRO Gateway — Phase 2a. One persistent control plane that hosts EVERYTHING at once: all
// configured chat channels (Telegram/Discord) AND the scheduled-agent cron loop, in a single resident
// process — the OpenClaw-style "gateway" (`openclaw onboard --install-daemon`), composed from the
// pieces ORIRO already ships (channels/* + agents/*), not a reimplementation. Keyless throughout.
// `planGateway()` is pure (reads config, starts nothing) so status + the runner share it and it's tested.
import { readChannels, type ChannelKind } from "../channels/config.js";
import { startTelegram, type RunningChannel } from "../channels/telegram.js";
import { startDiscord } from "../channels/discord.js";
import { listAgents, loadState, markRun, isDue } from "../agents/store.js";
import { runAgent } from "../agents/run.js";

export interface GatewayPlan {
  /** Channels the gateway will HOST now (enabled, token present; WhatsApp is excluded — it needs an
   *  interactive QR pairing + explicit --accept-risk, so it isn't auto-started by the gateway). */
  channels: Array<{ kind: ChannelKind; token: string }>;
  /** Names of agents with a schedule — the gateway fires them as they come due. */
  scheduledAgents: string[];
}

/** What the gateway WILL run — pure (reads config only, starts nothing). Unit-tested. */
export function planGateway(): GatewayPlan {
  const channels = readChannels()
    .filter((c) => c.enabled && (c.kind === "telegram" || c.kind === "discord") && !!c.token)
    .map((c) => ({ kind: c.kind, token: c.token }));
  const scheduledAgents = listAgents().filter((a) => a.schedule).map((a) => a.name);
  return { channels, scheduledAgents };
}

async function startChannel(kind: ChannelKind, token: string): Promise<RunningChannel> {
  return kind === "discord" ? startDiscord(token) : startTelegram(token);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface GatewayOpts {
  intervalMs?: number;          // agent-due check cadence (default 60s)
  log: (line: string) => void;  // progress sink (the command prints these)
  once?: boolean;               // run a single agent-tick then return (used by tests / OS-cron mode)
}

/**
 * Run the gateway: host every eligible channel + a cron loop that fires due agents. Resident until
 * SIGINT/SIGTERM (or, with `once`, one tick then return). Channel failures are logged, not fatal —
 * one dead channel never takes down the gateway.
 */
export async function runGateway(opts: GatewayOpts): Promise<void> {
  const plan = planGateway();
  const running: RunningChannel[] = [];
  for (const c of plan.channels) {
    try {
      running.push(await startChannel(c.kind, c.token));
      opts.log(`● channel up: ${c.kind}`);
    } catch (e) {
      opts.log(`✗ channel ${c.kind} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  opts.log(`⚙ ${plan.scheduledAgents.length} scheduled agent${plan.scheduledAgents.length === 1 ? "" : "s"} armed`);

  const everyMs = opts.intervalMs ?? 60_000;
  let stop = false;
  const stopAll = async (): Promise<void> => {
    stop = true;
    for (const r of running) { try { await r.stop(); } catch { /* best-effort */ } }
  };
  const onSignal = (): void => { opts.log("stopping…"); void stopAll().finally(() => process.exit(0)); };
  if (!opts.once) {
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
  }

  const tick = async (): Promise<void> => {
    const state = loadState();
    const now = Date.now();
    for (const def of listAgents().filter((a) => isDue(a, state, now))) {
      if (stop) break;
      opts.log(`▶ agent due: ${def.name}`);
      const r = await runAgent(def);
      markRun(def.name, r.ok, Date.now());
      opts.log(`  ${r.ok ? "✓" : "✗"} ${def.name}`);
    }
  };

  if (opts.once) { await tick(); await stopAll(); return; }

  while (!stop) {
    await tick();
    for (let waited = 0; waited < everyMs && !stop; waited += 500) await sleep(500);
  }
}
