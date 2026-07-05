// Phase 5 — the local, OpenAI-compatible inference endpoint. This is what replaces Ollama's role: a small
// HTTP server on localhost that the browser workspace (or any OpenAI-style client) calls. It loads the
// device-bound .orx via the streaming runtime, keeps each model warm, and streams SSE chat completions
// with the model's <think> reasoning already stripped by the engine.
//
// CORS for ORIRO origins is BUILT IN — no OLLAMA_ORIGINS env var to set (a UX win vs. Ollama). It binds
// 127.0.0.1 only (never exposed off the machine) on port 11435 (deliberately NOT Ollama's 11434).

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { startLocalModel, type LocalModel } from "./local-runtime.js";
import type { ChatMessage } from "./template.js";
import { oriroDir } from "../config/paths.js";

const KNOWN_MODELS = ["gauss", "avila"] as const;
const MODEL_PARAMS_B: Record<string, number> = { gauss: 9, avila: 9 };
const DEFAULT_PORT = 11435; // NOT 11434 (Ollama)
const ORIRO_ORIGIN = /^https:\/\/(www\.)?oriro\.(ai|app)$/;

export function orxPathFor(modelId: string): string {
  return join(oriroDir(), "weights", `${modelId}.orx`);
}

/** Map an incoming model field to a known ORIRO model id (default gauss). Pure → unit-tested. */
export function normalizeModel(raw: unknown): string {
  const s = String(raw ?? "").toLowerCase();
  for (const m of KNOWN_MODELS) if (s.includes(m)) return m;
  return "gauss";
}

export function sseData(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}
export function deltaChunk(model: string, id: string, content: string): object {
  return { id, object: "chat.completion.chunk", model, choices: [{ index: 0, delta: { content }, finish_reason: null }] };
}
export function finalChunk(model: string, id: string): object {
  return { id, object: "chat.completion.chunk", model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] };
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export interface ServeOptions {
  licenseKey: string;
  port?: number;
  host?: string;
}

export interface RunningServer {
  port: number;
  close(): Promise<void>;
}

/** Start the local endpoint. Models load lazily on first use and stay warm. */
export async function startLocalServer(opts: ServeOptions): Promise<RunningServer> {
  const warm = new Map<string, Promise<LocalModel>>();
  const getModel = (modelId: string): Promise<LocalModel> => {
    let p = warm.get(modelId);
    if (!p) {
      // Load the vision projector alongside the LM when it's installed ({id}-mmproj.orx).
      const mmprojPath = orxPathFor(`${modelId}-mmproj`);
      p = startLocalModel(orxPathFor(modelId), opts.licenseKey, MODEL_PARAMS_B[modelId] ?? 9, {
        mmprojOrxPath: existsSync(mmprojPath) ? mmprojPath : undefined,
      });
      warm.set(modelId, p);
    }
    return p;
  };

  const server = createServer((req, res) => {
    void handle(req, res, getModel).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });

  const port = opts.port ?? DEFAULT_PORT;
  await new Promise<void>((resolve) => server.listen(port, opts.host ?? "127.0.0.1", resolve));

  return {
    port,
    async close(): Promise<void> {
      await new Promise<void>((r) => server.close(() => r()));
      for (const p of warm.values()) {
        try { (await p).dispose(); } catch { /* best-effort */ }
      }
    },
  };
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  getModel: (id: string) => Promise<LocalModel>,
): Promise<void> {
  const origin = req.headers.origin;
  if (origin && ORIRO_ORIGIN.test(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "origin");
  }
  if (req.method === "OPTIONS") {
    if (origin && ORIRO_ORIGIN.test(origin)) {
      res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      res.setHeader("access-control-allow-headers", "content-type, authorization");
      // Private Network Access: current Chrome gates https→loopback behind this header. Without it the
      // browser can't reach the local runtime at all, so the on-device rung would never engage.
      res.setHeader("access-control-allow-private-network", "true");
    }
    res.writeHead(204).end();
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (url.pathname === "/v1/models") {
    const data = KNOWN_MODELS.filter((m) => existsSync(orxPathFor(m))).map((id) => ({ id, object: "model" }));
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ object: "list", data }));
    return;
  }
  if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
    await chatCompletions(req, res, getModel);
    return;
  }
  res.writeHead(404).end();
}

async function chatCompletions(
  req: IncomingMessage,
  res: ServerResponse,
  getModel: (id: string) => Promise<LocalModel>,
): Promise<void> {
  const body = await readJson(req);
  const modelId = normalizeModel(body.model);
  const messages = (Array.isArray(body.messages) ? body.messages : []) as ChatMessage[];
  const id = `chatcmpl-${randomBytes(8).toString("hex")}`;

  let model: LocalModel;
  try {
    model = await getModel(modelId);
  } catch (e) {
    // Model not installed, insufficient RAM, or engine missing → a clean, actionable error (never a hang).
    res.writeHead(503, { "content-type": "application/json" }).end(JSON.stringify({ error: { message: (e as Error).message } }));
    return;
  }

  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
  try {
    await model.chat(messages, (t) => { res.write(sseData(deltaChunk(modelId, id, t))); });
    res.write(sseData(finalChunk(modelId, id)));
    res.write("data: [DONE]\n\n");
  } catch (e) {
    res.write(sseData({ error: { message: (e as Error).message } }));
  }
  res.end();
}
