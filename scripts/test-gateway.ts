// Unit test for the Gateway control plane (src/gateway/gateway.ts) — Phase 2a. tsx.
// Tests planGateway() (pure config read) + a single agent tick via runGateway({once:true}) with a
// throwaway ORIRO_STATE_DIR. The resident channel/loop path is not unit-tested (it's a live process).
// Run: tsx scripts/test-gateway.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "oriro-gateway-"));
process.env.ORIRO_STATE_DIR = tmp;

const { planGateway, runGateway } = await import("../src/gateway/gateway.js");
const { saveChannel } = await import("../src/channels/config.js");
const { saveAgent } = await import("../src/agents/store.js");

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// empty config → empty plan
{
  const p = planGateway();
  ok(p.channels.length === 0 && p.scheduledAgents.length === 0, "empty config → nothing to run");
}

// channels: enabled telegram/discord with token are hosted; whatsapp + disabled excluded
saveChannel({ kind: "telegram", token: "ttoken", enabled: true });
saveChannel({ kind: "discord", token: "dtoken", enabled: true });
saveChannel({ kind: "whatsapp", token: "", enabled: true }); // excluded (QR pairing, no token)
{
  const p = planGateway();
  const kinds = p.channels.map((c) => c.kind).sort();
  ok(kinds.join(",") === "discord,telegram", "hosts enabled telegram + discord, excludes whatsapp");
}

// a disabled channel is excluded
saveChannel({ kind: "telegram", token: "ttoken", enabled: false });
{
  const p = planGateway();
  ok(!p.channels.some((c) => c.kind === "telegram"), "disabled channel excluded");
}

// scheduled agents surface in the plan; unscheduled do not
{
  const now = new Date().toISOString();
  saveAgent({ name: "nightly", task: "do the thing", schedule: "1d", createdAt: now, updatedAt: now });
  saveAgent({ name: "manual", task: "on demand", createdAt: now, updatedAt: now });
  const p = planGateway();
  ok(p.scheduledAgents.includes("nightly") && !p.scheduledAgents.includes("manual"), "only scheduled agents are armed");
}

// runGateway({once:true}) completes a single tick without hanging (no channels started here → discord/telegram
// tokens are fake, but startChannel isn't reached in once-mode unless a channel is planned; disable them first)
{
  // Clear channels AND due agents so the once-tick stays fully offline (no live Telegram/Discord,
  // no real agent LLM call) and just exercises the loop mechanics + summary log.
  const { removeChannel } = await import("../src/channels/config.js");
  const { removeAgent } = await import("../src/agents/store.js");
  removeChannel("discord");
  removeAgent("nightly");
  const logs: string[] = [];
  let threw: string | null = null;
  try {
    await Promise.race([
      runGateway({ once: true, log: (l) => logs.push(l) }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
    ]);
  } catch (e) { threw = e instanceof Error ? e.message : String(e); }
  ok(threw === null, `once-tick completes without hanging${threw ? ` (${threw})` : ""}`);
  ok(logs.some((l) => l.includes("scheduled agent")), "once-tick logs the armed-agents summary");
}

rmSync(tmp, { recursive: true, force: true });
process.stdout.write(fails === 0 ? "\ngateway: ALL PASS\n" : `\ngateway: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
