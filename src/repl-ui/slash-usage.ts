// UX-8: `/usage` — this session at a glance. ORIRO is keyless/free (no $ cost), so "usage" is the
// useful operational picture: turns so far, the racing pool + each router's learned health/latency,
// and who won the last race. Pure read of the mux health state + race status.
import { resolvePool } from "../routers/router-pool.js";
import { loadMuxState } from "../routers/mux.js";
import { getRaceStatus } from "../routers/race-status.js";
import { getTurns, getTrace } from "./repl-state.js";
import { oriroDir } from "../config/paths.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

export function isUsageSlash(cmd: string): boolean {
  return /^\/usage(\s|$)/i.test(cmd.trim());
}

export function handleUsage(): string[] {
  const pool = resolvePool();
  const health = new Map(loadMuxState(oriroDir()).map((s) => [s.id, s]));
  const race = getRaceStatus();
  const lines: string[] = [];

  lines.push(dim(`  turns this session: ${accent(String(getTurns()))} · thinking-trace: ${getTrace() ? fgHex(PALETTE.success, "on") : dim("off")}`));
  lines.push(dim("  racing pool (learned latency · health):"));
  if (!pool.length) {
    lines.push(dim("    (empty) → the keyless floor"));
  } else {
    const now = Date.now();
    for (const r of pool) {
      const s = health.get(r.id);
      const lat = s && Number.isFinite(s.latencyMs) ? `${Math.round(s.latencyMs)}ms` : "untried";
      const state = !s ? dim("new")
        : !s.healthy ? fgHex(PALETTE.error, "unhealthy")
        : s.cooldownUntil > now ? fgHex(PALETTE.error, "cooling")
        : fgHex(PALETTE.success, "healthy");
      lines.push(`    ${accent(r.id.padEnd(20))} ${dim(lat.padEnd(9))} ${state}`);
    }
  }
  if (race.winner && race.racers.length > 1) {
    lines.push(dim(`  last race: ${race.racers.join(" · ")} → won: `) + accent(race.winner));
  }
  return lines;
}
