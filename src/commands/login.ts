// `oriro login` / `oriro logout` — authorize (or de-authorize) model downloads on this machine. ORIRO is
// keyless for CHAT; downloading the on-device weights is the one action that needs to know which signed-in
// user asked for it. The user signs in on oriro.app, gets a one-time setup code, and pastes it here. That
// is the only credential `oriro models pull` needs (attestation is a no-op unless the worker enforces it).
import type { Command } from "commander";
import { saveSession, clearSession, isLoggedIn } from "../config/session.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

export function registerLoginCommand(program: Command): void {
  program
    .command("login [code]")
    .description("authorize model downloads on this machine (paste the code from oriro.app)")
    .option("--status", "show whether this machine is authorized")
    .action((code: string | undefined, opts: { status?: boolean }) => {
      if (opts.status) {
        info(isLoggedIn() ? "this machine is authorized for downloads" : `not authorized — run ${accent("oriro login <code>")}`);
        return;
      }
      if (!code) {
        die(`paste your setup code: ${accent("oriro login <code>")} — get it on oriro.app → Download → “Connect this computer”.`);
      }
      if (!/^[a-f0-9]{32,64}$/i.test(code)) die("that doesn't look like a valid setup code (expected a 32–64 char hex code).");
      saveSession(code);
      heading("Authorized");
      ok(`this machine can now download models — run ${accent("oriro models pull")}`);
      info(dim("stored locally in ~/.oriro/session.json (0600); run `oriro logout` to remove."));
    });

  program
    .command("logout")
    .description("remove this machine's download authorization")
    .action(() => {
      clearSession();
      ok("logged out — download authorization removed from this machine");
    });
}
