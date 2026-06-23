// ORIRO channels — the minimal host. Runs each inbound channel message through a full ORIRO
// session (Mux + Guardian + Head + Scriber + Orchestrator + skills). Channel input is UNTRUSTED:
// the session's Guardian gates every tool call, and a channel turn has NO UI, so Guardian FAILS
// CLOSED on any "ask" — it never auto-approves a dangerous tool from a remote message (premortem
// kill-shot #4). One session per host. Built fresh on Pi; zero OpenClaw footprint.
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { assembleOriroSession } from "../onboarding/assemble.js";

export class OriroChannelHost {
  private session: AgentSession | null = null;
  private starting: Promise<AgentSession> | null = null;

  private async ensure(): Promise<AgentSession> {
    if (this.session) return this.session;
    if (!this.starting) {
      this.starting = assembleOriroSession().then((a) => {
        this.session = a.session;
        return a.session;
      });
    }
    return this.starting;
  }

  /** Dispatch one inbound message → ORIRO reply. Never throws — a channel must not crash on a turn. */
  async dispatch(text: string): Promise<string> {
    try {
      const session = await this.ensure();
      let out = "";
      const unsub = session.subscribe((e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
        if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") out += e.assistantMessageEvent.delta ?? "";
      });
      try {
        await session.prompt(text);
      } finally {
        unsub();
      }
      return out.trim() || "(ORIRO had no reply)";
    } catch (e) {
      return `ORIRO error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  dispose(): void {
    this.session?.dispose();
    this.session = null;
    this.starting = null;
  }
}
