// ORIRO REPL slash commands: /routers and /model — manage the free-router race WITHOUT leaving chat.
// Surfaces the exact `oriro routers add|use|list` engine (router-pool.ts) as in-REPL commands so a
// user can add ORIRO-Gauss / ORIRO-Avila (or any free router) and rotate the racing pool inline.
// The mux re-resolves the pool per request (mux-provider.ts), so a change here is LIVE on the next
// prompt — no restart. Pure string-in/lines-out (the REPLs render the lines); `add` validates live.
import { selectableRouters, routerById } from "../routers/catalog.js";
import { addRouter, useRouters, resolvePool } from "../routers/router-pool.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

/** True for `/routers`, `/router`, `/model` (with optional subcommand/args). */
export function isRouterSlash(cmd: string): boolean {
  return /^\/(routers?|model)(\s|$)/i.test(cmd.trim());
}

function poolLine(): string {
  const pool = resolvePool();
  return pool.length
    ? `${dim("racing now:")} ${accent(pool.map((p) => p.id).join(", "))}`
    : dim("racing now: (empty) → keyless floor");
}

function catalogLines(head: string): string[] {
  const lines: string[] = [];
  lines.push(
    head === "/model"
      ? dim("  ORIRO models & free routers — they race, best answer wins:")
      : dim("  Router catalog — they race, best answer wins:"),
  );
  for (const r of selectableRouters()) {
    const tier = r.keyless ? fgHex(PALETTE.success, "keyless") : dim(r.tier);
    lines.push(`    ${accent(r.id.padEnd(20))} ${r.displayName.padEnd(22)} ${tier}`);
  }
  lines.push(`  ${poolLine()}`);
  lines.push(dim("  add: /routers add <id>   ·   rotate: /routers use <id> [<id>…]"));
  return lines;
}

/** Handle a /routers or /model line. Returns the display lines. Never throws. */
export async function handleRouterSlash(raw: string): Promise<string[]> {
  const parts = raw.trim().split(/\s+/);
  const head = (parts[0] ?? "").toLowerCase(); // /routers | /router | /model
  const sub = (parts[1] ?? "").toLowerCase();

  try {
    // add: /routers add <id>   (also /model add <id>)
    if (sub === "add") {
      const id = parts[2];
      if (!id) return [dim("  usage: /routers add <id>   (e.g. /routers add oriro-gauss)")];
      const entry = routerById(id);
      if (!entry) return [dim(`  unknown router '${id}' — try /routers list`)];
      const res = await addRouter(entry, {});
      if (res.ok) {
        return [
          `  ${fgHex(PALETTE.success, "✓")} added ${accent(id)} (${res.validation.latencyMs}ms, model ${res.validation.model}) → ${fgHex(PALETTE.success, "now racing")}`,
          `  ${poolLine()}`,
        ];
      }
      return [dim(`  ✗ could not add ${id}: ${res.validation.error ?? "validation failed"}`)];
    }

    // rotate: /routers use <id…>   ·   /model <id…>
    const rotate =
      sub === "use"
        ? parts.slice(2)
        : head === "/model" && parts[1] && sub !== "list"
          ? parts.slice(1)
          : null;
    if (rotate) {
      if (!rotate.length) return [dim("  usage: /routers use <id> [<id>…]")];
      const { applied, unknown } = useRouters(rotate);
      const out: string[] = [];
      if (applied.length) out.push(`  ${fgHex(PALETTE.success, "✓")} now racing: ${accent(applied.join(", "))}`);
      if (unknown.length) out.push(dim(`  not registered yet (add first): ${unknown.join(", ")}`));
      return out.length ? out : [dim("  nothing applied — add a router first: /routers add <id>")];
    }

    // bare / list
    return catalogLines(head);
  } catch (e) {
    return [dim(`  router command failed: ${e instanceof Error ? e.message : String(e)}`)];
  }
}
