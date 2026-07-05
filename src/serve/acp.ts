// ORIRO ACP server — V0.3.8. Speaks the Agent Client Protocol over stdio (the official
// @agentclientprotocol/sdk package — no hand-rolled JSON-RPC), so Zed, JetBrains and
// any ACP-capable editor can drive ORIRO as their coding agent: `oriro serve acp`.
// Each ACP session is a FULL assembled ORIRO session (keyless Mux + Guardian + skills) bound to the
// editor's cwd; agent text streams back as agent_message_chunk updates. Keyless by construction.
import { randomUUID } from "node:crypto";
import { Readable, Writable } from "node:stream";
import { AgentSideConnection, ndJsonStream, PROTOCOL_VERSION } from "@agentclientprotocol/sdk";
import type { Agent, InitializeRequest, InitializeResponse, NewSessionRequest, NewSessionResponse, AuthenticateRequest, AuthenticateResponse, PromptRequest, PromptResponse, CancelNotification } from "@agentclientprotocol/sdk";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { assembleOriroSession } from "../onboarding/assemble.js";
import { scrubOutput } from "../identity/filter.js";
import { promptText, protectStdio, exitOnStdinClose } from "./common.js";

class OriroAcpAgent implements Agent {
  private sessions = new Map<string, AgentSession>();
  constructor(private conn: AgentSideConnection) {}

  async initialize(_p: InitializeRequest): Promise<InitializeResponse> {
    return {
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
      authMethods: [], // keyless — there is nothing to authenticate
    };
  }

  async authenticate(_p: AuthenticateRequest): Promise<AuthenticateResponse> {
    return {};
  }

  async newSession(p: NewSessionRequest): Promise<NewSessionResponse> {
    const { session } = await assembleOriroSession({ cwd: p.cwd || process.cwd() });
    const id = randomUUID();
    this.sessions.set(id, session);
    return { sessionId: id };
  }

  async prompt(p: PromptRequest): Promise<PromptResponse> {
    const session = this.sessions.get(p.sessionId);
    if (!session) throw new Error(`unknown sessionId '${p.sessionId}' — call session/new first`);
    const text = promptText(p.prompt as Array<Record<string, unknown>>);
    if (!text) return { stopReason: "end_turn" };

    const unsub = session.subscribe(
      (e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
        if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
          const delta = scrubOutput(e.assistantMessageEvent.delta ?? "");
          if (!delta) return;
          void this.conn.sessionUpdate({
            sessionId: p.sessionId,
            update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: delta } },
          });
        }
      },
    );
    try {
      await session.prompt(text);
    } catch {
      return { stopReason: "refusal" }; // router pool exhausted / hard error — the editor shows the stop
    } finally {
      unsub();
    }
    return { stopReason: "end_turn" };
  }

  async cancel(p: CancelNotification): Promise<void> {
    // Best-effort: Pi's session abort if present; otherwise the in-flight prompt finishes and is discarded.
    try { (this.sessions.get(p.sessionId) as { abort?: () => void } | undefined)?.abort?.(); } catch { /* */ }
  }
}

/** Run the ACP stdio server until the editor closes stdin. */
export async function serveAcp(): Promise<void> {
  protectStdio();
  exitOnStdinClose();
  const stream = ndJsonStream(
    Writable.toWeb(process.stdout) as WritableStream<Uint8Array>,
    Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>,
  );
  new AgentSideConnection((conn) => new OriroAcpAgent(conn), stream);
  await new Promise<void>(() => {}); // event-driven; exitOnStdinClose / SIGINT end the process
}
