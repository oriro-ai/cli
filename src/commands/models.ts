// `oriro models` — run Gauss & Avila on THIS machine, no Ollama. ORIRO's own runtime (embedded llama.cpp)
// downloads the device-locked models and serves them on a local OpenAI-compatible endpoint.
//   status  → what's installed on this machine
//   pull    → download Gauss then Avila (one at a time, resumable) into device-bound .orx
//   serve   → run them locally on http://127.0.0.1:11435 (browser workspace can reach it — CORS built in)
//
// Credentials come from the login/setup flow via env (ORIRO_LICENSE_KEY device license + ORIRO_SETUP_TOKEN
// download authorization); ORIRO_API_BASE overrides the origin (default https://oriro.ai).
import type { Command } from "commander";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { oriroDir } from "../config/paths.js";
import { pullModelToOrx, probeSize } from "../weights/pull.js";
import { startLocalServer } from "../weights/serve.js";
import { packOrxToFile } from "../weights/container-stream.js";
import { deriveKek } from "../weights/binding.js";
import { readSetupToken, readLicense } from "../config/session.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

const MODELS = [
  { id: "gauss", label: "Gauss V2.4", paramsB: 9 },
  { id: "avila", label: "Avila V2.4", paramsB: 9 },
] as const;

function orxPath(id: string): string {
  return join(oriroDir(), "weights", `${id}.orx`);
}
function gb(n: number): string {
  return (n / 1e9).toFixed(2) + " GB";
}

/**
 * Infer the ORIRO storage id from a downloaded GGUF's filename. A vision projector maps to its OWN slot
 * ("gauss-mmproj") so it never overwrites the LM ("gauss"). Pure → unit-tested.
 */
export function modelIdFromFilename(p: string): string | null {
  const base = (p.replace(/\\/g, "/").split("/").pop() ?? "").toLowerCase().replace(/\.gguf$/, "");
  const root = base.includes("gauss") ? "gauss" : base.includes("avila") ? "avila" : null;
  if (!root) return null;
  return base.includes("mmproj") ? `${root}-mmproj` : root;
}

interface ManifestEntry { url: string; sha256: string; expires_at: number }

async function fetchManifest(base: string, setupToken: string): Promise<Record<string, ManifestEntry>> {
  const r = await fetch(`${base}/api/weights/manifest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ setup_token: setupToken }),
  });
  if (r.status === 401 || r.status === 403) {
    throw new Error(`downloads refused (HTTP ${r.status}) — run \`oriro login\` to authorize this machine${r.status === 403 ? " (device attestation required)" : ""}.`);
  }
  if (!r.ok) throw new Error(`weights manifest HTTP ${r.status}`);
  const d = (await r.json()) as { models?: Record<string, ManifestEntry> };
  return d.models ?? {};
}

async function resumeUrl(base: string, setupToken: string, modelId: string): Promise<string> {
  const r = await fetch(`${base}/api/weights/resume`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: `${modelId}.gguf`, setup_token: setupToken }),
  });
  const d = (await r.json().catch(() => ({}))) as { model?: { url?: string } };
  if (!r.ok || !d.model?.url) throw new Error("link refresh failed");
  return d.model.url;
}

export function registerModelsCommand(program: Command): void {
  const models = program
    .command("models")
    .description("run Gauss & Avila on this machine — download, serve, status (no Ollama)");

  models
    .command("status")
    .description("show which models are installed on this machine")
    .action(() => {
      heading("ORIRO models — on this machine");
      for (const m of MODELS) {
        const p = orxPath(m.id);
        if (existsSync(p)) ok(`${m.label} — installed (${gb(statSync(p).size)}, device-locked)`);
        else info(`${m.label} — ${dim("not downloaded")}`);
      }
      info(dim(`location: ${join(oriroDir(), "weights")}`));
    });

  models
    .command("pull")
    .description("download Gauss then Avila to this machine (one at a time, resumable)")
    .option("--only <id>", "download just one model (gauss|avila)")
    .action(async (opts: { only?: string }) => {
      const base = process.env.ORIRO_API_BASE ?? "https://oriro.ai";
      const license = readLicense();
      const setupToken = readSetupToken();
      if (!setupToken) die("not authorized for downloads — run `oriro login <code>` first (code from oriro.app).");

      const pick = opts.only ? MODELS.filter((m) => m.id === opts.only!.toLowerCase()) : [...MODELS];
      if (!pick.length) die(`unknown model "${opts.only}" (use gauss|avila)`);

      let manifest: Record<string, ManifestEntry>;
      try {
        manifest = await fetchManifest(base, setupToken);
      } catch (e) {
        return die((e as Error).message);
      }

      for (const m of pick) {
        const entry = manifest[m.id];
        if (!entry?.url) return die(`the weights manifest has no entry for ${m.id}`);
        heading(m.label);
        const size = await probeSize(entry.url).catch((e) => die((e as Error).message));
        info(`downloading ${gb(size)} — resumable, streams straight to disk`);
        let lastPct = -1;
        await pullModelToOrx({
          modelId: m.id,
          url: entry.url,
          sizeBytes: size,
          sha256: entry.sha256 ?? "",
          licenseKey: license,
          createdTs: Date.now(),
          version: "2.4",
          refresh: () => resumeUrl(base, setupToken, m.id),
          onProgress: (done, total) => {
            const pct = Math.floor((done / total) * 100);
            if (pct !== lastPct) {
              lastPct = pct;
              process.stdout.write(`\r  ${accent(String(pct).padStart(3))}%  ${gb(done)} / ${gb(total)}   `);
            }
          },
        });
        process.stdout.write("\n");
        ok(`${m.label} ready — locked to this device`);

        // Vision projector (mmproj), if published — pulled next to its LM so the model can take images.
        const vision = manifest[`${m.id}-mmproj`];
        if (vision?.url) {
          info(`${m.label} vision projector …`);
          const vsize = await probeSize(vision.url).catch(() => 0);
          if (vsize > 0) {
            await pullModelToOrx({
              modelId: `${m.id}-mmproj`, url: vision.url, sizeBytes: vsize, sha256: vision.sha256 ?? "",
              licenseKey: license, createdTs: Date.now(), version: "2.4",
              refresh: () => resumeUrl(base, setupToken, `${m.id}-mmproj`),
            });
            ok(`${m.label} vision ready`);
          }
        }
      }
      ok("all set — run `oriro models serve` to use them locally");
    });

  models
    .command("import <files...>")
    .description("device-lock GGUFs you downloaded from oriro.app into runnable .orx (local, no login)")
    .action(async (files: string[]) => {
      // Fully local: no server, no login, no attestation. Takes the gauss.gguf / avila.gguf a signed-in
      // user already downloaded from oriro.app and device-locks each into a runnable .orx. The default local
      // license is fine — the binding to THIS machine is via the per-machine install secret (binding.ts).
      const license = readLicense();
      heading("Import models to this machine");
      let done = 0;
      for (const f of files) {
        if (!existsSync(f)) { info(`skip ${f} — file not found`); continue; }
        const id = modelIdFromFilename(f);
        if (!id) { info(`skip ${f} — filename must contain 'gauss' or 'avila'`); continue; }
        const label = MODELS.find((m) => m.id === id)?.label ?? id;
        info(`device-locking ${label} …`);
        await packOrxToFile(f, orxPath(id), {
          kek: deriveKek(license),
          watermark: `orx:${id}-import`,
          meta: { modelId: id, version: "2.4", createdTs: Date.now() },
        });
        ok(`${label} imported (${gb(statSync(orxPath(id)).size)}, locked to this device)`);
        done++;
      }
      if (!done) die("nothing imported — pass the gauss.gguf / avila.gguf you downloaded from oriro.app");
      ok("run `oriro models serve` to use them locally (no Ollama)");
    });

  models
    .command("serve")
    .description("run the models locally on an OpenAI-compatible endpoint (no Ollama)")
    .option("-p, --port <n>", "port (default 11435)", (v) => parseInt(v, 10))
    .action(async (opts: { port?: number }) => {
      const license = readLicense();
      const installed = MODELS.filter((m) => existsSync(orxPath(m.id)));
      if (!installed.length) die("no models installed — run `oriro models pull` first.");

      const server = await startLocalServer({ licenseKey: license, port: opts.port });
      heading("ORIRO local endpoint");
      ok(`serving ${installed.map((m) => m.label).join(" + ")} on http://127.0.0.1:${server.port}`);
      info(dim("OpenAI-compatible: POST /v1/chat/completions · GET /v1/models · GET /health"));
      info(dim("oriro.ai / oriro.app reach it directly (CORS built in). Ctrl-C to stop."));
      await new Promise<void>((resolve) => {
        process.on("SIGINT", () => { void server.close().then(resolve); });
      });
    });
}
