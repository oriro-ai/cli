<!-- Banner / demo -->
<p align="center">
  <a href="https://github.com/oriro-ai/cli/raw/main/media/oriro-cli-demo.mp4">
    <img src="https://github.com/oriro-ai/cli/raw/main/media/oriro-cli-demo.gif" alt="ORIRO CLI v0.1.12 — live demo" width="900">
  </a>
</p>
<p align="center"><em>▶ ORIRO CLI v0.1.12 — 55-second live demo · keyless chat · avatar · agents · Guardian. <a href="https://github.com/oriro-ai/cli/raw/main/media/oriro-cli-demo.mp4">Click for full-quality MP4.</a></em></p>

# ORIRO‑Terminal - **“Head | Memory | Eyeball for AI”**

# **FREE · KEYLESS · BYOK** | **Works in 100 Languages | Deterministic Security Guardian V3**

A free, keyless terminal AI coder — built on the Pi agent harness (used as a library).
It **writes and runs code** from a pool of free routers, works in **your language**, **guards every action**,
can **inspect a live site's structure**, and greets you with an **avatar in its own on-device voice**.
Your language, your machine, no paid keys required.

## What's inside (this release)
- **Keyless free-router Mux** — best-router selection + invisible failover across free providers, with an on-device floor. **Never a paid key.** BYOK optional (live-validated).
- **100 languages** — pick yours at first run; the model works in English. On-device NLLB translation is an optional add-on (without it, your text passes through as-is).
- **Guardian V3 (Lite)** — a **deterministic** security gate on every tool call (default-on, fail-closed): blocks `curl|sh` remote-exec, destructive wipes, reverse shells, and env/secret exfil. No weights, no tokenizer, no download.
- **Head** — go out to a live site and SEE it. `oriro head <url>` does a keyless structural read (sections, CTAs, gaps vs competitors — pure fetch, no browser). With the optional Chromium peer it also **reverse-engineers a page into clean code** (`--code`), a **YAML build spec** (`--spec`), or **full-page screenshots** (`--shots`). The chat agent can call the same via its `inspect_site` / `url_to_code` / `url_to_spec` / `capture_site` tools.
- **Scriber (memory)** — a consent-gated local work journal, **off by default**; turns are recalled across sessions and never leave your machine.
- **326 skills** (CORE/TAIL tiered) + **multi-agent orchestration** on the free pool.
- **Agents** — save a workflow as an **agent** that runs on a router (its brain) with **full tools behind Guardian**: `oriro agents make <name> --task "…" [--router <id>] [--schedule 1h]`, then `oriro agents run <name>`. **Automate** it with `oriro agents tick` (wire to cron/Task Scheduler) or `oriro agents daemon`. Import shared agents with `oriro agents add <path|url>` — user-extensible, just like skills. An agent is inert until a router is behind it.
- **MCP connectors** — a 59-entry catalog (`oriro connectors add <slug>`) **plus guided setup of ANY custom server** (`oriro connectors setup`), Guardian-vetted before it's saved (no JSON).
- **Avatar** — pick a face at onboarding; it greets you aloud in its paired on-device voice.
- **Voice input** — `oriro voice` transcribes audio/mic to text on-device (Whisper, translate→English path); `/voice` speaks a turn in chat. *Experimental — needs ffmpeg + the transformers peer.*
- **Permission postures** — Shift+Tab cycles **Manual · Accept-Edits · Auto · Plan**; **Alt+Shift+T** toggles a plan-first **Thinking** mode. Guardian is the floor in every posture.
- **Channels** — run ORIRO from Telegram/Discord/WhatsApp with **your own** bot.

## On the roadmap (not in this release)
A fully **hands-free two-way voice loop** (auto mic → reply → speak — today `oriro voice`/`/voice` do on-device STT and the avatar speaks its greeting) and richer on-device TTS voices, plus **video → code** at pixel fidelity (shipped but experimental — needs a vision-capable router). The Head's structural read is keyless and always on; its screenshot / code / spec flows are opt-in behind the Chromium peer (`npm i playwright && npx playwright install chromium`), and voice STT is opt-in behind ffmpeg + the transformers peer.

**## Install**

**Run it instantly — no install**, works on any OS with Node ≥ 20:
```bash
npx @oriro/orirocli
```

**Or install the** `oriro` command globally:
```bash
npm i -g @oriro/orirocli   # then: oriro
```

**Both paths reach the same first-run setup.** `npx` and `npm i -g` are the supported install channels — they work on every OS with Node ≥ 20, no build step.

<details>
<summary>From source (contributors)</summary>

```bash
git clone https://github.com/oriro-ai/cli && cd cli
npm install && npm run build   # then: node dist/cli.js
```
</details>

> Built on [Pi](https://github.com/earendil-works/pi) (MIT). See `ATTRIBUTION.md` for full provenance.

**ORIRO-Head — how it works:**

- **Structural read (default, keyless, no browser):** `oriro head <url> [competitor …]` server-side `fetch()`es the page, detects 15 section types (hero, pricing, CTA, testimonials, FAQ, …), runs a gap analysis vs any competitor URLs, and prints a priority-ranked report + action items. Add `--html` for a visual report. `$0`, deterministic, nothing leaves the machine.
- **URL → code / spec (opt-in, Chromium peer):** `--code` crawls the page in a real browser (Playwright), captures the rendered post-JS HTML + a full-page screenshot, and reverse-engineers **clean, runnable code**; `--spec` emits a stack-agnostic **YAML build spec** instead. The coder runs on the free keyless Mux — no paid key.
- **Screenshots:** `--shots` assembles full-page screenshots of every URL into one visual flow HTML.
- The chat agent reaches all of this on its own judgment via the `inspect_site` / `url_to_code` / `url_to_spec` / `capture_site` tools — just say “go look at stripe.com and rebuild the pricing page”.

**Multi-Lingual** (99 Global Languages): 
Use your native language in the terminal; ORIRO translates to English for the router, works for you, and translates back. **Voice:** `oriro voice` (or `/voice` in chat) transcribes speech on-device via Whisper — with the translate→English path for the coder — and the avatar speaks its greeting (TTS). On-device STT is experimental (needs ffmpeg + the `@huggingface/transformers` peer); a fully hands-free loop is the next polish.

**Guardian V3 — the security floor.** Guardian V3 **Lite** ships in the CLI: pure deterministic TypeScript (regex injection patterns + IOC signatures + hidden-unicode ranges + heuristics). No weights, no tokenizer, no download; default-on by construction, fail-closed. *(The heavier financial-grade agentic/behavioral threat analysis by TranzGuard.com is the upstream vision, not bundled here.)*

**MCP setup — guided, no JSON.** `oriro connectors setup` asks for the name, command/URL, args, and env and builds the config for you. Guardian **vets every server before it's saved**: it blocks a malicious launch (`curl | sh`, obfuscated loader, env→URL exfil), asks-to-trust a new clean server, allows an already-trusted one — and **remembers your trust so it won't re-ask**. (`oriro connectors custom` lists them; `oriro connectors forget <name>` removes one.)
As forward integration to base CLI Terminal of pi-mono foundation; we used same foundation and carry forwarded instead of backward efforts to build it backward bottom up. Thanks to the foundation work by pi-mono foundation, @Claude @KIMI and all other contributors. 

We also added a fun factor in work for you: AVATAR you chose of your own in Terminal.
A genuinely cool stack, a terminal coder that sees the web (ORIRO-Head: Crawl → Screenshot + HTML → Reverse-engineered code), Speaks/listens in 99 languages, guards itself (Guardian V3 Lite), and can wear a floating avatar that talks back in its own voice. All on-device.

Permission cycle / Safety │ ✅ 4 modes: Shift+Tab → │ Postures │ Manual / Accept_Edits / Auto / Plan / Thinking-cycle → alt+shift+t

**Safety - ORIRO floor baked in: Even Auto can't run what Guardian blocks (wipes/exfil/curl|sh)**

**"Auto"** = don't-ask-for-low-risk, never run-anything; **Plan**= read-only

**“Indicators”** **●** Manual · **✎** Accept Edits · **⏵⏵**Auto · **▢** Plan │ Type-check clean


 License - **MIT License**

Copyright (c) 2026 ORIRO

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


