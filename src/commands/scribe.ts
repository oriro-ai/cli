// `oriro scribe` — the consent gate for the local work journal (Scriber). Off by default; nothing
// is recorded or injected until the user turns it on. Local-only, reversible.
import type { Command } from "commander";
import { isScribeEnabled, setScribeConsent } from "../scribe/consent.js";
import { ok, info } from "./ui.js";
import { dim } from "../ui/theme.js";

export function registerScribeCommand(program: Command): void {
  const scribe = program.command("scribe").description("the consent-gated local work journal (off by default)");

  scribe
    .command("on")
    .description("enable the journal (recorded locally at ~/.oriro/scribe, never leaves your machine)")
    .action(() => {
      setScribeConsent(true);
      ok("Scriber is ON — turns are journaled locally (redacted) and recalled across sessions.");
      info(dim("everything stays on this machine; turn off any time with `oriro scribe off`"));
    });

  scribe
    .command("off")
    .description("disable the journal")
    .action(() => {
      setScribeConsent(false);
      ok("Scriber is OFF — no new turns are recorded or injected.");
    });

  scribe
    .command("status")
    .description("show whether the journal is on or off")
    .action(() => {
      info(isScribeEnabled() ? "Scriber: ON" : "Scriber: OFF (default)");
    });
}
