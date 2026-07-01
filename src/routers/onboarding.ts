// ORIRO Step 6 — router / BYOK onboarding (the step that was referenced in code but never wired into
// the first-run journey). Keyless is the DEFAULT (Pollinations floor — works now, $0, no key); this
// step simply OFFERS the user their own API key for a faster, private lane, and points them at the
// `oriro routers` command. It is NEVER forced: declining keeps the keyless floor, so a brand-new user
// can always chat immediately. Asked once (settled marker in ~/.oriro, like the Scriber consent).
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { oriroDir } from "../config/paths.js";
import { ROUTER_CATALOG, routerById } from "./catalog.js";
import { addRouter } from "./router-pool.js";
import { ask } from "../onboarding/prompt.js";
import { accent, dim } from "../ui/theme.js";

function markerFile(): string {
  return join(oriroDir(), "routers", "onboarded.json");
}

/** True once the router step has been offered (regardless of whether a key was added). */
export function hasRouterChoice(): boolean {
  try {
    return existsSync(markerFile());
  } catch {
    return false;
  }
}

function markRouterOnboarded(): void {
  try {
    mkdirSync(join(oriroDir(), "routers"), { recursive: true });
    writeFileSync(markerFile(), `${JSON.stringify({ onboardedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
  } catch {
    /* non-fatal — marker is a convenience, the floor still works */
  }
}

/**
 * Offer the user a BYOK router once. Keyless stays the default. Returns after settling the choice
 * (and persisting the marker), whether the user added a key or skipped.
 */
export async function runRouterOnboarding(): Promise<void> {
  stdout.write(
    `\n  ${accent("Routers")} — ORIRO runs on a ${accent("free keyless router")} by default. ` +
      `No key, $0, works right now.\n` +
      `  ${dim("Add your own key (any free provider) for a faster, private lane — or skip and stay keyless.")}\n`,
  );

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const add = (await ask(rl, `  Add your own key now? ${dim("[y/N]")} `)).trim().toLowerCase();
    if (add === "y" || add === "yes") {
      // A few popular FREE providers (each gives a free key from its own site). Keyless + coming-soon
      // + non-chat routers are excluded — only real BYOK chat providers are offered here.
      const picks = ROUTER_CATALOG.filter(
        (r) => !r.comingSoon && !r.keyless && (!r.kind || r.kind === "chat"),
      ).slice(0, 8);

      stdout.write(`\n  ${dim("Free providers (grab a free key from each provider's site):")}\n`);
      for (const r of picks) {
        stdout.write(`    ${accent(r.id.padEnd(14))} ${dim(r.displayName)}\n`);
      }
      stdout.write(`    ${dim("…or any id from `oriro routers list`")}\n\n`);

      const slug = (await ask(rl, `  Which provider? ${dim("(id, or blank to skip)")} `)).trim();
      if (slug) {
        const entry = routerById(slug);
        if (!entry) {
          stdout.write(`  ${dim(`Unknown '${slug}' — skipped. You can add it later: oriro routers add ${slug}`)}\n`);
        } else {
          const key = (await ask(rl, `  Paste your ${accent(entry.displayName)} API key: `)).trim();
          if (key) {
            stdout.write(`  ${dim("Validating…")}\n`);
            const res = await addRouter(entry, { key });
            if (res.ok) {
              stdout.write(
                `  ${accent("✓")} added ${accent(slug)} (${res.validation.latencyMs}ms) — it now races in your pool.\n`,
              );
            } else {
              stdout.write(
                `  ${dim(`Couldn't add ${slug}: ${res.validation.error ?? "validation failed"}. Staying keyless — retry: oriro routers add ${slug} --key <key>`)}\n`,
              );
            }
          } else {
            stdout.write(`  ${dim("No key entered — staying keyless.")}\n`);
          }
        }
      }
    }
  } finally {
    rl.close();
  }

  markRouterOnboarded();
  stdout.write(`  ${dim("Manage routers anytime: ")}${accent("oriro routers list · add · use")}\n`);
}
